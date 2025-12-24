import type { WorkspaceRole } from "$lib/schema/workspace-members";

/**
 * Entity types that can have permissions
 */
export const ENTITY_TYPES = [
  "accounts",
  "transactions",
  "categories",
  "payees",
  "budgets",
  "schedules",
  "views",
  "members",
  "invitations",
  "workspace",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/**
 * Actions that can be performed on entities
 */
export const ACTIONS = ["create", "read", "update", "delete", "manage"] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * Permission string format: "entity:action"
 */
export type Permission = `${EntityType}:${Action}`;

/**
 * Permission matrix for each workspace role
 *
 * | Role   | Workspace | Members | Entities |
 * | ------ | --------- | ------- | -------- |
 * | Owner  | manage    | manage  | full     |
 * | Admin  | -         | manage  | full     |
 * | Editor | -         | read    | full     |
 * | Viewer | -         | read    | read     |
 */
export const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  owner: [
    // Workspace management (only owner can delete workspace)
    "workspace:manage",
    // Member management
    "members:manage",
    "invitations:manage",
    // Full entity access
    "accounts:create",
    "accounts:read",
    "accounts:update",
    "accounts:delete",
    "transactions:create",
    "transactions:read",
    "transactions:update",
    "transactions:delete",
    "categories:create",
    "categories:read",
    "categories:update",
    "categories:delete",
    "payees:create",
    "payees:read",
    "payees:update",
    "payees:delete",
    "budgets:create",
    "budgets:read",
    "budgets:update",
    "budgets:delete",
    "schedules:create",
    "schedules:read",
    "schedules:update",
    "schedules:delete",
    "views:create",
    "views:read",
    "views:update",
    "views:delete",
  ],
  admin: [
    // Member management (cannot delete workspace)
    "members:manage",
    "invitations:manage",
    // Full entity access
    "accounts:create",
    "accounts:read",
    "accounts:update",
    "accounts:delete",
    "transactions:create",
    "transactions:read",
    "transactions:update",
    "transactions:delete",
    "categories:create",
    "categories:read",
    "categories:update",
    "categories:delete",
    "payees:create",
    "payees:read",
    "payees:update",
    "payees:delete",
    "budgets:create",
    "budgets:read",
    "budgets:update",
    "budgets:delete",
    "schedules:create",
    "schedules:read",
    "schedules:update",
    "schedules:delete",
    "views:create",
    "views:read",
    "views:update",
    "views:delete",
  ],
  editor: [
    // Can see members but not manage
    "members:read",
    // Full entity access
    "accounts:create",
    "accounts:read",
    "accounts:update",
    "accounts:delete",
    "transactions:create",
    "transactions:read",
    "transactions:update",
    "transactions:delete",
    "categories:create",
    "categories:read",
    "categories:update",
    "categories:delete",
    "payees:create",
    "payees:read",
    "payees:update",
    "payees:delete",
    "budgets:create",
    "budgets:read",
    "budgets:update",
    "budgets:delete",
    "schedules:create",
    "schedules:read",
    "schedules:update",
    "schedules:delete",
    "views:create",
    "views:read",
    "views:update",
    "views:delete",
  ],
  viewer: [
    // Read-only access
    "members:read",
    "accounts:read",
    "transactions:read",
    "categories:read",
    "payees:read",
    "budgets:read",
    "schedules:read",
    "views:read",
  ],
};

/**
 * Role hierarchy for comparisons
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: WorkspaceRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * Check if role1 is higher or equal to role2 in the hierarchy
 */
export function isRoleHigherOrEqual(role1: WorkspaceRole, role2: WorkspaceRole): boolean {
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2];
}

/**
 * Check if role1 is strictly higher than role2 in the hierarchy
 */
export function isRoleHigher(role1: WorkspaceRole, role2: WorkspaceRole): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Get the highest role from a list of roles
 */
export function getHighestRole(roles: WorkspaceRole[]): WorkspaceRole | null {
  if (roles.length === 0) return null;
  return roles.reduce((highest, role) =>
    ROLE_HIERARCHY[role] > ROLE_HIERARCHY[highest] ? role : highest
  );
}

/**
 * Check if a role can manage another role
 * A role can manage a role lower in the hierarchy
 */
export function canManageRole(managerRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
  // Only owner can manage owners (transfer ownership)
  if (targetRole === "owner") {
    return managerRole === "owner";
  }
  // Otherwise, must be strictly higher in hierarchy
  return isRoleHigher(managerRole, targetRole);
}
