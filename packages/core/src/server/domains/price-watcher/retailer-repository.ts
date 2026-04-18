import { priceRetailers } from "$core/schema/price-retailers";
import type { NewPriceRetailer, PriceRetailer } from "$core/schema/price-retailers";
import { db } from "$core/server/db";
import { NotFoundError } from "$core/server/shared/types/errors";
import { getCurrentTimestamp } from "$core/utils/dates-core";
import { and, eq, isNull } from "drizzle-orm";

export class RetailerRepository {
  async findById(id: number, workspaceId: number): Promise<PriceRetailer | null> {
    return (
      (await db.query.priceRetailers.findFirst({
        where: and(
          eq(priceRetailers.id, id),
          eq(priceRetailers.workspaceId, workspaceId)
        ),
      })) ?? null
    );
  }

  async findByIdOrThrow(id: number, workspaceId: number): Promise<PriceRetailer> {
    const retailer = await this.findById(id, workspaceId);
    if (!retailer) {
      throw new NotFoundError("Retailer", id);
    }
    return retailer;
  }

  async findBySlug(slug: string, workspaceId: number): Promise<PriceRetailer | null> {
    return (
      (await db.query.priceRetailers.findFirst({
        where: and(
          eq(priceRetailers.slug, slug),
          eq(priceRetailers.workspaceId, workspaceId)
        ),
      })) ?? null
    );
  }

  async findAll(workspaceId: number): Promise<PriceRetailer[]> {
    return db.query.priceRetailers.findMany({
      where: eq(priceRetailers.workspaceId, workspaceId),
      orderBy: (retailers, { asc }) => [asc(retailers.name)],
    });
  }

  async create(data: NewPriceRetailer): Promise<PriceRetailer> {
    const [retailer] = await db.insert(priceRetailers).values(data).returning();
    if (!retailer) {
      throw new Error("Failed to create retailer");
    }
    return retailer;
  }

  async update(
    id: number,
    data: Partial<Pick<PriceRetailer, "name" | "logoUrl" | "website" | "color" | "notes">>,
    workspaceId: number
  ): Promise<PriceRetailer> {
    await this.findByIdOrThrow(id, workspaceId);

    const [updated] = await db
      .update(priceRetailers)
      .set({ ...data, updatedAt: getCurrentTimestamp() })
      .where(and(eq(priceRetailers.id, id), eq(priceRetailers.workspaceId, workspaceId)))
      .returning();

    if (!updated) {
      throw new Error("Failed to update retailer");
    }
    return updated;
  }

  async findOrCreateBySlug(
    slug: string,
    workspaceId: number,
    defaults: { name: string; domain?: string; logoUrl?: string }
  ): Promise<PriceRetailer> {
    const existing = await this.findBySlug(slug, workspaceId);
    if (existing) return existing;

    return this.create({
      workspaceId,
      slug,
      name: defaults.name,
      domain: defaults.domain ?? null,
      logoUrl: defaults.logoUrl ?? null,
    });
  }
}
