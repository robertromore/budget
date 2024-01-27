import { db } from ".";
import * as schema from "../../schema";

// eslint-disable-next-line drizzle/enforce-delete-with-where
await db.delete(schema.accounts);
