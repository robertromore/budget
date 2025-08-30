import { eq, and, isNull, ne } from "drizzle-orm";

/**
 * Generates a unique slug by checking against existing records in a table
 * @param db - Database instance
 * @param tableName - Table name as string (e.g., 'accounts')
 * @param slugColumn - Column name for the slug field
 * @param baseSlug - The base slug to make unique
 * @param options - Additional options
 * @returns Promise<string> - A unique slug
 */
export async function generateUniqueSlug(
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
  const { excludeId, idColumn, deletedAtColumn } = options;

  // Helper function to check if a slug exists
  const slugExists = async (slug: string): Promise<boolean> => {
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
      where: and(...conditions)
    });
    
    return !!existing;
  };

  // First check if the base slug is available
  if (!(await slugExists(baseSlug))) {
    return baseSlug;
  }
  
  // If base slug exists, try with numbers appended
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (await slugExists(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}