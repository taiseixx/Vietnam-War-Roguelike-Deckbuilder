import { useState, useEffect } from 'react';
import { Card, CampaignState, CampaignNode, Faction } from './types';
import { CARD_DATABASE } from './data/cards';
import { generateDynamicDeck } from './utils/deck';
import { CampaignMap } from './components/CampaignMap';
import { Battlefield } from './components/Battlefield';
import { sound } from './utils/sound';
import { Compass, Flame, ShieldAlert, Award, Star, RefreshCw, Sparkles } from 'lucide-react';
import { loadCampaignState, saveCampaignState, clearCampaignState } from './logic/campaignPersistence';

// STUNNING TITLE BANNER IMAGE
const titleBanner = "/src/assets/images/vietnam_propaganda_banner_1781634330429.jpg";

export default function App() {
  // Screen views: 'faction_selection' | 'campaign_map' | 'battle' | 'campaign_over'
  const [activeScreen, setActiveScreen] = useState<'faction_selection' | 'campaign_map' | 'battle' | 'campaign_over'>('faction_selection');

  // Core Game Roguelike State
  const [campaignState, setCampaignState] = useState<CampaignState>({
    currentFaction: 'USA',
    maxKredits: 1,
    currentKredits: 1,
    playerDeck: [],
    playerHand: [],
    opponentHand: [],
    playerHQDef: 20,
    opponentHQDef: 20,
    activeBattleNode: null,
    completedNodes: [],
    currentNodeId: 'node_0_vungtau',
    nodes: [],
    gold: 50,
    xp: 0,
    level: 1,
  });

  const [activeBattleNode, setActiveBattleNode] = useState<CampaignNode | null>(null);
  const [activeEventNode, setActiveEventNode] = useState<CampaignNode | null>(null);
  const [showDraftPool, setShowDraftPool] = useState(false);
  const [draftPool, setDraftPool] = useState<Card[]>([]);

  // 1. One-time campaign session load restoration on mount
  useEffect(() => {
    const savedSession = loadCampaignState();
    if (savedSession) {
      setCampaignState(savedSession.state);

      // Rehydrate the actual node object or reset to map
      let updatedScreen = savedSession.screen;
      if (savedSession.state.activeBattleNode) {
        const matchingNode = savedSession.state.nodes.find(n => n.id === savedSession.state.activeBattleNode);
        if (matchingNode) {
          setActiveBattleNode(matchingNode);
        } else {
          updatedScreen = 'campaign_map';
        }
      } else if (updatedScreen === 'battle') {
        updatedScreen = 'campaign_map';
      }

      setActiveScreen(updatedScreen);
      sound.playRadioStatic();
    }
  }, []);

  // 2. Incremental continuous campaign session state auto-saves
  useEffect(() => {
    if (activeScreen === 'faction_selection' || activeScreen === 'campaign_over') {
      clearCampaignState();
    } else if (campaignState && campaignState.playerDeck.length > 0 && campaignState.nodes.length > 0) {
      saveCampaignState(campaignState, activeScreen);
    }
  }, [campaignState, activeScreen]);

  // INITIALIZE FACTION CAMPAIGN DECKS & MAP NODES
  const selectFactionAndStart = (faction: Faction) => {
    sound.playRadioStatic();

    // 1. Establish starting decks of 30 thematic starter cards
    let starterDeck = generateDynamicDeck(faction, 30);

    // 2. Establish 5 campaign nodes
    const operationalNodes: CampaignNode[] = [
      {
        id: 'node_0_vungtau',
        name: 'Vũng Tàu Patrol Sector',
        type: 'Combat',
        description: 'Sweep patrol sectors. Enemy local cells are active in marshlands outside bases.',
        completed: false,
        gridY: 0,
        gridX: 0,
      },
      {
        id: 'node_1_ashau',
        name: 'A Shau Tactical Dilemma',
        type: 'Event',
        description: 'Intelligence reports local resistance nests in the dense mist-covered mountains. How will your column approach local security?',
        completed: false,
        gridY: 1,
        gridX: 1,
      },
      {
        id: 'node_2_bravo',
        name: 'Firebase Bravo Headquarters',
        type: 'Campfire',
        description: 'Rest, refit and regroup your logistics lines at Firebase camp grounds.',
        completed: false,
        gridY: 2,
        gridX: 1,
      },
      {
        id: 'node_3_iron',
        name: 'Iron Triangle Trench Nest',
        type: 'Elite',
        description: 'Highly fortified bunkers and underground tunnels reported. Sapper forces command intense local resistance.',
        completed: false,
        gridY: 3,
        gridX: 2,
      },
      {
        id: 'node_4_khesanh',
        name: 'Siege of Khe Sanh Highlands',
        type: 'Boss',
        description: 'The final, decisive operational showdown. Capture or secure the highland stronghold at all costs!',
        completed: false,
        gridY: 4,
        gridX: 1,
      },
    ];

    setCampaignState({
       currentFaction: faction,
       maxKredits: 1,
       currentKredits: 1,
       playerDeck: starterDeck,
       playerHand: [],
       opponentHand: [],
       playerHQDef: 20,
       opponentHQDef: 20,
       activeBattleNode: null,
       completedNodes: [],
       currentNodeId: 'node_0_vungtau',
       nodes: operationalNodes,
       gold: 50,
       xp: 0,
       level: 1,
     });

    setActiveScreen('campaign_map');
  };

  // ROUTE DYNAMIC NODES SELECTIONS
  const handleSelectNode = (node: CampaignNode) => {
    if (node.type === 'Combat' || node.type === 'Elite' || node.type === 'Boss') {
      setActiveBattleNode(node);
      setCampaignState(prev => ({ ...prev, activeBattleNode: node.id }));
      setActiveScreen('battle');
    } else if (node.type === 'Event') {
      setActiveEventNode(node);
    } else if (node.type === 'Campfire') {
      // Handled inline inside CampaignMap component via modals
    }
  };

  // CAMPFIRE DISPOSITIONS
  const handleCampfireSelection = (action: 'heal' | 'draft') => {
    if (action === 'heal') {
      // Heal HQ by +8
      setCampaignState((prev) => ({
        ...prev,
        playerHQDef: Math.min(20, prev.playerHQDef + 8),
      }));
      advanceToNextNode();
    } else if (action === 'draft') {
      // Open draft screen
      triggerDraftPool();
    }
  };

  // TRIGGERS DRAFTING LOOT CARD WINDOW
  const triggerDraftPool = () => {
    const oppoFaction = campaignState.currentFaction === 'USA' ? 'NVA' : 'USA';
    // Get cards from database matching player's general alignment (US/ARVN vs NVA/VC)
    const cardPool = CARD_DATABASE.filter((c) => {
      if (campaignState.currentFaction === 'USA') {
        return c.faction === 'US' || c.faction === 'ARVN';
      }
      return c.faction === 'NVA' || c.faction === 'VC';
    });

    // Pick 3 random
    const pool = [...cardPool].sort(() => Math.random() - 0.5).slice(0, 3);
    setDraftPool(pool);
    setShowDraftPool(true);
  };

  const handleChooseDraftCard = (card: Card) => {
    setCampaignState((prev) => ({
      ...prev,
      playerDeck: [...prev.playerDeck, card],
    }));
    setShowDraftPool(false);
    advanceToNextNode();
  };

  // EVENT CHOICES TRIGGER DILEMMAS
  const handleTriggerEventChoice = (choiceIdx: number) => {
    sound.playExplosion();
    if (choiceIdx === 0) {
      // Gain 45 supplies, lose 3 hq def (instability)
      setCampaignState((prev) => ({
        ...prev,
        gold: prev.gold + 45,
        playerHQDef: Math.max(1, prev.playerHQDef - 3),
      }));
    } else if (choiceIdx === 1) {
      // Add +5 HQ armor, cost 20 supplies
      setCampaignState((prev) => ({
        ...prev,
        gold: Math.max(0, prev.gold - 20),
        playerHQDef: Math.min(20, prev.playerHQDef + 2), // Buff base slightly
      }));
    } else {
      // Draft 1 card
      triggerDraftPool();
      setActiveEventNode(null);
      return;
    }

    setActiveEventNode(null);
    advanceToNextNode();
  };

  // PROGRESS LOGISTICS NODES
  const advanceToNextNode = () => {
    setCampaignState((prev) => {
      const nodeIndex = prev.nodes.findIndex((n) => n.id === prev.currentNodeId);
      const nextIndex = nodeIndex + 1;

      // Mark current completed
      const updatedNodes = prev.nodes.map((n) =>
        n.id === prev.currentNodeId ? { ...n, completed: true } : n
      );

      if (nextIndex >= prev.nodes.length) {
        // Boss Cleared! Absolute campaign Victory!
        setActiveScreen('campaign_over');
        return {
          ...prev,
          nodes: updatedNodes,
        };
      }

      const nextNodeId = prev.nodes[nextIndex].id;
      return {
        ...prev,
        currentNodeId: nextNodeId,
        nodes: updatedNodes,
        level: prev.level + 1,
      };
    });
  };

  // COMBAT DEFEAT REARRANGEMENT
  const handleBattleDefeat = () => {
    // Return player to start of campaign to try again!
    setActiveScreen('faction_selection');
  };

  // COMBAT VICTORY REWARD PAYOUT
  const handleBattleVictory = (goldReward: number) => {
    setCampaignState((prev) => ({
      ...prev,
      gold: prev.gold + goldReward,
      activeBattleNode: null,
    }));
    setActiveBattleNode(null);
    setActiveScreen('campaign_map');
    // Open reward card draft!
    triggerDraftPool();
  };

  // SPLASH SCREEN RENDER
  return (
    <div className="w-full min-h-screen bg-stone-950 text-stone-300 font-mono flex flex-col justify-between overflow-x-hidden select-none">
      {/* GLOWING AMBIENT RADAR LINES GRID BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-4 grid grid-cols-12 grid-rows-12">
        {Array.from({ length: 144 }).map((_, i) => (
          <div key={i} className="border border-stone-800" />
        ))}
      </div>

      {/* 1. FACTION SELECTOR SPLASH SCREEN */}
      {activeScreen === 'faction_selection' && (
        <div className="flex-grow flex flex-col justify-center items-center p-4 md:p-8 z-10">
          <div className="w-full max-w-4xl text-center space-y-6">
            
            {/* STUNNING BANNER POSTER */}
            <div className="relative w-full max-w-2xl mx-auto rounded-lg overflow-hidden border-2 border-stone-800 shadow-2xl aspect-[16/9] bg-stone-900 group">
              <img
                src={titleBanner}
                alt="Vietnam War Propaganda Banner Art"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-stone-950/40" />
              
              {/* Retro HUD Overlay details inside title banner */}
              <div className="absolute bottom-4 left-4 right-4 text-left font-mono">
                <div className="text-[10px] text-amber-500 animate-pulse uppercase tracking-widest font-bold">
                  ● OPERATIONAL COMMS ONLINE
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  COMMUNICATE COORDINATES VIA TAC_NET // RADIO CHIRP 559
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 bg-clip-text text-transparent">
                Vanguard Overlord
              </h1>
              <h2 className="text-sm md:text-base text-stone-500 tracking-widest uppercase font-bold">
                Vietnam War Roguelike Deckbuilder & Auto-Battler
              </h2>
            </div>

            <p className="text-xs text-stone-400 max-w-xl mx-auto leading-relaxed">
              Enter the vertical tactical 5-line battlefield matrix. Draft historically accurate soldiers, deploy logistic columns, and launch dynamic automated combat maneuvers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 max-w-3xl mx-auto items-stretch">
              {/* allied faction card */}
              <div
                onClick={() => selectFactionAndStart('USA')}
                className="p-6 border border-emerald-900/60 bg-emerald-950/10 hover:bg-emerald-950/20 hover:border-emerald-500 hover:text-emerald-400 transition-all duration-300 rounded cursor-pointer flex flex-col justify-between text-left space-y-4 hover:shadow-2xl hover:shadow-emerald-950/30 transform hover:-translate-y-1"
              >
                <div>
                  <h3 className="text-lg font-extrabold uppercase text-emerald-500 tracking-widest flex items-center gap-1.5 pb-2 border-b border-emerald-900/30">
                    <Award size={18} /> MACV Allied Command
                  </h3>
                  <p className="text-[11px] leading-relaxed text-stone-400 mt-3 font-mono">
                    Command elite **US Army airmobile infantry**, **101st Airborne drop wings**, heavy **M48 Patton tanks**, tactical **Combat Engineers**, and **ARVN regional forces**. Fully back actions via napalm airstrikes.
                  </p>
                </div>
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Tactility: Logistics, Armor Force & Napalm Support
                </div>
              </div>

              {/* PAVN liberation faction card */}
              <div
                onClick={() => selectFactionAndStart('NVA')}
                className="p-6 border border-red-900/60 bg-red-950/10 hover:bg-red-950/20 hover:border-red-500 hover:text-red-400 transition-all duration-300 rounded cursor-pointer flex flex-col justify-between text-left space-y-4 hover:shadow-2xl hover:shadow-red-950/30 transform hover:-translate-y-1"
              >
                <div>
                  <h3 className="text-lg font-extrabold uppercase text-red-500 tracking-widest flex items-center gap-1.5 pb-2 border-b border-red-900/30">
                    <ShieldAlert size={18} /> COSVN Liberation Front
                  </h3>
                  <p className="text-[11px] leading-relaxed text-stone-400 mt-3 font-mono">
                    Command hardened **NVA Steel Division regulars**, **Viet Cong guerrilla cells**, logistical **Group 559 guides**, elite **tunnel sappers**, and **regional artillery regiments**. Utilize camo, foliage cover, and punji traps.
                  </p>
                </div>
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Tactility: Infiltration, Camouflage & Ambush Traps
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CAMPAIGN ROADMAP SCREEN */}
      {activeScreen === 'campaign_map' && (
        <CampaignMap
          campaignState={campaignState}
          onSelectNode={handleSelectNode}
          onCampfireSelection={handleCampfireSelection}
          onTriggerEventChoice={handleTriggerEventChoice}
          onExitDraft={() => setShowDraftPool(false)}
          draftPool={draftPool}
          onChooseDraftCard={handleChooseDraftCard}
          activeEventNode={activeEventNode}
          showDraftPanel={showDraftPool}
          onBackToFactionSelection={() => setActiveScreen('faction_selection')}
        />
      )}

      {/* 3. ACTIVE FIELD COMBAT ARENA SCREEN */}
      {activeScreen === 'battle' && activeBattleNode && (
        <Battlefield
          faction={campaignState.currentFaction}
          playerDeck={campaignState.playerDeck}
          node={activeBattleNode}
          onBattleVictory={handleBattleVictory}
          onBattleDefeat={handleBattleDefeat}
          onExitBattle={() => setActiveScreen('campaign_map')}
        />
      )}

      {/* 4. TOTAL CAMPAIGN UNCONDITIONAL VICTORY OVERLAY SCREEN */}
      {activeScreen === 'campaign_over' && (
        <div className="flex-grow flex flex-col justify-center items-center z-10 p-4 md:p-8">
          <div className="max-w-md w-full bg-stone-900 border-2 border-amber-500 text-center rounded p-6 md:p-8 space-y-6 shadow-2xl select-none">
            <Star size={44} className="text-amber-500 mx-auto animate-spin" style={{ animationDuration: '6s' }} />
            <h1 className="text-3xl font-black text-amber-500 tracking-widest uppercase">CAMPAIGN COMPLETE</h1>
            <h2 className="text-xs uppercase text-stone-400">DECISIVE COMMAND CONFLICT METRIC:</h2>
            <div className="p-4 bg-stone-950 font-mono text-xs rounded border border-stone-850 space-y-2 text-left">
              <div>Faction Commander: <span className="font-bold text-amber-400 uppercase">{campaignState.currentFaction} Allies</span></div>
              <div>Current Division: <span className="font-bold text-stone-200">Level {campaignState.level} Garrison</span></div>
              <div>Supply Gold Remaining: <span className="font-bold text-emerald-400">{campaignState.gold} gold</span></div>
              <div>Deck Size Registry: <span className="font-bold text-stone-200">{campaignState.playerDeck.length} Cards in ledger</span></div>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed uppercase">
              Through strategic logistical mastery, your tactical command has driven off opposing front lines, securing total battlefield sovereignty in the sector.
            </p>
            <button
              onClick={() => setActiveScreen('faction_selection')}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase rounded shadow font-black tracking-widest cursor-pointer duration-200"
            >
              RECORD VICTORY & RESET COMMANDS
            </button>
          </div>
        </div>
      )}

      {/* FOOTER GENERAL RETRO CREDITS */}
      <div className="p-4 text-center text-[9px] text-stone-600 border-t border-stone-900 z-10 flex justify-between px-8 bg-stone-950/80">
        <span>TAC_NET INTERFACES V3.56 // ENCRYPTED COMMS SECURED</span>
        <span>VIETNAM WAR ROGUELIKE BATTLEFIELD</span>
      </div>
    </div>
  );
}
