import { accounts } from "$core/schema/accounts";
import { workspaceMembers } from "$core/schema/workspace-members";
import { auth } from "$core/server/auth";
import { db } from "$core/server/db";
import { and, eq, isNull } from "drizzle-orm";

export class ImportApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ImportApiError";
    this.status = status;
  }
}

export function isImportApiError(error: unknown): error is ImportApiError {
  return error instanceof ImportApiError;
}

export async function requireImportUserId(request: Request): Promise<string> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    throw new ImportApiError(401, "Authentication required");
  }

  return session.user.id;
}

function parsePositiveInt(value: number | string, fieldName: string): number {
  if (typeof value === "number") {
    if (Number.isInteger(value) && value > 0) {
      return value;
    }

    throw new ImportApiError(400, `Invalid ${fieldName}`);
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new ImportApiError(400, `Invalid ${fieldName}`);
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ImportApiError(400, `Invalid ${fieldName}`);
  }

  return parsed;
}

export function parseOptionalPositiveInt(value: unknown, fieldName: string): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return parsePositiveInt(value, fieldName);
  }

  throw new ImportApiError(400, `Invalid ${fieldName}`);
}

export function parseRequiredPositiveInt(value: unknown, fieldName: string): number {
  const parsed = parseOptionalPositiveInt(value, fieldName);
  if (parsed === null) {
    throw new ImportApiError(400, `${fieldName} is required`);
  }

  return parsed;
}

export async function requireImportAccountAccess(
  userId: string,
  accountId: number
): Promise<{
  id: number;
  workspaceId: number;
}> {
  const [account] = await db
    .select({ id: accounts.id, workspaceId: accounts.workspaceId })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), isNull(accounts.deletedAt)))
    .limit(1);

  if (!account) {
    throw new ImportApiError(404, "Account not found");
  }

  await requireImportWorkspaceAccess(userId, account.workspaceId);

  return account;
}

export async function requireImportWorkspaceAccess(
  userId: string,
  workspaceId: number
): Promise<void> {
  const [membership] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))
    .limit(1);

  if (!membership) {
    throw new ImportApiError(403, "You do not have access to this workspace");
  }
}
