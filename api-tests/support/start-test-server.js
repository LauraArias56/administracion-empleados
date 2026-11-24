/**
 * Levanta la aplicación compilada para las pruebas API en el esquema aislado test_api.
 * - escucha en TEST_PORT (por defecto 3100).
 */
const path = require("path");
try { process.loadEnvFile(path.resolve(__dirname, "..", "..", ".env")); } catch (error) { if (error.code !== "ENOENT") throw error; }

const root = path.resolve(__dirname, "..", "..");
const entry = path.join(root, "dist", "main.js");

if (!fs.existsSync(entry)) {
  console.error("No existe dist/main.js. Ejecuta primero: npm run build (o usa npm run test:api, que compila antes).");
  process.exit(1);
}

if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL para las pruebas de API.");
const schema = process.env.DB_SCHEMA || "test_api";
if (!schema.startsWith("test_") && !schema.startsWith("verify_")) throw new Error("Las pruebas solo pueden recrear esquemas test_* o verify_*.");
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) throw new Error("DB_SCHEMA contiene un nombre no válido.");
const { Client } = require("pg");
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.end();
}).then(() => {

// El middleware de errores de la app imprime cada error (incluidos los 4xx que las pruebas provocan
// a propósito). Aquí solo se silencian esos 4xx esperados; los errores 5xx sí se muestran.
const logError = console.error.bind(console);
console.error = (...args) => {
  const error = args[0];
  if (error && typeof error === "object" && error.statusCode >= 400 && error.statusCode < 500) {
    return;
  }
  logError(...args);
};

process.env.DB_SCHEMA = schema;
process.env.PORT = process.env.TEST_PORT || "3100";

require(entry);
}).catch((error) => { console.error(error); process.exit(1); });
