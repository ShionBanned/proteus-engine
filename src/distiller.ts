import fs from "node:fs";
import path from "node:path";

export interface DistillationInput {
  domain: string;
  rawContent: string;
  adapterCmd?: string;
  maxRisk?: "N0" | "N1" | "N2";
}

export interface DistillationResult {
  domain: string;
  contractPath: string;
  adapterPath: string;
  linesPurged: number;
  finalLineCount: number;
  contractContent: string;
  adapterContent: string;
}

const RHETORICAL_PATTERNS = [
  /^(hola|hello|saludos|querido|dear|please|por favor)[^\n]*\n?/gim,
  /.*(muy importante para mi carrera|take a deep breath|respira hondo|think carefully).*\n?/gi,
  /.*(escribe código limpio, modular, bien comentado y sin bugs).*\n?/gi,
  /.*(actúa como un experto en|you are a world-class).*\n?/gi,
];

export function cleanRhetoricalSlop(content: string): { cleaned: string; linesRemoved: number } {
  const originalLines = content.split(/\r?\n/).length;
  let text = content;
  for (const pattern of RHETORICAL_PATTERNS) {
    text = text.replace(pattern, "");
  }
  const cleanedLines = text.split(/\r?\n/).length;
  return {
    cleaned: text.trim(),
    linesRemoved: Math.max(0, originalLines - cleanedLines),
  };
}

export function generateContract(input: DistillationInput): string {
  const { domain, rawContent, adapterCmd = `bun run bin/proteus-tool-${input.domain}.ts`, maxRisk = "N1" } = input;
  const { cleaned } = cleanRhetoricalSlop(rawContent);

  const contract = `# DOMAIN CONTRACT: ${domain.toUpperCase()}
- **ID:** skill.${domain.toLowerCase()}.v1
- **Adapter CLI:** ${adapterCmd}
- **Max Blast Radius:** ${maxRisk}
- **Read Scope:** ["src/${domain}/**", "contracts/**"]
- **Write Scope:** ["src/${domain}/**"]

## 1. DOMAIN INVARIANTS (HARD CONSTRAINTS)
1. Strict Type Safety: Zero 'any' types allowed.
2. Bounded Context: All execution must terminate within acceptance command bounds.

## 2. CLI ADAPTER INTERFACE
| Subcommand | Input Payload (JSON) | Guaranteed Output (\`stdout\`) | Exit Code (\`exit\`) |
| :--- | :--- | :--- | :--- |
| \`inspect\` | \`{"target": "string"}\` | \`{"status": "ok", "details": object}\` | \`10: NOT_FOUND\` |
| \`exec\` | \`{"action": "string", "dryRun": boolean}\` | \`{"converged": boolean}\` | \`20: INVARIANT_BREACH\` |

## 3. PROHIBITED PATTERNS (ANTI-PATTERNS)
- FORBIDDEN to mutate files outside Write Scope.
- FORBIDDEN to suppress compiler diagnostics (@ts-ignore / eslint-disable).

## 4. CONVERGENCE VERIFICATION
Atomic verification command: \`bun test tests/${domain}.test.ts && bun run typecheck\`

## 5. EXTRACTED SYNTHETIC SNIPPET
${cleaned.slice(0, 1500)}
`;

  const lines = contract.split(/\r?\n/);
  if (lines.length > 150) {
    // Hard ceiling enforcement: clip to <= 150 lines
    return lines.slice(0, 149).join("\n") + "\n# [TRUNCATED AT 150 LINES HARD LIMIT BY DAEDALUS]";
  }
  return contract;
}

export function generateAdapterCli(domain: string): string {
  return `#!/usr/bin/env bun
/**
 * PROTEUS ENGINE: Lazy CLI Dispatcher for ${domain.toUpperCase()}
 * Standard UNIX interface (Zero System Prompt Token Cost)
 */

import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    schema: { type: "boolean", short: "s" },
    dryRun: { type: "boolean", default: false },
    input: { type: "string", short: "i" },
  },
  allowPositionals: true,
});

const command = positionals[0] || "inspect";

if (values.help) {
  console.log(\`
Usage: proteus-tool-${domain} [command] [options]

Commands:
  inspect   Analyze target without mutation
  exec      Execute domain action with bounded scope

Options:
  -h, --help    Show this message
  -s, --schema  Output input/output JSON schemas
  -i, --input   JSON payload input
  --dryRun      Validate invariants without writing to disk
\`);
  process.exit(0);
}

if (values.schema) {
  console.log(JSON.stringify({
    domain: "${domain}",
    commands: ["inspect", "exec"],
    schemaVersion: "1.0",
  }, null, 2));
  process.exit(0);
}

// Emitting JSON structured execution output
console.log(JSON.stringify({
  domain: "${domain}",
  command,
  dryRun: values.dryRun,
  status: "CONVERGED",
  timestamp: new Date().toISOString(),
}));
process.exit(0);
`;
}

export function distillDomain(rootDir: string, input: DistillationInput): DistillationResult {
  const contractContent = generateContract(input);
  const adapterContent = generateAdapterCli(input.domain);

  const refDir = path.join(rootDir, "references");
  const binDir = path.join(rootDir, "bin");
  if (!fs.existsSync(refDir)) fs.mkdirSync(refDir, { recursive: true });
  if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

  const contractPath = path.join(refDir, `${input.domain}.md`);
  const adapterPath = path.join(binDir, `proteus-tool-${input.domain}.ts`);

  fs.writeFileSync(contractPath, contractContent, "utf-8");
  fs.writeFileSync(adapterPath, adapterContent, "utf-8");

  const finalLines = contractContent.split(/\r?\n/).length;

  return {
    domain: input.domain,
    contractPath,
    adapterPath,
    linesPurged: cleanRhetoricalSlop(input.rawContent).linesRemoved,
    finalLineCount: finalLines,
    contractContent,
    adapterContent,
  };
}
