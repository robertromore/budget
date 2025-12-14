import { db } from "$lib/server/db";
import { secureOperationProcedure, t } from "$lib/trpc";
import { translateDomainError } from "$lib/trpc/shared/errors";
import { sql } from "drizzle-orm";

export const settingsRoutes = t.router({
  /**
   * Delete all data from all user tables.
   * This is a destructive operation that cannot be undone.
   */
  deleteAllData: secureOperationProcedure.mutation(async () => {
    try {
      // Get all table names from sqlite_master
      const allTables = await db.all<{ name: string }>(sql`
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '__drizzle%'
        ORDER BY name
      `);

      const tableNames = allTables.map((t) => t.name);

      if (tableNames.length === 0) {
        return { deleted: 0, tables: [] };
      }

      // Disable foreign keys temporarily
      await db.run(sql`PRAGMA foreign_keys = OFF`);

      try {
        // Delete from all tables
        for (const tableName of tableNames) {
          await db.run(sql.raw(`DELETE FROM "${tableName}"`));
        }

        // Reset autoincrement sequences
        await db.run(sql`DELETE FROM sqlite_sequence`);
      } finally {
        // Re-enable foreign keys (even on error)
        await db.run(sql`PRAGMA foreign_keys = ON`);
      }

      return {
        deleted: tableNames.length,
        tables: tableNames,
      };
    } catch (error) {
      throw translateDomainError(error);
    }
  }),
});
