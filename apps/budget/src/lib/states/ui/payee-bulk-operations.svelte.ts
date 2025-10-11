import { getContext, setContext } from "svelte";
import { SvelteSet } from "svelte/reactivity";
import type { Payee } from "$lib/schema/payees";

const KEY = Symbol("payee-bulk-operations");

export interface BulkOperationResult {
  payeeId: number;
  success: boolean;
  error?: string;
  details?: any;
}

export interface BulkOperationProgress {
  operation: string;
  total: number;
  completed: number;
  failed: number;
  results: BulkOperationResult[];
  isRunning: boolean;
  startTime?: Date;
  endTime?: Date;
}

export interface UndoOperation {
  id: string;
  operationType: string;
  payeeIds: number[];
  originalData: Record<number, any>;
  timestamp: Date;
  description: string;
}

export class PayeeBulkOperationsState {
  // Selection state
  selectedPayeeIds = $state(new SvelteSet<number>()) as SvelteSet<number>;
  isSelectAllMode = $state(false);
  isSelectAllFilteredMode = $state(false);

  // Operation state
  currentOperation = $state<BulkOperationProgress | null>(null);
  isOperationRunning = $state(false);

  // Undo stack
  undoStack = $state<UndoOperation[]>([]);
  maxUndoOperations = 10;

  // Clipboard for copy/paste operations
  clipboard = $state<{payeeIds: number[], operation: 'copy' | 'cut' | null}>({
    payeeIds: [],
    operation: null
  });

  // Keyboard shortcuts state
  ctrlPressed = $state(false);
  shiftPressed = $state(false);
  lastSelectedId = $state<number | null>(null);

  constructor() {
    this.initializeKeyboardHandlers();
  }

  // Context management
  static get() {
    return getContext<PayeeBulkOperationsState>(KEY);
  }

  static set() {
    return setContext(KEY, new PayeeBulkOperationsState());
  }

  // Selection management
  get selectedCount(): number {
    return this.selectedPayeeIds.size;
  }

  get hasSelection(): boolean {
    return this.selectedPayeeIds.size > 0;
  }

  get selectedPayeeIdsArray(): number[] {
    return Array.from(this.selectedPayeeIds);
  }

  isSelected(payeeId: number): boolean {
    return this.selectedPayeeIds.has(payeeId);
  }

  selectPayee(payeeId: number, extend = false) {
    if (extend && this.shiftPressed && this.lastSelectedId) {
      // Range selection
      this.selectRange(this.lastSelectedId, payeeId);
    } else if (extend && this.ctrlPressed) {
      // Toggle selection
      this.togglePayee(payeeId);
    } else {
      // Single selection (clear others)
      this.clearSelection();
      this.selectedPayeeIds.add(payeeId);
    }
    this.lastSelectedId = payeeId;
  }

  togglePayee(payeeId: number) {
    if (this.selectedPayeeIds.has(payeeId)) {
      this.selectedPayeeIds.delete(payeeId);
    } else {
      this.selectedPayeeIds.add(payeeId);
    }
    this.lastSelectedId = payeeId;
  }

  selectRange(startId: number, endId: number) {
    // This would need payee list order to implement properly
    // For now, just select both
    this.selectedPayeeIds.add(startId);
    this.selectedPayeeIds.add(endId);
  }

  selectAll(payeeIds: number[]) {
    this.clearSelection();
    payeeIds.forEach(id => this.selectedPayeeIds.add(id));
    this.isSelectAllMode = true;
  }

  selectAllFiltered(payeeIds: number[]) {
    this.clearSelection();
    payeeIds.forEach(id => this.selectedPayeeIds.add(id));
    this.isSelectAllFilteredMode = true;
  }

  clearSelection() {
    this.selectedPayeeIds.clear();
    this.isSelectAllMode = false;
    this.isSelectAllFilteredMode = false;
    this.lastSelectedId = null;
  }

  invertSelection(allPayeeIds: number[]) {
    const newSelection = new SvelteSet<number>();
    allPayeeIds.forEach(id => {
      if (!this.selectedPayeeIds.has(id)) {
        newSelection.add(id);
      }
    });
    this.selectedPayeeIds = newSelection;
  }

  // Operation management
  startOperation(operationType: string, total: number): string {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.currentOperation = {
      operation: operationType,
      total,
      completed: 0,
      failed: 0,
      results: [],
      isRunning: true,
      startTime: new Date()
    };

    this.isOperationRunning = true;
    return operationId;
  }

  updateOperationProgress(result: BulkOperationResult) {
    if (!this.currentOperation) return;

    this.currentOperation.results.push(result);
    if (result.success) {
      this.currentOperation.completed++;
    } else {
      this.currentOperation.failed++;
    }
  }

  completeOperation() {
    if (!this.currentOperation) return;

    this.currentOperation.isRunning = false;
    this.currentOperation.endTime = new Date();
    this.isOperationRunning = false;
  }

