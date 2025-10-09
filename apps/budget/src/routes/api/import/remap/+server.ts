import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CSVProcessor } from '$lib/server/import/file-processors/csv-processor';
import { TransactionValidator } from '$lib/server/import/validators/transaction-validator';
import { db } from '$lib/server/db';
import { transactions as transactionTable } from '$lib/schema/transactions';
import { and, eq, isNull } from 'drizzle-orm';
import type { ParseResult, ColumnMapping } from '$lib/types/import';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { file: fileData, columnMapping, accountId } = await request.json();

    console.log('Remap request:', {
      hasFile: !!fileData,
      columnMapping,
      accountId
    });

    if (!fileData || !columnMapping) {
      console.error('Missing data:', { hasFile: !!fileData, hasMapping: !!columnMapping });
      return json({ error: 'Missing file data or column mapping' }, { status: 400 });
    }

    // Reconstruct File object from base64 data
    const fileBytes = Uint8Array.from(atob(fileData.data), (c) => c.charCodeAt(0));
    const file = new File([fileBytes], fileData.name, { type: fileData.type });

    // Create processor with custom column mapping
    const processor = new CSVProcessor(columnMapping);

    // Validate file
    const validation = processor.validateFile(file);
    if (!validation.valid) {
      return json({ error: validation.error || 'File validation failed' }, { status: 400 });
    }

    // Parse file with custom column mapping
    const rawData = await processor.parseFile(file);

    // If accountId is provided, validate with duplicate checking
    let validatedData = rawData;
    if (accountId) {
      const accountIdNum = parseInt(accountId);
      if (!isNaN(accountIdNum)) {
        // Get existing transactions for duplicate detection
        const existingTransactions = await db
          .select()
          .from(transactionTable)
          .where(and(eq(transactionTable.accountId, accountIdNum), isNull(transactionTable.deletedAt)));

        // Validate rows with duplicate checking
        const validator = new TransactionValidator();
        validatedData = validator.validateRows(rawData, existingTransactions as any);
      }
    }

    // Extract column names from normalized data
    const columns = validatedData.length > 0
      ? Object.keys(validatedData.find(row => Object.keys(row.normalizedData).length > 0)?.normalizedData || {})
      : [];

    // Create parse result
    const result: ParseResult = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'text/csv',
      rowCount: validatedData.length,
      columns,
      rows: validatedData,
      parseErrors: [],
    };

    return json(result);
  } catch (error) {
    console.error('File remapping error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to process file with custom mapping',
      },
      { status: 500 }
    );
  }
};
