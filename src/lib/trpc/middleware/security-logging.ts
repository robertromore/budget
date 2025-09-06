import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import type { Context } from "$lib/trpc";

// Initialize tRPC instance for middleware creation
const t = initTRPC.context<Context>().create();

interface SecurityLogEntry {
  timestamp: string;
  type: 'success' | 'error' | 'suspicious' | 'blocked';
  operation: string;
  operationType: 'query' | 'mutation' | 'subscription';
  userAgent?: string;
  ip?: string;
  userId?: string;
  error?: string;
  inputSize?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Simple in-memory security log storage
 * In production, this should write to a proper logging service
 */
class SecurityLogger {
  private logs: SecurityLogEntry[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory

  log(entry: SecurityLogEntry) {
    this.logs.push(entry);
    
    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }
    
    // In production, send to external logging service
    if (entry.type === 'blocked' || entry.type === 'suspicious') {
      console.warn('Security Alert:', JSON.stringify(entry, null, 2));
    } else if (entry.type === 'error') {
      console.error('Security Error:', JSON.stringify(entry, null, 2));
    }
  }

  getRecentLogs(limit: number = 100): SecurityLogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsByType(type: SecurityLogEntry['type'], limit: number = 100): SecurityLogEntry[] {
    return this.logs
      .filter(log => log.type === type)
      .slice(-limit);
  }

  getSuspiciousActivity(timeWindowMs: number = 60000): SecurityLogEntry[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.logs.filter(log => 
      (log.type === 'suspicious' || log.type === 'blocked') &&
      new Date(log.timestamp).getTime() > cutoff
    );
  }
}

// Global security logger instance
export const securityLogger = new SecurityLogger();

/**
 * Detect suspicious patterns in requests
 */
function detectSuspiciousPatterns(input: any, operation: string): string[] {
  const suspiciousIndicators: string[] = [];
  const inputStr = JSON.stringify(input || {});
  
  // Check for common attack patterns
  const patterns = [
    { pattern: /<script/i, indicator: 'XSS_SCRIPT_TAG' },
    { pattern: /javascript:/i, indicator: 'XSS_JAVASCRIPT_PROTOCOL' },
    { pattern: /on\w+\s*=/i, indicator: 'XSS_EVENT_HANDLER' },
    { pattern: /union\s+select/i, indicator: 'SQL_INJECTION_UNION' },
    { pattern: /drop\s+table/i, indicator: 'SQL_INJECTION_DROP' },
    { pattern: /\.\.\/\.\.\//g, indicator: 'PATH_TRAVERSAL' },
    { pattern: /eval\s*\(/i, indicator: 'CODE_INJECTION_EVAL' },
    { pattern: /Function\s*\(/i, indicator: 'CODE_INJECTION_FUNCTION' },
  ];
  
  for (const { pattern, indicator } of patterns) {
    if (pattern.test(inputStr)) {
      suspiciousIndicators.push(indicator);
    }
  }
  
  // Check for unusual patterns
  if (inputStr.length > 50000) {
    suspiciousIndicators.push('EXCESSIVE_INPUT_SIZE');
  }
  
  if ((inputStr.match(/[<>]/g) || []).length > 10) {
    suspiciousIndicators.push('MULTIPLE_ANGLE_BRACKETS');
  }
  
  if ((inputStr.match(/['"]/g) || []).length > 20) {
    suspiciousIndicators.push('EXCESSIVE_QUOTES');
  }
  
  return suspiciousIndicators;
}

/**
 * Extract client information from context
 */
function extractClientInfo(ctx: Context) {
  return {
    userAgent: (ctx as any).userAgent || 'unknown',
    ip: (ctx as any).ip || 'unknown',
    userId: (ctx as any).user?.id || 'anonymous',
  };
}

/**
 * Security logging middleware for tRPC
 * Logs all requests and detects suspicious activity
 */
export const securityLogging = t.middleware(async ({ next, input, ctx, type, path }) => {
  const startTime = Date.now();
  const clientInfo = extractClientInfo(ctx);
  
  // Skip logging for tests
  if ((ctx as any).isTest) {
    return next();
  }
  
  try {
    // Detect suspicious patterns before processing
    const suspiciousPatterns = detectSuspiciousPatterns(input, path);
    
    if (suspiciousPatterns.length > 0) {
      securityLogger.log({
        timestamp: new Date().toISOString(),
        type: 'suspicious',
        operation: path,
        operationType: type,
        ...clientInfo,
        inputSize: JSON.stringify(input || {}).length,
        metadata: { suspiciousPatterns },
      });
    }
    
    // Process the request
    const result = await next();
    const duration = Date.now() - startTime;
    
    // Log successful request
    securityLogger.log({
      timestamp: new Date().toISOString(),
      type: 'success',
      operation: path,
      operationType: type,
      ...clientInfo,
      inputSize: JSON.stringify(input || {}).length,
      duration,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Determine if this was a security-related error
    const isSecurityError = error instanceof TRPCError && (
      error.code === 'BAD_REQUEST' ||
      error.code === 'TOO_MANY_REQUESTS' ||
      error.code === 'UNAUTHORIZED' ||
      error.code === 'FORBIDDEN'
    );
    
    securityLogger.log({
      timestamp: new Date().toISOString(),
      type: isSecurityError ? 'blocked' : 'error',
      operation: path,
      operationType: type,
      ...clientInfo,
      error: error instanceof Error ? error.message : 'Unknown error',
      inputSize: JSON.stringify(input || {}).length,
      duration,
    });
    
    throw error;
  }
});

/**
 * Get security metrics for monitoring
 */
export function getSecurityMetrics(timeWindowMs: number = 3600000) { // 1 hour default
  const recentLogs = securityLogger.getRecentLogs(1000);
  const cutoff = Date.now() - timeWindowMs;
  
  const filteredLogs = recentLogs.filter(log => 
    new Date(log.timestamp).getTime() > cutoff
  );
  
  return {
    totalRequests: filteredLogs.length,
    successfulRequests: filteredLogs.filter(log => log.type === 'success').length,
    errors: filteredLogs.filter(log => log.type === 'error').length,
    suspicious: filteredLogs.filter(log => log.type === 'suspicious').length,
    blocked: filteredLogs.filter(log => log.type === 'blocked').length,
    averageResponseTime: filteredLogs
      .filter(log => log.duration)
      .reduce((sum, log) => sum + (log.duration || 0), 0) / filteredLogs.length || 0,
    topOperations: Object.entries(
      filteredLogs.reduce((acc, log) => {
        acc[log.operation] = (acc[log.operation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10),
  };
}