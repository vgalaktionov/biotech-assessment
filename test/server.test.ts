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

  test("should be able to create single valid dna string", async () => {
    const dna_strings = ["AAGATGCCGT"];

    await request(api)
      .post("/dna")
      .send({ dna_strings })
      .expect(201);

    const result = await query(sql`SELECT dna_string FROM dna;`);
    expect(result.rows.map(r => r.dna_string)).toEqual(dna_strings);
  });

  test("should be able to create multiple valid dna strings", async () => {
    const dna_strings = ["AAGATGCCGT", "AATTTGCTTGGCAAATCGTATGCCTTGGG"];

    await request(api)
      .post("/dna")
      .send({ dna_strings })
      .expect(201);

    const result = await query(sql`SELECT dna_string FROM dna;`);
    expect(result.rows.map(r => r.dna_string)).toEqual(dna_strings);
  });

  test("should error with create on invalid dna string", async () => {
    const dna_strings = ["XYZ"];

    await request(api)
      .post("/dna")
      .set("Accept", "application/json")
      .send({ dna_strings })
      .expect(400, { status: 400, message: "Invalid DNA string!" });

    const result = await query(sql`SELECT dna_string FROM dna;`);
    expect(result.rows.map(r => r.dna_string)).toEqual([]);
  });

  test("should be able to do exact search", async () => {
    await query(sql`
      INSERT INTO dna (dna_string)
      VALUES
        ('ACGCCTGTTGAGCCT'),
        ('GCTCCCAGGATT'),
        ('GGTATTCCCTTACCGAAG'),
        ('CCAAAGCCACCGT'),
        ('ACTAAGGCTT'),
        ('CTAGCGGATTA'),
        ('CATTCCGTGA'),
        ('TTTGCAGTCGTAAG'),
        ('ACCCTTCATCCAATCGGAA'),
        ('CAGTCATTGTAGCT');
    `);

    await request(api)
      .get("/dna/search")
      .query({ search_string: "GAT" })
      .set("Accept", "application/json")
      .expect(200, ["GCTCCCAGGATT", "CTAGCGGATTA"]);
  });

  test("should be able to do fuzzy search", async () => {
    await query(sql`
      INSERT INTO dna (dna_string)
      VALUES
        ('ACGCCTGTTGAGCCT'),
        ('GCTCCCAGGATT'),
        ('GGTATTCCCTTACCGAAG'),
        ('CCAAAGCCACCGT'),
        ('ACTAAGGCTT'),
        ('CTAGCGGATTA'),
        ('CATTCCGTGA'),
        ('TTTGCAGTCGTAAG'),
        ('ACCCTTCATCCAATCGGAA'),
        ('CAGTCATTGTAGCT');
    `);

    await request(api)
      .get("/dna/search")
      .query({ search_string: "GAT", levenshtein: 10 })
      .set("Accept", "application/json")
      .expect(200, [
        "CCAAAGCCACCGT",
        "GCTCCCAGGATT",
        "ACTAAGGCTT",
        "CTAGCGGATTA",
        "CATTCCGTGA"
      ]);
  });

  test("should error on search with invalid dna substring", async () => {
    await request(api)
      .get("/dna/search")
      .query({ search_string: "OMG" })
      .set("Accept", "application/json")
      .expect(400, { status: 400, message: "Invalid DNA string!" });
  });
});
