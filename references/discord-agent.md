# DOMAIN CONTRACT: DISCORD_AGENT
- **ID:** `skill.discord.v1`
- **Adapter CLI:** `bun run bin/proteus-tool-discord.ts`
- **Max Blast Radius:** `N1`
- **Read Scope:** ["src/platforms/discord/**"]
- **Write Scope:** ["src/platforms/discord/**"]

## 1. DOMAIN INVARIANTS (HARD CONSTRAINTS)
1. Strict User Isolation: Bot will only reply to authorized user IDs configured in environment.
2. Zero Rate-Limit Violations: Exponential backoff on HTTP 429 errors from Discord Gateway.
3. No Raw Memory Leaks: Process must close gateway listeners on disconnect.

## 2. CLI ADAPTER INTERFACE
| Subcommand | Input Payload (JSON) | Guaranteed Output (`stdout`) | Exit Code (`exit`) |
| :--- | :--- | :--- | :--- |
| `inspect` | `{"channelId": "string"}` | `{"messages": number, "active": boolean}` | `10: CHANNEL_NOT_FOUND` |
| `send` | `{"channelId": "string", "text": "string"}` | `{"messageId": "string", "sent": true}` | `20: PERMISSION_DENIED` |

## 3. PROHIBITED PATTERNS (ANTI-PATTERNS)
- FORBIDDEN to store raw authentication tokens in source control.
- FORBIDDEN aggressive polling intervals below 1000ms.

## 4. CONVERGENCE VERIFICATION
Atomic verification command: `bun test tests/discord.test.ts && bun run typecheck`
