import { publicProcedure, rateLimitedProcedure, t } from "$core/trpc";
import { withErrorHandler } from "$core/trpc/shared/errors";
import { ProductRepository } from "$core/server/domains/price-watcher/product-repository";
import { HistoryRepository } from "$core/server/domains/price-watcher/history-repository";
import { AlertRepository } from "$core/server/domains/price-watcher/alert-repository";
import { ProductService } from "$core/server/domains/price-watcher/product-service";
import { AlertService } from "$core/server/domains/price-watcher/alert-service";
import { z } from "zod";

// Lazy service instantiation (singletons, consistent with serviceFactory pattern)
let _productService: ProductService | null = null;
let _alertService: AlertService | null = null;
let _historyRepo: HistoryRepository | null = null;

function init() {
  if (!_productService) {
    const productRepo = new ProductRepository();
    _historyRepo = new HistoryRepository();
    const alertRepo = new AlertRepository();
    _alertService = new AlertService(alertRepo);
    _productService = new ProductService(productRepo, _historyRepo, _alertService);
  }
}

function getProductService(): ProductService {
  init();
  return _productService!;
}

function getAlertService(): AlertService {
  init();
  return _alertService!;
}

function getHistoryRepo(): HistoryRepository {
  init();
  return _historyRepo!;
}

// Zod schemas
const productFiltersSchema = z.object({
  status: z.enum(["active", "paused", "error"]).optional(),
  retailer: z.string().optional(),
});

const addProductSchema = z.object({
  url: z.string().min(1, "URL is required"),
  targetPrice: z.number().positive().optional(),
  checkInterval: z.number().int().min(1).max(168).optional(), // 1 hour to 1 week
});

const updateProductSchema = z.object({
  id: z.number().positive(),
  data: z.object({
    targetPrice: z.number().positive().nullable().optional(),
    checkInterval: z.number().int().min(1).max(168).optional(),
    status: z.enum(["active", "paused"]).optional(),
    notes: z.string().max(500).nullable().optional(),
    name: z.string().min(1).max(200).optional(),
  }),
});

const priceHistorySchema = z.object({
  productId: z.number().positive(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const createAlertSchema = z.object({
  productId: z.number().positive(),
  type: z.enum(["price_drop", "target_reached", "back_in_stock", "any_change"]),
  threshold: z.number().min(0).max(100).nullable().optional(),
  enabled: z.boolean().optional(),
});

const updateAlertSchema = z.object({
  id: z.number().positive(),
  data: z.object({
    type: z.enum(["price_drop", "target_reached", "back_in_stock", "any_change"]).optional(),
    threshold: z.number().min(0).max(100).nullable().optional(),
    enabled: z.boolean().optional(),
  }),
});

export const priceWatcherRoutes = t.router({
  // Products
  listProducts: publicProcedure
    .input(productFiltersSchema.optional())
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        getProductService().listProducts(ctx.workspaceId, input ?? undefined)
      )
    ),

  getProduct: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        getProductService().getProduct(input.slug, ctx.workspaceId)
      )
    ),

  addProduct: rateLimitedProcedure
    .input(addProductSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getProductService().addProduct(input.url, ctx.workspaceId, {
          targetPrice: input.targetPrice,
          checkInterval: input.checkInterval,
        })
      )
    ),

  updateProduct: rateLimitedProcedure
    .input(updateProductSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getProductService().updateProduct(input.id, input.data, ctx.workspaceId)
      )
    ),

  deleteProduct: rateLimitedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getProductService().deleteProduct(input.id, ctx.workspaceId)
      )
    ),

  // Price History
  getPriceHistory: publicProcedure
    .input(priceHistorySchema)
    .query(
      withErrorHandler(async ({ input }) =>
        getHistoryRepo().getHistory(input.productId, {
          from: input.dateFrom,
          to: input.dateTo,
        })
      )
    ),

  checkPriceNow: rateLimitedProcedure
    .input(z.object({ productId: z.number().positive() }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getProductService().checkPrice(input.productId, ctx.workspaceId)
      )
    ),

  checkPriceWithBrowser: rateLimitedProcedure
    .input(z.object({ productId: z.number().positive() }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getProductService().checkPrice(input.productId, ctx.workspaceId, { useBrowser: true })
      )
    ),

  // Alerts
  listAlerts: publicProcedure
    .input(z.object({ productId: z.number().positive().optional() }).optional())
    .query(
      withErrorHandler(async ({ input, ctx }) => {
        if (input?.productId) {
          return getAlertService().getAlertsByProduct(input.productId);
        }
        return getAlertService().getAllAlerts(ctx.workspaceId);
      })
    ),

  createAlert: rateLimitedProcedure
    .input(createAlertSchema)
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getAlertService().createAlert({
          productId: input.productId,
          workspaceId: ctx.workspaceId,
          type: input.type,
          threshold: input.threshold ?? null,
          enabled: input.enabled,
        })
      )
    ),

  updateAlert: rateLimitedProcedure
    .input(updateAlertSchema)
    .mutation(
      withErrorHandler(async ({ input }) =>
        getAlertService().updateAlert(input.id, input.data)
      )
    ),

  deleteAlert: rateLimitedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(
      withErrorHandler(async ({ input }) =>
        getAlertService().deleteAlert(input.id)
      )
    ),

  // Manual price entry
  logManualPrice: rateLimitedProcedure
    .input(
      z.object({
        productId: z.number().positive(),
        price: z.number().positive("Price must be positive"),
        inStock: z.boolean().optional(),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        const productService = getProductService();
        return productService.logManualPrice(
          input.productId,
          input.price,
          ctx.workspaceId,
          input.inStock
        );
      })
    ),
});