  cancelOperation() {
    if (this.currentOperation) {
      this.currentOperation.isRunning = false;
      this.currentOperation.endTime = new Date();
    }
    this.isOperationRunning = false;
  }

  clearOperationResults() {
    this.currentOperation = null;
  }

  // Undo operations
  addUndoOperation(
    operationType: string,
    payeeIds: number[],
    originalData: Record<number, any>,
    description: string
  ) {
    const undoOp: UndoOperation = {
      id: `undo_${Date.now()}`,
      operationType,
      payeeIds,
      originalData,
      timestamp: new Date(),
      description
    };

    this.undoStack.unshift(undoOp);

    // Limit undo stack size
    if (this.undoStack.length > this.maxUndoOperations) {
      this.undoStack = this.undoStack.slice(0, this.maxUndoOperations);
    }
  }

  getLatestUndoOperation(): UndoOperation | null {
    return this.undoStack.length > 0 ? (this.undoStack[0] ?? null) : null;
  }

  removeUndoOperation(operationId: string) {
    const index = this.undoStack.findIndex(op => op.id === operationId);
    if (index !== -1) {
      this.undoStack.splice(index, 1);
    }
  }

  clearUndoStack() {
    this.undoStack = [];
  }

  // Clipboard operations
  copyPayees(payeeIds: number[]) {
    this.clipboard = {
      payeeIds: [...payeeIds],
      operation: 'copy'
    };
  }

  cutPayees(payeeIds: number[]) {
    this.clipboard = {
      payeeIds: [...payeeIds],
      operation: 'cut'
    };
  }

  clearClipboard() {
    this.clipboard = {
      payeeIds: [],
      operation: null
    };
  }

  get hasClipboard(): boolean {
    return this.clipboard.payeeIds.length > 0 && this.clipboard.operation !== null;
  }

  // Keyboard shortcuts
  private initializeKeyboardHandlers() {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      this.ctrlPressed = e.ctrlKey || e.metaKey;
      this.shiftPressed = e.shiftKey;

      // Global shortcuts
      if (this.ctrlPressed) {
        switch (e.key.toLowerCase()) {
          case 'a':
            if (this.hasSelection) {
              e.preventDefault();
              // This would need to be connected to the current filtered payees
              // Will be implemented in the component layer
            }
            break;
          case 'c':
            if (this.hasSelection) {
              e.preventDefault();
              this.copyPayees(this.selectedPayeeIdsArray);
            }
            break;
          case 'x':
            if (this.hasSelection) {
              e.preventDefault();
              this.cutPayees(this.selectedPayeeIdsArray);
            }
            break;
          case 'z':
            e.preventDefault();
            // Undo operation - will be implemented in components
            break;
        }
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        this.clearSelection();
      }

      // Delete key for bulk delete
      if (e.key === 'Delete' && this.hasSelection) {
        e.preventDefault();
        // Trigger bulk delete - will be implemented in components
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      this.ctrlPressed = e.ctrlKey || e.metaKey;
      this.shiftPressed = e.shiftKey;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Cleanup is handled by Svelte's lifecycle
  }

  // Utility methods
  getOperationSummary(): string {
    if (!this.currentOperation) return '';

    const { operation, total, completed, failed } = this.currentOperation;
    const inProgress = total - completed - failed;

    if (this.currentOperation.isRunning) {
      return `${operation}: ${completed}/${total} completed${failed > 0 ? `, ${failed} failed` : ''}`;
    } else {
      return `${operation} completed: ${completed} success${failed > 0 ? `, ${failed} failed` : ''}`;
    }
  }

  getEstimatedTimeRemaining(): number | null {
    if (!this.currentOperation?.isRunning || !this.currentOperation.startTime) return null;

    const { completed, total, startTime } = this.currentOperation;
    if (completed === 0) return null;

    const elapsed = Date.now() - startTime.getTime();
    const avgTimePerItem = elapsed / completed;
    const remaining = total - completed;

    return remaining * avgTimePerItem;
  }

  // Filter helpers for operation validation
  getValidPayeesForOperation(
    allPayees: Payee[],
    operationType: 'delete' | 'activate' | 'deactivate' | 'assign_category' | 'assign_budget'
  ): number[] {
    const selectedPayees = allPayees.filter(p => this.isSelected(p.id));

    switch (operationType) {
      case 'delete':
        // Can delete any payee
        return selectedPayees.map(p => p.id);

      case 'activate':
        // Can only activate inactive payees
        return selectedPayees.filter(p => !p.isActive).map(p => p.id);

      case 'deactivate':
        // Can only deactivate active payees
        return selectedPayees.filter(p => p.isActive).map(p => p.id);

      case 'assign_category':
      case 'assign_budget':
        // Can assign to any payee
        return selectedPayees.map(p => p.id);

      default:
        return selectedPayees.map(p => p.id);
    }
  }
}