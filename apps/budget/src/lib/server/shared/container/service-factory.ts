/**
 * Service Factory for Dependency Injection
 *
 * Manages singleton instances of services and repositories.
 * Provides centralized service instantiation with proper dependency injection.
 *
 * Usage:
 *   import { serviceFactory } from '$lib/server/shared/container/service-factory';
 *   const transactionService = serviceFactory.getTransactionService();
 *
 * Testing:
 *   const factory = new ServiceFactory();
 *   factory.override('TransactionService', mockService);
 */

import { AccountRepository } from '$lib/server/domains/accounts/repository';
import { TransactionRepository } from '$lib/server/domains/transactions/repository';
import { CategoryRepository } from '$lib/server/domains/categories/repository';
import { PayeeRepository } from '$lib/server/domains/payees/repository';
import { BudgetRepository } from '$lib/server/domains/budgets/repository';
import { PatternRepository } from '$lib/server/domains/patterns/repository';
import { ScheduleRepository } from '$lib/server/domains/schedules/repository';

import { CategoryService } from '$lib/server/domains/categories/services';
import { PatternDetectionService } from '$lib/server/domains/patterns/services';
import { BudgetTransactionService, BudgetService, GoalTrackingService, BudgetForecastService, BudgetPeriodService } from '$lib/server/domains/budgets/services';
import { BudgetCalculationService } from '$lib/server/domains/budgets/calculation-service';
import { EnvelopeService } from '$lib/server/domains/budgets/envelope-service';
import { BudgetIntelligenceService } from '$lib/server/domains/budgets/intelligence-service';
import { BudgetTemplateService } from '$lib/server/domains/budgets/template-service';
import { PeriodManager } from '$lib/server/domains/budgets/period-manager';
import { RolloverCalculator } from '$lib/server/domains/budgets/rollover-calculator';
import { DeficitRecoveryService } from '$lib/server/domains/budgets/deficit-recovery';
import { TransactionService } from '$lib/server/domains/transactions/services';
import { PayeeService } from '$lib/server/domains/payees/services';
import { PayeeIntelligenceService } from '$lib/server/domains/payees/intelligence';
import { CategoryLearningService } from '$lib/server/domains/payees/category-learning';
import { BudgetAllocationService } from '$lib/server/domains/payees/budget-allocation';
import { PayeeMLCoordinator } from '$lib/server/domains/payees/ml-coordinator';
import { ContactManagementService } from '$lib/server/domains/payees/contact-management';
import { SubscriptionManagementService } from '$lib/server/domains/payees/subscription-management';
import { AccountService } from '$lib/server/domains/accounts/services';
import { ScheduleService } from '$lib/server/domains/schedules/services';

// PERFORMANCE: Lazy load medical-expenses modules via dynamic imports to prevent eager compilation
// These modules are large (504+ lines) and importing them at the top level causes TypeScript/Vite
// to compile the entire HSA feature set whenever any tRPC route imports the serviceFactory,
// resulting in sustained 100% CPU usage during development. Dynamic imports ensure modules are
// only loaded when medical-expenses routes are actually invoked.
import type { MedicalExpenseRepository } from '$lib/server/domains/medical-expenses/repository';
import type { MedicalExpenseService } from '$lib/server/domains/medical-expenses/services';
import type { ClaimService } from '$lib/server/domains/medical-expenses/claim-service';
import type { ClaimRepository } from '$lib/server/domains/medical-expenses/claim-repository';
import type { ReceiptService } from '$lib/server/domains/medical-expenses/receipt-service';
import type { ReceiptRepository } from '$lib/server/domains/medical-expenses/receipt-repository';

export class ServiceFactory {
  private instances = new Map<string, unknown>();

  // ==================== Repositories ====================

  getAccountRepository(): AccountRepository {
    const key = 'AccountRepository';
    if (!this.instances.has(key)) {
      this.instances.set(key, new AccountRepository());
    }
    return this.instances.get(key) as AccountRepository;
  }

  getTransactionRepository(): TransactionRepository {
    const key = 'TransactionRepository';
    if (!this.instances.has(key)) {
      this.instances.set(key, new TransactionRepository());
    }
    return this.instances.get(key) as TransactionRepository;
  }

  getCategoryRepository(): CategoryRepository {
    const key = 'CategoryRepository';
    if (!this.instances.has(key)) {
      this.instances.set(key, new CategoryRepository());
    }
    return this.instances.get(key) as CategoryRepository;
  }

  getPayeeRepository(): PayeeRepository {
    const key = 'PayeeRepository';
    if (!this.instances.has(key)) {
      this.instances.set(key, new PayeeRepository(
        this.getBudgetIntelligenceService()
      ));
    }
    return this.instances.get(key) as PayeeRepository;
  }

  getBudgetRepository(): BudgetRepository {
    const key = 'BudgetRepository';
    if (!this.instances.has(key)) {
      this.instances.set(key, new BudgetRepository());
    }
    return this.instances.get(key) as BudgetRepository;
  }

