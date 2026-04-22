/**
 * LSH index unit tests.
 *
 * The LSH (MinHash + banding) index is the pre-filter stage of the
 * payee-matching pipeline. It shrinks an O(N²) all-pairs comparison
 * down to a handful of candidates before the expensive composite
 * similarity + LLM narrowing runs. A regression here (wrong band
 * count, broken signature, estimatedSimilarity drifting) silently
 * starves the downstream stages of correct candidates — which
 * manifests as "duplicates not found" in the UI rather than a crash.
 *
 * Characterization style: assert bands on estimatedSimilarity for
 * known-similar and known-unrelated merchant pairs, plus the
 * structural invariants (size, add/remove, export/import round-trip).
 */

import { describe, it, expect } from "vitest";
import { createLSHIndex } from "$core/server/domains/ml/similarity/lsh-index";

describe("createLSHIndex — config validation", () => {
  it("throws when numHashFunctions is not divisible by numBands", () => {
    expect(() => createLSHIndex({ numHashFunctions: 100, numBands: 7 })).toThrow(
      /divisible/i,
    );
  });

  it("accepts valid default config", () => {
    const index = createLSHIndex();
    expect(index.size()).toBe(0);
  });
});

describe("LSHIndex — size / add / remove", () => {
  it("starts empty", () => {
    const index = createLSHIndex();
    expect(index.size()).toBe(0);
  });

  it("reports size after adds", () => {
    const index = createLSHIndex();
    index.add(1, "Starbucks");
    index.add(2, "Walmart");
    expect(index.size()).toBe(2);
  });

  it("treats re-adding the same id as an upsert", () => {
    const index = createLSHIndex();
    index.add(1, "Starbucks");
    index.add(1, "Starbucks Coffee"); // same id, different text
    expect(index.size()).toBe(1);
  });

  it("remove() returns true on hit, false on miss", () => {
    const index = createLSHIndex();
    index.add(1, "Starbucks");
    expect(index.remove(1)).toBe(true);
    expect(index.remove(1)).toBe(false);
    expect(index.size()).toBe(0);
  });

  it("clear() empties the index", () => {
    const index = createLSHIndex();
    index.add(1, "foo");
    index.add(2, "bar");
    index.clear();
    expect(index.size()).toBe(0);
    expect(index.query("foo")).toEqual([]);
  });
});

describe("LSHIndex — query semantics", () => {
  it("returns empty for queries against an empty index", () => {
    const index = createLSHIndex();
    expect(index.query("Starbucks")).toEqual([]);
  });

  it("returns the document itself with similarity ~1 on exact match", () => {
    const index = createLSHIndex();
    index.add(1, "Starbucks Coffee Company");
    const results = index.query("Starbucks Coffee Company");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe(1);
    expect(results[0].estimatedSimilarity).toBeGreaterThan(0.9);
  });

  it("ranks a close variant above an unrelated document", () => {
    // LSH banding requires candidates to collide in at least one band.
    // Using a close variant of the query text ensures at least one
    // band hash matches; the unrelated document should not surface
    // (or should score much lower if it does).
    const index = createLSHIndex();
    index.add(1, "Starbucks Coffee Company Store");
    index.add(2, "Exxon Mobil Gas Station");
    const results = index.query("Starbucks Coffee Company");
    expect(results[0]?.id).toBe(1);
    const exxon = results.find((r) => r.id === 2);
    if (exxon) {
      expect(results[0].estimatedSimilarity).toBeGreaterThan(
        exxon.estimatedSimilarity,
      );
    }
  });

  it("respects the maxResults cap", () => {
    const index = createLSHIndex();
    for (let i = 0; i < 10; i++) {
      index.add(i, `Starbucks Store #${i}`);
    }
    const results = index.query("Starbucks", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("returns results sorted by estimatedSimilarity descending", () => {
    const index = createLSHIndex();
    index.add(1, "Starbucks");
    index.add(2, "Starbucks Coffee");
    index.add(3, "Starbucks Coffee Company Store #1234");
    const results = index.query("Starbucks Coffee Company");
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].estimatedSimilarity).toBeGreaterThanOrEqual(
        results[i].estimatedSimilarity,
      );
    }
  });

  it("preserves metadata on returned results", () => {
    const index = createLSHIndex();
    index.add(1, "Starbucks", { category: "coffee" });
    const results = index.query("Starbucks");
    expect(results[0].metadata).toEqual({ category: "coffee" });
  });
});

describe("LSHIndex — export / import round-trip", () => {
  it("re-imports produce identical query behaviour", () => {
    const a = createLSHIndex();
    a.add(1, "Starbucks Coffee");
    a.add(2, "Walmart Supercenter");

    const data = a.export();
    const b = createLSHIndex();
    b.import(data);

    expect(b.size()).toBe(2);
    const resA = a.query("Starbucks");
    const resB = b.query("Starbucks");
    expect(resB.map((r) => r.id)).toEqual(resA.map((r) => r.id));
  });
});

describe("LSHIndex — rebuild()", () => {
  it("is a no-op for externally-visible query results", () => {
    const index = createLSHIndex();
    index.add(1, "Starbucks");
    index.add(2, "Walmart");
    const before = index.query("Starbucks");
    index.rebuild();
    const after = index.query("Starbucks");
    expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));
  });
});
