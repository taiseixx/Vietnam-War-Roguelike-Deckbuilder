# AGENTS.md

BMAD-style Codex agent index for the Vietnam War Roguelike Deckbuilder.

Read order for every agent:
1. `CODEX.md` for behavioral rules.
2. `AGENT.md` for project-specific engineering, game design, historical, and validation rules.
3. The relevant `.agents/*.md` role file for the current task.

This file does not replace `AGENT.md`. The existing `AGENT.md` remains the source of truth for repo-specific constraints.

## Working Model

Use a lightweight BMAD-style workflow: specialized agents collaborate across analysis, writing, and review, but all docs must be grounded in verified repo facts.

Default documentation loop:
1. Inspect the source, manifests, and existing docs before editing.
2. Identify which docs are affected by the change.
3. Update only the affected docs.
4. Mark assumptions explicitly when source evidence is incomplete.
5. Run validation before calling the work complete.

## Sub-Agents

- `.agents/doc-analyst.md`: maps code or design changes to impacted documentation.
- `.agents/game-design-doc.md`: maintains `GDD.md`, balance notes, faction identity, and historical sensitivity.
- `.agents/technical-doc.md`: maintains `TDD.md`, architecture notes, combat/state/persistence documentation.
- `.agents/roadmap-agent.md`: maintains `ROADMAP.md`, `BUG.md`, and `CR.md`.
- `.agents/doc-reviewer.md`: checks documentation drift, unsupported claims, broken links, and scope creep.

## Documentation Sources Of Truth

- Product overview and setup: `README.md`
- Game design: `GDD.md`
- Technical design: `TDD.md`
- Development workflow and repo rules: `AGENT.md`
- Roadmap and planning: `ROADMAP.md`
- Known bugs: `BUG.md`
- Change requests: `CR.md`
- Source code: `src/`
- Card data: `src/data/cards.ts`
- Shared types: `src/types.ts`
- Combat logic: `src/logic/combatEngine.ts` and `src/components/Battlefield.tsx`
- Campaign persistence: `src/logic/campaignPersistence.ts`
- Audio engine: `src/utils/sound.ts`

## Validation

For docs-only changes:
- Check local Markdown links among `CODEX.md`, `AGENTS.md`, `AGENT.md`, and `.agents/*.md`.
- Confirm no secrets are introduced.
- Confirm `.env.example` is unchanged unless the task explicitly concerns environment variables.

For code-related changes:
- Run `npm run lint`.
- Run `npm run test`.
- When UI/gameplay behavior changes, run `npm run dev` and manually inspect the affected flow.

## Guardrails

- Do not rename or replace `AGENT.md`.
- Do not install new dependencies for documentation-agent setup.
- Do not change game logic when the task is only documentation infrastructure.
- Do not invent gameplay, historical facts, APIs, or architecture details that are not supported by source code or existing docs.
