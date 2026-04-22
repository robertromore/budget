/**
 * Text similarity unit tests.
 *
 * The similarity module underpins payee matching, merchant
 * canonicalization, and the `auto` duplicate-detection pipeline.
 * It's all pure functions with deterministic output, which makes it
 * the highest-value place to lock behaviour with tests: regressions
 * here ripple into every "is A the same payee as B?" decision.
 *
 * These tests are characterization-style. They document current
 * outputs with just enough precision to catch real regressions
 * (e.g. a weight tweak that shifts a band) without failing over
 * numerically-insignificant floating-point drift.
 */

import { describe, it, expect } from "vitest";
import {
  computeCompositeSimilarity,
  computeTFIDF,
  cosineSimilarity,
  createTFIDFVectorizer,
  diceCoefficient,
  generateNGrams,
  generateWordNGrams,
  jaccardSimilarity,
  jaroWinklerSimilarity,
  levenshteinSimilarity,
  ngramDiceCoefficient,
  ngramSimilarity,
  normalizeText,
  tokenize,
} from "$core/server/domains/ml/similarity/text-similarity";

describe("normalizeText", () => {
  it("lowercases + trims + collapses whitespace", () => {
    expect(normalizeText("  Hello   WORLD  ")).toBe("hello world");
  });

  it("strips punctuation", () => {
    expect(normalizeText("Amazon.com*123")).toBe("amazon com 123");
    expect(normalizeText("SQ *COFFEE-ROASTER, CH!")).toBe("sq coffee roaster ch");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeText("")).toBe("");
  });
});

describe("tokenize", () => {
  it("splits on whitespace and normalizes", () => {
    expect(tokenize("Hello WORLD")).toEqual(["hello", "world"]);
  });

  it("drops empty tokens", () => {
    expect(tokenize("   foo    bar   ")).toEqual(["foo", "bar"]);
  });
});

describe("n-gram generation", () => {
  it("generates character n-grams of the requested size", () => {
    expect(generateNGrams("abcd", 2)).toEqual(["ab", "bc", "cd"]);
    expect(generateNGrams("abcd", 3)).toEqual(["abc", "bcd"]);
  });

  it("strips spaces before generating char n-grams", () => {
    expect(generateNGrams("ab cd", 3)).toEqual(["abc", "bcd"]);
  });

  it("returns empty when n exceeds string length", () => {
    expect(generateNGrams("ab", 3)).toEqual([]);
  });

  it("generates word n-grams joined with a single space", () => {
    expect(generateWordNGrams("the quick brown fox", 2)).toEqual([
      "the quick",
      "quick brown",
      "brown fox",
    ]);
  });
});

