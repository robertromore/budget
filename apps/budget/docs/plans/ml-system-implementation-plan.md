# ML System Implementation Plan

**Status**: Future Enhancement - Not Currently Implemented
**Created**: 2025-10-15
**Purpose**: Preserve comprehensive ML system design for potential future implementation

---

## Executive Summary

This document describes a comprehensive enterprise-grade Machine Learning (ML) monitoring, automation, and governance system that was originally planned but not yet implemented. The type definitions exist in `src/lib/server/domains/payees/ml-types.ts` (375 lines, 30+ types) but are currently unused.

**Current State**: Basic ML recommendations exist via:
- `PayeeIntelligenceService` - Spending pattern analysis
- `CategoryLearningService` - Auto-categorization learning
- `BudgetAllocationService` - Budget optimization suggestions
- `PayeeMLCoordinator` - Simple unified recommendations

**Gap**: No monitoring, automation rules, audit trails, explainability, or model management infrastructure.

---

## System Architecture Overview

### Core Components (Planned)

```
┌─────────────────────────────────────────────────────────┐
│                   Admin Dashboard                       │
│  - System Health Monitoring                            │
│  - Model Performance Metrics                           │
│  - Automation Rule Configuration                       │
│  - Audit Log Viewer                                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              ML Coordinator (Enhanced)                  │
│  - Ensemble Decision Making                            │
│  - Cross-System Learning                               │
│  - Health Monitoring                                   │
│  - Audit Logging                                       │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │Intelligence│   │ Learning │    │  Budget  │
    │  Service   │   │ Service  │    │Allocation│
    └──────────┘    └──────────┘    └──────────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
              ┌─────────────────────┐
              │  Automation Engine  │
              │  - Rule Evaluation  │
              │  - Auto-Apply Logic │
              │  - User Approvals   │
              └─────────────────────┘
                           │
                           ▼
              ┌─────────────────────┐
              │   Training System   │
              │  - Model Retraining │
              │  - A/B Experiments  │
              │  - Data Pipelines   │
              └─────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (4-6 weeks)

**Goal**: Establish monitoring and audit infrastructure

#### 1.1 System Health Monitoring
**New Files**:
- `src/lib/server/domains/payees/health-monitor.ts`
- `src/routes/admin/ml-system/+page.svelte`
- `src/routes/admin/ml-system/+page.server.ts`

**Implementation**:
```typescript
// health-monitor.ts
export class MLHealthMonitor {
  async getSystemHealth(): Promise<MLSystemHealth> {
    return {
      overall: {
        status: await this.calculateOverallStatus(),
        score: await this.calculateHealthScore(),
        lastCheck: new Date().toISOString()
      },
      systems: await this.getSystemStatuses(),
      alerts: await this.getActiveAlerts(),
      trends: await this.analyzeTrends(),
      recommendations: await this.generateRecommendations()
    };
  }

  private async calculateHealthScore(): Promise<number> {
    const intelligence = await this.intelligenceService.getMetrics();
    const learning = await this.learningService.getMetrics();
    const budget = await this.budgetService.getMetrics();

    // Weighted average of accuracy, error rate, response time
    return (intelligence.accuracy * 0.4 +
            learning.accuracy * 0.3 +
            budget.accuracy * 0.3) * 100;
  }
}
```

**Dashboard UI**:
```svelte
<!-- +page.svelte -->
<script lang="ts">
  import type { MLSystemHealth } from '$lib/server/domains/payees';
  export let data: { health: MLSystemHealth };
</script>

<div class="ml-dashboard">
  <HealthScore score={data.health.overall.score} />
  <SystemStatusGrid systems={data.health.systems} />
  <AlertPanel alerts={data.health.alerts} />
  <TrendCharts trends={data.health.trends} />
</div>
```

**Database Schema**:
```sql
-- ML system metrics table
CREATE TABLE ml_system_metrics (
  id INTEGER PRIMARY KEY,
  system TEXT NOT NULL, -- 'intelligence' | 'learning' | 'budget_allocation'
  timestamp TEXT NOT NULL,
  accuracy REAL,
  error_rate REAL,
  response_time_ms INTEGER,
  predictions_made INTEGER,
  confidence_avg REAL
);

