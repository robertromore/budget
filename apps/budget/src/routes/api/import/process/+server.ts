import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ImportOrchestrator } from '$lib/server/import/import-orchestrator';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { accountId, data, selectedEntities, options } = body;

    if (!accountId || !data) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create orchestrator and process import with selected entities
    const orchestrator = new ImportOrchestrator();
    const result = await orchestrator.processImport(
      accountId,
      data,
      options || {},
      selectedEntities
    );

    return json({ result });
  } catch (error) {
    console.error('Import processing error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to process import',
      },
      { status: 500 }
    );
  }
};