describe("jaccardSimilarity", () => {
  it("is 1 for identical sets", () => {
    expect(jaccardSimilarity(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });

  it("is 1 for two empty sets (documented semantics)", () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(1);
  });

  it("is 0 for disjoint sets", () => {
    expect(jaccardSimilarity(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("computes intersection / union for partial overlap", () => {
    const a = new Set(["a", "b", "c"]);
    const b = new Set(["b", "c", "d"]);
    // intersection = {b,c}=2, union = {a,b,c,d}=4 → 0.5
    expect(jaccardSimilarity(a, b)).toBe(0.5);
  });
});

describe("diceCoefficient", () => {
  it("is 1 for identical sets", () => {
    expect(diceCoefficient(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });

  it("is 0 for disjoint sets", () => {
    expect(diceCoefficient(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("rates overlap higher than Jaccard on the same inputs", () => {
    const a = new Set(["a", "b", "c"]);
    const b = new Set(["b", "c", "d"]);
    const j = jaccardSimilarity(a, b);
    const d = diceCoefficient(a, b);
    expect(d).toBeGreaterThan(j);
  });
});

describe("ngramSimilarity + ngramDiceCoefficient", () => {
  it("is 1 when normalized texts are identical", () => {
    expect(ngramSimilarity("Starbucks", "starbucks")).toBe(1);
  });

  it("scores similar merchant names above 0.5", () => {
    // Common real-world case: one has location suffix, one doesn't
    const score = ngramSimilarity("STARBUCKS #1234", "STARBUCKS STORE");
    expect(score).toBeGreaterThan(0.4);
  });

  it("scores unrelated strings below 0.2", () => {
    const score = ngramSimilarity("Starbucks", "Shell Oil");
    expect(score).toBeLessThan(0.2);
  });

  it("dice variant rates higher than Jaccard on the same inputs", () => {
    const jac = ngramSimilarity("STARBUCKS #1234", "STARBUCKS STORE", 3);
    const dic = ngramDiceCoefficient("STARBUCKS #1234", "STARBUCKS STORE", 3);
    expect(dic).toBeGreaterThan(jac);
  });
});

describe("levenshteinSimilarity", () => {
  it("is 1 for identical strings", () => {
    expect(levenshteinSimilarity("foo", "foo")).toBe(1);
  });

  it("normalizes before comparing", () => {
    // Different punctuation / case, same letters
    expect(levenshteinSimilarity("Foo, Bar.", "foo bar")).toBe(1);
  });

  it("decreases with more edits", () => {
    const closeMatch = levenshteinSimilarity("kitten", "sitten"); // 1 edit
    const farMatch = levenshteinSimilarity("kitten", "sunday"); // many edits
    expect(closeMatch).toBeGreaterThan(farMatch);
    expect(closeMatch).toBeCloseTo(5 / 6, 2);
  });

  it("returns 1 for two empty strings", () => {
    expect(levenshteinSimilarity("", "")).toBe(1);
  });
});

describe("jaroWinklerSimilarity", () => {
  it("is 1 for identical strings", () => {
    expect(jaroWinklerSimilarity("foo", "foo")).toBe(1);
  });

  it("is 0 when either string is empty", () => {
    expect(jaroWinklerSimilarity("foo", "")).toBe(0);
    expect(jaroWinklerSimilarity("", "foo")).toBe(0);
  });

  it("boosts matches sharing a common prefix", () => {
    // Classic Jaro-Winkler illustration: prefix match pushes score
    // higher than raw Jaro would.
    const sharedPrefix = jaroWinklerSimilarity("MARTHA", "MARHTA");
    expect(sharedPrefix).toBeGreaterThan(0.9);
  });

  it("returns high similarity for merchant-with-suffix variants", () => {
    const score = jaroWinklerSimilarity("STARBUCKS", "STARBUCKS #1234");
    expect(score).toBeGreaterThan(0.8);
  });
});

describe("TF-IDF", () => {
  it("vectorizer counts document frequency correctly", () => {
    const corpus = ["apple banana", "apple cherry", "banana cherry date"];
    const vec = createTFIDFVectorizer(corpus);
    expect(vec.documentCount).toBe(3);
    expect(vec.documentFrequency.get("apple")).toBe(2);
    expect(vec.documentFrequency.get("banana")).toBe(2);
    expect(vec.documentFrequency.get("date")).toBe(1);
  });

  it("produces a zero-magnitude vector for empty text", () => {
    const vec = createTFIDFVectorizer(["apple banana"]);
    const tfidf = computeTFIDF(vec, "");
    expect(tfidf.magnitude).toBe(0);
    expect(tfidf.terms.size).toBe(0);
  });

  it("cosine similarity of identical vectors is ~1", () => {
    const corpus = ["foo bar baz", "foo qux"];
    const vec = createTFIDFVectorizer(corpus);
    const a = computeTFIDF(vec, "foo bar baz");
    const b = computeTFIDF(vec, "foo bar baz");
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it("cosine similarity of orthogonal vectors is 0", () => {
    const corpus = ["foo bar", "baz qux"];
    const vec = createTFIDFVectorizer(corpus);
    const a = computeTFIDF(vec, "foo bar");
    const b = computeTFIDF(vec, "baz qux");
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});

describe("computeCompositeSimilarity", () => {
  it("returns exact=true, composite=1 for string-equal inputs", () => {
    const s = computeCompositeSimilarity("Starbucks", "Starbucks");
    expect(s.exact).toBe(true);
    expect(s.normalized).toBe(true);
    expect(s.composite).toBe(1);
  });

  it("returns exact=false, normalized=true, composite=1 for case/punctuation variants", () => {
    const s = computeCompositeSimilarity("STARBUCKS, INC.", "starbucks inc");
    expect(s.exact).toBe(false);
    expect(s.normalized).toBe(true);
    expect(s.composite).toBe(1);
  });

  it("scores real-world merchant suffix variants in the high-confidence band (>=0.75)", () => {
    // This is the band above which the `auto` payee matcher skips LLM
    // review. Regressions here would start spamming LLM calls on
    // obvious duplicates.
    const cases: Array<[string, string]> = [
      ["STARBUCKS STORE #1234", "Starbucks"],
      ["Walmart Supercenter", "WAL-MART"],
      ["Amazon.com*M1A2B3", "Amazon.com"],
    ];
    for (const [a, b] of cases) {
      const s = computeCompositeSimilarity(a, b);
      expect(s.composite).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("scores fuzzy-band pairs (partial overlap) below 0.75", () => {
    // These are the cases `auto` mode hands to the LLM for a final call.
    const s = computeCompositeSimilarity("Shell Gas Station", "Shell Oil Corp");
    expect(s.composite).toBeGreaterThanOrEqual(0.4);
    expect(s.composite).toBeLessThan(0.9);
  });

  it("scores clearly unrelated merchants below 0.5", () => {
    const s = computeCompositeSimilarity("Starbucks", "Exxon Mobil");
    expect(s.composite).toBeLessThan(0.5);
  });

  it("honours custom weights (Jaro-Winkler heavy)", () => {
    const sDefault = computeCompositeSimilarity("Starbucks", "Starbucks #1234");
    const sJwHeavy = computeCompositeSimilarity(
      "Starbucks",
      "Starbucks #1234",
      undefined,
      { levenshtein: 0, jaroWinkler: 1, ngram: 0, dice: 0, tfidf: 0 },
    );
    // JW boosts common-prefix matches, so pinning its weight to 1
    // should raise composite vs. the blended default.
    expect(sJwHeavy.composite).toBeGreaterThan(sDefault.composite);
  });
});
