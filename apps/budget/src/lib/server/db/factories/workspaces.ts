import slugify from "@sindresorhus/slugify";
import {db} from "..";
import {workspaces, type Workspace, type WorkspacePreferences} from "$lib/schema/workspaces";
import {faker} from "@faker-js/faker";

/**
 * Creates workspace(s) with realistic names and preferences
 *
 * @param count - Number of workspaces to create (default: 1)
 * @returns Promise<Workspace[]> - Array of created workspaces
 *
 * @example
 * ```typescript
 * // Create a single workspace
 * const [workspace] = await workspaceFactory();
 *
 * // Create multiple workspaces
 * const workspaces = await workspaceFactory(3);
 * ```
 */
export const workspaceFactory = async (
  count: number = 1
): Promise<Workspace[]> => {
  const workspaces_collection: Workspace[] = [];

  for (let i = 0; i < count; i++) {
    // Generate realistic workspace names
    const companyTypes = ['Corp', 'LLC', 'Inc', 'Group', 'Ventures', 'Partners'];
    const businessTypes = ['Financial', 'Budget', 'Accounting', 'Money', 'Wealth'];

    const displayName = faker.helpers.maybe(
      () => `${faker.company.name()}`,
      { probability: 0.7 }
    ) ?? `${faker.person.lastName()} ${faker.helpers.arrayElement(businessTypes)}`;

    const slug = slugify(displayName);

    // Generate realistic preferences
    const preferences: WorkspacePreferences = {
      locale: faker.helpers.arrayElement(['en-US', 'en-GB', 'es-ES', 'fr-FR']),
      dateFormat: faker.helpers.arrayElement(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
      currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP']),
      theme: faker.helpers.arrayElement(['light', 'dark', 'system']),
      timezone: faker.helpers.arrayElement([
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris'
      ])
    };

    const new_workspace = await db
      .insert(workspaces)
      .values({
        displayName,
        slug,
        preferences: JSON.stringify(preferences),
      })
      .returning();

    const workspace = new_workspace[0];
    if (!workspace) {
      throw new Error(`Failed to create workspace: ${displayName}`);
    }

    workspaces_collection.push(workspace);
  }

  return workspaces_collection;
};
