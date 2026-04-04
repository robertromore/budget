import { describe, it, expect } from "vitest";
import { cleanStringForFuzzyMatching } from "$lib/utils/string-utilities";

describe("cleanStringForFuzzyMatching", () => {
  it("should lowercase and trim input", () => {
    expect(cleanStringForFuzzyMatching("  HELLO WORLD  ")).toBe("hello world");
  });

  it("should remove dollar amounts", () => {
    expect(cleanStringForFuzzyMatching("PAYMENT $123.45")).toBe("payment");
    expect(cleanStringForFuzzyMatching("$1,234.56 DEPOSIT")).toBe("deposit");
    expect(cleanStringForFuzzyMatching("STORE $50")).toBe("store");
  });

  it("should remove standalone trailing amounts", () => {
    expect(cleanStringForFuzzyMatching("WALMART 50.00")).toBe("walmart");
    expect(cleanStringForFuzzyMatching("TARGET 1,234.56")).toBe("target");
  });

  it("should remove dates in MM/DD/YYYY format", () => {
    expect(cleanStringForFuzzyMatching("PAYMENT 01/15/2024")).toBe("payment");
    expect(cleanStringForFuzzyMatching("12/31/23 STORE")).toBe("store");
  });

  it("should remove dates in YYYY-MM-DD format", () => {
    expect(cleanStringForFuzzyMatching("PAYMENT 2024-01-15")).toBe("payment");
  });

  it("should remove transaction IDs with * or #", () => {
    // The regex targets contiguous alphanumeric+symbol tokens like VISA*1234 or CHECK#5678
    expect(cleanStringForFuzzyMatching("TST*RESTAURANT")).toBe("");
    expect(cleanStringForFuzzyMatching("VISA*1234 PURCHASE")).toBe("purchase");
    // SQ *COFFEE has a space before *, so SQ and *COFFEE are separate tokens — SQ preserved
    expect(cleanStringForFuzzyMatching("SQ *COFFEE SHOP")).toBe("sq *coffee shop");
  });

  it("should remove long numeric sequences (8+ digits)", () => {
    expect(cleanStringForFuzzyMatching("VENMO 12345678")).toBe("venmo");
    expect(cleanStringForFuzzyMatching("TRANSFER 123456789012")).toBe("transfer");
  });

  it("should remove trailing reference numbers (4-7 digits)", () => {
    expect(cleanStringForFuzzyMatching("APPLECARD GSBANK 12345")).toBe("applecard gsbank");
    expect(cleanStringForFuzzyMatching("VENMO PAYMENT 1234567")).toBe("venmo payment");
  });

  it("should remove card number patterns", () => {
    expect(cleanStringForFuzzyMatching("PAYMENT ****1234")).toBe("payment");
  });

  it("should remove trailing I identifier", () => {
    expect(cleanStringForFuzzyMatching("AMAZON MARKETPLACE I")).toBe("amazon marketplace");
  });

  it("should handle combined noise", () => {
    expect(cleanStringForFuzzyMatching("VISA*1234 COFFEE SHOP $4.50 01/15/2024 12345678")).toBe(
      "coffee shop"
    );
  });

  it("should preserve meaningful payee names", () => {
    expect(cleanStringForFuzzyMatching("Walmart")).toBe("walmart");
    expect(cleanStringForFuzzyMatching("The Home Depot")).toBe("the home depot");
    expect(cleanStringForFuzzyMatching("AT&T")).toBe("at&t");
  });

  it("should return empty string for pure noise", () => {
    const result = cleanStringForFuzzyMatching("$123.45 01/15/2024 12345678");
    expect(result.trim()).toBe("");
  });

  it("should collapse whitespace after removals", () => {
    const result = cleanStringForFuzzyMatching("STORE   #123   PURCHASE");
    expect(result).not.toContain("  ");
  });
});
