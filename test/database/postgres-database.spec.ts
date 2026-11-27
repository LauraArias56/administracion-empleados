import { PostgresDatabase } from "../../src/database/postgres-database";

describe("PostgresDatabase", () => {
  it("requires DATABASE_URL", () => {
    expect(() => new PostgresDatabase("")).toThrow(/DATABASE_URL/);
  });
  it("rejects unsafe schema names", () => {
    expect(() => new PostgresDatabase("postgresql://localhost/test", "test; DROP SCHEMA public")).toThrow(/DB_SCHEMA/);
  });
});
