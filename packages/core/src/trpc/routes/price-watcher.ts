import { publicProcedure, rateLimitedProcedure, t } from "$core/trpc";
import { withErrorHandler } from "$core/trpc/shared/errors";
import { ProductRepository } from "$core/server/domains/price-watcher/product-repository";
import { HistoryRepository } from "$core/server/domains/price-watcher/history-repository";
import { AlertRepository } from "$core/server/domains/price-watcher/alert-repository";
import { ProductService } from "$core/server/domains/price-watcher/product-service";
import { AlertService } from "$core/server/domains/price-watcher/alert-service";
import { TagService } from "$core/server/domains/price-watcher/tag-service";
import { ListService } from "$core/server/domains/price-watcher/list-service";
import { RetailerRepository } from "$core/server/domains/price-watcher/retailer-repository";
import { RetailerService } from "$core/server/domains/price-watcher/retailer-service";
import { z } from "zod";

// Lazy service instantiation (singletons, consistent with serviceFactory pattern)
let _productService: ProductService | null = null;
let _alertService: AlertService | null = null;
let _historyRepo: HistoryRepository | null = null;
let _retailerService: RetailerService | null = null;

function init() {
  if (!_productService) {
    const productRepo = new ProductRepository();
    _historyRepo = new HistoryRepository();
    const alertRepo = new AlertRepository();
    const retailerRepo = new RetailerRepository();
    _alertService = new AlertService(alertRepo);
    _retailerService = new RetailerService(retailerRepo);
    _productService = new ProductService(productRepo, _historyRepo, _alertService, _retailerService);
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

function getRetailerService(): RetailerService {
  init();
  return _retailerService!;
}

let _tagService: TagService | null = null;
let _listService: ListService | null = null;

function getTagService(): TagService {
  if (!_tagService) _tagService = new TagService();
  return _tagService;
}

function getListService(): ListService {
  if (!_listService) _listService = new ListService();
  return _listService;
}

// Zod schemas
const productFiltersSchema = z.object({
  status: z.enum(["active", "paused", "error"]).optional(),
  retailer: z.string().optional(),
  retailerId: z.number().positive().optional(),
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

  previewUrl: rateLimitedProcedure
    .input(z.object({ url: z.string().min(1) }))
    .mutation(
      withErrorHandler(async ({ input }) =>
        getProductService().previewUrl(input.url)
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

  bulkDeleteProducts: rateLimitedProcedure
    .input(z.object({ ids: z.array(z.number().positive()).min(1).max(100) }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getProductService().bulkDeleteProducts(input.ids, ctx.workspaceId)
      )
    ),

  bulkUpdateStatus: rateLimitedProcedure
    .input(z.object({ ids: z.array(z.number().positive()).min(1).max(100), status: z.enum(["active", "paused"]) }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getProductService().bulkUpdateStatus(input.ids, input.status, ctx.workspaceId)
      )
    ),

  bulkCheckPrices: rateLimitedProcedure
    .input(z.object({ ids: z.array(z.number().positive()).min(1).max(20) }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getProductService().bulkCheckPrices(input.ids, ctx.workspaceId)
      )
    ),

  // Price History
  getPriceHistory: publicProcedure
    .input(priceHistorySchema)
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        getHistoryRepo().getHistory(input.productId, ctx.workspaceId, {
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

  refreshProductInfo: rateLimitedProcedure
    .input(z.object({ productId: z.number().positive() }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getProductService().refreshMetadata(input.productId, ctx.workspaceId)
      )
    ),

  // Alerts
  listAlerts: publicProcedure
    .input(z.object({ productId: z.number().positive().optional() }).optional())
    .query(
      withErrorHandler(async ({ input, ctx }) => {
        if (input?.productId) {
          return getAlertService().getAlertsByProduct(input.productId, ctx.workspaceId);
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
      withErrorHandler(async ({ input, ctx }) =>
        getAlertService().updateAlert(input.id, input.data, ctx.workspaceId)
      )
    ),

  deleteAlert: rateLimitedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getAlertService().deleteAlert(input.id, ctx.workspaceId)
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

  // Tags
  addTag: rateLimitedProcedure
    .input(z.object({ productId: z.number().positive(), tag: z.string().min(1).max(50) }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getTagService().addTag(input.productId, input.tag, ctx.workspaceId)
      )
    ),

  removeTag: rateLimitedProcedure
    .input(z.object({ productId: z.number().positive(), tag: z.string().min(1) }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getTagService().removeTag(input.productId, input.tag, ctx.workspaceId)
      )
    ),

  getProductTags: publicProcedure
    .input(z.object({ productId: z.number().positive() }))
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        getTagService().getProductTags(input.productId, ctx.workspaceId)
      )
    ),

  getAllTags: publicProcedure
    .query(
      withErrorHandler(async ({ ctx }) =>
        getTagService().getAllTags(ctx.workspaceId)
      )
    ),

  getProductIdsByTags: publicProcedure
    .input(z.object({ tags: z.array(z.string().min(1)).min(1) }))
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        getTagService().getProductIdsByTags(input.tags, ctx.workspaceId)
      )
    ),

  // Lists (both "collection" wishlists and "comparison" shortlists share
  // this surface; the `kind` discriminator switches UX downstream).
  createList: rateLimitedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).nullable().optional(),
        kind: z.enum(["collection", "comparison"]).optional(),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getListService().createList(input.name, ctx.workspaceId, {
          description: input.description,
          kind: input.kind,
        })
      )
    ),

  updateList: rateLimitedProcedure
    .input(z.object({ id: z.number().positive(), data: z.object({ name: z.string().min(1).max(100).optional(), description: z.string().max(500).nullable().optional() }) }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getListService().updateList(input.id, input.data, ctx.workspaceId)
      )
    ),

  deleteList: rateLimitedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getListService().deleteList(input.id, ctx.workspaceId)
      )
    ),

  addToList: rateLimitedProcedure
    .input(z.object({ listId: z.number().positive(), productId: z.number().positive() }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getListService().addToList(input.listId, input.productId, ctx.workspaceId)
      )
    ),

  removeFromList: rateLimitedProcedure
    .input(z.object({ listId: z.number().positive(), productId: z.number().positive() }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getListService().removeFromList(input.listId, input.productId, ctx.workspaceId)
      )
    ),

  getListProducts: publicProcedure
    .input(z.object({ listId: z.number().positive() }))
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        getListService().getListProducts(input.listId, ctx.workspaceId)
      )
    ),

  getProductLists: publicProcedure
    .input(z.object({ productId: z.number().positive() }))
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        getListService().getProductLists(input.productId, ctx.workspaceId)
      )
    ),

  getAllLists: publicProcedure
    .input(
      z.object({ kind: z.enum(["collection", "comparison"]).optional() }).optional()
    )
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        getListService().getAllLists(ctx.workspaceId, { kind: input?.kind })
      )
    ),

  setListItemNotes: rateLimitedProcedure
    .input(
      z.object({
        listId: z.number().positive(),
        productId: z.number().positive(),
        notes: z.string().max(500).nullable(),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getListService().setListItemNotes(
          input.listId,
          input.productId,
          input.notes,
          ctx.workspaceId
        )
      )
    ),

  // Retailers
  listRetailers: publicProcedure
    .query(
      withErrorHandler(async ({ ctx }) =>
        getRetailerService().listRetailers(ctx.workspaceId)
      )
    ),

  getRetailer: publicProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(
      withErrorHandler(async ({ input, ctx }) =>
        getRetailerService().getRetailer(input.id, ctx.workspaceId)
      )
    ),

  updateRetailer: rateLimitedProcedure
    .input(z.object({
      id: z.number().positive(),
      data: z.object({
        name: z.string().min(1).max(100).optional(),
        logoUrl: z.string().max(500).nullable().optional(),
        website: z.string().max(500).nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
        color: z.string().max(7).nullable().optional(),
      }),
    }))
    .mutation(
      withErrorHandler(async ({ input, ctx }) =>
        getRetailerService().updateRetailer(input.id, input.data, ctx.workspaceId)
      )
    ),
});
