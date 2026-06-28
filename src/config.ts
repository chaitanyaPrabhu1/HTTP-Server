// config.ts
import type { MigrationConfig } from "drizzle-orm/migrator";

process.loadEnvFile(); // must come first — loads .env into process.env

function envOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Step 1: the MigrationConfig object
const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

// Types
type APIConfig = {
  fileserverHits: number;
  polkaKey: string;
};

type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};


type JWTConfig = {
  secret: string;
  defaultDuration: number;
};


type Config = {
  api: APIConfig;
  db: DBConfig;
  jwt: JWTConfig;
};

// Step 2: refactored config with both api and db
export const config: Config = {
  api: {
    fileserverHits: 0,
    polkaKey: envOrThrow("POLKA_KEY")
  },
  db: {
    url: envOrThrow("DB_URL"),
    migrationConfig: migrationConfig,
  },
  jwt: {
    secret: envOrThrow("JWT_SECRET"),
    defaultDuration: 60*60,
  },
};
