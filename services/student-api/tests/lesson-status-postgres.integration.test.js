import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";

const server = await readFile(new URL("../src/server.js", import.meta.url), "utf8");

function lessonUpdateSql() {
  // Execute the same SQL text assembled by the lesson PUT handler, not a retyped copy.
  const found = server.match(
    /"UPDATE student_course_lessons SET ([^"\n]+)"\s*\+\s*\n\s*"([^"\n]+)"/
  );
  assert.ok(found, "Lesson UPDATE query must be discoverable in server.js");
  return "UPDATE student_course_lessons SET " + found[1] + found[2];
}

test("real PostgreSQL accepts completed and cancelled lesson status updates", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is required for PostgreSQL integration",
}, async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    // The temporary table shadows the real name for this connection.
    // No migrations, students, or shared database records are modified.
    await client.query(`
      CREATE TEMP TABLE student_course_lessons (
        id uuid PRIMARY KEY,
        status varchar(20) NOT NULL,
        completed_at timestamptz,
        tutor_note text,
        updated_at timestamptz NOT NULL DEFAULT NOW()
      ) ON COMMIT DROP
    `);
    const id = randomUUID();
    await client.query(
      "INSERT INTO student_course_lessons (id, status) VALUES ($1, 'scheduled')",
      [id]
    );
    const sql = lessonUpdateSql();

    const completed = await client.query(sql, ["completed", "CI integration test", id]);
    assert.equal(completed.rowCount, 1);
    assert.equal(completed.rows[0].status, "completed");
    assert.ok(completed.rows[0].completed_at, "Completion timestamp must be populated");

    const cancelled = await client.query(sql, ["cancelled", null, id]);
    assert.equal(cancelled.rowCount, 1);
    assert.equal(cancelled.rows[0].status, "cancelled");
    assert.equal(cancelled.rows[0].completed_at, null);
  } finally {
    try { await client.query("ROLLBACK"); } finally { await client.end(); }
  }
});
