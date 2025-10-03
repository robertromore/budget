/**
 * Seeders are used to generate default data.
 */

import type {TableConfig} from "drizzle-orm/mysql-core";
import {db} from "..";
import * as schema from "$lib/schema";

import {Glob} from "bun";
import * as path from "node:path";
import type {SQLiteTable} from "drizzle-orm/sqlite-core";

const glob = new Glob("*.json");
const seeders_path = "./src/lib/server/db/seeders/";

for await (const file of glob.scan(seeders_path)) {
  const table_name = path.basename(file, ".json") as keyof typeof schema;

  if (!Object.prototype.hasOwnProperty.call(schema, table_name)) {
    console.warn(`Skipping ${file}: Table ${table_name} doesn't exist in schema.`);
    continue;
  }

  const table = schema[table_name] as unknown as SQLiteTable<TableConfig>;
  const data = await Bun.file(seeders_path + file).json();

  if (!Array.isArray(data)) {
    console.warn(`Skipping ${file}: Data must be an array.`);
    continue;
  }

  for (const record of data) {
    await db.insert(table).values(record);
  }

  console.log(`Seeded ${table_name} with ${data.length} record(s).`);
}

console.log("Seeding complete.");
