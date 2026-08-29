import { describe, expect, test } from "bun:test";
import { createDatabase, createPostgresPool } from "./client.js";

describe("database pool configuration", () => {
  test("accepts bounded per-process pools", async () => {
    const database = createDatabase("postgresql://unused.invalid/test", 5);
    await database.destroy();
  });

  test.each([
    0,
    51,
    1.5,
    Number.MAX_SAFE_INTEGER,
  ])("rejects invalid pool maximum %s", (maximum) => {
    expect(() =>
      createDatabase("postgresql://unused.invalid/test", maximum),
    ).toThrow(/between 1 and 50/);
  });
});


describe("createPostgresPool", () => {
  test("registers the supplied idle-client error handler", async () => {
    const onError = (_error: Error): void => {};
    const pool = createPostgresPool(
      "postgres://unused:unused@127.0.0.1:1/unused",
      2,
      onError,
    );

    expect(pool.listenerCount("error")).toBe(1);
    expect(pool.listeners("error")).toContain(onError);

    await pool.end();
  });
});
