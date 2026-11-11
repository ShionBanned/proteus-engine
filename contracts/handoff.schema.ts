/**
 * PROTEUS ENGINE: Standard Handoff Contracts & Schema (v1.0)
 *
 * Defines the strict, immutable data structures exchanged between:
 * - Sisyphus (Conductor)
 * - Proteus & Daedalus (Ingest & Distill)
 * - Themis (Contract Law)
 * - Cerberus (Context Firewall)
 * - Charon (Ephemeral Sandbox Process)
 * - Argus (LCS Diff-Scoped Auditor)
 * - Hephaestus (Sandboxed Deep Worker)
 */

export type RiskTier = "N0" | "N1" | "N2";

export type RoleName =
  | "PROTEUS"
  | "DAEDALUS"
  | "CERBERUS"
  | "CHARON"
  | "THEMIS"
  | "ARGUS"
  | "PROMETHEUS"
  | "MOMUS"
  | "SISYPHUS"
  | "HEPHAESTUS"
  | "EXPLORE";

/**
 * Manifest issued by Sisyphus to Charon to spawn an ephemeral worker in sandbox.
 * Contains only bounded scopes and exact invariant contracts.
 */
export interface SpawnManifest {
  readonly taskId: string;
  readonly targetRole: RoleName;
  readonly riskTier: RiskTier;
  readonly skillRef: string; // e.g. "references/discord-agent.md"
  readonly readScope: readonly string[]; // Glob patterns allowed for reading
  readonly writeScope: readonly string[]; // Glob patterns allowed for mutation ([] if read-only)
  readonly invariantsRequired: readonly string[];
  readonly acceptanceCmd: string; // e.g. "bun test tests/discord.test.ts"
}

/**
 * Atomic failure triage packet emitted when a worker cannot converge locally.
 * Prevents raw stack-trace dumps from leaking into the conductor's context.
 */
export interface FailureTriage {
  readonly failureClass: "INVARIANT_BREACH" | "TEST_FAILED" | "CONTRACT_LIMIT" | "TIMEOUT";
  readonly failingAssertion: string; // Compact summary <= 120 chars
  readonly reproductionCmd: string; // Command to reproduce failure
  readonly contractExpansionNeeded?: boolean; // Signal to Daedalus if the 150-line contract was insufficient
}

/**
 * Receipt returned by Charon to Sisyphus after an ephemeral subagent completes.
 * Maximum size: < 250 tokens. Zero raw code dumps allowed.
 */
export interface ExecutionReceipt {
  readonly taskId: string;
  readonly status: "CONVERGED" | "REJECTED_BY_HOOK" | "INVARIANT_BREACH" | "ESCALATION_REQUIRED";
  readonly riskTierExecuted: RiskTier;
  readonly mutatedFiles: readonly {
    path: string;
    linesAdded: number;
    linesRemoved: number;
    sha256After: string;
  }[];
  readonly verificationProof: {
    typecheckPassed: boolean;
    lcsSlopViolations: number;
    testExitCode: number;
    executionMs: number;
  };
  readonly triage?: FailureTriage; // Populated only on failure or escalation
  readonly architecturalSummary: string; // Max 280 characters.
}

/**
 * Registry entry in skills.index.json conforming to SEP-2640 Lazy Discovery.
 * Each entry consumes < 30 tokens in the index.
 */
export interface SkillIndexEntry {
  readonly id: string;
  readonly triggers: readonly string[];
  readonly description: string;
  readonly refPath: string; // e.g. "references/discord-agent.md"
  readonly cliPath: string; // e.g. "bin/proteus-tool-discord.ts"
  readonly maxRisk: RiskTier;
  readonly lineCount: number; // Enforces <= 150 lines
}

/**
 * Canonical format of references/{domain}.md
 */
export interface DomainContract {
  readonly domainId: string;
  readonly adapterCli: string;
  readonly maxBlastRadius: RiskTier;
  readonly readScope: readonly string[];
  readonly writeScope: readonly string[];
  readonly invariants: readonly string[];
  readonly cliInterface: readonly {
    subcommand: string;
    inputPayload: string;
    guaranteedOutput: string;
    exitCode: string;
  }[];
  readonly antiPatterns: readonly string[];
  readonly convergenceCheck: string;
}
