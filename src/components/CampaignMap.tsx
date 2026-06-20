import React, { useState, useMemo, useEffect } from 'react';
import { CampaignState, CampaignNode, Card } from '../types';
import { Play, Flame, Compass, ShieldAlert, Award, Star, Compass as RadarIcon, Eye, ShoppingCart } from 'lucide-react';
import { sound } from '../utils/sound';
import { PropagandaPoster } from './PropagandaPoster';
import { CardFrame } from './CardFrame';

interface CampaignMapProps {
  campaignState: CampaignState;
  onSelectNode: (node: CampaignNode) => void;
  onCampfireSelection: (action: 'heal' | 'draft') => void;
  onTriggerEventChoice: (choiceIdx: number) => void;
  onExitDraft: () => void;
  draftPool: Card[];
  onChooseDraftCard: (card: Card) => void;
  activeEventNode: CampaignNode | null;
  showDraftPanel: boolean;
  onBackToFactionSelection: () => void;
}

export const CampaignMap: React.FC<CampaignMapProps> = ({
  campaignState,
  onSelectNode,
  onCampfireSelection,
  onTriggerEventChoice,
  onExitDraft,
  draftPool,
  onChooseDraftCard,
  activeEventNode,
  showDraftPanel,
  onBackToFactionSelection,
}) => {
  const [showDeckViewer, setShowDeckViewer] = useState(false);
  const { nodes, currentNodeId, gold, level, playerDeck, currentFaction, playerHQDef } = campaignState;
  
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Group duplicate cards to avoid visual flooding, keeping track of counts
  const groupedDeck = useMemo(() => {
    const groups: { [key: string]: { card: Card; count: number } } = {};
    playerDeck.forEach((card) => {
      if (groups[card.id]) {
        groups[card.id].count += 1;
      } else {
        groups[card.id] = { card: { ...card }, count: 1 };
      }
    });

    const list = Object.values(groups);

    // Sort to make the deck viewer layout fully aligned, stable, and readable
    return list.sort((a, b) => {
      // 1. Primary faction first, sub-faction second (US/NVA first, ARVN/VC second)
      const factionWeight = (f: string) => {
        if (f === 'US' || f === 'NVA') return 0;
        return 1;
      };
      const diffFactionWeight = factionWeight(a.card.faction) - factionWeight(b.card.faction);
      if (diffFactionWeight !== 0) return diffFactionWeight;

      // Subdivision alphabetical
      const diffFaction = a.card.faction.localeCompare(b.card.faction);
      if (diffFaction !== 0) return diffFaction;

      // 2. Card Type (Unit first, then Order, then Countermeasure)
      const typeWeight = (t: string) => {
        if (t === 'Unit') return 0;
        if (t === 'Order') return 1;
        return 2;
      };
      const diffType = typeWeight(a.card.type) - typeWeight(b.card.type);
      if (diffType !== 0) return diffType;

      // 3. Kredit cost (increasing)
      const diffCost = a.card.k - b.card.k;
      if (diffCost !== 0) return diffCost;

      // 4. Name (alphabetical)
      return a.card.name.localeCompare(b.card.name);
    });
  }, [playerDeck]);

  // Render node icon helper
  const getNodeIcon = (type: string, active: boolean) => {
    const size = 18;
    const colorClass = active ? 'text-amber-400' : 'text-stone-500';
    switch (type) {
      case 'Campfire':
        return <Flame size={size} className={colorClass} />;
      case 'Event':
        return <Compass size={size} className={colorClass} />;
      case 'Elite':
        return <ShieldAlert size={size} className={active ? 'text-red-500' : 'text-stone-500'} />;
      case 'Boss':
        return <Award size={size} className={active ? 'text-red-500 animate-pulse' : 'text-stone-500'} />;
      default:
        return <Play size={size} className={colorClass} />;
    }
  };

  const getFactionDisplay = () => {
    if (currentFaction === 'USA') {
      return {
        title: 'US Army Allied Command HQ',
        subtitle: 'MACV Operational Theater',
        accent: 'border-emerald-600/50 bg-emerald-950/20 text-emerald-400',
      };
    }
    return {
      title: 'PAVN / NVA Liberation Command',
      subtitle: 'COSVN Central Office',
      accent: 'border-red-900/50 bg-red-950/20 text-red-400',
    };
  };

  const factionDisplay = getFactionDisplay();

  const handleToggleDeckViewer = () => {
    sound.playCardDraw();
    setShowDeckViewer(!showDeckViewer);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center bg-stone-950 overflow-hidden font-mono text-stone-300 select-none p-4 md:p-6">
      
      {/* 4K STRATEGIC OPERATIONS BANNER */}
      <div className="relative w-full max-w-6xl h-44 md:h-56 rounded-lg overflow-hidden border border-stone-850 shadow-2xl mb-4 group shrink-0">
        <img
          src="/src/assets/images/campaign_banner_1781640565073.jpg"
          alt="Campaign Strategic Operations Area"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 duration-700 brightness-75 select-none pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/25 to-stone-950/10" />
        <div className="absolute bottom-4 left-6 right-6 flex flex-wrap gap-4 justify-between items-end">
          <div>
            <div className="text-[10px] text-amber-500 font-extrabold tracking-widest uppercase mb-1 flex items-center gap-1.5 font-typewriter">
              ● SECURE SEC-NET DIRECTIVE // WAR ROOM MAP
            </div>
            <h1 className="text-2xl md:text-5xl font-extrabold uppercase text-white tracking-widest font-heading drop-shadow-lg leading-none">
              TACTICAL OPERATIONS ROADMAP
            </h1>
          </div>
          {/* BACK TO FACTION SELECTION */}
          <button
            onClick={onBackToFactionSelection}
            className="px-4 py-2 border border-stone-700 bg-stone-900/90 hover:bg-red-950 hover:border-red-700 text-stone-200 hover:text-red-300 transition-all duration-200 text-xs font-black rounded uppercase tracking-widest shadow font-heading flex items-center gap-2 cursor-pointer hover:shadow-red-950/60 z-20"
          >
            ← BACK TO FACTIONS
          </button>
        </div>
      </div>

      {/* HUD HEADER PANEL */}
      <div className="w-full max-w-6xl flex flex-wrap gap-4 items-center justify-between border-y border-stone-850 p-4 bg-stone-900/90 rounded shadow-lg mb-6 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <div className={`border px-3 py-1.5 rounded ${factionDisplay.accent}`}>
            <div className="text-[10px] uppercase font-bold tracking-widest">{factionDisplay.subtitle}</div>
            <div className="text-sm font-black tracking-wide uppercase">{factionDisplay.title}</div>
          </div>
          <div>
            <div className="text-[10px] text-stone-500">SECTOR ADVISORY</div>
            <div className="text-xs text-stone-300">Level {level} Elite Division</div>
          </div>
        </div>

        <div className="flex gap-4 md:gap-8 items-center text-xs">
          <div>
            <div className="text-[10px] text-stone-500">BASE SUPPLIES</div>
            <div className="text-amber-500 font-bold flex items-center gap-1">
              <ShoppingCart size={12} /> {gold} gold
            </div>
          </div>
          <div>
            <div className="text-[10px] text-stone-500">COMMANDER HP</div>
            <div className="text-emerald-500 font-bold">
              {playerHQDef} / 20 DEF
            </div>
          </div>
          <div>
            <div className="text-[10px] text-stone-500">TACTICAL DECK</div>
            <button
              onClick={handleToggleDeckViewer}
              className="text-amber-400 flex items-center gap-1 hover:underline text-xs bg-stone-850 px-2 py-1 rounded border border-stone-800"
            >
              <Eye size={12} /> View Deck ({playerDeck.length} Cards)
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 z-10 items-stretch">
        {/* LEFT COLUMN: THE TACTICAL RADAR ROADMAP */}
        <div className="lg:col-span-12 flex flex-col bg-stone-900/40 rounded-lg p-5 border border-stone-850 relative overflow-hidden flex-grow shadow-2xl">
          {/* Scanning crosshair background simulation */}
          <div className="absolute inset-0 pointer-events-none border border-stone-850/25 grid grid-cols-6 grid-rows-6 opacity-30">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="border-t border-l border-stone-850/20" />
            ))}
          </div>
          {/* Radar sweeping green gradient */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-green-500/10 pointer-events-none animate-[bounce_8s_infinite]" />

          <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-800 flex-wrap gap-2">
            <h2 className="text-sm font-black flex items-center gap-2 text-stone-100 uppercase tracking-widest">
              <RadarIcon size={14} className="text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
              Vietnam War Tactical Operations Roadmap
            </h2>
            <div className="text-[9px] bg-red-950/45 text-red-400 px-1.5 py-0.5 rounded border border-red-900/30 animate-pulse">
              WARNING: NVA INFILTRATION GRID ACTIVE
            </div>
          </div>

          {/* ROGUELIKE INTERACTIVE MAP GRID */}
          <div className="flex-grow flex flex-col justify-around py-8 relative">
            {/* SVG Connecting Routes path draw */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: '220px' }}>
              <defs>
                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4A3B1B" />
                  <stop offset="100%" stopColor="#CE911F" />
                </linearGradient>
              </defs>
              {/* Connect nodes logically in sequence */}
              {nodes.map((node, idx) => {
                if (idx === nodes.length - 1) return null;
                const nextNode = nodes[idx + 1];
                // Determine responsive visual positions based on indexes
                const x1 = `${10 + idx * 20}%`;
                const y1 = `${50 + (idx % 2 === 0 ? 10 : -10)}%`;
                const x2 = `${10 + (idx + 1) * 20}%`;
                const y2 = `${50 + ((idx + 1) % 2 === 0 ? 10 : -10)}%`;
                return (
                  <g key={`path-${idx}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={idx < nodes.findIndex((n) => n.id === currentNodeId) ? '#CE911F' : '#333'}
                      strokeWidth={2}
                      strokeDasharray={idx < nodes.findIndex((n) => n.id === currentNodeId) ? 'none' : '4,4'}
                    />
                  </g>
                );
              })}
            </svg>

            {/* NODES ROW PLACEHOLDER CONTAINER */}
            <div className="flex items-center justify-between px-4 sm:px-12 md:px-20 relative w-full flex-wrap gap-y-12 gap-x-2">
              {nodes.map((node, idx) => {
                const nodeIndex = nodes.findIndex((n) => n.id === node.id);
                const currentActiveIndex = nodes.findIndex((n) => n.id === currentNodeId);
                const isCompleted = node.completed || nodeIndex < currentActiveIndex;
                const isCurrent = node.id === currentNodeId;
                const isLocked = nodeIndex > currentActiveIndex;

                let stateColor = 'bg-stone-850 hover:bg-stone-800 border-stone-800 text-stone-500';
                if (isCurrent) {
                  stateColor = 'bg-amber-900/30 border-amber-500 text-amber-300 ring-4 ring-amber-500/20';
                } else if (isCompleted) {
                  stateColor = 'bg-stone-800 border-amber-600/40 text-amber-500';
                } else if (isLocked) {
                  stateColor = 'bg-stone-900 border-stone-850 text-stone-600 cursor-not-allowed opacity-50';
                }

                // Push offset slightly to give rugged retro look
                const offsetClass = idx % 2 === 0 ? 'translate-y-4' : '-translate-y-4';

                return (
                  <div
                    key={node.id}
                    onClick={() => {
                      if (!isLocked && !isCompleted && !showDraftPanel && !activeEventNode) {
                        sound.playDeploy();
                        onSelectNode(node);
                      }
                    }}
                    className={`relative flex flex-col items-center group cursor-pointer transition-all duration-300 ${offsetClass} ${
                      isLocked ? 'pointer-events-none' : ''
                    }`}
                  >
                    {/* Node Circle badge */}
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${stateColor}`}
                    >
                      {getNodeIcon(node.type, isCurrent)}
                    </div>

                    {/* Hover Tooltip or Tag detail */}
                    <div className="mt-3 text-center">
                      <div className="text-[10px] font-black tracking-widest text-stone-400 capitalize">
                        {node.type}
                      </div>
                      <div className="text-[12px] text-stone-100 font-bold max-w-[130px] line-clamp-1">
                        {node.name}
                      </div>
                      <div className="text-[8px] text-stone-500 font-mono tracking-tighter">
                        {isCompleted ? 'COMPLETED' : isCurrent ? 'READY' : 'CLASSIFIED'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LEGEND HUD FOOTER */}
          <div className="mt-12 p-3 bg-stone-950 rounded border border-stone-850/80 flex flex-wrap justify-between gap-4 text-[10px] tracking-wide">
            <div className="flex gap-4 items-center">
              <span className="text-stone-500 uppercase font-black">Grid Indicators:</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-stone-850 border border-stone-800"></span> Combat Sector</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-900/30 border border-red-500 animate-pulse"></span> Elite Insurgency</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-900/30 border border-amber-500"></span> Camp Ground</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-900/35 border border-indigo-500"></span> Incident Event</span>
            </div>
            <div className="text-stone-500">
              CLICK AN ACTIVE COORDINATE RETICLE TO LAUNCH LOGISTICAL OPERATION
            </div>
          </div>
        </div>
      </div>

      {/* ================= EXTRA MODAL 1: CAMPFIRE PANEL ================= */}
      {nodes.find((n) => n.id === currentNodeId)?.type === 'Campfire' && !showDraftPanel && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg bg-stone-900 border-2 border-amber-500 p-6 rounded-lg text-center font-mono relative overflow-hidden shadow-2xl">
            <div className="absolute top-2 right-2 text-[8px] text-stone-600">STANCE ID: REFRESH_BASE</div>
            <Flame size={44} className="text-amber-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-amber-100 uppercase tracking-wider mb-2">Firebase Supply Rest Base</h3>
            <p className="text-xs text-stone-400 mb-6 leading-relaxed">
              Your forces have encamped at a safe tactical Firebase perimeter. Utilize local logistics reserves to replenish your forces. Establish defensive fortifications or recruit seasoned regulars.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  sound.playRadioStatic();
                  onCampfireSelection('heal');
                }}
                className="p-4 border border-emerald-500/50 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 font-bold uppercase rounded cursor-pointer transition-all duration-300"
              >
                <div className="text-sm">RECONSTRUCT DEFENSE</div>
                <div className="text-[10px] text-emerald-500 mt-1">Restore Allied HQ Defense by +8</div>
              </button>

              <button
                onClick={() => {
                  sound.playRadioStatic();
                  onCampfireSelection('draft');
                }}
                className="p-4 border border-amber-500/50 bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 font-bold uppercase rounded cursor-pointer transition-all duration-300"
              >
                <div className="text-sm">SUPPLY RECRUITMENT</div>
                <div className="text-[10px] text-amber-500 mt-1">Draft a new Combat Card to your deck</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EXTRA MODAL 2: INTERACTIVE HISTORICAL EVENT NODAL ================= */}
      {activeEventNode && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-stone-900 border-2 border-indigo-500/80 p-6 md:p-8 rounded-lg text-center font-mono relative overflow-hidden shadow-2xl">
            <div className="absolute top-2 right-2 text-[8px] text-indigo-500">GRID REF CODE: DILEMMA_1965</div>
            <Compass size={40} className="text-indigo-400 mx-auto mb-4 animate-spin" style={{ animationDuration: '10s' }} />
            <h3 className="text-2xl font-bold text-indigo-100 uppercase tracking-widest mb-3">Tactical Ground Dilemma</h3>
            <h4 className="text-sm text-stone-300 font-black mb-4 uppercase text-amber-500">{activeEventNode.name}</h4>
            <p className="text-xs text-stone-400 mb-8 leading-relaxed text-left bg-stone-950 p-4 border border-stone-850 rounded">
              {activeEventNode.description}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => onTriggerEventChoice(0)}
                className="w-full p-3 bg-stone-950 hover:bg-indigo-950/20 border border-stone-800 hover:border-indigo-500/40 text-left text-xs uppercase px-4 cursor-pointer text-stone-300 hover:text-indigo-300 transition-all duration-300 rounded"
              >
                <div className="font-bold text-[10px] text-amber-400">CHOICE ALPHA: INVENT SUPPLIES</div>
                <div>Raid local black markets to secure extra gold supplies (+45 supplies). But lose 3 HQ DEF from structural instability.</div>
              </button>

              <button
                onClick={() => onTriggerEventChoice(1)}
                className="w-full p-3 bg-stone-950 hover:bg-indigo-950/20 border border-stone-800 hover:border-indigo-500/40 text-left text-xs uppercase px-4 cursor-pointer text-stone-300 hover:text-indigo-300 transition-all duration-300 rounded"
              >
                <div className="font-bold text-[10px] text-amber-400">CHOICE BETA: LOGISTICAL DRILL</div>
                <div>Fortify local settlements. Safely secure HQ Defense (+5 armor shield). But costs 20 Supplies to manage construction.</div>
              </button>

              <button
                onClick={() => onTriggerEventChoice(2)}
                className="w-full p-3 bg-stone-950 hover:bg-indigo-950/20 border border-stone-800 hover:border-indigo-500/40 text-left text-xs uppercase px-4 cursor-pointer text-stone-300 hover:text-indigo-300 transition-all duration-300 rounded"
              >
                <div className="font-bold text-[10px] text-amber-400">CHOICE GAMMA: CONFLICT ENGAGEMENT</div>
                <div>Deploy advanced reconnaissance. Recruits 1 elite tactical asset card to your active deck registry (+1 Card). No cost.</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EXTRA MODAL 3: CARD DRAUGHT LOOT PANEL ================= */}
      {showDraftPanel && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 md:p-8 backdrop-blur-md">
          <div className="max-w-2xl text-center space-y-2 mb-8">
            <Star size={34} className="text-amber-500 mx-auto animate-pulse" />
            <h1 className="text-3xl font-mono tracking-tight text-amber-500 font-bold uppercase">
              Operational Rewards
            </h1>
            <p className="text-stone-400 font-mono text-xs max-w-xl mx-auto">
              You had cleared the battle sectors successfully! Allied logisticians have secured tactical equipment and units. Choose EXACTLY ONE card to add to your deck.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl px-4 select-none mb-8">
            {draftPool.map((card) => {
              const cardWidth = Math.min(200, (windowWidth - 48) / 3);
              return (
                <div
                  key={card.id}
                  className="relative cursor-pointer transition-transform duration-300 transform scale-100 hover:scale-105 hover:-translate-y-2"
                >
                  <CardFrame
                    card={card}
                    width={cardWidth}
                    onClick={() => {
                      sound.playDeploy();
                      onChooseDraftCard(card);
                    }}
                  />
                </div>
              );
            })}
          </div>
          <button
            onClick={onExitDraft}
            className="px-6 py-2 border border-stone-800 hover:border-stone-500 hover:bg-stone-900 rounded font-bold text-xs"
          >
            DISREGARD SUPPLIES
          </button>
        </div>
      )}

      {/* ================= EXTRA PANEL 4: DECK VIEWER PANEL ================= */}
      {showDeckViewer && (
        <div className="absolute inset-0 z-50 flex flex-col items-center bg-stone-950/98 p-4 md:p-8 overflow-y-auto">
          <div className="w-full max-w-5xl flex justify-between items-center border-b border-stone-850 pb-4 mb-6">
            <div>
              <h3 className="text-2xl font-bold uppercase text-amber-500">Operational Logistical Deck</h3>
              <p className="text-xs text-stone-500">Currently active cards available for deployment in battles.</p>
            </div>
            <button
              onClick={handleToggleDeckViewer}
              className="px-4 py-2 bg-stone-850 hover:bg-stone-800 rounded font-mono text-xs uppercase"
            >
              Close Ledger
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-4 w-full max-w-5xl pb-10">
            {groupedDeck.map(({ card, count }, idx) => {
              // 4 columns max for comfortable deck viewing
              const cardWidth = Math.min(160, (windowWidth - 64) / 4);
              return (
                <div
                  key={`${card.id}-${idx}`}
                  className="relative transition-transform duration-300 transform hover:-translate-y-1"
                >
                  <CardFrame card={card} width={cardWidth} />
                  {count > 1 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-[#1E3A8A] text-[#93C5FD] font-black text-sm px-2 py-0.5 rounded-full shadow-lg border-2 border-[#3B82F6]/70 z-50 animate-pulse">
                      x{count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
