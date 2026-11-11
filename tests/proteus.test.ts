import { test, expect } from "bun:test";
import { cleanRhetoricalSlop, generateContract } from "../src/distiller";
import { loadIndex, searchSkills, verifyAllContracts } from "../src/indexer";
import { runArgusAudit } from "../hooks/proteus-post-edit-slop";
import path from "node:path";

const rootDir = path.resolve(__dirname, "..");

test("Daedalus: cleans emotional begging and rhetorical slop", () => {
  const dirty = "Hola querido agente! Por favor respira hondo y escribe código limpio, modular, bien comentado y sin bugs. Es muy importante para mi carrera!";
  const { cleaned, linesRemoved } = cleanRhetoricalSlop(dirty);
  expect(cleaned).not.toContain("respira hondo");
  expect(cleaned).not.toContain("muy importante para mi carrera");
});

test("Themis: ensures reference contracts adhere to <= 150 lines", () => {
  const result = verifyAllContracts(rootDir);
  expect(result.valid).toBe(true);
  expect(result.errors.length).toBe(0);
});

test("Cerberus & SEP-2640: index loads and searches without loading full contract body", () => {
  const reg = loadIndex(rootDir);
  expect(reg.skills.length).toBeGreaterThan(0);
  const found = searchSkills(rootDir, "discord");
  expect(found.length).toBeGreaterThan(0);
  expect(found[0].id).toBe("skill.discord.v1");
});

test("Argus: detects prohibited slop patterns in fake diff", () => {
  const badDiff = `
+++ b/src/sample.ts
+ // TODO: implement later
+ const foo: any = 123;
`;
  const audit = runArgusAudit(badDiff);
  expect(audit.success).toBe(false);
  expect(audit.violations.length).toBe(2);
});
