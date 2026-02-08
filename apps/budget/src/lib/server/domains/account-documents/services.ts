import type { AccountDocument, DocumentType } from "$lib/schema/account-documents";
import { ALLOWED_DOCUMENT_MIMES, MAX_DOCUMENT_SIZE } from "$lib/schema/account-documents";
import { NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import { existsSync } from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { AccountDocumentRepository } from "./repository";
import type { AccountRepository } from "../accounts/repository";

// Service input types
export interface UploadDocumentData {
  accountId: number;
  taxYear: number;
  documentType?: DocumentType;
  file: File;
  title?: string;
  description?: string;
}

export interface UpdateDocumentData {
  documentType?: DocumentType;
  title?: string;
  description?: string;
}

/**
 * Account document service for handling file uploads and management
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class AccountDocumentService {
  private readonly uploadsDir: string;

  constructor(
    private documentRepository: AccountDocumentRepository,
    private accountRepository: AccountRepository
  ) {
    // Configure uploads directory
    this.uploadsDir = join(process.cwd(), "uploads", "documents");
  }

  /**
   * Validate file type and size
   */
  private validateFile(file: File): void {
    // Check file size
    if (file.size > MAX_DOCUMENT_SIZE) {
      throw new ValidationError(`File size must be less than ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB`);
    }

    // Check MIME type
    if (!ALLOWED_DOCUMENT_MIMES.includes(file.type as any)) {
      throw new ValidationError("File type must be JPEG, PNG, WebP, or PDF");
    }
  }

  /**
   * Validate tax year
   */
  private validateTaxYear(taxYear: number): void {
    const currentYear = new Date().getFullYear();
    if (taxYear < 2000 || taxYear > currentYear + 1) {
      throw new ValidationError(`Tax year must be between 2000 and ${currentYear + 1}`);
    }
  }

  /**
   * Generate storage path for file
   * Format: {taxYear}/account-{accountId}-{timestamp}-{originalname}
   */
  private generateStoragePath(accountId: number, taxYear: number, fileName: string): string {
    const timestamp = Date.now();

    // Sanitize filename to remove special characters
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

    return join(taxYear.toString(), `account-${accountId}-${timestamp}-${sanitizedName}`);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Save file to disk
   */
  private async saveFile(file: File, storagePath: string): Promise<void> {
    const fullPath = join(this.uploadsDir, storagePath);
    const dirPath = join(fullPath, "..");

    // Ensure directory exists
    await this.ensureDirectory(dirPath);

    // Convert File to Buffer and write
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(fullPath, buffer);
  }

  /**
   * Delete file from disk
   */
  private async deleteFile(storagePath: string): Promise<void> {
    const fullPath = join(this.uploadsDir, storagePath);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  }

  /**
   * Upload a document file
   * @param data Document data including file
   * @param workspaceId Optional workspace ID for validation (if provided, account must belong to this workspace)
   */
  async uploadDocument(data: UploadDocumentData, workspaceId?: number): Promise<AccountDocument> {
    // Validate account exists
    const account = await this.accountRepository.findById(data.accountId);
    if (!account) {
      throw new NotFoundError("Account", data.accountId.toString());
    }

    // If workspaceId is provided, validate account belongs to it
    if (workspaceId !== undefined && account.workspaceId !== workspaceId) {
      throw new ValidationError("Account does not belong to this workspace");
    }

    // Validate file
    this.validateFile(data.file);

    // Validate tax year
    this.validateTaxYear(data.taxYear);

    // Sanitize inputs
    const sanitizedTitle = data.title ? InputSanitizer.sanitizeName(data.title) : undefined;
    const sanitizedDescription = data.description
      ? InputSanitizer.sanitizeDescription(data.description)
      : undefined;

    // Generate storage path
    const storagePath = this.generateStoragePath(data.accountId, data.taxYear, data.file.name);

    // Save file to disk
    await this.saveFile(data.file, storagePath);

    try {
      // Create document record
      const documentData: any = {
        accountId: data.accountId,
        taxYear: data.taxYear,
        documentType: data.documentType || "other",
        fileName: data.file.name,
        fileSize: data.file.size,
        mimeType: data.file.type,
        storagePath,
      };

      if (sanitizedTitle) {
        documentData.title = sanitizedTitle;
      }
      if (sanitizedDescription) {
        documentData.description = sanitizedDescription;
      }

      const document = await this.documentRepository.create(documentData);

      return document;
    } catch (error) {
      // If database insert fails, clean up the file
      await this.deleteFile(storagePath);
      throw error;
    }
  }

  /**
   * Get all documents for a tax year
   */
  async getDocumentsByTaxYear(taxYear: number): Promise<AccountDocument[]> {
    return await this.documentRepository.findByTaxYear(taxYear);
  }

  /**
   * Get all documents for an account
   */
  async getDocumentsByAccount(accountId: number): Promise<AccountDocument[]> {
    return await this.documentRepository.findByAccountId(accountId);
  }

  /**
   * Get documents for an account and tax year
   */
  async getDocumentsByAccountAndTaxYear(
    accountId: number,
    taxYear: number
  ): Promise<AccountDocument[]> {
    return await this.documentRepository.findByAccountAndTaxYear(accountId, taxYear);
  }

  /**
   * Get a single document by ID
   */
  async getDocument(id: number): Promise<AccountDocument> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      throw new NotFoundError("AccountDocument", id.toString());
    }
    return document;
  }

  /**
   * Get document file path
   */
  getDocumentFilePath(document: AccountDocument): string {
    return join(this.uploadsDir, document.storagePath);
  }

  /**
   * Update document metadata
   */
  async updateDocument(id: number, data: UpdateDocumentData): Promise<AccountDocument> {
    const existing = await this.documentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("AccountDocument", id.toString());
    }

    // Sanitize inputs
    const sanitizedTitle = data.title ? InputSanitizer.sanitizeName(data.title) : undefined;
    const sanitizedDescription = data.description
      ? InputSanitizer.sanitizeDescription(data.description)
      : undefined;

    // Build update object conditionally
    const updateData: any = {};

    if (data.documentType) {
      updateData.documentType = data.documentType;
    }
    if (sanitizedTitle) {
      updateData.title = sanitizedTitle;
    }
    if (sanitizedDescription) {
      updateData.description = sanitizedDescription;
    }

    const updated = await this.documentRepository.update(id, updateData);

    return updated;
  }

  /**
   * Delete a document (soft delete in DB, hard delete file)
   */
  async deleteDocument(id: number): Promise<void> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      throw new NotFoundError("AccountDocument", id.toString());
    }

    // Soft delete from database
    await this.documentRepository.delete(id);

    // Hard delete file from disk
    try {
      await this.deleteFile(document.storagePath);
    } catch (error) {
      // Log error but don't throw - database record is already deleted
      console.error(`Failed to delete document file: ${document.storagePath}`, error);
    }
  }

  /**
   * Get available tax years with documents
   */
  async getAvailableTaxYears(): Promise<number[]> {
    return await this.documentRepository.getAvailableTaxYears();
  }

  /**
   * Get available tax years for an account
   */
  async getAvailableTaxYearsForAccount(accountId: number): Promise<number[]> {
    return await this.documentRepository.getAvailableTaxYearsForAccount(accountId);
  }

  /**
   * Count documents for a tax year (or all documents if no year specified)
   */
  async countDocuments(taxYear?: number): Promise<number> {
    if (taxYear) {
      return await this.documentRepository.countByTaxYear(taxYear);
    }
    // Count all documents across all years
    const years = await this.documentRepository.getAvailableTaxYears();
    let total = 0;
    for (const year of years) {
      total += await this.documentRepository.countByTaxYear(year);
    }
    return total;
  }

  /**
   * Get document count grouped by type (for a specific year or all documents)
   */
  async getCountByType(taxYear?: number): Promise<Record<string, number>> {
    if (taxYear) {
      const results = await this.documentRepository.getCountByTypeForTaxYear(taxYear);
      // Convert array to record
      const byType: Record<string, number> = {};
      for (const { documentType, count } of results) {
        byType[documentType] = count;
      }
      return byType;
    }

    // Aggregate counts across all years
    const years = await this.documentRepository.getAvailableTaxYears();
    const byType: Record<string, number> = {};

    for (const year of years) {
      const results = await this.documentRepository.getCountByTypeForTaxYear(year);
      for (const { documentType, count } of results) {
        byType[documentType] = (byType[documentType] || 0) + count;
      }
    }

    return byType;
  }
}