  getPatternRepository(): PatternRepository {
    const key = 'PatternRepository';
    if (!this.instances.has(key)) {
      this.instances.set(key, new PatternRepository());
    }
    return this.instances.get(key) as PatternRepository;
  }

  getScheduleRepository(): ScheduleRepository {
    const key = 'ScheduleRepository';
    if (!this.instances.has(key)) {
      this.instances.set(key, new ScheduleRepository());
    }
    return this.instances.get(key) as ScheduleRepository;
  }

  async getMedicalExpenseRepository(): Promise<MedicalExpenseRepository> {
    const key = 'MedicalExpenseRepository';
    if (!this.instances.has(key)) {
      const { MedicalExpenseRepository } = await import('$lib/server/domains/medical-expenses/repository');
      this.instances.set(key, new MedicalExpenseRepository());
    }
    return this.instances.get(key) as MedicalExpenseRepository;
  }

  async getClaimRepository(): Promise<ClaimRepository> {
    const key = 'ClaimRepository';
    if (!this.instances.has(key)) {
      const { ClaimRepository } = await import('$lib/server/domains/medical-expenses/claim-repository');
      this.instances.set(key, new ClaimRepository());
    }
    return this.instances.get(key) as ClaimRepository;
  }

  async getReceiptRepository(): Promise<ReceiptRepository> {
    const key = 'ReceiptRepository';
    if (!this.instances.has(key)) {
      const { ReceiptRepository } = await import('$lib/server/domains/medical-expenses/receipt-repository');
      this.instances.set(key, new ReceiptRepository());
    }
    return this.instances.get(key) as ReceiptRepository;
  }

  // ==================== Services ====================

