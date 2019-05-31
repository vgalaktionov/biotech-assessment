import sql from "pg-template-tag";
import api from "../src/api";
import request from "supertest";
import { migrate, drop, pool, query } from "../src/db";

describe("API", () => {
  beforeEach(migrate);

  afterEach(drop);

  afterAll(async done => {
    await pool.end();
    done();
  });

  test("should return 200 on health endpoint", async () => {
    await request(api)
      .get("/health")
      .expect(200);
  });

  test("should be able to create single valid rna string", async () => {
    const rna_strings = ["AAGAUGCCGU"];

    await request(api)
      .post("/rna")
      .send({ rna_strings })
      .expect(201);

    const result = await query(sql`SELECT rna_string FROM rna;`);
    expect(result.rows.map(r => r.rna_string)).toEqual(rna_strings);
  });

  test("should be able to create multiple valid rna strings", async () => {
    const rna_strings = ["AAGAUGCCGU", "AAUUUGCUUGGCAAAUCGUAUGCCUUGGG"];

    await request(api)
      .post("/rna")
      .send({ rna_strings })
      .expect(201);

    const result = await query(sql`SELECT rna_string FROM rna;`);
    expect(result.rows.map(r => r.rna_string)).toEqual(rna_strings);
  });

  test("should error with create on invalid rna string", async () => {
    const rna_strings = ["XYZ"];

    await request(api)
      .post("/rna")
      .set("Accept", "application/json")
      .send({ rna_strings })
      .expect(400, { status: 400, message: "Invalid RNA string!" });

    const result = await query(sql`SELECT rna_string FROM rna;`);
    expect(result.rows.map(r => r.rna_string)).toEqual([]);
  });

  test("should be able to do exact search", async () => {
    await query(sql`
      INSERT INTO rna (rna_string)
      VALUES
        ('ACGCCUGUUGAGCCU'),
        ('GCUCCCAGGAUU'),
        ('GGUAUUCCCUUACCGAAG'),
        ('CCAAAGCCACCGU'),
        ('ACUAAGGCUU'),
        ('CUAGCGGAUUA'),
        ('CAUUCCGUGA'),
        ('UUUGCAGUCGUAAG'),
        ('ACCCUUCAUCCAAUCGGAA'),
        ('CAGUCAUUGUAGCU');
    `);

    await request(api)
      .get("/rna/search")
      .query({ search_string: "GAU" })
      .set("Accept", "application/json")
      .expect(200, ["GCUCCCAGGAUU", "CUAGCGGAUUA"]);
  });

  test("should be able to do fuzzy search", async () => {
    await query(sql`
      INSERT INTO rna (rna_string)
      VALUES
        ('ACGCCUGUUGAGCCU'),
        ('GCUCCCAGGAUU'),
        ('GGUAUUCCCUUACCGAAG'),
        ('CCAAAGCCACCGU'),
        ('ACUAAGGCUU'),
        ('CUAGCGGAUUA'),
        ('CAUUCCGUGA'),
        ('UUUGCAGUCGUAAG'),
        ('ACCCUUCAUCCAAUCGGAA'),
        ('CAGUCAUUGUAGCU');
    `);

    await request(api)
      .get("/rna/search")
      .query({ search_string: "GAU", levenshtein: 10 })
      .set("Accept", "application/json")
      .expect(200, [
        "CCAAAGCCACCGU",
        "GCUCCCAGGAUU",
        "ACUAAGGCUU",
        "CUAGCGGAUUA",
        "CAUUCCGUGA"
      ]);
  });

  test("should error on search with invalid rna substring", async () => {
    await request(api)
      .get("/rna/search")
      .query({ search_string: "OMG" })
      .set("Accept", "application/json")
      .expect(400, { status: 400, message: "Invalid RNA string!" });
  });
});
