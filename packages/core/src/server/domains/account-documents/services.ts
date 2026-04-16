import type { AccountDocument, DocumentType } from "$core/schema/account-documents";
import { ALLOWED_DOCUMENT_MIMES, MAX_DOCUMENT_SIZE } from "$core/schema/account-documents";
import { NotFoundError, ValidationError } from "$core/server/shared/types/errors";
import { InputSanitizer } from "$core/server/shared/validation";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
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
   * Verify an account belongs to the given workspace or throw NotFound.
   */
  private async assertAccountInWorkspace(
    accountId: number,
    workspaceId: number
  ): Promise<void> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || account.workspaceId !== workspaceId) {
      throw new NotFoundError("Account", accountId.toString());
    }
  }

  /**
   * Get all documents for a tax year within a workspace.
   */
  async getDocumentsByTaxYear(
    taxYear: number,
    workspaceId: number
  ): Promise<AccountDocument[]> {
    return await this.documentRepository.findByTaxYearInWorkspace(taxYear, workspaceId);
  }

  /**
   * Get all documents for an account (workspace-verified).
   */
  async getDocumentsByAccount(
    accountId: number,
    workspaceId: number
  ): Promise<AccountDocument[]> {
    await this.assertAccountInWorkspace(accountId, workspaceId);
    return await this.documentRepository.findByAccountId(accountId);
  }

  /**
   * Get documents for an account and tax year (workspace-verified).
   */
  async getDocumentsByAccountAndTaxYear(
    accountId: number,
    taxYear: number,
    workspaceId: number
  ): Promise<AccountDocument[]> {
    await this.assertAccountInWorkspace(accountId, workspaceId);
    return await this.documentRepository.findByAccountAndTaxYear(accountId, taxYear);
  }

  /**
   * Get a single document by ID, verifying workspace ownership via its account.
   */
  async getDocument(id: number, workspaceId: number): Promise<AccountDocument> {
    const document = await this.documentRepository.findByIdInWorkspace(id, workspaceId);
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
  async updateDocument(
    id: number,
    data: UpdateDocumentData,
    workspaceId: number
  ): Promise<AccountDocument> {
    // Workspace-scoped lookup — throws if the document belongs to another tenant.
    await this.getDocument(id, workspaceId);

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
   * Delete a document (soft delete in DB, hard delete file).
   * Verifies workspace ownership before doing either.
   */
  async deleteDocument(id: number, workspaceId: number): Promise<void> {
    const document = await this.getDocument(id, workspaceId);

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
   * Get available tax years with documents within a workspace.
   */
  async getAvailableTaxYears(workspaceId: number): Promise<number[]> {
    return await this.documentRepository.getAvailableTaxYearsInWorkspace(workspaceId);
  }

  /**
   * Get available tax years for an account (workspace-verified).
   */
  async getAvailableTaxYearsForAccount(
    accountId: number,
    workspaceId: number
  ): Promise<number[]> {
    await this.assertAccountInWorkspace(accountId, workspaceId);
    return await this.documentRepository.getAvailableTaxYearsForAccount(accountId);
  }

  /**
   * Count documents in a workspace, optionally filtered by tax year.
   */
  async countDocuments(workspaceId: number, taxYear?: number): Promise<number> {
    return await this.documentRepository.countInWorkspace(workspaceId, taxYear);
  }

  /**
   * Document count grouped by type, scoped to a workspace.
   */
  async getCountByType(
    workspaceId: number,
    taxYear?: number
  ): Promise<Record<string, number>> {
    const results = await this.documentRepository.getCountByTypeInWorkspace(
      workspaceId,
      taxYear
    );
    const byType: Record<string, number> = {};
    for (const { documentType, count } of results) {
      byType[documentType] = (byType[documentType] || 0) + count;
    }
    return byType;
  }
}