-- Create indexes
CREATE INDEX idx_ml_metrics_system_time ON ml_system_metrics(system, timestamp);
```

**Deliverables**:
- ✅ Real-time health dashboard
- ✅ System status tracking
- ✅ Basic alerting (email/UI notifications)
- ✅ Historical metrics storage (30 days)

---

#### 1.2 Audit Logging System
**New Files**:
- `src/lib/server/domains/payees/audit-logger.ts`
- `src/routes/admin/ml-audit/+page.svelte`

**Implementation**:
```typescript
// audit-logger.ts
export class MLAuditLogger {
  async logPrediction(log: Omit<MLAuditLog, 'id'>): Promise<void> {
    await db.insert(mlAuditLogs).values({
      ...log,
      id: generateId(),
      timestamp: new Date().toISOString()
    });
  }

  async searchAuditLogs(filters: {
    system?: string;
    payeeId?: number;
    startDate?: string;
    endDate?: string;
    minConfidence?: number;
  }): Promise<MLAuditLog[]> {
    // Query with filters
  }
}
```

**Database Schema**:
```sql
CREATE TABLE ml_audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  system TEXT NOT NULL,
  action TEXT NOT NULL,
  payee_id INTEGER,
  input_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  confidence REAL NOT NULL,
  model_version TEXT NOT NULL,
  user_accepted BOOLEAN,
  user_corrected BOOLEAN,
  user_feedback TEXT,
  execution_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error TEXT
);

CREATE INDEX idx_ml_audit_system ON ml_audit_logs(system, timestamp);
CREATE INDEX idx_ml_audit_payee ON ml_audit_logs(payee_id, timestamp);
```

**Deliverables**:
- ✅ Complete audit trail for all ML decisions
- ✅ Searchable audit log UI
- ✅ User feedback tracking
- ✅ Compliance reporting

---

### Phase 2: Automation Engine (6-8 weeks)

**Goal**: Enable rule-based automation of ML recommendations

#### 2.1 Automation Rules
**New Files**:
- `src/lib/server/domains/payees/automation-engine.ts`
- `src/lib/server/domains/payees/automation-rules.ts`
- `src/routes/admin/automation-rules/+page.svelte`

**Implementation**:
```typescript
// automation-engine.ts
export class AutomationEngine {
  private rules: MLAutomationRule[] = [];

  async evaluateAndExecute(
    prediction: any,
    context: { payeeId: number; confidence: number }
  ): Promise<{ applied: boolean; ruleName?: string }> {

    const applicableRules = this.rules.filter(rule =>
      rule.isActive &&
      this.meetsConditions(rule, prediction, context)
    );

    for (const rule of applicableRules) {
      if (rule.actions.autoApply) {
        await this.applyAutomation(rule, prediction);
        await this.auditLogger.logPrediction({
          system: 'automation',
          action: 'automation',
          payeeId: context.payeeId,
          input: { rule: rule.name, prediction },
          output: { applied: true },
          confidence: context.confidence,
          modelVersion: 'automation-v1',
          success: true,
          executionTime: 0
        });
        return { applied: true, ruleName: rule.name };
      } else if (rule.actions.requiresApproval) {
        await this.createApprovalRequest(rule, prediction);
      }
    }

    return { applied: false };
  }

  private meetsConditions(
    rule: MLAutomationRule,
    prediction: any,
    context: { confidence: number }
  ): boolean {
    // Check confidence threshold
    if (context.confidence < rule.conditions.confidenceThreshold) {
      return false;
    }

    // Check minimum data points
    if (prediction.dataPoints < rule.conditions.minimumDataPoints) {
      return false;
    }

    // Check agreement if required
    if (rule.conditions.agreementRequired) {
      const agreement = this.calculateAgreement(prediction);
      if (agreement < 0.8) return false;
    }

    return true;
  }
}
```

**Example Rules**:
```typescript
const autoCategorizationRule: MLAutomationRule = {
  id: 'auto-categorize-high-confidence',
  name: 'Auto-Categorize High Confidence',
  description: 'Automatically apply category suggestions with >90% confidence',
  type: 'category',
  conditions: {
    confidenceThreshold: 0.90,
    minimumDataPoints: 5,
    agreementRequired: true,
    riskTolerance: 0.1
  },
  actions: {
    autoApply: true,
    requiresApproval: false,
    notifyUser: true,
    logDecision: true
  },
  monitoring: {
    trackPerformance: true,
    alertOnFailure: true,
    reviewPeriodDays: 30
  },
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z'
};
```

**Database Schema**:
```sql
CREATE TABLE ml_automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  conditions_json TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  monitoring_json TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT NOT NULL,
  last_triggered TEXT
);

