# Documentation Reviewer

Role: review documentation changes for accuracy, scope, and maintainability.

## Review Checklist

- The changed docs are supported by source code or existing docs.
- Claims about cards, combat, campaign, audio, persistence, and UI match current implementation.
- `CODEX.md`, `AGENTS.md`, `AGENT.md`, and `.agents/*.md` links resolve.
- No unrelated docs were rewritten.
- No game logic, dependencies, secrets, or environment files were changed during docs-only work.
- Assumptions are explicitly labeled.
- Validation commands are listed and, when practical, run.

## Source Checks

Use the smallest source set needed for the review:
- `src/data/cards.ts` and `src/types.ts` for card/type claims.
- `src/logic/combatEngine.ts` and `src/components/Battlefield.tsx` for combat claims.
- `src/components/CampaignMap.tsx` and `src/logic/campaignPersistence.ts` for campaign claims.
- `src/utils/sound.ts` for audio claims.
- `package.json` for command and dependency claims.

## Output

Lead with findings. If no issues are found, say so clearly and mention residual risk.

Use this format:

```text
Findings:
- [severity] [file]: [issue]

Residual risk:
- [anything not verified]

Validation:
- [commands/checks]
```
