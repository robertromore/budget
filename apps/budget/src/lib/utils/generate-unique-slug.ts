/**
 * Generates a unique slug by testing against a provided uniqueness check function
 * @param baseSlug - The base slug to make unique
 * @param isUnique - Function that returns true if the slug is unique
 * @returns Promise<string> - A unique slug
 */
export async function generateUniqueSlug(
  baseSlug: string,
  isUnique: (slug: string) => Promise<boolean>
): Promise<string> {
  // First check if the base slug is available
  if (await isUnique(baseSlug)) {
    return baseSlug;
  }

  // If base slug exists, try with numbers appended
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (!(await isUnique(uniqueSlug))) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}
