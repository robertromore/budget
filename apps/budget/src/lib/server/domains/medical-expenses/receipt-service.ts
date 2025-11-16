import { ReceiptRepository } from "./receipt-repository";
import { MedicalExpenseRepository } from "./repository";
import type { ExpenseReceipt, ReceiptType } from "$lib/schema/expense-receipts";
import { ALLOWED_RECEIPT_MIMES, MAX_RECEIPT_SIZE } from "$lib/schema/expense-receipts";
import { ValidationError, NotFoundError } from "$lib/server/shared/types/errors";
import { InputSanitizer } from "$lib/server/shared/validation";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Service input types
export interface UploadReceiptData {
  medicalExpenseId: number;
  receiptType?: ReceiptType;
  file: File;
  description?: string;
}

export interface UpdateReceiptData {
  receiptType?: ReceiptType;
  description?: string;
}

/**
 * Receipt service for handling file uploads and management
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class ReceiptService {
  private readonly uploadsDir: string;

  constructor(
    private receiptRepository: ReceiptRepository,
    private medicalExpenseRepository: MedicalExpenseRepository
  ) {
    // Configure uploads directory (adjust path as needed)
    this.uploadsDir = join(process.cwd(), "uploads", "receipts");
  }

  /**
   * Validate file type and size
   */
  private validateFile(file: File): void {
    // Check file size
    if (file.size > MAX_RECEIPT_SIZE) {
      throw new ValidationError(`File size must be less than ${MAX_RECEIPT_SIZE / 1024 / 1024}MB`);
    }

    // Check MIME type
    if (!ALLOWED_RECEIPT_MIMES.includes(file.type as any)) {
      throw new ValidationError("File type must be JPEG, PNG, WebP, or PDF");
    }
  }

  /**
   * Generate storage path for file
   * Format: YYYY/MM/expense-{id}-{timestamp}-{originalname}
   */
  private generateStoragePath(medicalExpenseId: number, fileName: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const timestamp = now.getTime();

    // Sanitize filename to remove special characters
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

    return join(
      year.toString(),
      month,
      `expense-${medicalExpenseId}-${timestamp}-${sanitizedName}`
    );
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
   * Upload a receipt file
   */
  async uploadReceipt(data: UploadReceiptData): Promise<ExpenseReceipt> {
    // Validate medical expense exists
    const expense = await this.medicalExpenseRepository.findById(data.medicalExpenseId);
    if (!expense) {
      throw new NotFoundError("MedicalExpense", data.medicalExpenseId.toString());
    }

    // Validate file
    this.validateFile(data.file);

    // Sanitize description
    const sanitizedDescription = data.description
      ? InputSanitizer.sanitizeDescription(data.description)
      : undefined;

    // Generate storage path
    const storagePath = this.generateStoragePath(data.medicalExpenseId, data.file.name);

    // Save file to disk
    await this.saveFile(data.file, storagePath);

    try {
      // Create receipt record - build object conditionally for exactOptionalPropertyTypes
      const receiptData: any = {
        medicalExpenseId: data.medicalExpenseId,
        receiptType: data.receiptType || "receipt",
        fileName: data.file.name,
        fileSize: data.file.size,
        mimeType: data.file.type,
        storagePath,
      };

      if (sanitizedDescription) {
        receiptData.description = sanitizedDescription;
      }

      const receipt = await this.receiptRepository.create(receiptData);

      return receipt;
    } catch (error) {
      // If database insert fails, clean up the file
      await this.deleteFile(storagePath);
      throw error;
    }
  }

  /**
   * Get all receipts for a medical expense
   */
  async getReceiptsByExpense(medicalExpenseId: number): Promise<ExpenseReceipt[]> {
    return await this.receiptRepository.findByMedicalExpenseId(medicalExpenseId);
  }

  /**
   * Get a single receipt by ID
   */
  async getReceipt(id: number): Promise<ExpenseReceipt> {
    const receipt = await this.receiptRepository.findById(id);
    if (!receipt) {
      throw new NotFoundError("ExpenseReceipt", id.toString());
    }
    return receipt;
  }

  /**
   * Get receipt file path
   */
  getReceiptFilePath(receipt: ExpenseReceipt): string {
    return join(this.uploadsDir, receipt.storagePath);
  }

  /**
   * Update receipt metadata
   */
  async updateReceipt(id: number, data: UpdateReceiptData): Promise<ExpenseReceipt> {
    const existing = await this.receiptRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("ExpenseReceipt", id.toString());
    }

    // Sanitize description
    const sanitizedDescription = data.description
      ? InputSanitizer.sanitizeDescription(data.description)
      : undefined;

    // Build update object conditionally for exactOptionalPropertyTypes
    const updateData: any = {};

    if (data.receiptType) {
      updateData.receiptType = data.receiptType;
    }
    if (sanitizedDescription) {
      updateData.description = sanitizedDescription;
    }

    const updated = await this.receiptRepository.update(id, updateData);

    return updated;
  }

  /**
   * Delete a receipt (soft delete in DB, hard delete file)
   */
  async deleteReceipt(id: number): Promise<void> {
    const receipt = await this.receiptRepository.findById(id);
    if (!receipt) {
      throw new NotFoundError("ExpenseReceipt", id.toString());
    }

    // Soft delete from database
    await this.receiptRepository.delete(id);

    // Hard delete file from disk
    try {
      await this.deleteFile(receipt.storagePath);
    } catch (error) {
      // Log error but don't throw - database record is already deleted
      console.error(`Failed to delete receipt file: ${receipt.storagePath}`, error);
    }
  }

  /**
   * Count receipts for an expense
   */
  async countReceipts(medicalExpenseId: number): Promise<number> {
    return await this.receiptRepository.countByMedicalExpenseId(medicalExpenseId);
  }
}
