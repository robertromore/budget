import {
  accountDocuments,
  type AccountDocument,
  type DocumentType,
  type ExtractionStatus,
  type ExtractionMethod,
} from "$lib/schema/account-documents";
import { db } from "$lib/server/shared/database";
import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

// Types for document operations
export interface CreateDocumentInput {
  accountId: number;
  taxYear: number;
  documentType?: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  storageUrl?: string;
  title?: string;
  description?: string;
}

export interface UpdateDocumentInput {
  documentType?: DocumentType;
  title?: string;
  description?: string;
  extractedText?: string;
  extractedData?: string;
  extractionStatus?: ExtractionStatus;
  extractionMethod?: ExtractionMethod;
  extractionError?: string;
  extractedAt?: string;
}

/**
 * Account document repository with domain-specific operations
 */
export class AccountDocumentRepository extends BaseRepository<
  typeof accountDocuments,
  AccountDocument,
  CreateDocumentInput,
  UpdateDocumentInput
> {
  constructor() {
    super(db, accountDocuments, "AccountDocument");
  }

  /**
   * Find all documents for an account
   */
  async findByAccountId(accountId: number): Promise<AccountDocument[]> {
    return await db
      .select()
      .from(accountDocuments)
      .where(
        and(
          eq(accountDocuments.accountId, accountId),
          isNull(accountDocuments.deletedAt)
        )
      )
      .orderBy(desc(accountDocuments.taxYear), desc(accountDocuments.uploadedAt))
      .execute();
  }

  /**
   * Find all documents for a specific tax year
   */
  async findByTaxYear(taxYear: number): Promise<AccountDocument[]> {
    return await db
      .select()
      .from(accountDocuments)
      .where(
        and(
          eq(accountDocuments.taxYear, taxYear),
          isNull(accountDocuments.deletedAt)
        )
      )
      .orderBy(desc(accountDocuments.uploadedAt))
      .execute();
  }

  /**
   * Find documents for an account and tax year
   */
  async findByAccountAndTaxYear(accountId: number, taxYear: number): Promise<AccountDocument[]> {
    return await db
      .select()
      .from(accountDocuments)
      .where(
        and(
          eq(accountDocuments.accountId, accountId),
          eq(accountDocuments.taxYear, taxYear),
          isNull(accountDocuments.deletedAt)
        )
      )
      .orderBy(desc(accountDocuments.uploadedAt))
      .execute();
  }

  /**
   * Find documents by type
   */
  async findByType(accountId: number, documentType: DocumentType): Promise<AccountDocument[]> {
    return await db
      .select()
      .from(accountDocuments)
      .where(
        and(
          eq(accountDocuments.accountId, accountId),
          eq(accountDocuments.documentType, documentType),
          isNull(accountDocuments.deletedAt)
        )
      )
      .orderBy(desc(accountDocuments.uploadedAt))
      .execute();
  }

  /**
   * Get all available tax years that have documents
   */
  async getAvailableTaxYears(): Promise<number[]> {
    const result = await db
      .selectDistinct({ taxYear: accountDocuments.taxYear })
      .from(accountDocuments)
      .where(isNull(accountDocuments.deletedAt))
      .orderBy(desc(accountDocuments.taxYear))
      .execute();

    return result.map((r) => r.taxYear);
  }

  /**
   * Get available tax years for a specific account
   */
  async getAvailableTaxYearsForAccount(accountId: number): Promise<number[]> {
    const result = await db
      .selectDistinct({ taxYear: accountDocuments.taxYear })
      .from(accountDocuments)
      .where(
        and(
          eq(accountDocuments.accountId, accountId),
          isNull(accountDocuments.deletedAt)
        )
      )
      .orderBy(desc(accountDocuments.taxYear))
      .execute();

    return result.map((r) => r.taxYear);
  }

  /**
   * Count documents for an account
   */
  async countByAccountId(accountId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(accountDocuments)
      .where(
        and(
          eq(accountDocuments.accountId, accountId),
          isNull(accountDocuments.deletedAt)
        )
      )
      .execute();

    return result[0]?.count || 0;
  }

  /**
   * Count documents for a tax year
   */
  async countByTaxYear(taxYear: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(accountDocuments)
      .where(
        and(
          eq(accountDocuments.taxYear, taxYear),
          isNull(accountDocuments.deletedAt)
        )
      )
      .execute();

    return result[0]?.count || 0;
  }

  /**
   * Get document count grouped by type for a tax year
   */
  async getCountByTypeForTaxYear(
    taxYear: number
  ): Promise<Array<{ documentType: string; count: number }>> {
    const result = await db
      .select({
        documentType: accountDocuments.documentType,
        count: sql<number>`count(*)`,
      })
      .from(accountDocuments)
      .where(
        and(
          eq(accountDocuments.taxYear, taxYear),
          isNull(accountDocuments.deletedAt)
        )
      )
      .groupBy(accountDocuments.documentType)
      .execute();

    return result.map((r) => ({
      documentType: r.documentType || "other",
      count: r.count,
    }));
  }

  /**
   * Find documents pending extraction
   */
  async findPendingExtractions(limit: number = 10): Promise<AccountDocument[]> {
    return await db
      .select()
      .from(accountDocuments)
      .where(
        and(
          eq(accountDocuments.extractionStatus, "pending"),
          isNull(accountDocuments.deletedAt)
        )
      )
      .limit(limit)
      .orderBy(accountDocuments.uploadedAt)
      .execute();
  }

  /**
   * Find documents by extraction status
   */
  async findByExtractionStatus(status: ExtractionStatus): Promise<AccountDocument[]> {
    return await db
      .select()
      .from(accountDocuments)
      .where(
        and(
          eq(accountDocuments.extractionStatus, status),
          isNull(accountDocuments.deletedAt)
        )
      )
      .orderBy(desc(accountDocuments.uploadedAt))
      .execute();
  }
}
