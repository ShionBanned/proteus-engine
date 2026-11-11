#!/usr/bin/env bun
/**
 * PROTEUS ENGINE: Argus LCS Diff-Scoped Mechanical Scanner
 *
 * Enforces zero-tolerance against prompt/code slop on ADDED lines only (+).
 * Older legacy files are not penalized unless modified.
 */

import { spawnSync } from "node:child_process";

export interface SlopRule {
  readonly id: string;
  readonly regex: RegExp;
  readonly reason: string;
}

export const FORBIDDEN_SLOP_RULES: readonly SlopRule[] = [
  {
    id: "SLOP-01",
    regex: /\b(TODO|FIXME|HACK|XXX|PLACEHOLDER)\b/i,
    reason: "Prohibited lazy marker: do not defer implementation with comments.",
  },
  {
    id: "SLOP-02",
    regex: /:\s*any\b|\bas\s+any\b/,
    reason: "Type system bypass detected: explicit use of 'any' is forbidden.",
  },
  {
    id: "SLOP-03",
    regex: /@ts-(ignore|nocheck)|eslint-disable/,
    reason: "Illegal diagnostic suppression of compiler/linter.",
  },
  {
    id: "SLOP-04",
    regex: /catch\s*\([^)]*\)\s*\{\s*(\/\/.*)?\s*\}/,
    reason: "Silent exception swallow in empty catch block.",
  },
  {
    id: "SLOP-05",
    regex: /\.\.\.\s*(rest of|existing|implement|código|code)/i,
    reason: "Lazy truncation comment detected in code diff.",
  },
];

export function runArgusAudit(diffText?: string): { success: boolean; violations: string[] } {
  let diff = diffText;
  if (diff === undefined) {
    const res = spawnSync("git", ["diff", "-U0", "HEAD"], { encoding: "utf-8" });
    if (res.error) {
      return { success: false, violations: [`Git diff failed: ${res.error.message}`] };
    }
    diff = res.stdout || "";
  }

  const lines = diff.split(/\r?\n/);
  let currentFile = "unknown";
  const violations: string[] = [];

  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6).trim();
      continue;
    }
    // Only inspect genuine added lines (exclude unified diff header lines +++)
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const addedContent = line.slice(1);
      for (const rule of FORBIDDEN_SLOP_RULES) {
        if (rule.regex.test(addedContent)) {
          violations.push(`[${rule.id}] ${currentFile}: "${addedContent.trim()}" -> ${rule.reason}`);
        }
      }
    }
  }

  return {
    success: violations.length === 0,
    violations,
  };
}

if (import.meta.main) {
  const result = runArgusAudit();
  if (!result.success) {
    console.error("\x1b[31m[ARGUS-VETO]\x1b[0m Critical Proteus post-edit slop detected:");
    for (const v of result.violations) {
      console.error(`  \x1b[33m*\x1b[0m ${v}`);
    }
    process.exit(22);
  } else {
    console.log("\x1b[32m[ARGUS-PASSED]\x1b[0m 0 slop violations detected in current diff.");
    process.exit(0);
  }
}
