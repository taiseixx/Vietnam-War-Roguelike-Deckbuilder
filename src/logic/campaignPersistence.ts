import { CampaignState, Faction } from '../types';

/**
 * Validates and hydrates the campaign state loaded from local storage.
 * If data is corrupted, partial, or missing required fields, it safely returns null.
 */
export function safeHydrateCampaignState(savedRaw: string | null): CampaignState | null {
  if (!savedRaw) return null;
  try {
    const parsed = JSON.parse(savedRaw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Robust validation check for required structural properties
    const hasFaction = parsed.currentFaction === 'USA' || parsed.currentFaction === 'NVA';
    const hasDeck = Array.isArray(parsed.playerDeck);
    const hasNodes = Array.isArray(parsed.nodes);
    const hasHQDef = typeof parsed.playerHQDef === 'number';
    const hasCurrentNode = typeof parsed.currentNodeId === 'string';

    if (!hasFaction || !hasDeck || !hasNodes || !hasHQDef || !hasCurrentNode) {
      console.warn("Retrieved campaign state failed strict validation checks.");
      return null;
    }

    // Hydrate state object with precise fallbacks for other auxiliary properties
    return {
      currentFaction: parsed.currentFaction as Faction,
      maxKredits: typeof parsed.maxKredits === 'number' ? parsed.maxKredits : 1,
      currentKredits: typeof parsed.currentKredits === 'number' ? parsed.currentKredits : 1,
      playerDeck: parsed.playerDeck,
      playerHand: Array.isArray(parsed.playerHand) ? parsed.playerHand : [],
      opponentHand: Array.isArray(parsed.opponentHand) ? parsed.opponentHand : [],
      playerHQDef: Math.max(1, parsed.playerHQDef), // player has at least 1 HP if campaign is continuing
      opponentHQDef: typeof parsed.opponentHQDef === 'number' ? parsed.opponentHQDef : 20,
      activeBattleNode: parsed.activeBattleNode || null,
      completedNodes: Array.isArray(parsed.completedNodes) ? parsed.completedNodes : [],
      currentNodeId: parsed.currentNodeId,
      nodes: parsed.nodes,
      gold: typeof parsed.gold === 'number' ? parsed.gold : 50,
      xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
      level: typeof parsed.level === 'number' ? parsed.level : 1,
    };
  } catch (error) {
    console.error("Failed to parse and hydrate campaign state:", error);
    return null;
  }
}

const LOCAL_STORAGE_KEY_STATE = 'vwr_campaign_state';
const LOCAL_STORAGE_KEY_SCREEN = 'vwr_active_screen';

export function saveCampaignState(state: CampaignState, activeScreen: string) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_STATE, JSON.stringify(state));
    localStorage.setItem(LOCAL_STORAGE_KEY_SCREEN, activeScreen);
  } catch (error) {
    console.error("Failed to write state persistent update:", error);
  }
}

export function loadCampaignState(): { state: CampaignState; screen: any } | null {
  try {
    const rawState = localStorage.getItem(LOCAL_STORAGE_KEY_STATE);
    const rawScreen = localStorage.getItem(LOCAL_STORAGE_KEY_SCREEN);
    if (!rawState) return null;

    const validatedState = safeHydrateCampaignState(rawState);
    if (!validatedState) return null;

    return {
      state: validatedState,
      screen: rawScreen || 'campaign_map'
    };
  } catch (error) {
    console.error("Failed to read campaign persistence updates:", error);
    return null;
  }
}

export function clearCampaignState() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_STATE);
    localStorage.removeItem(LOCAL_STORAGE_KEY_SCREEN);
  } catch (error) {
    console.error("Failed to clear campaign state persistence:", error);
  }
}
