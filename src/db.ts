import { Pool, QueryResult } from "pg";
// takes care of SQL escaping
import sql, { join } from "pg-template-tag";

export const pool = new Pool({
  connectionString:
    process.env.NODE_ENV === "TEST"
      ? process.env.TEST_DB_URI
      : process.env.DB_URI
});

export function query(text: string, params?: any): Promise<QueryResult> {
  return pool.query(text, params);
}

export async function drop(): Promise<void> {
  // Clean slate, ensure correct permissions
  await query(sql`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO public;`);
}

// Initial DB migration
export async function migrate(): Promise<void> {
  // Install extensions
  await query(sql`
    CREATE EXTENSION fuzzystrmatch;
    CREATE EXTENSION pg_trgm;
  `);

  // Our table
  await query(sql`
    CREATE TABLE IF NOT EXISTS dna (
      id SERIAL,
      dna_string TEXT
    );

    CREATE INDEX idx_like ON dna USING gin(dna_string gin_trgm_ops);
  `);
}

export async function create(...dna: string[]): Promise<void> {
  // support bulk creation
  const values = join(dna.map(s => sql`(${s})`), ",");
  await query(sql`INSERT INTO dna (dna_string) VALUES ${values}`);
}

export async function search(
  substring: string,
  levenshtein: number = 0
): Promise<string[]> {
  let result;
  if (levenshtein !== 0) {
    // fuzzy search
    result = await query(sql`
      SELECT *
      FROM dna
      WHERE levenshtein(dna_string, ${substring}) <= ${levenshtein}
      ORDER BY levenshtein(dna_string, ${substring}) DESC;
    `);
  } else {
    // indexed LIKE search
    result = await query(
      sql`SELECT * FROM dna WHERE dna_string LIKE '%' || ${substring} || '%';`
    );
  }
  return result.rows.map(r => r.dna_string);
}

// for healthcheck
export async function ping(): Promise<void> {
  await query(sql`SELECT 1;`);
}
