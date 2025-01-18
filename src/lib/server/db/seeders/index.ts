/**
 * Seeders are used to generate default data.
 */

import type { TableConfig } from 'drizzle-orm/mysql-core';
import { db } from '..';
import * as schema from '../../../schema';

import { Glob } from 'bun';
import * as path from 'node:path';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

const glob = new Glob('*.json');
const seeders_path = './src/lib/server/db/seeders/';
const tables = Object.keys(schema);

for await (const file of glob.scan(seeders_path)) {
  const table_name = path.basename(file, '.json') as keyof typeof tables;
  if (Object.prototype.hasOwnProperty.call(schema, table_name)) {
    throw new Error(`Table ` + table_name.toString() + ` doesn't exist.`);
  }
  const table = tables[table_name] as unknown as SQLiteTable<TableConfig>;
  const data = await Bun.file(seeders_path + file).json();
  let count = 0;
  for (const records of data.values()) {
    count++;
    await db.insert(table).values(records);
  }
  console.log('Seeded ' + table + ' with ' + count + ' records.');
}

console.log('Seeding complete.');
