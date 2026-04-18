import { ProductRepository } from "./product-repository";
import { HistoryRepository } from "./history-repository";
import { AlertRepository } from "./alert-repository";
import { ProductService } from "./product-service";
import { AlertService } from "./alert-service";
import { RetailerRepository } from "./retailer-repository";
import { RetailerService } from "./retailer-service";

export interface SchedulerResult {
  checked: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ productId: number; name: string; error: string }>;
}

const SAME_DOMAIN_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process all overdue price checks for a workspace.
 * Rate-limits requests to the same retailer domain.
 */
export async function processOverdueChecks(workspaceId: number): Promise<SchedulerResult> {
  const productRepo = new ProductRepository();
  const historyRepo = new HistoryRepository();
  const alertRepo = new AlertRepository();
  const retailerRepo = new RetailerRepository();
  const alertService = new AlertService(alertRepo);
  const retailerService = new RetailerService(retailerRepo);
  const productService = new ProductService(productRepo, historyRepo, alertService, retailerService);

  const overdueProducts = await productRepo.findDueForCheck(workspaceId);

  const result: SchedulerResult = {
    checked: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Group by retailer for rate limiting
  const byRetailer = new Map<string, typeof overdueProducts>();
  for (const product of overdueProducts) {
    // Skip products already in error status (need manual retry)
    if (product.status === "error") {
      result.skipped++;
      continue;
    }

    const group = byRetailer.get(product.retailer) ?? [];
    group.push(product);
    byRetailer.set(product.retailer, group);
  }

  // Process each retailer group with delay between same-domain requests
  for (const [retailer, products] of byRetailer) {
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      result.checked++;

      try {
        await productService.checkPrice(product.id, workspaceId);
        result.succeeded++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          productId: product.id,
          name: product.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Rate limit: delay between requests to the same retailer
      if (i < products.length - 1) {
        await sleep(SAME_DOMAIN_DELAY_MS);
      }
    }
  }

  return result;
}
