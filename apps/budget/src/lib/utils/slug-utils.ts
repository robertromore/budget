import {eq, and, isNull, ne} from "drizzle-orm";
import {generateUniqueSlug as generateUniqueSlugGeneric} from "./generate-unique-slug";

/**
 * Database-specific wrapper for generating unique slugs
 * Uses the generic generateUniqueSlug function with database-specific logic
 * @param db - Database instance
 * @param tableName - Table name as string (e.g., 'accounts')
 * @param slugColumn - Column name for the slug field
 * @param baseSlug - The base slug to make unique
 * @param options - Additional options
 * @returns Promise<string> - A unique slug
 */
export async function generateUniqueSlugForDB(
  db: any,
  tableName: string,
  slugColumn: any,
  baseSlug: string,
  options: {
    excludeId?: number;
    idColumn?: any;
    deletedAtColumn?: any;
  } = {}
): Promise<string> {
  const {excludeId, idColumn, deletedAtColumn} = options;

  // Create a database-specific uniqueness checker
  const isUnique = async (slug: string): Promise<boolean> => {
    const conditions = [eq(slugColumn, slug)];

    // Only check non-deleted records if deletedAtColumn is provided
    if (deletedAtColumn) {
      conditions.push(isNull(deletedAtColumn));
    }

    // Exclude a specific ID if provided (useful for updates)
    if (excludeId && idColumn) {
      conditions.push(ne(idColumn, excludeId));
    }

    const existing = await db.query[tableName].findFirst({
      where: and(...conditions),
    });

    return !existing; // Return true if unique (no existing record found)
  };

  // Use the generic slug generator with our database-specific checker
  return generateUniqueSlugGeneric(baseSlug, isUnique);
}

/**
 * @deprecated Use generateUniqueSlugForDB instead
 * Kept for backward compatibility
 */
export const generateUniqueSlug = generateUniqueSlugForDB;
