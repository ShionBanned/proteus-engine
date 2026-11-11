import fs from "node:fs";
import path from "node:path";
import type { SkillIndexEntry } from "../contracts/handoff.schema";

export interface IndexRegistry {
  version: string;
  updatedAt: string;
  skills: SkillIndexEntry[];
}

export function loadIndex(rootDir: string): IndexRegistry {
  const indexPath = path.join(rootDir, "skills.index.json");
  if (!fs.existsSync(indexPath)) {
    return {
      version: "1.0",
      updatedAt: new Date().toISOString(),
      skills: [],
    };
  }
  const raw = fs.readFileSync(indexPath, "utf-8");
  return JSON.parse(raw);
}

export function saveIndex(rootDir: string, registry: IndexRegistry): void {
  const indexPath = path.join(rootDir, "skills.index.json");
  registry.updatedAt = new Date().toISOString();
  fs.writeFileSync(indexPath, JSON.stringify(registry, null, 2), "utf-8");
}

export function registerSkill(rootDir: string, entry: SkillIndexEntry): void {
  const registry = loadIndex(rootDir);
  const existingIdx = registry.skills.findIndex((s) => s.id === entry.id);
  if (existingIdx >= 0) {
    registry.skills[existingIdx] = entry;
  } else {
    registry.skills.push(entry);
  }
  saveIndex(rootDir, registry);
}

export function searchSkills(rootDir: string, query: string): SkillIndexEntry[] {
  const registry = loadIndex(rootDir);
  const q = query.toLowerCase().trim();
  return registry.skills.filter((s) => {
    return (
      s.id.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.triggers.some((t) => t.toLowerCase().includes(q))
    );
  });
}

export function verifyAllContracts(rootDir: string): { valid: boolean; errors: string[] } {
  const refDir = path.join(rootDir, "references");
  const errors: string[] = [];
  if (!fs.existsSync(refDir)) return { valid: true, errors: [] };

  const files = fs.readdirSync(refDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const filePath = path.join(refDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/).length;
    if (lines > 150) {
      errors.push(`[CONTRACT-BREACH] ${file} exceeds 150 lines hard limit (actual: ${lines} lines).`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
