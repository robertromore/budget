/**
 * Type-safe configuration system
 */

import {
  type NonEmptyString,
  type PositiveNumber,
  type AppConfig,
  type EnvironmentVariables,
  brand,
  getRequiredEnvironmentVariable,
  getEnvironmentVariable,
} from '../types/enhanced-types';
import { TypeValidator } from '../utils/type-validation';

/**
 * Configuration validation and management
 */
export class ConfigManager {
  private static instance: ConfigManager | null = null;
  private config: AppConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigManager {
    if (!this.instance) {
      this.instance = new ConfigManager();
    }
    return this.instance;
  }

  /**
   * Initialize configuration from environment variables
   */
  initialize(): AppConfig {
    if (this.config) {
      return this.config;
    }

    try {
      const nodeEnv = getRequiredEnvironmentVariable('NODE_ENV');
      const databaseUrl = getRequiredEnvironmentVariable('DATABASE_URL');
      
      // API configuration
      const apiBaseUrl = getEnvironmentVariable('API_BASE_URL') || 
        (nodeEnv === 'development' ? 'http://localhost:5173' : '');
      
      if (!apiBaseUrl) {
        throw new Error('API_BASE_URL must be set for production');
      }

      const apiTimeout = this.parsePositiveNumber(
        process.env['API_TIMEOUT'],
        5000, // Default 5 seconds
        'API_TIMEOUT'
      );

      const apiRetryAttempts = this.parsePositiveNumber(
        process.env['API_RETRY_ATTEMPTS'],
        3, // Default 3 attempts
        'API_RETRY_ATTEMPTS'
      );

      // UI configuration
      const uiPageSize = this.parsePageSize(
        process.env['UI_PAGE_SIZE'],
        20, // Default 20 items per page
        'UI_PAGE_SIZE'
      );

      const uiDebounceMs = this.parsePositiveNumber(
        process.env['UI_DEBOUNCE_MS'],
        300, // Default 300ms debounce
        'UI_DEBOUNCE_MS'
      );

      const uiAnimationDuration = this.parsePositiveNumber(
        process.env['UI_ANIMATION_DURATION'],
        200, // Default 200ms animations
        'UI_ANIMATION_DURATION'
      );

      // Cache configuration
      const cacheDefaultTtl = this.parsePositiveNumber(
        process.env['CACHE_DEFAULT_TTL'],
        300000, // Default 5 minutes
        'CACHE_DEFAULT_TTL'
      );

      const cacheMaxSize = this.parsePositiveNumber(
        process.env['CACHE_MAX_SIZE'],
        100, // Default 100 entries
        'CACHE_MAX_SIZE'
      );

      const cacheEnabled = this.parseBoolean(
        process.env['CACHE_ENABLED'],
        true, // Default enabled
        'CACHE_ENABLED'
      );

      this.config = {
        api: {
          baseUrl: TypeValidator.validateNonEmptyString(apiBaseUrl)!,
          timeout: apiTimeout,
          retryAttempts: apiRetryAttempts,
        },
        ui: {
          pageSize: uiPageSize,
          debounceMs: uiDebounceMs,
          animationDuration: uiAnimationDuration,
        },
        cache: {
          defaultTtl: cacheDefaultTtl,
          maxSize: cacheMaxSize,
          enabled: cacheEnabled,
        },
      };

      // Validate the complete configuration
      this.validateConfig(this.config);

      return this.config;
    } catch (error) {
      throw new Error(`Configuration initialization failed: ${error}`);
    }
  }

  /**
   * Get current configuration (initialize if needed)
   */
  getConfig(): AppConfig {
    return this.config || this.initialize();
  }

  /**
   * Get specific configuration section
   */
  getApiConfig() {
    return this.getConfig().api;
  }

  getUIConfig() {
    return this.getConfig().ui;
  }

  getCacheConfig() {
    return this.getConfig().cache;
  }

  /**
   * Update configuration at runtime (for testing)
   */
  updateConfig(updates: Partial<AppConfig>): void {
    if (!this.config) {
      this.initialize();
    }

    this.config = {
      ...this.config!,
      ...updates,
      api: { ...this.config!.api, ...updates.api },
      ui: { ...this.config!.ui, ...updates.ui },
      cache: { ...this.config!.cache, ...updates.cache },
    };

    this.validateConfig(this.config);
  }

  /**
   * Reset configuration (for testing)
   */
  reset(): void {
    this.config = null;
  }

  // Private helper methods
  private parsePositiveNumber(
    value: string | undefined,
    defaultValue: number,
    name: string
  ): PositiveNumber {
    if (!value) {
      const validated = TypeValidator.validatePositiveNumber(defaultValue);
      if (!validated) {
        throw new Error(`Default value for ${name} is not a positive number`);
      }
      return validated;
    }

    const parsed = parseInt(value, 10);
    const validated = TypeValidator.validatePositiveNumber(parsed);
    if (!validated) {
      throw new Error(`Environment variable ${name} must be a positive number, got: ${value}`);
    }
    return validated;
  }

  private parsePageSize(
    value: string | undefined,
    defaultValue: number,
    name: string
  ): PositiveNumber & { __constraint: 'max100' } {
    if (!value) {
      const validated = TypeValidator.validatePageSize(defaultValue);
      if (!validated) {
        throw new Error(`Default value for ${name} is not a valid page size`);
      }
      return validated;
    }

    const parsed = parseInt(value, 10);
    const validated = TypeValidator.validatePageSize(parsed);
    if (!validated) {
      throw new Error(`Environment variable ${name} must be a positive number ≤ 100, got: ${value}`);
    }
    return validated;
  }

