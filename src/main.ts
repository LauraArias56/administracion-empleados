import { container } from "./config/container";
import { PostgresDatabase } from "./database/postgres-database";
import { createServer } from "./server";

const database = container.resolve<PostgresDatabase>("database");
void database.initialize().then(() => {
  const app = createServer();
  const PORT = Number(process.env.PORT) || 3000;

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
