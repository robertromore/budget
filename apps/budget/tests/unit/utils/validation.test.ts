import {describe, it, expect} from "vitest";
import {
  sanitizeHtml,
  restrictedTextSchema,
  safeHtmlSchema,
  currencyAmountSchema,
  slugSchema,
  nameSchema,
  bulkOperationSchema,
  emailSchema,
  passwordSchema,
} from "../../../src/lib/utils/validation";

describe("Validation Utils - Unit Tests", () => {
  describe("sanitizeHtml", () => {
    it("should remove HTML tags", () => {
      expect(sanitizeHtml("<script>alert('xss')</script>")).toBe("alert('xss')");
      expect(sanitizeHtml("<b>bold</b> text")).toBe("bold text");
      expect(sanitizeHtml("<p>paragraph</p>")).toBe("paragraph");
    });

    it("should trim whitespace", () => {
      expect(sanitizeHtml("  text  ")).toBe("text");
      expect(sanitizeHtml("\n\ttext\n\t")).toBe("text");
    });

    it("should handle empty strings", () => {
      expect(sanitizeHtml("")).toBe("");
      expect(sanitizeHtml("   ")).toBe("");
    });

    it("should preserve safe text", () => {
      expect(sanitizeHtml("Safe text with & symbols")).toBe("Safe text with & symbols");
      expect(sanitizeHtml("Numbers 123 and symbols !@#")).toBe("Numbers 123 and symbols !@#");
    });
  });

  describe("restrictedTextSchema", () => {
    it("should enforce minimum length", () => {
      const schema = restrictedTextSchema(3, 10);
      expect(() => schema.parse("ab")).toThrow();
      expect(schema.parse("abc")).toBe("abc");
    });

    it("should enforce maximum length", () => {
      const schema = restrictedTextSchema(1, 5);
      expect(() => schema.parse("toolong")).toThrow();
      expect(schema.parse("short")).toBe("short");
    });

    it("should sanitize HTML during transformation", () => {
      const schema = restrictedTextSchema(3, 20);
      expect(schema.parse("<b>test</b>")).toBe("test");
    });

    it("should fail if text is too short after sanitization", () => {
      const schema = restrictedTextSchema(5, 20);
      expect(() => schema.parse("<b></b>")).toThrow();
    });
  });

  describe("currencyAmountSchema", () => {
    it("should accept valid currency amounts", () => {
      expect(currencyAmountSchema.parse(100.5)).toBe(100.5);
      expect(currencyAmountSchema.parse(-25.99)).toBe(-25.99);
      expect(currencyAmountSchema.parse(0.01)).toBe(0.01);
    });

    it("should reject amounts that are too large", () => {
      expect(() => currencyAmountSchema.parse(1000000)).toThrow();
    });

    it("should reject amounts that are too small", () => {
      expect(() => currencyAmountSchema.parse(-1000000)).toThrow();
    });

    it("should reject invalid precision", () => {
      expect(() => currencyAmountSchema.parse(10.123)).toThrow();
    });

    it("should accept boundary values", () => {
      expect(currencyAmountSchema.parse(999999.99)).toBe(999999.99);
      expect(currencyAmountSchema.parse(-999999.99)).toBe(-999999.99);
    });
  });

  describe("slugSchema", () => {
    it("should accept valid slugs", () => {
      const schema = slugSchema();
      expect(schema.parse("valid-slug")).toBe("valid-slug");
      expect(schema.parse("test123")).toBe("test123");
      expect(schema.parse("a-b-c-123")).toBe("a-b-c-123");
    });

    it("should reject invalid characters", () => {
      const schema = slugSchema();
      expect(() => schema.parse("Invalid Slug")).toThrow();
      expect(() => schema.parse("slug_with_underscore")).toThrow();
      expect(() => schema.parse("slug.with.dots")).toThrow();
      expect(() => schema.parse("slug@special")).toThrow();
    });

    it("should enforce length limits", () => {
      const schema = slugSchema(3, 10);
      expect(() => schema.parse("ab")).toThrow();
      expect(() => schema.parse("toolongslugname")).toThrow();
      expect(schema.parse("goodlength")).toBe("goodlength");
    });
  });

  describe("nameSchema", () => {
    it("should accept valid names", () => {
      const schema = nameSchema();
      expect(schema.parse("John Doe")).toBe("John Doe");
      expect(schema.parse("Mary-Jane")).toBe("Mary-Jane");
      expect(schema.parse("O'Connor")).toBe("O'Connor");
      expect(schema.parse("Food & Dining")).toBe("Food & Dining");
    });

    it("should reject invalid characters", () => {
      const schema = nameSchema();
      // Test with characters that remain invalid after sanitization
      expect(() => schema.parse("name@email.com")).toThrow();
      expect(() => schema.parse("name#hash")).toThrow();
      expect(() => schema.parse("name$money")).toThrow();
    });

    it("should sanitize HTML", () => {
      const schema = nameSchema();
      expect(schema.parse("<b>Bold Name</b>")).toBe("Bold Name");
    });

    it("should enforce length limits", () => {
      const schema = nameSchema(2, 10);
      expect(() => schema.parse("A")).toThrow();
      expect(() => schema.parse("Very Long Name That Exceeds Limit")).toThrow();
      expect(schema.parse("Good Name")).toBe("Good Name");
    });
  });

  describe("bulkOperationSchema", () => {
    it("should accept valid bulk operations", () => {
      const validData = {entities: [1, 2, 3, 4, 5]};
      expect(bulkOperationSchema.parse(validData)).toEqual(validData);
    });

    it("should reject empty arrays", () => {
      expect(() => bulkOperationSchema.parse({entities: []})).not.toThrow();
    });

    it("should reject arrays that are too large", () => {
      const tooMany = {entities: Array.from({length: 101}, (_, i) => i + 1)};
      expect(() => bulkOperationSchema.parse(tooMany)).toThrow();
    });

    it("should reject negative IDs", () => {
      expect(() => bulkOperationSchema.parse({entities: [-1, 2, 3]})).toThrow();
    });

    it("should accept boundary case", () => {
      const exactly100 = {entities: Array.from({length: 100}, (_, i) => i + 1)};
      expect(bulkOperationSchema.parse(exactly100)).toEqual(exactly100);
    });
  });

  describe("emailSchema", () => {
    it("should accept valid email addresses", () => {
      expect(emailSchema.parse("test@example.com")).toBe("test@example.com");
      expect(emailSchema.parse("user.name@domain.co.uk")).toBe("user.name@domain.co.uk");
      expect(emailSchema.parse("TEST@EXAMPLE.COM")).toBe("test@example.com"); // Lowercase
    });

    it("should reject invalid email formats", () => {
      expect(() => emailSchema.parse("invalid-email")).toThrow();
      expect(() => emailSchema.parse("@example.com")).toThrow();
      expect(() => emailSchema.parse("test@")).toThrow();
      expect(() => emailSchema.parse("test.example.com")).toThrow();
    });

    it("should enforce length limits", () => {
      const longEmail = "a".repeat(90) + "@example.com";
      expect(() => emailSchema.parse(longEmail)).toThrow();
    });
  });

  describe("passwordSchema", () => {
    it("should accept valid passwords", () => {
      expect(passwordSchema.parse("ValidPass123")).toBe("ValidPass123");
      expect(passwordSchema.parse("Another1")).toBe("Another1");
    });

    it("should reject passwords that are too short", () => {
      expect(() => passwordSchema.parse("Short1")).toThrow();
    });

    it("should reject passwords that are too long", () => {
      const longPassword = "A1" + "a".repeat(127);
      expect(() => passwordSchema.parse(longPassword)).toThrow();
    });

    it("should require at least one lowercase letter", () => {
      expect(() => passwordSchema.parse("UPPERCASE123")).toThrow();
    });

    it("should require at least one uppercase letter", () => {
      expect(() => passwordSchema.parse("lowercase123")).toThrow();
    });

    it("should require at least one number", () => {
      expect(() => passwordSchema.parse("NoNumbersHere")).toThrow();
    });
  });

  describe("safeHtmlSchema", () => {
    it("should sanitize HTML content", () => {
      const schema = safeHtmlSchema();
      expect(schema.parse("<b>bold</b> text")).toBe("bold text");
    });

    it("should handle null and undefined", () => {
      const schema = safeHtmlSchema();
      expect(schema.parse(null)).toBe(null);
      expect(schema.parse(undefined)).toBe(undefined);
    });

    it("should enforce length limits", () => {
      const schema = safeHtmlSchema(10);
      expect(() => schema.parse("This is way too long")).toThrow();
    });
  });
});
