import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { resolveMigrationsFolder as resolveBunMigrationsFolder } from "./test-db";
import { resolveMigrationsFolder as resolveNodeMigrationsFolder } from "./test-db-node";

describe("Integration test DB migration path resolution", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const resolvers = [
    { name: "bun sqlite helper", resolve: resolveBunMigrationsFolder },
    { name: "node sqlite helper", resolve: resolveNodeMigrationsFolder },
  ];

  for (const resolver of resolvers) {
    it(`${resolver.name} prefers cwd/drizzle when present`, () => {
      const existsSpy = vi.spyOn(fs, "existsSync");
      existsSpy.mockReturnValueOnce(true);

      const result = resolver.resolve();

      expect(result).toBe(path.join(process.cwd(), "drizzle"));
      expect(existsSpy).toHaveBeenCalledTimes(1);
    });

    it(`${resolver.name} falls back to cwd/apps/budget/drizzle`, () => {
      const existsSpy = vi.spyOn(fs, "existsSync");
      existsSpy.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const result = resolver.resolve();

      expect(result).toBe(path.join(process.cwd(), "apps", "budget", "drizzle"));
      expect(existsSpy).toHaveBeenCalledTimes(2);
    });

    it(`${resolver.name} throws when no candidate has a migration journal`, () => {
      const existsSpy = vi.spyOn(fs, "existsSync");
      existsSpy.mockReturnValue(false);

      expect(() => resolver.resolve()).toThrow(
        "Could not locate drizzle migrations folder."
      );
      expect(existsSpy).toHaveBeenCalledTimes(3);
    });
  }
});
