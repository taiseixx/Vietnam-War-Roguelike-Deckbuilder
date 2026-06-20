import { Card, CardRarity, Faction } from '../types';
import { CARD_DATABASE } from '../data/cards';

export const getRarityLimit = (rarity: CardRarity): number => {
  switch (rarity) {
    case 'Common': return 4;
    case 'Uncommon': return 3;
    case 'Rare': return 2;
    case 'Elite': return 1;
    default: return 1;
  }
};

export const generateDynamicDeck = (factionPrimary: Faction, deckSize: number = 30): Card[] => {
  const allowedFactions = factionPrimary === 'USA' ? ['US', 'ARVN'] : ['NVA', 'VC'];
  
  const pool = CARD_DATABASE.filter(c => allowedFactions.includes(c.faction));
  const deck: Card[] = [];
  const cardCounts: Record<string, number> = {};

  // 1. Ensure at least one copy of each available card in the pool is added first
  pool.forEach((card) => {
    if (deck.length < deckSize) {
      deck.push({ ...card });
      cardCounts[card.id] = 1;
    }
  });

  // 2. Pad the remaining slots randomly up to deckSize, respecting the rarity limits
  let attempts = 0;
  while (deck.length < deckSize && attempts < 1000) {
    attempts++;
    const idx = Math.floor(Math.random() * pool.length);
    const card = pool[idx];
    
    const count = cardCounts[card.id] || 0;
    const limit = getRarityLimit(card.rarity);
    
    if (count < limit) {
      deck.push({ ...card });
      cardCounts[card.id] = count + 1;
    }
  }

  return deck;
};
