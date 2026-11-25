import { container, LEGACY_JSON_FILE } from "./config/container";
import { bootstrapDatabase } from "./database/bootstrap";
import { PostgresDatabase } from "./database/postgres-database";
import { SqliteDatabase } from "./database/sqlite-database";
import { createServer } from "./server";

const database = container.resolve<PostgresDatabase | SqliteDatabase>("database");
const starting = database instanceof PostgresDatabase
  ? database.initialize()
  : Promise.resolve(bootstrapDatabase(database, LEGACY_JSON_FILE));

void starting.then(() => {
  const app = createServer();
  const PORT = Number(process.env.PORT) || 3000;

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    if (database instanceof PostgresDatabase) {
      console.log("Base de datos: Supabase");
    } else {
      console.log(`SQLite database: ${database.path}`);
    }
  });
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
