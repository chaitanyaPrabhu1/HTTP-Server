process.loadEnvFile(); // must come first — loads .env into process.env
function envOrThrow(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
// Step 1: the MigrationConfig object
const migrationConfig = {
    migrationsFolder: "./src/db/migrations",
};
// Step 2: refactored config with both api and db
export const config = {
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
        defaultDuration: 60 * 60,
    },
};
