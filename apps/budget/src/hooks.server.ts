import type {Handle} from '@sveltejs/kit';

// tRPC is now handled by the /api/trpc/[...procedure] endpoint
// This file can be used for other server hooks if needed
export const handle: Handle = async ({event, resolve}) => {
  return resolve(event);
};