CREATE TABLE ml_automation_executions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  payee_id INTEGER,
  timestamp TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  prediction_json TEXT,
  error TEXT,
  FOREIGN KEY (rule_id) REFERENCES ml_automation_rules(id)
);
```

**Deliverables**:
- ✅ Rule builder UI
- ✅ Auto-categorization rules
- ✅ Auto-budget adjustment rules
- ✅ Approval workflow for risky actions
- ✅ Rule performance tracking

---

#### 2.2 Prediction Explainability
**Implementation**:
```typescript
// Add to intelligence.ts, category-learning.ts, budget-allocation.ts
async predictWithExplanation(payeeId: number): Promise<{
  prediction: CategoryRecommendation;
  explanation: MLPredictionExplanation;
}> {
  const prediction = await this.predict(payeeId);
  const history = await this.getTransactionHistory(payeeId);

  return {
    prediction,
    explanation: {
      prediction: prediction.categoryId,
      confidence: prediction.confidence,
      mainFactors: [
        {
          factor: 'Historical Pattern',
          contribution: 0.45,
          evidence: `Used category "${prediction.categoryName}" in 90% of ${history.length} transactions`
        },
        {
          factor: 'Amount Range',
          contribution: 0.30,
          evidence: `$${prediction.avgAmount} matches typical spending for this category`
        },
        {
          factor: 'Temporal Pattern',
          contribution: 0.15,
          evidence: `Mid-month timing aligns with category pattern`
        },
        {
          factor: 'Merchant Name',
          contribution: 0.10,
          evidence: `Merchant name contains category keywords`
        }
      ],
      alternatives: [
        {
          prediction: 'Dining',
          probability: 0.08,
          reason: 'Similar amount range but different frequency pattern'
        }
      ],
      uncertaintySource: [
        history.length < 10 ? 'Limited transaction history' : null,
        prediction.confidence < 0.7 ? 'Multiple plausible categories' : null
      ].filter(Boolean) as string[],
      recommendedAction: prediction.confidence > 0.9
        ? 'Apply automatically with high confidence'
        : 'Review before applying'
    }
  };
}
```

**UI Component**:
```svelte
<!-- ExplanationPanel.svelte -->
<script lang="ts">
  import type { MLPredictionExplanation } from '$lib/server/domains/payees';
  export let explanation: MLPredictionExplanation;
</script>

