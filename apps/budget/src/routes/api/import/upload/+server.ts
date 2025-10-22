import { transactions as transactionTable } from '$lib/schema/transactions';
import { db } from '$lib/server/db';
import { CSVProcessor } from '$lib/server/import/file-processors/csv-processor';
import { ExcelProcessor } from '$lib/server/import/file-processors/excel-processor';
import { OFXProcessor } from '$lib/server/import/file-processors/ofx-processor';
import { QIFProcessor } from '$lib/server/import/file-processors/qif-processor';
import { TransactionValidator } from '$lib/server/import/validators/transaction-validator';
import type { ParseResult } from '$lib/types/import';
import { json } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('importFile') as File;
    const accountIdParam = url.searchParams.get('accountId');
    const reverseAmountSignsParam = url.searchParams.get('reverseAmountSigns');

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // Determine file type and get appropriate processor
    const processor = getFileProcessor(file.name);

    if (!processor) {
      return json(
        {
          error: 'Unsupported file type. Supported formats: .csv, .txt, .xlsx, .xls, .qif, .ofx, .qfx',
        },
        { status: 400 }
      );
    }

    // Validate file
    const validation = processor.validateFile(file);
    if (!validation.valid) {
      return json({ error: validation.error || 'File validation failed' }, { status: 400 });
    }

    // Parse file
    const rawData = await processor.parseFile(file);

    // If accountId is provided, validate with duplicate checking
    let validatedData = rawData;
    if (accountIdParam) {
      const accountId = parseInt(accountIdParam);
      if (!isNaN(accountId)) {
        // Get existing transactions for duplicate detection
        const existingTransactions = await db
          .select()
          .from(transactionTable)
          .where(and(eq(transactionTable.accountId, accountId), isNull(transactionTable.deletedAt)));

        // Apply amount reversal before duplicate checking if enabled
        // This ensures we compare "final" amounts (as they will be stored in DB) against existing transactions
        let dataForValidation = rawData;
        if (reverseAmountSignsParam === 'true') {
          dataForValidation = rawData.map(row => ({
            ...row,
            normalizedData: {
              ...row.normalizedData,
              amount: row.normalizedData['amount'] !== undefined && row.normalizedData['amount'] !== null
                ? -(row.normalizedData['amount'] as number)
                : row.normalizedData['amount']
            }
          }));
        }

        // Validate rows with duplicate checking
        const validator = new TransactionValidator();
        validatedData = validator.validateRows(dataForValidation, existingTransactions as any);
      }
    }

    // Extract raw column names from first row (before normalization)
    const columns = validatedData.length > 0
      ? Object.keys(validatedData[0]?.rawData || {})
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
    console.error('File upload error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to process file',
      },
      { status: 500 }
    );
  }
};

function getFileProcessor(fileName: string) {
  const extension = `.${fileName.split('.').pop()?.toLowerCase()}`;

  switch (extension) {
    case '.csv':
    case '.txt':
      return new CSVProcessor();
    case '.xlsx':
    case '.xls':
      return new ExcelProcessor();
    case '.qif':
      return new QIFProcessor();
    case '.ofx':
    case '.qfx':
      return new OFXProcessor();
    default:
      return null;
  }
}
