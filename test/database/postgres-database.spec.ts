import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { PostgresDatabase } from "../../src/database/postgres-database";

const sessionPoolerUrl = "postgresql://aws-0-test.pooler.supabase.com:5432/postgres?sslmode=require";
const transactionPoolerUrl = "postgresql://aws-0-test.pooler.supabase.com:6543/postgres?sslmode=require";
const directUrl = "postgresql://localhost:5432/test";

describe("PostgresDatabase", () => {
  it("requires DATABASE_URL", () => {
    expect(() => new PostgresDatabase("")).toThrow(/DATABASE_URL/);
  });
  it("rejects unsafe schema names", () => {
    expect(() => new PostgresDatabase(directUrl, "invalid-schema")).toThrow(/DB_SCHEMA/);
  });

  it.each([
    { scenario: "uses the transaction pooler for a Supabase session URL", input: sessionPoolerUrl, expected: transactionPoolerUrl },
    { scenario: "keeps a Supabase transaction-pooler URL", input: transactionPoolerUrl, expected: transactionPoolerUrl },
    { scenario: "keeps a direct PostgreSQL URL", input: directUrl, expected: directUrl },
  ])("$scenario", async ({ input, expected }) => {
    const database = new PostgresDatabase(input);
    try {
      expect(database.pool.options.connectionString).toBe(expected);
    } finally {
      await database.close();
    }
  });

  it("initializes tables in the existing public schema", async () => {
    const database = new PostgresDatabase(directUrl);
    const query = vi.fn();
    const client = { query } as unknown as PoolClient;
    const transaction = vi.spyOn(database, "transaction").mockImplementation((action) => action(client));

    try {
      await database.initialize();

      expect(query).not.toHaveBeenCalledWith(expect.stringMatching(/^CREATE SCHEMA/));
      expect(query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS "public".employees'));
    } finally {
      transaction.mockRestore();
      await database.close();
    }
  });
});
