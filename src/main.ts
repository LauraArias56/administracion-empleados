import { container, LEGACY_JSON_FILE } from "./config/container";
import { bootstrapDatabase } from "./database/bootstrap";
import { SqliteDatabase } from "./database/sqlite-database";
import { createServer } from "./server";

// Crea la base SQLite y las tablas (y migra el JSON anterior si corresponde)
// antes de aceptar peticiones.
const database = container.resolve<SqliteDatabase>("database");
bootstrapDatabase(database, LEGACY_JSON_FILE);

const app = createServer();
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`SQLite database: ${database.path}`);
});
