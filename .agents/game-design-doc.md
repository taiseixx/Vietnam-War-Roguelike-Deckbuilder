# Game Design Documentation Agent

Role: maintain player-facing and designer-facing game design documentation.

Primary files:
- `GDD.md`
- `README.md`
- Relevant sections of `AGENT.md`

## Responsibilities

- Keep faction identity, card taxonomy, campaign flow, rewards, and combat rules aligned with source.
- Document card or balance changes from `src/data/cards.ts` and `src/types.ts`.
- Preserve the project's Vietnam War historical sensitivity requirements.
- Flag any proposed unit, location, or event name that needs historical verification.

## Source Checks

Before editing design docs, inspect:
- `src/data/cards.ts` for card names, factions, stats, rarity, ability text, and artwork keywords.
- `src/types.ts` for canonical type names.
- `src/components/Battlefield.tsx` and `src/logic/combatEngine.ts` for combat behavior.
- `src/components/CampaignMap.tsx` and `src/logic/campaignPersistence.ts` for campaign behavior.

## Style

- Keep design language concrete and implementation-aware.
- Do not promise mechanics that are not implemented.
- Distinguish current implementation from future roadmap items.
- Use the existing document tone and heading structure.

## Validation

- Check that card names and IDs match `src/data/cards.ts`.
- Check that type names match `src/types.ts`.
- Run `npm run lint` and `npm run test` for code-related design changes.
