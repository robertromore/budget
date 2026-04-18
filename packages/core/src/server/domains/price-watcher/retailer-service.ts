import type { PriceRetailer } from "$core/schema/price-retailers";
import { capitalize } from "$core/utils/string-utilities";
import { detectRetailer } from "./price-checker";
import { RetailerRepository } from "./retailer-repository";

export interface RetailerUpdateData {
  name?: string;
  logoUrl?: string | null;
  website?: string | null;
  color?: string | null;
  notes?: string | null;
}

export class RetailerService {
  constructor(private retailerRepo: RetailerRepository) {}

  /**
   * Resolve a URL to a PriceRetailer entity (find-or-create by slug within workspace).
   */
  async resolveRetailerForUrl(url: string, workspaceId: number): Promise<PriceRetailer> {
    const slug = detectRetailer(url);
    const hostname = RetailerService.extractDomain(url);

    return this.retailerRepo.findOrCreateBySlug(slug, workspaceId, {
      name: RetailerService.getDisplayName(slug),
      domain: hostname,
      logoUrl: RetailerService.getFaviconUrl(hostname),
    });
  }

  async listRetailers(workspaceId: number): Promise<PriceRetailer[]> {
    return this.retailerRepo.findAll(workspaceId);
  }

  async getRetailer(id: number, workspaceId: number): Promise<PriceRetailer | null> {
    return this.retailerRepo.findById(id, workspaceId);
  }

  async updateRetailer(id: number, data: RetailerUpdateData, workspaceId: number): Promise<PriceRetailer> {
    return this.retailerRepo.update(id, data, workspaceId);
  }

  /**
   * Google favicon service URL for a domain.
   */
  static getFaviconUrl(domain: string): string {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  }

  /**
   * Extract the registrable domain from a URL (e.g., "amazon.com" from "https://www.amazon.com/dp/...").
   */
  static extractDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return "unknown";
    }
  }

  /**
   * Map known retailer slugs to human-readable display names.
   */
  static getDisplayName(slug: string): string {
    const displayNames: Record<string, string> = {
      amazon: "Amazon",
      walmart: "Walmart",
      target: "Target",
      bestbuy: "Best Buy",
      ebay: "eBay",
      newegg: "Newegg",
      costco: "Costco",
      homedepot: "Home Depot",
      lowes: "Lowe's",
      adorama: "Adorama",
      bhphoto: "B&H Photo",
      dwr: "Design Within Reach",
      lumens: "Lumens",
      "2modern": "2Modern",
    };
    return displayNames[slug] ?? capitalize(slug);
  }
}
