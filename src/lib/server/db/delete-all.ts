/* eslint-disable drizzle/enforce-delete-with-where */
import { sql } from "drizzle-orm";
import { db } from ".";
import * as schema from "../../schema";
import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    "drop-tables": {
      type: "boolean",
    },
  },
  strict: true,
  allowPositionals: true,
});

await db.delete(schema.accounts);
await db.delete(schema.transactions);
await db.delete(schema.categories);
await db.delete(schema.payees);
if (values["drop-tables"]) {
  db.run(sql`drop table 'account'`);
  db.run(sql`drop table 'transaction'`);
  db.run(sql`drop table 'categories'`);
  db.run(sql`drop table 'payee'`);
}
db.run(sql`delete from sqlite_sequence where name='account'`);
db.run(sql`delete from sqlite_sequence where name='transaction'`);
db.run(sql`delete from sqlite_sequence where name='categories'`);
db.run(sql`delete from sqlite_sequence where name='payee'`);
