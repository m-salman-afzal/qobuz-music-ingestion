import "dotenv/config";
import {defineConfig} from "drizzle-kit";

export default defineConfig({
    dialect: "turso",
    out: "./be/infra/database/migrations",
    schema: "./be/infra/database/models/*",
    dbCredentials: {
        url: process.env.DB_URL || "file:./local.sqlite",
        authToken: process.env.DB_AUTH_TOKEN
    },
    verbose: true,
    strict: true
});
