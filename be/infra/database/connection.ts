import {createClient} from "@libsql/client";
import {drizzle} from "drizzle-orm/libsql";

import * as models from "./models";

const client = createClient({
    url: process.env.DB_URL || "file:./local.sqlite",
    authToken: process.env.DB_AUTH_TOKEN
});

export const db = drizzle(client, {
    schema: models,
    logger: process.env.NODE_ENV === "development"
});
