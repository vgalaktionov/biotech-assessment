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
  // Install extension
  await query(sql`CREATE EXTENSION fuzzystrmatch;`);

  // Our table
  await query(sql`
    CREATE TABLE IF NOT EXISTS rna (
      id SERIAL,
      rna_string TEXT
    );
  `);
}

export async function create(...rna: string[]): Promise<void> {
  // support bulk creation
  const values = join(rna.map(s => sql`(${s})`), ",");
  await query(sql`INSERT INTO rna (rna_string) VALUES ${values}`);
}

export async function search(
  substring: string,
  levenshtein: number = 0
): Promise<string[]> {
  let result;
  if (levenshtein !== 0) {
    result = await query(sql`
      SELECT *
      FROM rna
      WHERE levenshtein(rna_string, ${substring}) <= ${levenshtein}
      ORDER BY levenshtein(rna_string, ${substring}) DESC;
    `);
  } else {
    result = await query(
      sql`SELECT * FROM rna WHERE rna_string LIKE '%' || ${substring} || '%';`
    );
  }
  return result.rows.map(r => r.rna_string);
}

// for healthcheck
export async function ping(): Promise<void> {
  await query(sql`SELECT 1;`);
}