  getCategoryService(): CategoryService {
    const key = 'CategoryService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new CategoryService(
        this.getCategoryRepository()
      ));
    }
    return this.instances.get(key) as CategoryService;
  }

  getPatternDetectionService(): PatternDetectionService {
    const key = 'PatternDetectionService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new PatternDetectionService(
        this.getPatternRepository()
      ));
    }
    return this.instances.get(key) as PatternDetectionService;
  }

  getBudgetTransactionService(): BudgetTransactionService {
    const key = 'BudgetTransactionService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new BudgetTransactionService(
        this.getBudgetRepository()
      ));
    }
    return this.instances.get(key) as BudgetTransactionService;
  }

  getRolloverCalculator(): RolloverCalculator {
    const key = 'RolloverCalculator';
    if (!this.instances.has(key)) {
      this.instances.set(key, new RolloverCalculator());
    }
    return this.instances.get(key) as RolloverCalculator;
  }

  getDeficitRecoveryService(): DeficitRecoveryService {
    const key = 'DeficitRecoveryService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new DeficitRecoveryService());
    }
    return this.instances.get(key) as DeficitRecoveryService;
  }

  getEnvelopeService(): EnvelopeService {
    const key = 'EnvelopeService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new EnvelopeService(
        this.getBudgetRepository(),
        this.getRolloverCalculator(),
        this.getDeficitRecoveryService()
      ));
    }
    return this.instances.get(key) as EnvelopeService;
  }

  getBudgetCalculationService(): BudgetCalculationService {
    const key = 'BudgetCalculationService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new BudgetCalculationService(
        this.getBudgetRepository(),
        this.getEnvelopeService()
      ));
    }
    return this.instances.get(key) as BudgetCalculationService;
  }

  getPayeeIntelligenceService(): PayeeIntelligenceService {
    const key = 'PayeeIntelligenceService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new PayeeIntelligenceService());
    }
    return this.instances.get(key) as PayeeIntelligenceService;
  }

  getCategoryLearningService(): CategoryLearningService {
    const key = 'CategoryLearningService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new CategoryLearningService());
    }
    return this.instances.get(key) as CategoryLearningService;
  }

  getBudgetAllocationService(): BudgetAllocationService {
    const key = 'BudgetAllocationService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new BudgetAllocationService(
        this.getPayeeIntelligenceService(),
        this.getCategoryLearningService()
      ));
    }
    return this.instances.get(key) as BudgetAllocationService;
  }

  getPayeeMLCoordinator(): PayeeMLCoordinator {
    const key = 'PayeeMLCoordinator';
    if (!this.instances.has(key)) {
      this.instances.set(key, new PayeeMLCoordinator(
        this.getPayeeIntelligenceService(),
        this.getCategoryLearningService(),
        this.getBudgetAllocationService()
      ));
    }
    return this.instances.get(key) as PayeeMLCoordinator;
  }

  getContactManagementService(): ContactManagementService {
    const key = 'ContactManagementService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new ContactManagementService());
    }
    return this.instances.get(key) as ContactManagementService;
  }

  getSubscriptionManagementService(): SubscriptionManagementService {
    const key = 'SubscriptionManagementService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new SubscriptionManagementService());
    }
    return this.instances.get(key) as SubscriptionManagementService;
  }

  getPayeeService(): PayeeService {
    const key = 'PayeeService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new PayeeService(
        this.getPayeeRepository(),
        this.getPayeeIntelligenceService(),
        this.getCategoryLearningService(),
        this.getPayeeMLCoordinator(),
        this.getContactManagementService(),
        this.getSubscriptionManagementService(),
        this.getCategoryService(),
        this.getBudgetService(),
        this.getBudgetAllocationService()
      ));
    }
    return this.instances.get(key) as PayeeService;
  }

  getTransactionService(): TransactionService {
    const key = 'TransactionService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new TransactionService(
        this.getTransactionRepository(),
        this.getPayeeService(),
        this.getCategoryService(),
        this.getBudgetTransactionService(),
        this.getBudgetCalculationService(),
        // Pass ScheduleService getter to avoid circular dependency
        () => this.getScheduleService(),
        this.getBudgetIntelligenceService()
      ));
    }
    return this.instances.get(key) as TransactionService;
  }

  getAccountService(): AccountService {
    const key = 'AccountService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new AccountService(
        this.getAccountRepository(),
        this.getTransactionService()
      ));
    }
    return this.instances.get(key) as AccountService;
  }

  getScheduleService(): ScheduleService {
    const key = 'ScheduleService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new ScheduleService(
        this.getScheduleRepository(),
        this.getTransactionService(),
        this.getPayeeService(),
        this.getCategoryService()
      ));
    }
    return this.instances.get(key) as ScheduleService;
  }

  async getClaimService(): Promise<ClaimService> {
    const key = 'ClaimService';
    if (!this.instances.has(key)) {
      const { ClaimService } = await import('$lib/server/domains/medical-expenses/claim-service');
      this.instances.set(key, new ClaimService(
        await this.getClaimRepository(),
        await this.getMedicalExpenseRepository()
      ));
    }
    return this.instances.get(key) as ClaimService;
  }

  async getMedicalExpenseService(): Promise<MedicalExpenseService> {
    const key = 'MedicalExpenseService';
    if (!this.instances.has(key)) {
      const { MedicalExpenseService } = await import('$lib/server/domains/medical-expenses/services');
      this.instances.set(key, new MedicalExpenseService(
        await this.getMedicalExpenseRepository(),
        this.getTransactionService(),
        await this.getClaimService()
      ));
    }
    return this.instances.get(key) as MedicalExpenseService;
  }

  getGoalTrackingService(): GoalTrackingService {
    const key = 'GoalTrackingService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new GoalTrackingService(
        this.getBudgetRepository()
      ));
    }
    return this.instances.get(key) as GoalTrackingService;
  }

  getBudgetForecastService(): BudgetForecastService {
    const key = 'BudgetForecastService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new BudgetForecastService(
        this.getBudgetRepository()
      ));
    }
    return this.instances.get(key) as BudgetForecastService;
  }

  getBudgetIntelligenceService(): BudgetIntelligenceService {
    const key = 'BudgetIntelligenceService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new BudgetIntelligenceService());
    }
    return this.instances.get(key) as BudgetIntelligenceService;
  }

  getBudgetPeriodService(): BudgetPeriodService {
    const key = 'BudgetPeriodService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new BudgetPeriodService(
        this.getBudgetRepository()
      ));
    }
    return this.instances.get(key) as BudgetPeriodService;
  }

  getBudgetTemplateService(): BudgetTemplateService {
    const key = 'BudgetTemplateService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new BudgetTemplateService());
    }
    return this.instances.get(key) as BudgetTemplateService;
  }

  getPeriodManager(): PeriodManager {
    const key = 'PeriodManager';
    if (!this.instances.has(key)) {
      this.instances.set(key, new PeriodManager());
    }
    return this.instances.get(key) as PeriodManager;
  }

  getBudgetService(): BudgetService {
    const key = 'BudgetService';
    if (!this.instances.has(key)) {
      this.instances.set(key, new BudgetService(
        this.getBudgetRepository(),
        this.getEnvelopeService(),
        this.getGoalTrackingService(),
        this.getBudgetForecastService(),
        this.getBudgetIntelligenceService()
      ));
    }
    return this.instances.get(key) as BudgetService;
  }

  async getReceiptService(): Promise<ReceiptService> {
    const key = 'ReceiptService';
    if (!this.instances.has(key)) {
      const { ReceiptService } = await import('$lib/server/domains/medical-expenses/receipt-service');
      this.instances.set(key, new ReceiptService(
        await this.getReceiptRepository(),
        await this.getMedicalExpenseRepository()
      ));
    }
    return this.instances.get(key) as ReceiptService;
  }

  // ==================== Testing Utilities ====================

  /**
   * Override a service instance (useful for testing)
   */
  override<T>(key: string, instance: T): void {
    this.instances.set(key, instance);
  }

  /**
   * Clear all cached instances (useful for testing)
   */
  reset(): void {
    this.instances.clear();
  }

  /**
   * Check if a service is already instantiated
   */
  has(key: string): boolean {
    return this.instances.has(key);
  }

  /**
   * Get the current number of instantiated services (for debugging)
   */
  get size(): number {
    return this.instances.size;
  }
}

/**
 * Global singleton instance of ServiceFactory
 * Use this in your application code
 */
export const serviceFactory = new ServiceFactory();
