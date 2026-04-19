import { budgetPinsRepository, type BudgetPinsRepository } from "./pins-repository";

/**
 * Thin service wrapper over the pins repository. Exists so the tRPC
 * layer has a single injectable entry point, mirroring the pattern used
 * by the rest of the budgets domain.
 */
export class BudgetPinsService {
  constructor(private readonly repository: BudgetPinsRepository = budgetPinsRepository) {}

  async listPinnedIds(workspaceId: number, userId: string): Promise<number[]> {
    return this.repository.listPinnedIds(workspaceId, userId);
  }

  /**
   * Flip the pin state for one budget. Returns the resulting state so
   * the UI can update optimistically without a follow-up read.
   */
  async togglePin(
    workspaceId: number,
    userId: string,
    budgetId: number,
  ): Promise<{ pinned: boolean }> {
    const removed = await this.repository.unpin(workspaceId, userId, budgetId);
    if (removed > 0) return { pinned: false };
    await this.repository.pin(workspaceId, userId, budgetId);
    return { pinned: true };
  }
}

export const budgetPinsService = new BudgetPinsService();