  private parseBoolean(
    value: string | undefined,
    defaultValue: boolean,
    name: string
  ): boolean {
    if (!value) {
      return defaultValue;
    }

    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
      return true;
    }
    if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
      return false;
    }

    throw new Error(`Environment variable ${name} must be a boolean value, got: ${value}`);
  }

  private validateConfig(config: AppConfig): void {
    // Validate API configuration
    if (!TypeValidator.validateNonEmptyString(config.api.baseUrl)) {
      throw new Error('API baseUrl must be a non-empty string');
    }

    if (!TypeValidator.validatePositiveNumber(config.api.timeout)) {
      throw new Error('API timeout must be a positive number');
    }

    if (!TypeValidator.validatePositiveNumber(config.api.retryAttempts)) {
      throw new Error('API retryAttempts must be a positive number');
    }

    // Validate UI configuration
    if (!TypeValidator.validatePageSize(config.ui.pageSize)) {
      throw new Error('UI pageSize must be a positive number ≤ 100');
    }

    if (!TypeValidator.validatePositiveNumber(config.ui.debounceMs)) {
      throw new Error('UI debounceMs must be a positive number');
    }

    if (!TypeValidator.validatePositiveNumber(config.ui.animationDuration)) {
      throw new Error('UI animationDuration must be a positive number');
    }

    // Validate cache configuration
    if (!TypeValidator.validatePositiveNumber(config.cache.defaultTtl)) {
      throw new Error('Cache defaultTtl must be a positive number');
    }

    if (!TypeValidator.validatePositiveNumber(config.cache.maxSize)) {
      throw new Error('Cache maxSize must be a positive number');
    }

    if (typeof config.cache.enabled !== 'boolean') {
      throw new Error('Cache enabled must be a boolean');
    }
  }
}

/**
 * Configuration constants with type safety
 */
export const CONFIG_CONSTANTS = {
  // API limits
  MAX_API_TIMEOUT: 30000 as const, // 30 seconds
  MIN_API_TIMEOUT: 1000 as const, // 1 second
  MAX_RETRY_ATTEMPTS: 5 as const,
  MIN_RETRY_ATTEMPTS: 1 as const,

  // UI limits
  MAX_PAGE_SIZE: 100 as const,
  MIN_PAGE_SIZE: 1 as const,
  MAX_DEBOUNCE: 2000 as const, // 2 seconds
  MIN_DEBOUNCE: 0 as const,

  // Cache limits
  MAX_CACHE_SIZE: 1000 as const,
  MIN_CACHE_SIZE: 1 as const,
  MAX_CACHE_TTL: 86400000 as const, // 24 hours
  MIN_CACHE_TTL: 1000 as const, // 1 second

  // Environment-specific defaults
  DEVELOPMENT_DEFAULTS: {
    API_TIMEOUT: 10000,
    DEBOUNCE_MS: 100,
    CACHE_TTL: 60000, // 1 minute
  } as const,

  PRODUCTION_DEFAULTS: {
    API_TIMEOUT: 5000,
    DEBOUNCE_MS: 300,
    CACHE_TTL: 300000, // 5 minutes
  } as const,

  TEST_DEFAULTS: {
    API_TIMEOUT: 1000,
    DEBOUNCE_MS: 0,
    CACHE_TTL: 1000,
  } as const,
} as const;

/**
 * Environment-specific configuration helpers
 */
export class EnvironmentConfig {
  /**
   * Get configuration for current environment
   */
  static getEnvironmentDefaults() {
    const env = getRequiredEnvironmentVariable('NODE_ENV');
    
    switch (env) {
      case 'development':
        return CONFIG_CONSTANTS.DEVELOPMENT_DEFAULTS;
      case 'production':
        return CONFIG_CONSTANTS.PRODUCTION_DEFAULTS;
      case 'test':
        return CONFIG_CONSTANTS.TEST_DEFAULTS;
      default:
        return CONFIG_CONSTANTS.DEVELOPMENT_DEFAULTS;
    }
  }

  /**
   * Check if running in development
   */
  static isDevelopment(): boolean {
    return getRequiredEnvironmentVariable('NODE_ENV') === 'development';
  }

  /**
   * Check if running in production
   */
  static isProduction(): boolean {
    return getRequiredEnvironmentVariable('NODE_ENV') === 'production';
  }

  /**
   * Check if running in test environment
   */
  static isTest(): boolean {
    return getRequiredEnvironmentVariable('NODE_ENV') === 'test';
  }

  /**
   * Get log level based on environment
   */
  static getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
    const envLogLevel = getEnvironmentVariable('LOG_LEVEL');
    if (envLogLevel) {
      return envLogLevel;
    }

    // Default log levels by environment
    if (this.isDevelopment()) return 'debug';
    if (this.isTest()) return 'warn';
    return 'info'; // Production default
  }

  /**
   * Validate environment setup
   */
  static validateEnvironment(): void {
    const requiredVars: (keyof EnvironmentVariables)[] = ['NODE_ENV', 'DATABASE_URL'];
    
    for (const varName of requiredVars) {
      try {
        getRequiredEnvironmentVariable(varName);
      } catch (error) {
        throw new Error(`Environment validation failed: ${error}`);
      }
    }

    // Additional production-specific validations
    if (this.isProduction()) {
      const apiBaseUrl = getEnvironmentVariable('API_BASE_URL');
      if (!apiBaseUrl) {
        throw new Error('API_BASE_URL is required in production');
      }

      if (apiBaseUrl.startsWith('localhost') || apiBaseUrl.includes('127.0.0.1')) {
        throw new Error('API_BASE_URL cannot use localhost in production');
      }
    }
  }
}

// Export singleton instance for easy access
export const config = ConfigManager.getInstance();