<div class="explanation-panel">
  <h3>Why this prediction?</h3>
  <ConfidenceMeter value={explanation.confidence} />

  <div class="factors">
    {#each explanation.mainFactors as factor}
      <FactorCard
        name={factor.factor}
        contribution={factor.contribution}
        evidence={factor.evidence}
      />
    {/each}
  </div>

  {#if explanation.alternatives.length > 0}
    <div class="alternatives">
      <h4>Alternative predictions</h4>
      {#each explanation.alternatives as alt}
        <AlternativeOption option={alt} />
      {/each}
    </div>
  {/if}

  {#if explanation.uncertaintySource.length > 0}
    <div class="uncertainty">
      <h4>Uncertainty factors</h4>
      <ul>
        {#each explanation.uncertaintySource as source}
          <li>{source}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
```

**Deliverables**:
- ✅ Explain every prediction
- ✅ Show factor contributions
- ✅ Display alternatives
- ✅ Highlight uncertainty sources
- ✅ User-friendly explanations

---

### Phase 3: Model Management (8-10 weeks)

**Goal**: Enable model training, versioning, and experimentation

#### 3.1 Training System
**New Files**:
- `src/lib/server/domains/payees/training-service.ts`
- `src/lib/server/cron/ml-training-jobs.ts`

**Implementation**:
```typescript
// training-service.ts
export class ModelTrainingService {
  async trainModel(config: {
    modelType: 'category_classifier' | 'budget_predictor';
    dataRange: { start: string; end: string };
  }): Promise<MLTrainingJob> {
    const job: MLTrainingJob = {
      id: generateId(),
      modelType: config.modelType,
      status: 'queued',
      progress: 0,
      datasetSize: 0,
      epochs: 10,
      metrics: {},
      artifacts: [],
      logs: []
    };

    // Background processing
    this.processTrainingJob(job, config);

    return job;
  }

  private async processTrainingJob(
    job: MLTrainingJob,
    config: any
  ): Promise<void> {
    try {
      job.status = 'running';
      job.startedAt = new Date().toISOString();

      // 1. Extract training data
      const data = await this.extractTrainingData(config.dataRange);
      job.datasetSize = data.length;
      job.logs.push(`Extracted ${data.length} training samples`);

      // 2. Split into train/val/test
      const [train, val, test] = this.splitDataset(data, [0.7, 0.15, 0.15]);

      // 3. Train model
      for (let epoch = 0; epoch < job.epochs; epoch++) {
        job.currentEpoch = epoch;
        const metrics = await this.trainEpoch(train, val);
        job.metrics = { ...job.metrics, [`epoch_${epoch}`]: metrics };
        job.progress = (epoch + 1) / job.epochs;
        job.logs.push(`Epoch ${epoch}: accuracy=${metrics.accuracy}`);
      }

      // 4. Evaluate on test set
      const testMetrics = await this.evaluate(test);
      job.metrics.test = testMetrics;

      // 5. Save model artifacts
      const artifact = await this.saveModel(job.modelType, testMetrics);
      job.artifacts.push(artifact);

      job.status = 'completed';
      job.completedAt = new Date().toISOString();
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }

    await this.saveTrainingJob(job);
  }
}
```

**Cron Job**:
```typescript
// ml-training-jobs.ts
import { CronJob } from 'cron';

// Retrain models weekly on Sunday at 2 AM
export const weeklyRetraining = new CronJob(
  '0 2 * * 0',
  async () => {
    const trainingService = new ModelTrainingService();

    // Check if retraining is needed
    const health = await healthMonitor.getSystemHealth();

    if (health.trends.accuracyTrend === 'declining') {
      logger.info('Accuracy declining, triggering retraining');

      await trainingService.trainModel({
        modelType: 'category_classifier',
        dataRange: {
          start: getDateNDaysAgo(90),
          end: getCurrentDate()
        }
      });
    }
  },
  null,
  true,
  'America/New_York'
);
```

**Deliverables**:
- ✅ Automated weekly retraining
- ✅ Training job queue and progress tracking
- ✅ Model versioning and artifact storage
- ✅ Performance comparison across versions

---

#### 3.2 A/B Experimentation
**Implementation**:
```typescript
// experimentation-service.ts
export class ExperimentationService {
  async createExperiment(params: {
    name: string;
    hypothesis: string;
    baselineModelId: string;
    experimentalConfig: any;
  }): Promise<MLExperiment> {
    const experiment: MLExperiment = {
      id: generateId(),
      name: params.name,
      description: `Testing: ${params.hypothesis}`,
      hypothesis: params.hypothesis,
      parameters: params.experimentalConfig,
      results: {
        baseline: await this.getModelMetadata(params.baselineModelId),
        experiment: {} as MLModelMetadata,
        improvement: 0,
        significance: 0,
        recommendation: 'continue_testing'
      },
      status: 'running',
      startDate: new Date().toISOString(),
      conclusions: []
    };

    // Train experimental model
    const expModel = await this.trainingService.trainModel({
      modelType: 'category_classifier',
      ...params.experimentalConfig
    });

    // Run A/B test on held-out data
    const testResults = await this.runABTest(
      params.baselineModelId,
      expModel.id
    );

    // Statistical significance test
    const significance = this.tTest(
      testResults.baselineAccuracy,
      testResults.experimentAccuracy
    );

    experiment.results.experiment = expModel.metadata;
    experiment.results.improvement = testResults.improvement;
    experiment.results.significance = significance;

    if (significance > 0.95 && testResults.improvement > 0.05) {
      experiment.results.recommendation = 'adopt';
      experiment.conclusions.push('Experimental model shows significant improvement');
    } else if (testResults.improvement < 0) {
      experiment.results.recommendation = 'reject';
      experiment.conclusions.push('Baseline model performs better');
    }

    experiment.status = 'completed';
    experiment.endDate = new Date().toISOString();

    return experiment;
  }
}
```

**Deliverables**:
- ✅ A/B test framework
- ✅ Statistical significance testing
- ✅ Experiment tracking and results
- ✅ Easy rollback to baseline

---

### Phase 4: Advanced Features (10-12 weeks)

#### 4.1 Data Quality Monitoring
**Implementation**:
```typescript
// data-quality-monitor.ts
export class DataQualityMonitor {
  async generateReport(): Promise<MLDataQualityReport> {
    return {
      overallScore: await this.calculateQualityScore(),
      issues: await this.detectIssues(),
      recommendations: await this.generateRecommendations(),
      trends: await this.analyzeTrends(),
      dataCoverage: await this.assessCoverage()
    };
  }

  private async detectIssues(): Promise<DataQualityIssue[]> {
    const issues: DataQualityIssue[] = [];

    // Check for missing data
    const missingCategories = await this.findMissingCategories();
    if (missingCategories.length > 0) {
      issues.push({
        type: 'missing_data',
        severity: 'high',
        description: `${missingCategories.length} transactions without categories`,
        affectedRecords: missingCategories.length,
        mitigation: 'Run category suggestion batch job'
      });
    }

    // Check for data drift
    const drift = await this.detectCategoryDrift();
    if (drift.driftMagnitude > 0.3) {
      issues.push({
        type: 'category_drift',
        severity: 'medium',
        description: 'Significant change in category distribution detected',
        affectedRecords: drift.affectedTransactions,
        mitigation: 'Consider retraining models'
      });
    }

    // Check for outliers
    const outliers = await this.detectOutliers();
    if (outliers.length > 100) {
      issues.push({
        type: 'outliers',
        severity: 'low',
        description: `${outliers.length} anomalous transactions detected`,
        affectedRecords: outliers.length,
        mitigation: 'Review and potentially exclude from training'
      });
    }

    return issues;
  }
}
```

**Deliverables**:
- ✅ Data quality dashboard
- ✅ Drift detection
- ✅ Outlier identification
- ✅ Data completeness tracking

---

#### 4.2 Feature Importance Analysis
**Implementation**:
```typescript
// feature-analysis.ts
export class FeatureAnalysisService {
  async getFeatureImportance(
    modelId: string
  ): Promise<MLFeatureImportance[]> {
    const model = await this.loadModel(modelId);

    // Calculate SHAP values or permutation importance
    const importance = await this.calculateImportance(model);

    return [
      {
        feature: 'transaction_amount',
        importance: 0.35,
        category: 'transaction_amount',
        description: 'Transaction amount in dollars',
        stability: 0.92
      },
      {
        feature: 'day_of_month',
        importance: 0.25,
        category: 'seasonal',
        description: 'Day of the month (1-31)',
        stability: 0.88
      },
      {
        feature: 'payee_frequency',
        importance: 0.20,
        category: 'frequency',
        description: 'How often payee is used',
        stability: 0.85
      },
      {
        feature: 'previous_category',
        importance: 0.15,
        category: 'behavioral',
        description: 'Last category used for this payee',
        stability: 0.95
      },
      {
        feature: 'merchant_keywords',
        importance: 0.05,
        category: 'contextual',
        description: 'Keywords extracted from merchant name',
        stability: 0.70
      }
    ];
  }
}
```

**Deliverables**:
- ✅ Feature importance visualization
- ✅ Feature stability tracking
- ✅ User-facing explanations of what drives predictions

---

## Database Schema (Complete)

```sql
-- System health metrics
CREATE TABLE ml_system_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  system TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  accuracy REAL,
  error_rate REAL,
  response_time_ms INTEGER,
  predictions_made INTEGER,
  confidence_avg REAL,
  data_quality_score REAL
);

-- Audit logs
CREATE TABLE ml_audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  system TEXT NOT NULL,
  action TEXT NOT NULL,
  payee_id INTEGER,
  input_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  confidence REAL NOT NULL,
  model_version TEXT NOT NULL,
  user_accepted BOOLEAN,
  user_corrected BOOLEAN,
  user_feedback TEXT,
  explanation_json TEXT,
  execution_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error TEXT,
  FOREIGN KEY (payee_id) REFERENCES payees(id)
);

-- Automation rules
CREATE TABLE ml_automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  conditions_json TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  monitoring_json TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_triggered TEXT
);

-- Automation executions
CREATE TABLE ml_automation_executions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  payee_id INTEGER,
  timestamp TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  prediction_json TEXT,
  error TEXT,
  FOREIGN KEY (rule_id) REFERENCES ml_automation_rules(id),
  FOREIGN KEY (payee_id) REFERENCES payees(id)
);

-- Training jobs
CREATE TABLE ml_training_jobs (
  id TEXT PRIMARY KEY,
  model_type TEXT NOT NULL,
  status TEXT NOT NULL,
  progress REAL DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  dataset_size INTEGER,
  epochs INTEGER,
  current_epoch INTEGER,
  metrics_json TEXT,
  artifacts_json TEXT,
  logs_json TEXT,
  error TEXT
);

-- Model metadata
CREATE TABLE ml_models (
  id TEXT PRIMARY KEY,
  model_type TEXT NOT NULL,
  version TEXT NOT NULL,
  training_date TEXT NOT NULL,
  features_json TEXT NOT NULL,
  target_variable TEXT NOT NULL,
  performance_json TEXT NOT NULL,
  hyperparameters_json TEXT NOT NULL,
  dataset_size_json TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TEXT NOT NULL
);

-- Experiments
CREATE TABLE ml_experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT NOT NULL,
  parameters_json TEXT NOT NULL,
  results_json TEXT,
  status TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  conclusions_json TEXT,
  created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_ml_metrics_system_time ON ml_system_metrics(system, timestamp);
CREATE INDEX idx_ml_audit_system ON ml_audit_logs(system, timestamp);
CREATE INDEX idx_ml_audit_payee ON ml_audit_logs(payee_id, timestamp);
CREATE INDEX idx_ml_rules_active ON ml_automation_rules(is_active);
CREATE INDEX idx_ml_executions_rule ON ml_automation_executions(rule_id, timestamp);
CREATE INDEX idx_ml_jobs_status ON ml_training_jobs(status, started_at);
CREATE INDEX idx_ml_models_active ON ml_models(is_active, model_type);
```

---

## API Endpoints (tRPC Routes)

```typescript
// src/lib/trpc/routes/ml-system.ts
export const mlSystemRouter = t.router({
  // Health & Monitoring
  getSystemHealth: publicProcedure.query(async () => {
    return await healthMonitor.getSystemHealth();
  }),

  getSystemStatus: publicProcedure
    .input(z.object({ system: z.enum(['intelligence', 'learning', 'budget_allocation']) }))
    .query(async ({ input }) => {
      return await healthMonitor.getSystemStatus(input.system);
    }),

  // Audit Logs
  searchAuditLogs: publicProcedure
    .input(z.object({
      system: z.string().optional(),
      payeeId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      minConfidence: z.number().optional()
    }))
    .query(async ({ input }) => {
      return await auditLogger.searchAuditLogs(input);
    }),

  // Automation Rules
  listAutomationRules: publicProcedure.query(async () => {
    return await automationEngine.listRules();
  }),

  createAutomationRule: publicProcedure
    .input(automationRuleSchema)
    .mutation(async ({ input }) => {
      return await automationEngine.createRule(input);
    }),

  updateAutomationRule: publicProcedure
    .input(z.object({
      id: z.string(),
      updates: automationRuleSchema.partial()
    }))
    .mutation(async ({ input }) => {
      return await automationEngine.updateRule(input.id, input.updates);
    }),

  toggleAutomationRule: publicProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      return await automationEngine.toggleRule(input.id, input.isActive);
    }),

  // Training & Experimentation
  listTrainingJobs: publicProcedure.query(async () => {
    return await trainingService.listJobs();
  }),

  startTrainingJob: publicProcedure
    .input(z.object({
      modelType: z.enum(['category_classifier', 'budget_predictor']),
      dataRange: z.object({
        start: z.string(),
        end: z.string()
      })
    }))
    .mutation(async ({ input }) => {
      return await trainingService.trainModel(input);
    }),

  getTrainingJobStatus: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      return await trainingService.getJobStatus(input.jobId);
    }),

  listExperiments: publicProcedure.query(async () => {
    return await experimentationService.listExperiments();
  }),

  createExperiment: publicProcedure
    .input(experimentSchema)
    .mutation(async ({ input }) => {
      return await experimentationService.createExperiment(input);
    }),

  // Model Management
  listModels: publicProcedure.query(async () => {
    return await modelManager.listModels();
  }),

  activateModel: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .mutation(async ({ input }) => {
      return await modelManager.activateModel(input.modelId);
    }),

  getFeatureImportance: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .query(async ({ input }) => {
      return await featureAnalysis.getFeatureImportance(input.modelId);
    }),

  // Data Quality
  getDataQualityReport: publicProcedure.query(async () => {
    return await dataQualityMonitor.generateReport();
  })
});
```

---

## UI Routes

```
/admin/ml-system              - Main dashboard (health, metrics, alerts)
/admin/ml-system/audit        - Audit log viewer with search
/admin/ml-system/rules        - Automation rules configuration
/admin/ml-system/training     - Training jobs and model management
/admin/ml-system/experiments  - A/B testing and experiments
/admin/ml-system/data-quality - Data quality reports
/admin/ml-system/settings     - System configuration
```

---

## Estimated Effort

| Phase | Duration | Team Size | Complexity |
|-------|----------|-----------|------------|
| Phase 1: Foundation | 4-6 weeks | 1 dev | Medium |
| Phase 2: Automation | 6-8 weeks | 1-2 devs | High |
| Phase 3: Model Management | 8-10 weeks | 2 devs | High |
| Phase 4: Advanced Features | 10-12 weeks | 2 devs | Very High |
| **Total** | **28-36 weeks** | **1-2 devs** | **High** |

**Prerequisites**:
- Understanding of ML concepts
- Experience with model training pipelines
- Database design expertise
- UI/UX for complex dashboards
- Statistical analysis knowledge

---

## Alternative Approaches

### Option 1: Third-Party ML Platform
Instead of building, integrate with existing platforms:
- **Snowplow** for event tracking
- **MLflow** for model management
- **Evidently AI** for monitoring
- **Great Expectations** for data quality

**Pros**: Faster, battle-tested, feature-rich
**Cons**: External dependencies, cost, limited customization

### Option 2: Minimal Implementation
Implement only the most valuable features:
- ✅ Basic health monitoring (Phase 1.1)
- ✅ Audit logging (Phase 1.2)
- ✅ One automation rule: auto-categorize at >90% confidence
- ❌ Skip training, experiments, advanced features

**Pros**: 4-6 weeks vs 28-36 weeks
**Cons**: Limited value, no continuous improvement

### Option 3: Wait for Real Need
Keep current simple ML coordinator until:
- User feedback requests automation
- Scale requires better monitoring
- Compliance demands audit trails

**Pros**: Don't build what you don't need
**Cons**: Technical debt if implemented later

---

## Recommendation

**Current Recommendation**: **Option 3 (Wait)**

**Rationale**:
1. Current ML system works for basic recommendations
2. No user feedback requesting automation
3. No compliance requirements for audit trails
4. 28-36 week investment not justified by current need
5. Can implement Phase 1 (monitoring) if scaling issues arise

**When to Revisit**:
- User base > 1000 active users
- >100 ML decisions per day
- Users request "auto-categorize" feature
- Accuracy degrades and needs monitoring
- Compliance audit requires ML decision tracking

---

## Conclusion

The `ml-types.ts` file represents an ambitious vision for enterprise-grade ML infrastructure. While comprehensive and well-designed, it's currently premature for the application's maturity level.

**Preserve this document** as a reference for future implementation when business needs justify the significant engineering investment.

**Branch**: `feature/ml-system-future` (types preserved for reference)
**Status**: Not currently on roadmap
**Review Date**: Q2 2026 or when user base reaches 1000+ active users
