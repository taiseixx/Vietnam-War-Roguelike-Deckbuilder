import React, { useState, useEffect, useRef } from 'react';
import { Card, GridUnit, Grid, BattleLog, Faction, CampaignNode } from '../types';
import { CARD_DATABASE } from '../data/cards';
import { sound } from '../utils/sound';
import { PropagandaPoster } from './PropagandaPoster';
import { MulliganOverlay } from './MulliganOverlay';
import { CardDetailModal } from './CardDetailModal';
import { Shield, Swords, Crosshair, ArrowDown, ArrowUp, Activity, Terminal, RotateCcw, Volume2, VolumeX, Flame } from 'lucide-react';

interface BattlefieldProps {
  faction: Faction;
  playerDeck: Card[];
  node: CampaignNode;
  onBattleVictory: (suppliesReward: number) => void;
  onBattleDefeat: () => void;
  onExitBattle: () => void;
}

export const Battlefield: React.FC<BattlefieldProps> = ({
  faction,
  playerDeck,
  node,
  onBattleVictory,
  onBattleDefeat,
  onExitBattle,
}) => {
  // Game state
  const [playerHQ, setPlayerHQ] = useState(20);
  const [playerHQArmor, setPlayerHQArmor] = useState(0);
  const [opponentHQ, setOpponentHQ] = useState(20);
  const [opponentHQArmor, setOpponentHQArmor] = useState(0);

  const [maxKredits, setMaxKredits] = useState(1);
  const [playerKredits, setPlayerKredits] = useState(1);
  const [opponentKredits, setOpponentKredits] = useState(1);

  const [playerDeckRemaining, setPlayerDeckRemaining] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [opponentHand, setOpponentHand] = useState<Card[]>([]);

  // 3 rows x 5 columns grid
  const [grid, setGrid] = useState<Grid>([
    [null, null, null, null, null], // Row 0: Opponent Base line (Line 1/3 check)
    [null, null, null, null, null], // Row 1: Conflict Zone (Line 2/3 check)
    [null, null, null, null, null], // Row 2: Player Base line (Line 3/3 check)
  ]);

  const [activeTraps, setActiveTraps] = useState<{ faction: Faction; cardId: string }[]>([]);

  // Mulligan State
  const [showMulligan, setShowMulligan] = useState(true);
  const [mulliganSelected, setMulliganSelected] = useState<string[]>([]);
  const [showMobileLogs, setShowMobileLogs] = useState(false);

  // Battle Phase
  // "deploy" | "resolve" | "gameover"
  const [battlePhase, setBattlePhase] = useState<'deploy' | 'resolve' | 'gameover'>('deploy');
  const [activeUnitActing, setActiveUnitActing] = useState<{ r: number; c: number } | null>(null);
  const [battleReportLogs, setBattleReportLogs] = useState<BattleLog[]>([]);
  const [currentTurnOwner, setCurrentTurnOwner] = useState<Faction>('USA'); // Player first
  const [selectedOrderCard, setSelectedOrderCard] = useState<Card | null>(null);
  const [targetingIndex, setTargetingIndex] = useState<{ r: number; c: number } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSiren, setActiveSiren] = useState(false);

  // Stats
  const [opponentDeckSize, setOpponentDeckSize] = useState(15);

  // Tactical Drag and Drop & Targeting Arrows State
  const [activeDrag, setActiveDrag] = useState<{
    card: Card;
    sourceType: 'hand' | 'board';
    sourceR?: number;
    sourceC?: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // References for bounding box calculations
  const battlefieldRef = useRef<HTMLDivElement | null>(null);
  const gridRefs = useRef<(HTMLDivElement | null)[][]>([
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null]
  ]);

  // Selected Board Unit for Manual Moves/Attacks (KARDS Style)
  const [selectedBoardUnit, setSelectedBoardUnit] = useState<{ r: number; c: number } | null>(null);

  // Drag over coordinates
  const [draggedCard, setDraggedCard] = useState<Card | null>(null); // Keep for legacy
  const [selectedHandUnit, setSelectedHandUnit] = useState<Card | null>(null);

  // Detailed Modal Card State
  const [detailedCard, setDetailedCard] = useState<Card | null>(null);

  // Add Log Entry helper
  const addLog = (message: string, tag: BattleLog['tag']) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setBattleReportLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, message, tag, time: timeStr },
      ...prev,
    ]);
  };

  // Dynamic 1960s KARDS-style helpers
  const getUnitClassSymbol = (unit: any) => {
    if (unit.id === 'hq_player' || unit.id === 'hq_opponent') return '⭐';
    if (unit.isAir) return '🚁';
    if (unit.isArtillery) return '💥';
    if (unit.isAmphibious) return '⚓';
    const idLower = unit.id?.toLowerCase() || '';
    if (idLower.includes('tank') || idLower.includes('patton') || idLower.includes('apc') || idLower.includes('acav') || idLower.includes('armoured') || idLower.includes('armored')) return '🚜';
    return '🪖';
  };

  const getFactionCurrency = (fac: string) => {
    if (fac === 'US' || fac === 'ARVN' || fac === 'USA' || fac === 'US/ARVN') {
      return { symbol: '$', name: 'Dollars', color: 'text-emerald-400 bg-emerald-950/90 border-emerald-500/40' };
    }
    return { symbol: '🎫', name: 'Ration Coupons', color: 'text-red-400 bg-red-950/90 border-red-500/40' };
  };

  const renderCard = (card: Card, isMini: boolean = false, isSelected: boolean = false) => {
    const currency = getFactionCurrency(card.faction);
    const isHQ = card.id === 'hq_player' || card.id === 'hq_opponent';

    // Scale factors for board (isMini) vs hand (normal)
    const cardClass = isMini 
      ? `relative w-full h-full rounded-lg overflow-hidden border bg-stone-950 cursor-pointer shadow-xl transition-all duration-300 flex flex-col justify-between ${
          isSelected 
            ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-stone-900/95 z-20 shadow-2xl scale-102 font-mono' 
            : 'border-stone-800 hover:border-amber-500 hover:shadow-lg bg-stone-900/90'
        }` 
      : `relative flex-shrink-0 h-[14vh] xs:h-[15vh] sm:h-[16vh] lg:h-[17vh] aspect-[3/4.2] rounded-lg overflow-hidden border bg-stone-950 cursor-pointer shadow-xl transition-all duration-300 transform scale-100 hover:scale-105 hover:-translate-y-2 flex flex-col justify-between ${
          isSelected
            ? 'border-cyan-500 ring-2 ring-cyan-500/50 scale-102 bg-stone-900 shadow-2xl'
            : 'border-stone-800 hover:border-amber-500 hover:shadow-lg'
        }`;

    const badgeSymbolSize = isMini ? 'text-[6px] px-1 py-0.2' : 'text-[9px] px-1.5 py-0.5';
    const badgeTypeSize = isMini ? 'text-[5.5px] px-0.5 bg-stone-950/90 text-stone-400' : 'text-[7.5px] px-1 bg-stone-950/90 text-stone-400';
    const textGap = isMini ? 'p-1 gap-0.5' : 'p-2 gap-1';
    const titleSize = isMini ? 'text-[7px]' : 'text-[11px]';
    const opCostSize = isMini ? 'text-[5.5px]' : 'text-[8px]';
    const abilitySize = isMini ? 'text-[6px] leading-snug line-clamp-1 h-2 min-h-0 border-t border-stone-850/40 my-0.2 pt-0.2' : 'text-[9px] font-typewriter leading-tight line-clamp-3 min-h-[30px] my-1 border-t border-stone-850/50 pt-1';
    const statsBoxSize = isMini ? 'text-[7.5px] py-0 border-stone-250 font-bold' : 'text-[10px] py-0.5 border-stone-300 font-bold';
    const statsDivClass = isMini ? 'grid grid-cols-3 bg-stone-100 text-stone-950 border rounded shadow-xs items-center divide-x divide-stone-250 py-0.2' : 'grid grid-cols-3 bg-stone-100 text-stone-950 border rounded shadow-md items-center divide-x divide-stone-300 py-0.5';

    return (
      <div 
        onClick={(e) => {
          if (isMini) {
            e.stopPropagation();
          }
          setDetailedCard(card);
          if (!isMini) {
            handleSelectCard(card);
          }
        }}
        className={cardClass}
      >
        {/* Top Bar Overlays with Currency Badge */}
        {!isHQ && (
          <div className={`absolute select-none pointer-events-none ${isMini ? 'top-0.5 left-0.5' : 'top-1 left-1'} z-10`}>
            <span className={`font-black rounded border shadow-md font-mono ${badgeSymbolSize} ${currency.color}`}>
              {currency.symbol}{card.k}
            </span>
          </div>
        )}
        <div className={`absolute select-none pointer-events-none ${isMini ? 'top-0.5 right-0.5' : 'top-1 right-1'} z-10`}>
          <span className={`uppercase tracking-widest border border-stone-850 rounded font-black font-mono ${badgeTypeSize} ${
            isHQ 
              ? card.faction === 'US' 
                ? 'bg-amber-950/95 border-amber-500/50 text-amber-400' 
                : 'bg-red-950/95 border-red-500/50 text-red-400'
              : ''
          }`}>
            {isHQ ? 'HQ SITE' : card.type}
          </span>
        </div>

        {/* Poster Artwork Render */}
        <div className="aspect-[4/3] w-full border-b border-stone-950 shrink-0 select-none pointer-events-none relative overflow-hidden">
          <PropagandaPoster keyword={card.artworkKeyword} faction={card.faction} name={card.name} />
        </div>

        {/* Stats HUD footer */}
        <div className={`${textGap} font-mono bg-stone-900 flex-grow flex flex-col justify-between items-stretch select-none`}>
          <div className="pointer-events-none">
            <div className={`font-extrabold text-stone-100 truncate font-sans tracking-wide leading-tight ${titleSize}`}>
              {card.name}
            </div>
            {/* Operation/Action Cost */}
            <div className={`text-amber-500 uppercase font-black opacity-85 tracking-wider font-mono ${opCostSize}`}>
              Op Cost: {card.o} {currency.symbol}
            </div>
          </div>

          {/* Card ability in small typewriter script */}
          <p className={`text-stone-400 font-typewriter select-none pointer-events-none ${abilitySize}`}>
            {card.ability}
          </p>

          {/* Bottom stats row for units, or action label for orders */}
          {card.type === 'Unit' ? (
            <div className={`${statsDivClass} font-mono select-none z-10 shrink-0 pointer-events-none`}>
              {/* Attack */}
              <span className={`text-red-700 flex items-center justify-center gap-0.5 ${statsBoxSize}`}>{card.atk}</span>
              {/* Class Icon */}
              <span className="text-[7px] flex items-center justify-center py-0">{getUnitClassSymbol(card)}</span>
              {/* Defense */}
              <span className={`text-emerald-800 flex items-center justify-center gap-0.5 ${statsBoxSize}`}>{card.def}</span>
            </div>
          ) : (
            <div className={`text-center py-0.2 bg-cyan-950/70 border border-cyan-800/40 text-cyan-400 uppercase tracking-widest rounded shadow-sm select-none shrink-0 border-opacity-40 font-mono font-bold pointer-events-none ${isMini ? 'text-[5.5px]' : 'text-[8px]'}`}>
              ⚡ TACTICAL DIRECTIVE
            </div>
          )}
        </div>
      </div>
    );
  };

  // Mute toggle
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // INITIAL SETUP / DECK SHUFFLE WITH HQ PLACEMENTS
  useEffect(() => {
    sound.startChopperAmbience();

    // Prepare Player Deck
    const shuffledDeck = [...playerDeck].sort(() => Math.random() - 0.5);
    const openingHandCount = faction === 'USA' ? 4 : 5; // US draws 4, NVA draws 5 starting
    const startingHand = shuffledDeck.slice(0, openingHandCount);
    const remainingDeck = shuffledDeck.slice(openingHandCount);

    setPlayerHand(startingHand);
    setPlayerDeckRemaining(remainingDeck);

    // Prepare Opponent Deck (opposite faction)
    const opponentFaction = faction === 'USA' ? 'NVA' : 'US';
    const opponentPool = CARD_DATABASE.filter(
      (c) => c.faction === opponentFaction || (opponentFaction === 'NVA' && c.faction === 'VC') || (opponentFaction === 'US' && c.faction === 'ARVN')
    );
    const startingOpponentCount = faction === 'USA' ? 5 : 4;
    setOpponentDeckSize(15 - startingOpponentCount);

    // Initial Opponent Hand Card Objects
    const oppHand = Array.from({ length: startingOpponentCount }).map(() => {
      const idx = Math.floor(Math.random() * opponentPool.length);
      return opponentPool[idx];
    });
    setOpponentHand(oppHand);

    // Set up the static physical HQ cells on grid base positions
    const isPlayerUS = faction === 'USA';
    const oppFactionName = isPlayerUS ? 'NVA' : 'US';
    const playerFactionName = isPlayerUS ? 'US' : 'NVA';

    const oppHQCard: GridUnit = {
      id: 'hq_opponent',
      name: isPlayerUS ? 'HANOI BASE HQ' : 'SAIGON COMMAND HQ',
      faction: oppFactionName,
      k: 0,
      o: 0,
      atk: 0,
      def: 20,
      maxDef: 20,
      type: 'Unit',
      rarity: 'Elite',
      ability: `Primary Enemy Strategic Command Base. Reduce defense to 0!`,
      artworkKeyword: oppFactionName === 'NVA' ? 'hq_hanoi' : 'hq_saigon',
      instanceId: 'hq-opponent-default',
      hasMovedOrAttackedThisTurn: true,
      camouflage: false,
      frozenTurns: 0,
      armor: 0,
      isAmphibious: false,
      isAir: false,
      isArtillery: false,
    };

    const playerHQCard: GridUnit = {
      id: 'hq_player',
      name: isPlayerUS ? 'SAIGON COMMAND HQ' : 'HANOI BASE HQ',
      faction: playerFactionName,
      k: 0,
      o: 0,
      atk: 0,
      def: 20,
      maxDef: 20,
      type: 'Unit',
      rarity: 'Elite',
      ability: 'Your Command HQ base station. Guard this line with your life!',
      artworkKeyword: playerFactionName === 'US' ? 'hq_saigon' : 'hq_hanoi',
      instanceId: 'hq-player-default',
      hasMovedOrAttackedThisTurn: true,
      camouflage: false,
      frozenTurns: 0,
      armor: 0,
      isAmphibious: false,
      isAir: false,
      isArtillery: false,
    };

    setGrid([
      [null, null, oppHQCard, null, null],
      [null, null, null, null, null],
      [null, null, playerHQCard, null, null],
    ]);

    addLog(`GRID SECURED. Initiating Operational Sector: ${node.name}`, 'SYSTEM');
    addLog(`SQUAD ALLY: ${faction === 'USA' ? 'Allied Forces' : 'National Liberation Front'}`, 'SYSTEM');

    return () => {
      sound.stopChopperAmbience();
    };
  }, [playerDeck, faction, node]);

  // Dynamically synchronize the HQs health inside of the physical board cards whenever the states alter
  useEffect(() => {
    setGrid((prevGrid) => {
      return prevGrid.map((row) =>
        row.map((unit) => {
          if (unit?.id === 'hq_opponent') {
            return { ...unit, def: opponentHQ };
          }
          if (unit?.id === 'hq_player') {
            return { ...unit, def: playerHQ };
          }
          return unit;
        })
      );
    });
  }, [opponentHQ, playerHQ]);

  // COMBAT TRIGGERS FOR SPECIAL ABILITIES
  const applyAuraBuffs = (currentGrid: Grid): Grid => {
    // Return grid copying original stats and then applying local dynamic aura increases
    const tempGrid = currentGrid.map((row) =>
      row.map((unit) => {
        if (!unit) return null;
        // Reset dynamic buff properties
        return {
          ...unit,
          atk: CARD_DATABASE.find((c) => c.id === unit.id)?.atk || unit.atk,
          def: unit.def, // Def can be altered but maximum remains limit
        };
      })
    );

    // Scan for PAVN High Command Vanguard (Elite NVA: +1/+1 to all deployed NVA/VC units)
    let nvaAuraCount = 0;
    // Scan for MAAG Advisors (USA: Adjacent ARVN gets double ATK)
    const advisorsOnGrid: { r: number; c: number }[] = [];

    tempGrid.forEach((row, r) => {
      row.forEach((unit, c) => {
        if (unit) {
          if (unit.id === 'nva_command_vanguard') nvaAuraCount++;
          if (unit.id === 'us_maag_advisors') advisorsOnGrid.push({ r, c });
        }
      });
    });

    // 1. Apply NVA Command Vanguard aura
    if (nvaAuraCount > 0) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const unit = tempGrid[r][c];
          if (unit && (unit.faction === 'NVA' || unit.faction === 'VC') && unit.id !== 'nva_command_vanguard') {
            unit.atk += nvaAuraCount;
          }
        }
      }
    }

    // 2. Apply MAAG Advisors multiplicative synergy (adjacent left/right ARVN positions double ATK)
    advisorsOnGrid.forEach(({ r, c }) => {
      const checkCoords = [
        { r, c: c - 1 },
        { r, c: c + 1 },
      ];
      checkCoords.forEach(({ r: cr, c: cc }) => {
        if (cc >= 0 && cc < 5) {
          const unit = tempGrid[cr][cc];
          if (unit && unit.faction === 'ARVN') {
            unit.atk *= 2;
          }
        }
      });
    });

    // 3. Scan for Group 559th Logistics: At turn start, reduce 'O' of adjacent friendly units by 1
    // (This is applied in turn replenish phase instead, to prevent continuous active state resets)

    return tempGrid;
  };

  // MULLIGAN CONFIRMATION
  const handleConfirmMulligan = () => {
    sound.playRadioStatic();
    if (mulliganSelected.length > 0) {
      addLog(`Mulligan Redraft: Exchanging ${mulliganSelected.length} cards.`, 'SYSTEM');
      const keeperCards = playerHand.filter((c) => !mulliganSelected.includes(c.id));
      const pool = [...playerDeckRemaining].sort(() => Math.random() - 0.5);

      const freshCards = pool.slice(0, mulliganSelected.length);
      const leftoverDeck = [...pool.slice(mulliganSelected.length), ...playerDeck.filter((c) => mulliganSelected.includes(c.id))];

      setPlayerHand([...keeperCards, ...freshCards]);
      setPlayerDeckRemaining(leftoverDeck);
    } else {
      addLog(`Commander accepted starting hand unchanged.`, 'SYSTEM');
    }
    setShowMulligan(false);
  };

  const handleToggleMulliganItem = (cardId: string) => {
    sound.playCardDraw();
    setMulliganSelected((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // TURN BEGIN CYCLE
  const startNextTurn = (nextOwner: Faction) => {
    setCurrentTurnOwner(nextOwner);
    const newMaxKredits = Math.min(12, maxKredits + (nextOwner === 'USA' ? 1 : 0));
    if (nextOwner === 'USA') {
      setMaxKredits(newMaxKredits);
    }

    setPlayerKredits(newMaxKredits);
    setOpponentKredits(newMaxKredits);

    // Replenish status of grid units
    let updatedGrid = grid.map((row) =>
      row.map((unit) => {
        if (!unit) return null;
        if (
          (nextOwner === 'USA' && (unit.faction === 'US' || unit.faction === 'ARVN')) ||
          (nextOwner === 'NVA' && (unit.faction === 'NVA' || unit.faction === 'VC'))
        ) {
          return {
            ...unit,
            hasMovedOrAttackedThisTurn: false,
            frozenTurns: Math.max(0, unit.frozenTurns - 1),
          };
        }
        return unit;
      })
    );

    // Apply Logistics Group 559th cost reduction to adjacent units
    updatedGrid = updatedGrid.map((row, r) =>
      row.map((unit, c) => {
        if (!unit) return null;
        // Group 559th logistics reduction check
        const isLogisticsGroupOnHQ =
          (r > 0 && updatedGrid[r - 1][c]?.id === 'nva_group_559') ||
          (r < 4 && updatedGrid[r + 1][c]?.id === 'nva_group_559') ||
          (c > 0 && updatedGrid[r][c - 1]?.id === 'nva_group_559') ||
          (c < 4 && updatedGrid[r][c + 1]?.id === 'nva_group_559');

        if (isLogisticsGroupOnHQ && (unit.faction === 'NVA' || unit.faction === 'VC')) {
          return {
            ...unit,
            o: Math.max(0, unit.o - 1),
          };
        }
        return unit;
      })
    );

    setGrid(applyAuraBuffs(updatedGrid));

    // Draw card
    if (nextOwner === 'USA') {
      if (playerDeckRemaining.length > 0) {
        sound.playCardDraw();
        const [drawn, ...rest] = playerDeckRemaining;
        if (playerHand.length < 9) {
          setPlayerHand((prev) => [...prev, drawn]);
          addLog(`Allied Logistics drew: ${drawn.name}.`, 'DEPLOY');
        } else {
          addLog(`Hand overflow. Burned ${drawn.name}.`, 'SYSTEM');
        }
        setPlayerDeckRemaining(rest);
      } else {
        addLog(`WARNING: Allied Reserves depleted! HQ absorbs damage.`, 'HQ');
        setPlayerHQ((h) => Math.max(0, h - 2));
      }
    } else {
      // Opponent AI turn actions
      if (opponentDeckSize > 0) {
        setOpponentDeckSize((s) => s - 1);
        const oppPool = CARD_DATABASE.filter(
          (c) => c.faction === 'NVA' || c.faction === 'VC'
        );
        const card = oppPool[Math.floor(Math.random() * oppPool.length)];
        setOpponentHand((prev) => [...prev, card]);
      }
      executeOpponentAITurn();
    }
  };

  // CLIENT CARD USAGE (DEPLOY CODES)
  const handleSelectCard = (card: Card) => {
    if (battlePhase !== 'deploy' || currentTurnOwner !== 'USA') return;

    if (card.type === 'Order') {
      sound.playRadioStatic();
      setSelectedOrderCard(card);
      setSelectedHandUnit(null);
      addLog(`Selected Order: ${card.name}. Select targeted column panel/HQ.`, 'ORDER');
    } else if (card.type === 'Unit') {
      sound.playRadioStatic();
      setSelectedHandUnit(card);
      setSelectedOrderCard(null);
      addLog(`Selected Unit: ${card.name}. Select empty cell in your Support/Base lines to deploy.`, 'DEPLOY');
    } else if (card.type === 'Countermeasure') {
      sound.playRadioStatic();
      setSelectedOrderCard(card); // Countermeasure operates similar to Order when cast from hand
      setSelectedHandUnit(null);
      addLog(`Selected Countermeasure: ${card.name}. Select targeted column panel to set trap.`, 'ORDER');
    }
  };

  const handleDeployHandUnit = (card: Card, r: number, c: number) => {
    const isAirmobile = card.id === 'us_1st_cav_heli';
    const isScreamingEagles = card.id === 'us_101st_airborne';

    let isValidRow = false;
    if (isAirmobile || isScreamingEagles) {
      isValidRow = r === 1 || r === 2;
    } else {
      isValidRow = r === 2;
    }

    if (!isValidRow) {
      addLog(`Invalid Deployment Row. Regular forces restricted to Support/Base lines.`, 'SYSTEM');
      setSelectedHandUnit(null);
      return;
    }

    if (grid[r][c] !== null) {
      addLog(`Tile is already occupied.`, 'SYSTEM');
      setSelectedHandUnit(null);
      return;
    }

    if (playerKredits < card.k) {
      addLog(`Insufficient Kredits (Need K:${card.k} to deploy ${card.name}).`, 'SYSTEM');
      setSelectedHandUnit(null);
      return;
    }

    sound.playDeploy();

    if (card.id === 'us_combat_engineers') {
      setPlayerHQArmor((a) => a + 3);
      setActiveTraps((traps) => traps.filter((t) => t.faction !== 'NVA'));
      addLog(`Combat Engineers cleared active guerrilla traps.`, 'BUFF');
    }

    const newUnit: GridUnit = {
      ...card,
      instanceId: `unit-${Date.now()}-${r}-${c}`,
      hasMovedOrAttackedThisTurn: card.id === 'us_f4_phantom',
      camouflage: false,
      frozenTurns: card.id === 'us_f4_phantom' ? 0 : 1,
      armor: 0,
      isAmphibious: card.id === 'nva_803rd_riverine',
      isAir: card.id === 'us_1st_cav_heli' || card.id === 'us_f4_phantom' || card.id === 'nva_mig17_pilot',
      isArtillery: card.id === 'nva_40th_artillery' || card.id === 'vc_7th_reg_artillery',
    };

    const nextGrid = [...grid];
    nextGrid[r][c] = newUnit;

    setGrid(applyAuraBuffs(nextGrid));
    setPlayerKredits((k) => k - card.k);
    setPlayerHand((prev) => prev.filter((cd) => cd.id !== card.id));
    setSelectedHandUnit(null);

    addLog(`Deployed ${card.name} to Row ${r + 1}, Lane ${c + 1}.`, 'DEPLOY');
  };

  // HANDLES DETAILED MANUAL CLICK AND COMMITTED SELECTION (KARDS-STYLE PLAY)
  const handleGridCellClick = (r: number, c: number) => {
    if (currentTurnOwner !== 'USA' || battlePhase !== 'deploy') return;

    // If there is an active selected unit card from hand, prioritize deploying it!
    if (selectedHandUnit) {
      handleDeployHandUnit(selectedHandUnit, r, c);
      return;
    }

    const clickedUnit = grid[r][c];

    // If there is an active selected order card from hand, prioritize casting it!
    if (selectedOrderCard) {
      handleCastOrder(c);
      return;
    }

    // Step 1: No card is selected on the board yet
    if (!selectedBoardUnit) {
      if (clickedUnit) {
        const isFriendly = clickedUnit.faction === 'US' || clickedUnit.faction === 'ARVN';
        if (isFriendly) {
          if (clickedUnit.id === 'hq_player') {
            addLog("Your HQ is defensive station. It does not advance.", "SYSTEM");
            return;
          }
          if (clickedUnit.hasMovedOrAttackedThisTurn) {
            sound.playRadioStatic();
            addLog(`${clickedUnit.name} is currently rearming (Action already completed this turn).`, "SYSTEM");
            return;
          }
          if (clickedUnit.frozenTurns > 0) {
            sound.playRadioStatic();
            addLog(`${clickedUnit.name} is securing positions (Frozen for current deployment phase).`, "SYSTEM");
            return;
          }
          setSelectedBoardUnit({ r, c });
          sound.playRadioStatic();
        } else {
          // Enemy card click: open detailed modal views
          setDetailedCard(clickedUnit);
        }
      }
      return;
    }

    // Step 2: A friendly card is already selected on the board
    if (selectedBoardUnit) {
      const selectedUnit = grid[selectedBoardUnit.r][selectedBoardUnit.c];
      if (!selectedUnit) {
        setSelectedBoardUnit(null);
        return;
      }

      // Clicking the exact same unit deselects it
      if (selectedBoardUnit.r === r && selectedBoardUnit.c === c) {
        setSelectedBoardUnit(null);
        return;
      }

      // Clicking another active friendly unit switches selection
      if (clickedUnit && (clickedUnit.faction === 'US' || clickedUnit.faction === 'ARVN')) {
        if (clickedUnit.id === 'hq_player') {
          setSelectedBoardUnit(null);
          return;
        }
        if (clickedUnit.hasMovedOrAttackedThisTurn || clickedUnit.frozenTurns > 0) {
          setSelectedBoardUnit(null);
          return;
        }
        setSelectedBoardUnit({ r, c });
        sound.playRadioStatic();
        return;
      }

      // Operational cost checks
      if (playerKredits < selectedUnit.o) {
        addLog(`Insufficient Kredits (Need K:${selectedUnit.o} Op Cost to action ${selectedUnit.name}).`, "SYSTEM");
        setSelectedBoardUnit(null);
        return;
      }

      // Subcase A: Targeted cell is empty - attempting MOVEMENT!
      if (!clickedUnit) {
        const isSameColumn = selectedBoardUnit.c === c;
        const rowDiff = r - selectedBoardUnit.r;

        // KARDS movement rule: Can advance (r - 1) or retreat (r + 1) by 1 row in the exact same column
        const isValidMove = isSameColumn && (rowDiff === -1 || rowDiff === 1);
        if (!isValidMove) {
          addLog("Invalid Command. Normal ground battalions advance or retreat by 1 cell in vertical alignment.", "SYSTEM");
          setSelectedBoardUnit(null);
          return;
        }

        // Execute board move action
        sound.playDeploy();
        const nextGrid = [...grid];
        nextGrid[r][c] = { ...selectedUnit, hasMovedOrAttackedThisTurn: true };
        nextGrid[selectedBoardUnit.r][selectedBoardUnit.c] = null;

        setPlayerKredits(k => k - selectedUnit.o);
        setGrid(applyAuraBuffs(nextGrid));
        addLog(`${selectedUnit.name} moved to Sector Row ${r + 1}, Lane ${c + 1}.`, "MOVE");

        // Mine/Punji triggers check
        checkMineTrigger(r, c, nextGrid[r][c] as GridUnit);
        setSelectedBoardUnit(null);
        return;
      }

      // Subcase B: Targeted cell is preoccupied - attempting COMBAT ATTACK!
      const isEnemy = clickedUnit.faction === 'NVA' || clickedUnit.faction === 'VC' || clickedUnit.id === 'hq_opponent';
      if (isEnemy) {
        // Range check
        let isRangeValid = false;
        if (selectedUnit.isAir) {
          isRangeValid = true; // Air planes sweep and strike anywhere!
        } else if (selectedUnit.isArtillery) {
          // Artillery can strike any row in its same vertical alignment
          isRangeValid = selectedBoardUnit.c === c;
        } else {
          // Regular infantry & tanks: adjacent row or column
          const rDiff = Math.abs(selectedBoardUnit.r - r);
          const cDiff = Math.abs(selectedBoardUnit.c - c);
          isRangeValid = (rDiff <= 1 && cDiff === 0) || (cDiff <= 1 && rDiff === 0);
        }

        if (!isRangeValid) {
          addLog(`Target out of strategic range for ${selectedUnit.name}.`, "SYSTEM");
          setSelectedBoardUnit(null);
          return;
        }

        // Execute attack sequence!
        sound.playGunshot();
        const nextGrid = [...grid];

        if (clickedUnit.id === 'hq_opponent') {
          // Direct attack on the Enemy Command HQ
          sound.playExplosion();
          const damage = selectedUnit.atk;
          const remainingDefense = Math.max(0, opponentHQ - damage);
          setOpponentHQ(remainingDefense);
          addLog(`DIRECT IMPACT! Allied ${selectedUnit.name} bombarded Enemy HQ for ${damage} damage!`, "HQ");
        } else {
          // Unit vs standard Unit
          clickedUnit.def -= selectedUnit.atk;
          addLog(`Allied ${selectedUnit.name} launched offensive on ${clickedUnit.name}, dealing ${selectedUnit.atk} damage.`, "ATTACK");

          // Retaliation checks (Artillery & Air forces take no counter-strike retaliation damage)
          const canEnemyRetaliate = !selectedUnit.isAir && !selectedUnit.isArtillery && (Math.abs(selectedBoardUnit.r - r) <= 1 && Math.abs(selectedBoardUnit.c - c) <= 1);
          if (canEnemyRetaliate) {
            selectedUnit.def -= clickedUnit.atk;
            addLog(`${clickedUnit.name} retaliated dealing ${clickedUnit.atk} damage to ${selectedUnit.name}.`, "ATTACK");
          }

          // Bury deceased casualties
          if (clickedUnit.def <= 0) {
            addLog(`Enemy ${clickedUnit.name} was neutralized on battlefield.`, "DEATH");
            nextGrid[r][c] = null;
          }
          if (selectedUnit.def <= 0) {
            addLog(`Allied ${selectedUnit.name} fell in the line of duty.`, "DEATH");
            nextGrid[selectedBoardUnit.r][selectedBoardUnit.c] = null;
          } else {
            // Keep alive but mark completed
            nextGrid[selectedBoardUnit.r][selectedBoardUnit.c] = { ...selectedUnit, hasMovedOrAttackedThisTurn: true };
          }
        }

        setPlayerKredits(k => k - selectedUnit.o);
        setGrid(applyAuraBuffs(nextGrid));
        setSelectedBoardUnit(null);
        return;
      }
    }
  };

  const handleCastOrder = (colIdx: number) => {
    if (!selectedOrderCard) return;
    if (playerKredits < selectedOrderCard.k) {
      addLog(`Insufficient Kredits (Need K:${selectedOrderCard.k}).`, 'SYSTEM');
      setSelectedOrderCard(null);
      return;
    }

    sound.playExplosion();
    const orderId = selectedOrderCard.id;
    const isRadarCountered = activeTraps.some((t) => t.faction === 'NVA' && t.cardId === 'nva_trap_amber'); // Counter check
    if (isRadarCountered) {
      addLog(`COUNTERMEASURE TRIGGERED! "Trận địa Phục kích" intercepted and canceled Order: ${selectedOrderCard.name}!`, 'SYSTEM');
      setActiveTraps((traps) => traps.filter((t) => !(t.faction === 'NVA' && t.cardId === 'nva_trap_amber')));
      setPlayerKredits((k) => k - selectedOrderCard.k);
      setPlayerHand((hand) => hand.filter((c) => c.id !== selectedOrderCard.id));
      setSelectedOrderCard(null);
      return;
    }

    let nextGrid = [...grid];

    if (orderId === 'us_order_hamlet') {
      setPlayerHQArmor((a) => a + 4);
      addLog(`Casted "Strategic Hamlet Program". Allied HQ gained +4 Armor defence.`, 'ORDER');
    } else if (orderId === 'us_order_logistics') {
      setPlayerKredits((k) => k + 3);
      addLog(`Casted "Logistical Superiority". Secured +3 temporary Kredits.`, 'ORDER');
    } else if (orderId === 'us_order_briefing') {
      if (opponentHand.length > 0) {
        const discarded = opponentHand[0];
        setOpponentHand((hand) => hand.slice(1));
        addLog(`Casted "Intelligence Briefing". Intel leaked! opponent discarded: ${discarded.name}.`, 'ORDER');
      } else {
        addLog(`Intelligence briefing turned up empty (opponent has empty hand).`, 'ORDER');
      }
    } else if (orderId === 'us_order_chopper') {
      // Spawn 2/2 Helitroop in Conflict Zone (Row 1, Column colIdx)
      if (!nextGrid[1][colIdx]) {
        nextGrid[1][colIdx] = {
          id: 'spaw_helitroop',
          name: '1st Cav Heli-Troop',
          faction: 'US',
          k: 0,
          o: 1,
          atk: 2,
          def: 2,
          maxDef: 2,
          type: 'Unit',
          rarity: 'Common',
          ability: 'Heli Dropped tactical backup unit.',
          artworkKeyword: 'screaming_eagles',
          instanceId: `spawn-chopper-${Date.now()}-${colIdx}`,
          hasMovedOrAttackedThisTurn: true,
          camouflage: false,
          frozenTurns: 0,
          armor: 0,
          isAmphibious: false,
          isAir: false,
          isArtillery: false,
        };
        addLog(`Tactical helitroop deployed on Conflict Zone Col ${colIdx + 1}.`, 'ORDER');
      } else {
        addLog(`Target zone occupied! Chopper deployment aborted.`, 'SYSTEM');
        setSelectedOrderCard(null);
        return;
      }
    } else if (orderId === 'us_order_airstrike') {
      // Deal 2 damage to all units in selected column colIdx
      for (let r = 0; r < 3; r++) {
        const target = nextGrid[r][colIdx];
        if (target) {
          target.def -= 2;
          if (target.def <= 0) {
            addLog(`${target.name} incinerated in Column ${colIdx + 1} napalm airstrike.`, 'DEATH');
            nextGrid[r][colIdx] = null;
          } else {
            addLog(`${target.name} struck for 2 damage in Napalm Airstrike.`, 'ORDER');
          }
        }
      }
      addLog(`Napalm strike targeted entire operational Column ${colIdx + 1}!`, 'ORDER');
    } else if (orderId === 'arvn_order_binh_dinh') {
      // Draw 1 card and give +2 DEF to chosen ARVN unit on column
      const targetUnit = nextGrid.find((row) => row[colIdx]?.faction === 'ARVN')?.[colIdx];
      if (targetUnit) {
        targetUnit.def += 2;
        targetUnit.maxDef += 2;
        addLog(`Pacification plan secured. ARVN ${targetUnit.name} given +2 DEF.`, 'ORDER');
      }
      if (playerDeckRemaining.length > 0) {
        const [drawn, ...rest] = playerDeckRemaining;
        setPlayerHand((prev) => [...prev, drawn]);
        setPlayerDeckRemaining(rest);
      }
    } else if (orderId === 'arvn_order_tong_dong_vien') {
      // Heal all deployed ARVN units back to max DEF
      nextGrid = nextGrid.map((row) =>
        row.map((unit) => {
          if (unit && unit.faction === 'ARVN') {
            return { ...unit, def: unit.maxDef };
          }
          return unit;
        })
      );
      addLog(`General mobilization issued to all ARVN divisions on grid.`, 'ORDER');
    } else if (orderId === 'nva_order_hanh_quan') {
      // Rapid March: Grants +2 ATK this turn to a friendly selected unit on this column
      const targetUnit = nextGrid.find((row) => row[colIdx] && (row[colIdx]?.faction === 'NVA' || row[colIdx]?.faction === 'VC'))?.[colIdx];
      if (targetUnit) {
        targetUnit.atk += 2;
        addLog(`Rapid March: Friendly unit ${targetUnit.name} gained +2 ATK this turn.`, 'ORDER');
      } else {
        addLog(`Rapid March cast, but no target friendly PAVN/VC force in Column ${colIdx + 1}.`, 'ORDER');
      }
    } else if (orderId === 'nva_order_nguy_trang') {
      // Foliage Camouflage: Grants Camouflage (+3 max DEF and full heal) to a friendly unit
      const targetUnit = nextGrid.find((row) => row[colIdx] && (row[colIdx]?.faction === 'NVA' || row[colIdx]?.faction === 'VC'))?.[colIdx];
      if (targetUnit) {
        targetUnit.maxDef += 3;
        targetUnit.def = targetUnit.maxDef;
        targetUnit.camouflage = true;
        addLog(`Foliage Camouflage applied to friendly unit ${targetUnit.name} in Column ${colIdx + 1}.`, 'ORDER');
      } else {
        addLog(`Foliage Camouflage cast, but no target in Column ${colIdx + 1}.`, 'ORDER');
      }
    } else if (orderId === 'nva_order_bao_vay') {
      // Surround & Isolate: Freeze 1 selected enemy unit for 1 turn
      const enemyUnit = nextGrid.find((row) => row[colIdx] && (row[colIdx]?.faction === 'US' || row[colIdx]?.faction === 'ARVN'))?.[colIdx];
      if (enemyUnit) {
        enemyUnit.frozenTurns = 2;
        addLog(`Surround & Isolate: Enemy unit ${enemyUnit.name} frozen for 1 turn.`, 'ORDER');
      } else {
        addLog(`Surround & Isolate cast, but no enemy unit in Column ${colIdx + 1}.`, 'ORDER');
      }
    } else if (orderId === 'nva_order_loi_keu_goi') {
      // Emulation Appeal: Grants +1 ATK and +1 DEF to all currently deployed friendly units
      nextGrid = nextGrid.map((row) =>
        row.map((unit) => {
          if (unit && (unit.faction === 'NVA' || unit.faction === 'VC')) {
            return { ...unit, atk: unit.atk + 1, def: unit.def + 1, maxDef: unit.maxDef + 1 };
          }
          return unit;
        })
      );
      addLog(`Emulation Appeal: All active friendly PAVN/VC fighters awarded +1 ATK & +1 DEF.`, 'ORDER');
    } else if (orderId === 'nva_order_xe_doc') {
      // Truong Son Drive: Draw 2 cards. If they are NVA units, set Kredit cost to 0
      let drawnCount = 0;
      let tempHand = [...playerHand];
      let tempDeck = [...playerDeckRemaining];
      while (drawnCount < 2 && tempDeck.length > 0) {
        let [drawn, ...rest] = tempDeck;
        if (drawn.faction === 'NVA' || drawn.faction === 'VC') {
          drawn = { ...drawn, k: 0 };
        }
        tempHand.push(drawn);
        tempDeck = rest;
        drawnCount++;
      }
      setPlayerHand(tempHand);
      setPlayerDeckRemaining(tempDeck);
      addLog(`Truong Son Drive executed! Logistics draw 2 reinforcements with 0 deployment credits.`, 'ORDER');
    } else if (orderId === 'nva_trap_amber') {
      // Countermeasure Ambush Trap: Triggers when an enemy unit enters the Conflict Zone
      setActiveTraps((traps) => [...traps, { faction: 'NVA', cardId: 'nva_trap_amber' }]);
      addLog(`Prepared hidden Ambush Trap inside Column ${colIdx + 1}.`, 'ORDER');
    } else if (orderId === 'vc_order_vuon_khong') {
      // Scorched Earth: Returns one damaged friendly VC unit to hand
      const targetUnitIdx = nextGrid.findIndex((row) => row[colIdx] && (row[colIdx]?.faction === 'VC' || row[colIdx]?.faction === 'NVA') && row[colIdx]!.def < row[colIdx]!.maxDef);
      if (targetUnitIdx !== -1) {
        const targetUnit = nextGrid[targetUnitIdx][colIdx]!;
        const originalCard = CARD_DATABASE.find((c) => c.id === targetUnit.id);
        if (originalCard && playerHand.length < 9) {
          setPlayerHand((prev) => [...prev, originalCard]);
          nextGrid[targetUnitIdx][colIdx] = null;
          addLog(`Scorched Earth: Recalled damaged unit ${targetUnit.name} safely to tactical Hand.`, 'ORDER');
        } else {
          addLog(`Recall failed due to Hand limit overflow.`, 'ORDER');
        }
      } else {
        addLog(`Scorched Earth: No damaged friendly force detected in Column ${colIdx + 1}.`, 'ORDER');
      }
    } else if (orderId === 'vc_order_dia_dao') {
      // Cu Chi Tunnel Transport: spawn 2/2 Local Guerrilla in Conflict Zone on column if empty
      if (!nextGrid[1][colIdx]) {
        nextGrid[1][colIdx] = {
          id: 'vc_guerrilla_cell',
          name: 'Local Guerrilla Cell',
          faction: 'VC',
          k: 0,
          o: 3,
          atk: 2,
          def: 1,
          maxDef: 1,
          type: 'Unit',
          rarity: 'Common',
          ability: 'Ambush: First-strike on friendly ground engagements.',
          artworkKeyword: 'vc_guerrilla',
          instanceId: `spawn-tunnel-${Date.now()}-${colIdx}`,
          hasMovedOrAttackedThisTurn: true,
          camouflage: false,
          frozenTurns: 0,
          armor: 0,
          isAmphibious: false,
          isAir: false,
          isArtillery: false,
        };
        addLog(`Cu Chi Tunnel transport breached! Local Guerrilla Cell deployed in Column ${colIdx + 1}.`, 'ORDER');
      } else {
        addLog(`Cu Chi Tunnel transport blocked: Column is already fortified.`, 'SYSTEM');
        setSelectedOrderCard(null);
        return;
      }
    }

    setPlayerKredits((k) => k - selectedOrderCard.k);
    setPlayerHand((hand) => hand.filter((c) => c.id !== selectedOrderCard.id));
    setGrid(applyAuraBuffs(nextGrid));
    setSelectedOrderCard(null);
  };

  // UNIT DRAG AND DROP REGISTRY (Modern Pointer)
  const handlePointerDownHand = (e: React.PointerEvent<HTMLDivElement>, card: Card) => {
    if (battlePhase !== 'deploy' || currentTurnOwner !== 'USA') return;
    if (card.type === 'Order') {
      handleSelectCard(card);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveDrag({
      card,
      sourceType: 'hand',
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
    setDraggedCard(card); // Legacy tracking
    setSelectedHandUnit(card); // Tap to select tracking
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerDownBoardUnit = (e: React.PointerEvent<HTMLDivElement>, r: number, c: number, unit: GridUnit) => {
    if (currentTurnOwner !== 'USA' || battlePhase !== 'deploy') return;
    const isFriendly = unit.faction === 'US' || unit.faction === 'ARVN';
    if (!isFriendly || unit.id === 'hq_player') return;
    if (unit.hasMovedOrAttackedThisTurn || unit.frozenTurns > 0) return;

    setActiveDrag({
      card: unit,
      sourceType: 'board',
      sourceR: r,
      sourceC: c,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
    setSelectedBoardUnit({ r, c });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (activeDrag) {
        setActiveDrag(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activeDrag) {
        // Resolve drop using elementsFromPoint
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const cellNode = elements.find(el => el.hasAttribute('data-grid-r'));
        
        let dropProcessed = false;
        if (cellNode) {
          const r = parseInt(cellNode.getAttribute('data-grid-r') || '-1');
          const c = parseInt(cellNode.getAttribute('data-grid-c') || '-1');
          
          if (r !== -1 && c !== -1) {
            if (activeDrag.sourceType === 'hand') {
              // Same check as old handleDropOnGrid
              handleDeployHandUnit(activeDrag.card, r, c);
              dropProcessed = true;
            } else if (activeDrag.sourceType === 'board' && activeDrag.sourceR !== undefined && activeDrag.sourceC !== undefined) {
              // Try to perform action on target cell using click handler logic
              // Note: selectedBoardUnit was set on pointerdown, so handleGridCellClick can execute move/attack!
              if (activeDrag.sourceR !== r || activeDrag.sourceC !== c || grid[r][c] !== null) {
                // If it's the same cell and there's a unit, it's just a tap selection, not a drop action
                handleGridCellClick(r, c);
                dropProcessed = true;
              }
            }
          }
        }
        
        // If not dropped on a valid cell, but was a simple tap, we keep selecting.
        // We know it was a tap if they barely moved the pointer.
        const dist = Math.hypot(activeDrag.currentX - activeDrag.startX, activeDrag.currentY - activeDrag.startY);
        if (dist > 15 && !dropProcessed) {
           // It was a drag, but invalid drop. Close selection.
           if (activeDrag.sourceType === 'hand') setSelectedHandUnit(null);
           if (activeDrag.sourceType === 'board') setSelectedBoardUnit(null);
        }

        setActiveDrag(null);
        setDraggedCard(null);
      }
    };

    if (activeDrag) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDrag, grid]);

  // Legacy Drop mapping (kept for safety, though custom pointer system handles most now)
  const handleDropOnGrid = (r: number, c: number) => {
    // If standard drag completes, just trigger deploy. Native drag is hidden by our new layer on mobile, but keeping for desktop edge cases.
    if (!draggedCard) return;
    handleDeployHandUnit(draggedCard, r, c);
    setDraggedCard(null);
  };

  // DYNAMIC COUNTERMEASURE TRIGGER ACTION
  const checkMineTrigger = (r: number, c: number, activeUnit: GridUnit) => {
    // If unit enters conflict zone row (Row index 1 / line 2):
    // check if opponent has active Trap (Amber ambush)
    if (r === 1 && activeUnit.faction !== 'NVA' && activeUnit.faction !== 'VC') {
      const isAmbushActive = activeTraps.some((t) => t.cardId === 'nva_trap_amber');
      if (isAmbushActive) {
        sound.playExplosion();
        addLog(`BOOM! Countermeasure: "Trận địa Phục kích" triggers! 1st Cav Sapper punji spikes hit ${activeUnit.name} for 3 DEF damage!`, 'ATTACK');
        activeUnit.def -= 3;
        setActiveTraps((traps) => traps.filter((t) => t.cardId !== 'nva_trap_amber'));
      }
    }
  };

  // AUTOMATED AUTO-BATTLER AI AND SEQUENCE RESOLUTION TIMER
  const endDeploymentAndResolve = async () => {
    sound.playRadioStatic();
    setBattlePhase('resolve');
    addLog(`DEPLOYMENT LOCKED. Launching Tactical Conflict Combat Phase.`, 'SYSTEM');

    // Run round operations for BOTH forces
    // Order: Player bottom-to-top, Opponent top-to-bottom
    let currentGrid = [...grid];
    const isPlayerUS = faction === 'USA';

    // Step 1: Scan and simulate Player forces
    for (let r = 2; r >= 0; r--) {
      for (let c = 0; c < 5; c++) {
        const unit = currentGrid[r][c];
        if (unit && (unit.faction === 'US' || unit.faction === 'ARVN')) {
          setActiveUnitActing({ r, c });
          // Highlight delay
          await new Promise((res) => setTimeout(res, 750));

          if (unit.frozenTurns > 0) {
            addLog(`${unit.name} preparing tactical positions (Frozen).`, 'SYSTEM');
            continue;
          }

          // Check if player has Kredits spent for O cost of movement or attack
          if (playerKredits < unit.o) {
            const currency = getFactionCurrency(unit.faction);
            addLog(`${unit.name} stands idle in battlefield (Insufficient ${currency.name} Operation Cost ${currency.symbol}${unit.o}).`, 'SYSTEM');
            continue;
          }

          // Operation logic: Attack enemy directly ahead OR move forward towards opponent Row 0
          // For player US forces: Walk is UP (r-1)
          const targetRow = r - 1;
          if (targetRow < 0) {
            // Reached Opponent HQ! Strike base directly!
            sound.playExplosion();
            const dmg = unit.atk;
            setOpponentHQ((prev) => {
              const remains = Math.max(0, prev - dmg);
              addLog(`DIRECT HIT! Allied ${unit.name} slammed Opponent Base HQ for ${dmg} damage.`, 'HQ');
              return remains;
            });
            // Units stays there or continues command
            continue;
          }

          // Check for enemy unit blocking any vertical cell above
          const blockingUnit = currentGrid[targetRow][c];
          if (blockingUnit && blockingUnit.faction !== 'US' && blockingUnit.faction !== 'ARVN') {
            // FIGHT!
            sound.playGunshot();
            // Deduct Operation Cost
            setPlayerKredits((k) => k - unit.o);

            const isHeavyMachineGunVS_Air = unit.id === 'nva_hmg_team' && blockingUnit.isAir;
            const steelDivisionVS_Armor = unit.id === 'nva_320th_steel' && (blockingUnit.id === 'us_m48_patton' || blockingUnit.id === 'us_m113_acav');

            let dealDmg = unit.atk;
            if (isHeavyMachineGunVS_Air) dealDmg *= 2;
            if (steelDivisionVS_Armor) dealDmg += 1;

            blockingUnit.def -= dealDmg;
            addLog(`Allied ${unit.name} fired on ${blockingUnit.name} dealing ${dealDmg} damage.`, 'ATTACK');

            // Retaliation? Artillery ignores retaliation when making Support attack
            const isArtillery = unit.isArtillery && r === 2; // Row 2 is Player Support line
            if (!isArtillery) {
              unit.def -= blockingUnit.atk;
              addLog(`${blockingUnit.name} retaliated dealing ${blockingUnit.atk} damage to ${unit.name}.`, 'ATTACK');
            }

            // Clean up burials
            if (blockingUnit.def <= 0) {
              addLog(`${blockingUnit.name} was eliminated.`, 'DEATH');

              // Death trigger: M113 ACAV spawn a 2/2 ACAV Squad Infantry
              if (blockingUnit.id === 'us_m113_acav') {
                currentGrid[targetRow][c] = {
                  ...blockingUnit,
                  id: 'spawn_acav_inf',
                  name: 'ACAV Infantry',
                  def: 2,
                  maxDef: 2,
                  atk: 2,
                  o: 1,
                  type: 'Unit',
                  rarity: 'Common',
                  ability: 'Ejected troop squad from destroyed armored carrier.',
                  artworkKeyword: 'militia',
                  instanceId: `acav-spawn-${Date.now()}`,
                } as GridUnit;
              } else {
                currentGrid[targetRow][c] = null;
              }
            }

            if (unit.def <= 0) {
              addLog(`Allied ${unit.name} was defeated.`, 'DEATH');
              currentGrid[r][c] = null;
            }

            currentGrid = applyAuraBuffs(currentGrid);
            setGrid([...currentGrid]);
          } else {
            // No blocking enemy, MOVE FORWARD!
            // Cost paid
            setPlayerKredits((k) => k - unit.o);
            currentGrid[targetRow][c] = { ...unit, hasMovedOrAttackedThisTurn: true };
            currentGrid[r][c] = null;
            addLog(`Allied ${unit.name} advanced forward to operational Line ${3 - targetRow}.`, 'MOVE');

            // Punji trigger check
            checkMineTrigger(targetRow, c, currentGrid[targetRow][c] as GridUnit);

            currentGrid = applyAuraBuffs(currentGrid);
            setGrid([...currentGrid]);
          }
        }
      }
    }

    // Step 2: Scan and simulate Opponent NVA forces (moves from Row 0 downwards to Row 2 Player HQ)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        const unit = currentGrid[r][c];
        if (unit && (unit.faction === 'NVA' || unit.faction === 'VC')) {
          setActiveUnitActing({ r, c });
          await new Promise((res) => setTimeout(res, 750));

          if (unit.frozenTurns > 0) {
            continue;
          }

          if (opponentKredits < unit.o) {
            continue;
          }

          const targetRow = r + 1;
          if (targetRow > 2) {
            // Hit Player Allied HQ base!
            sound.playExplosion();
            const dmg = unit.atk;
            setPlayerHQ((prev) => {
              const remains = Math.max(0, prev - dmg);
              addLog(`BASE IMPACT! Opponent ${unit.name} breached Allied Base-line HQ, inflicting ${dmg} damage!`, 'HQ');
              return remains;
            });
            continue;
          }

          const blockingUnit = currentGrid[targetRow][c];
          if (blockingUnit && blockingUnit.faction !== 'NVA' && blockingUnit.faction !== 'VC') {
            // FIGHT!
            sound.playGunshot();
            setOpponentKredits((k) => k - unit.o);

            let dealDmg = unit.atk;
            blockingUnit.def -= dealDmg;
            addLog(`Opponent ${unit.name} charged ${blockingUnit.name} for ${dealDmg} damage.`, 'ATTACK');

            const isOpponentArtillery = unit.isArtillery && r === 0; // Row 0 is Opponent Support
            if (!isOpponentArtillery) {
              unit.def -= blockingUnit.atk;
              addLog(`${blockingUnit.name} defended, retaliating with ${blockingUnit.atk} damage to ${unit.name}.`, 'ATTACK');
            }

            // Burials
            if (blockingUnit.def <= 0) {
              addLog(`Allied ${blockingUnit.name} was neutralized.`, 'DEATH');
              currentGrid[targetRow][c] = null;
            }
            if (unit.def <= 0) {
              addLog(`Opponent ${unit.name} collapsed.`, 'DEATH');
              currentGrid[r][c] = null;
            }

            currentGrid = applyAuraBuffs(currentGrid);
            setGrid([...currentGrid]);
          } else {
            // Walk forward downwards!
            setOpponentKredits((k) => k - unit.o);
            currentGrid[targetRow][c] = { ...unit, hasMovedOrAttackedThisTurn: true };
            currentGrid[r][c] = null;
            addLog(`Opponent ${unit.name} slipped forward in the shadows to Line ${targetRow + 1}.`, 'MOVE');

            currentGrid = applyAuraBuffs(currentGrid);
            setGrid([...currentGrid]);
          }
        }
      }
    }

    setActiveUnitActing(null);
    setBattlePhase('deploy');

    // End of full round loop: replenish player turn
    // If game has ended (HQ falls to 0), trigger GameOver scene instead
    startNextTurn('USA');
  };

  // CHECK WIN / DEFEAT STATES
  useEffect(() => {
    if (opponentHQ <= 0) {
      sound.playExplosion();
      setBattlePhase('gameover');
      addLog(`VICTORY! Campaign objective fully secured! Opponent Headquarters annihilated!`, 'SYSTEM');
    } else if (playerHQ <= 0) {
      sound.playExplosion();
      setBattlePhase('gameover');
      addLog(`DEFEAT! MACV Command post over-run. Emergency medical evacuation underway.`, 'SYSTEM');
    }
  }, [playerHQ, opponentHQ]);

  // OPPONENT AI MULTI-STEP MANIFEST PLAY EXPERIENCE (PVE DECISION CRATE)
  const executeOpponentAITurn = async () => {
    addLog(`OPPONENT CHANNELS CONNECTED. Enemy commander devising counter-offensive...`, 'SYSTEM');
    await new Promise((res) => setTimeout(res, 1200));

    // Step A: Draw 1 card from deck pool
    let currentHand = [...opponentHand];
    const oppFaction = faction === 'USA' ? 'NVA' : 'US';
    const opponentPool = CARD_DATABASE.filter(
      (c) => c.faction === oppFaction || (oppFaction === 'NVA' && c.faction === 'VC') || (oppFaction === 'US' && c.faction === 'ARVN')
    );

    if (opponentDeckSize > 0) {
      setOpponentDeckSize((s) => s - 1);
      const drawnCard = opponentPool[Math.floor(Math.random() * opponentPool.length)];
      currentHand.push(drawnCard);
      setOpponentHand(currentHand);
      sound.playCardDraw();
      addLog(`Intel report: Opponent drew 1 tactical deployment card.`, 'SYSTEM');
      await new Promise((res) => setTimeout(res, 1000));
    }

    // Set opponent active budget for this turn
    let aiKredits = maxKredits;
    setOpponentKredits(aiKredits);

    let nextGrid = [...grid];

    // Step B: Deploy affordable cards from hand to enemy's support sector rows (Row 0 only now)
    for (let i = 0; i < currentHand.length; i++) {
      const card = currentHand[i];
      if (card && aiKredits >= card.k) {
        let placed = false;
        // Search row 0, preferring lanes that do not block the active HQ card at Row 0, Col 2
        for (let r = 0; r <= 0 && !placed; r++) {
          const checkCols = [0, 1, 3, 4].filter(c => !(c === 2));
          for (const c of checkCols) {
            if (!nextGrid[r][c]) {
              const newAIUnit: GridUnit = {
                ...card,
                instanceId: `ai-unit-${Date.now()}-${Math.random()}`,
                hasMovedOrAttackedThisTurn: true, // Cannot act on deploy turn
                camouflage: false,
                frozenTurns: card.id === 'nva_mig17_pilot' ? 0 : 1, // MiG blitz pilot acts immediately
                armor: 0,
                isAmphibious: card.id === 'nva_803rd_riverine',
                isAir: card.id === 'nva_mig17_pilot',
                isArtillery: card.id === 'nva_40th_artillery' || card.id === 'vc_7th_reg_artillery',
              };
              nextGrid[r][c] = newAIUnit;
              aiKredits -= card.k;
              setOpponentKredits(aiKredits);
              currentHand.splice(i, 1);
              i--; // shift index down
              setOpponentHand([...currentHand]);

              sound.playDeploy();
              addLog(`Enemy deployed: ${card.name} covertly in Sector Row ${r + 1}, Lane ${c + 1}.`, 'DEPLOY');
              placed = true;
              nextGrid = applyAuraBuffs(nextGrid);
              setGrid([...nextGrid]);
              await new Promise((res) => setTimeout(res, 1000));
              break;
            }
          }
        }
      }
    }

    // Step C: Action already deployed opponent units on the field
    const enemyBattalions: { r: number; c: number }[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        const u = nextGrid[r][c];
        const isEnemyUnit = u && (u.faction === 'NVA' || u.faction === 'VC' || u.faction === 'ARVN' && faction !== 'USA') && u.id !== 'hq_opponent';
        if (isEnemyUnit) {
          enemyBattalions.push({ r, c });
        }
      }
    }

    // Sort battalions from bottom-to-top so units closest to row 2 (Player HQ) operate first!
    enemyBattalions.sort((a, b) => b.r - a.r);

    for (const pos of enemyBattalions) {
      const u = nextGrid[pos.r][pos.c];
      if (!u) continue;

      if (u.frozenTurns > 0) {
        // decrement freeze
        nextGrid[pos.r][pos.c] = { ...u, frozenTurns: Math.max(0, u.frozenTurns - 1) };
        setGrid([...nextGrid]);
        continue;
      }

      if (aiKredits >= u.o) {
        // Action decision logic
        
        // 1. Can we directly strike the Player HQ?
        // Player HQ is at Row 2, Col 2.
        const isDirectAbovePlayerHQ = pos.r === 1 && pos.c === 2;
        const isNearPlayerHQ = pos.r >= 1 && Math.abs(pos.c - 2) <= 1;

        if (isDirectAbovePlayerHQ || (u.isAir && isNearPlayerHQ) || (u.isArtillery && pos.c === 2)) {
          // Blast player Command base!
          sound.playExplosion();
          const damage = u.atk;
          setPlayerHQ((v) => Math.max(0, v - damage));
          aiKredits -= u.o;
          setOpponentKredits(aiKredits);
          addLog(`BASE CONTACT! Enemy ${u.name} shelled player HQ base for ${damage} damage!`, 'HQ');
          await new Promise((res) => setTimeout(res, 1000));
          continue;
        }

        // 2. Can we attack any player infantry/tanks blocking directly below?
        let attackTarget: { r: number; c: number } | null = null;
        
        const rowBelow = pos.r + 1;
        if (rowBelow <= 2) {
          const pot = nextGrid[rowBelow][pos.c];
          if (pot && (pot.faction === 'US' || pot.faction === 'ARVN' || pot.id === 'hq_player')) {
            attackTarget = { r: rowBelow, c: pos.c };
          }
        }

        // Artillery: check entire column
        if (u.isArtillery && !attackTarget) {
          for (let rowIdx = pos.r + 1; rowIdx <= 2; rowIdx++) {
            const pot = nextGrid[rowIdx][pos.c];
            if (pot && (pot.faction === 'US' || pot.faction === 'ARVN')) {
              attackTarget = { r: rowIdx, c: pos.c };
              break;
            }
          }
        }

        // Air planes: attack any friendly target found
        if (u.isAir && !attackTarget) {
          for (let r = 2; r >= 0; r--) {
            for (let c = 0; c < 5; c++) {
              const pot = nextGrid[r][c];
              if (pot && (pot.faction === 'US' || pot.faction === 'ARVN')) {
                attackTarget = { r, c };
                break;
              }
            }
            if (attackTarget) break;
          }
        }

        if (attackTarget) {
          const friendlyUnit = nextGrid[attackTarget.r][attackTarget.c];
          if (friendlyUnit) {
            sound.playGunshot();
            aiKredits -= u.o;
            setOpponentKredits(aiKredits);

            if (friendlyUnit.id === 'hq_player') {
              setPlayerHQ((v) => Math.max(0, v - u.atk));
              addLog(`DIRECT IMPACT! Enemy ${u.name} slammed ${friendlyUnit.name} for ${u.atk} damage.`, 'HQ');
            } else {
              friendlyUnit.def -= u.atk;
              addLog("Opponent " + u.name + " engaged Allied " + friendlyUnit.name + ", executing " + u.atk + " damage.", 'ATTACK');

              const canRetaliate = !u.isAir && !u.isArtillery && (Math.abs(pos.r - attackTarget.r) <= 1 && Math.abs(pos.c - attackTarget.c) <= 1);
              if (canRetaliate) {
                u.def -= friendlyUnit.atk;
                addLog(`Allied ${friendlyUnit.name} retaliated dealing ${friendlyUnit.atk} damage.`, 'ATTACK');
              }

              if (friendlyUnit.def <= 0) {
                addLog(`Allied ${friendlyUnit.name} was mobilized off the theater (destroyed).`, 'DEATH');
                nextGrid[attackTarget.r][attackTarget.c] = null;
              }
              if (u.def <= 0) {
                addLog(`Enemy ${u.name} collapsed under defense fire.`, 'DEATH');
                nextGrid[pos.r][pos.c] = null;
              }
            }

            nextGrid = applyAuraBuffs(nextGrid);
            setGrid([...nextGrid]);
            await new Promise((res) => setTimeout(res, 1000));
            continue;
          }
        }

        // 3. Walk forward downwards if cell below is empty
        const nextRow = pos.r + 1;
        if (nextRow <= 2 && !nextGrid[nextRow][pos.c]) {
          sound.playDeploy();
          nextGrid[nextRow][pos.c] = { ...u, hasMovedOrAttackedThisTurn: true };
          nextGrid[pos.r][pos.c] = null;
          aiKredits -= u.o;
          setOpponentKredits(aiKredits);
          addLog(`Enemy ${u.name} advanced to Sector Row ${nextRow + 1}, Lane ${pos.c + 1}.`, 'MOVE');
          nextGrid = applyAuraBuffs(nextGrid);
          setGrid([...nextGrid]);
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }

    // Step D: End Opponent turn, start player turn!
    startNextTurn('USA');
  };

  // RENDER SECTOR
  const isPlayerUSA = faction === 'USA';
  
  // Dynamic Player and Opponent Profile Info as per KARDs and Vietnamese avoidance rule
  const playerProfile = isPlayerUSA 
    ? { name: 'Gen. Westmoreland', flag: '🇺🇸', role: 'ALLIED HQ', gradient: 'radial-gradient(circle, #386641 0%, #112a14 100%)', textCol: 'text-emerald-450' }
    : { name: 'General Giap', flag: '🇻🇳', role: 'PAVN HQ', gradient: 'radial-gradient(circle, #8d0801 0%, #170100 100%)', textCol: 'text-red-400' };

  const opponentProfile = isPlayerUSA
    ? { name: 'General Giap', flag: '🇻🇳', role: 'PAVN HQ', gradient: 'radial-gradient(circle, #8d0801 0%, #170100 100%)', textCol: 'text-red-400' }
    : { name: 'Gen. Westmoreland', flag: '🇺🇸', role: 'ALLIED HQ', gradient: 'radial-gradient(circle, #386641 0%, #112a14 100%)', textCol: 'text-emerald-400' };

  return (
    <div className="relative w-full h-screen max-h-screen flex flex-col items-center bg-stone-950 font-mono text-xs overflow-hidden select-none p-2 justify-between">
      {/* MULLIGAN SCREEN */}
      {showMulligan && (
        <MulliganOverlay
          initialHand={playerHand}
          onConfirmMulligan={handleConfirmMulligan}
        />
      )}

      {/* GAME OVER SCREEN */}
      {battlePhase === 'gameover' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 md:p-8 backdrop-blur-md">
          <div className="max-w-md text-center p-6 border-2 border-amber-500 rounded bg-stone-900/90 shadow-2xl space-y-6">
            <Flame size={48} className="text-amber-500 mx-auto animate-bounce" />
            <h1 className="text-3xl font-black tracking-widest text-amber-500 uppercase">
              {opponentHQ <= 0 ? 'SECTOR RECONQUERED' : 'LOGISTICS BLOWOUT'}
            </h1>
            <p className="text-stone-400 text-xs leading-relaxed uppercase">
              {opponentHQ <= 0
                ? 'Allied forces breached defensive perimeter lines, leading to total operational collapse of enemy regional hubs.'
                : 'Defensive command structures fell to intense vanguard sabotage strikes. Commander evacuated safely.'}
            </p>

            <div className="flex gap-4 justify-center">
              {opponentHQ <= 0 ? (
                <button
                  onClick={() => onBattleVictory(50 + (node.gridY + 1) * 15)}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase rounded shadow font-black tracking-widest"
                >
                  SECURE SUPPLY PAYOUT (+{50 + (node.gridY + 1) * 15} Gold)
                </button>
              ) : (
                <button
                  onClick={onBattleDefeat}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold uppercase rounded shadow font-black tracking-widest"
                >
                  RETURN TO BASE FOR REARM
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BATTLEFIELD HEADER STATUS STRIP */}
      <div className="w-full max-w-7xl lg:h-[6vh] flex flex-col md:flex-row justify-between items-center px-4 py-2 md:py-0 border-b border-stone-850 bg-stone-900/85 rounded-t shadow z-10 text-[10px] shrink-0 gap-2 md:gap-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitBattle}
            className="px-3 py-1 bg-stone-800 hover:bg-stone-750 hover:text-white rounded border border-stone-700 font-bold"
          >
            RETREAT TO MAP
          </button>
          <span className="text-stone-500">|</span>
          <span className="font-extrabold text-amber-400 uppercase tracking-widest text-center">
            {node.name} Battlefield Grid
          </span>
        </div>

        <div className="flex gap-4 items-center flex-wrap justify-center">
          {/* Faction indicator */}
          <span className="bg-stone-800 text-[10px] px-2 py-0.5 rounded font-black text-amber-500 border border-stone-750">
            OPPOSING RADAR FORCE: {faction === 'USA' ? 'NVA/VC' : 'USA/ARVN'}
          </span>
          <span className="text-stone-500">|</span>
          <button
            onClick={handleToggleMute}
            className="p-1 px-2.5 bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-white duration-200 border border-stone-750 text-[10px] flex items-center gap-1.5 rounded"
          >
            {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            {isMuted ? 'UNMUTE AUDIO' : 'MUTE ENGINE'}
          </button>
        </div>
      </div>

      {/* WIDESCREEN 3-COLUMN TACTICAL BATTLEFIELD */}
      <div className="w-full max-w-7xl lg:h-[88vh] flex flex-col lg:grid lg:grid-cols-12 gap-2 lg:gap-4 shrink-0 z-10 relative min-h-0 py-1 lg:py-2">
        
        {/* LEFT COLUMN: PROFILES & KREDIT INDICATION (2 COLS) */}
        <div className="col-span-2 hidden lg:flex flex-col justify-between py-6 h-full font-sans">
          
          {/* Opponent Profile Port-plate */}
          <div className="bg-stone-900/95 border border-stone-800 rounded-xl p-3 relative shadow-2xl text-center w-full flex flex-col items-center gap-1.5">
            <div className="absolute -top-3 left-3 bg-stone-950 text-[7px] font-black text-rose-500 uppercase px-2 py-0.5 rounded border border-stone-800 tracking-widest font-mono">
              OPPONENT
            </div>
            
            {/* PROCEDURAL ENEMY AVATAR */}
            <div className="w-12 h-12 rounded-full border-2 border-stone-800 flex items-center justify-center text-xl shadow-inner relative overflow-hidden mt-1.5" style={{ backgroundImage: opponentProfile.gradient }}>
              <span className="font-serif font-black uppercase tracking-tighter">{opponentProfile.flag}</span>
            </div>

            <div className="font-extrabold text-[10px] text-stone-200 tracking-wide uppercase leading-none font-mono">
              {opponentProfile.name}
            </div>
            <div className="text-[6.5px] text-stone-550 uppercase font-black tracking-widest font-mono">
              {opponentProfile.role}
            </div>

            {/* Kredit Counter Badges */}
            <div className="w-full border-t border-stone-850 pt-2 mt-1 flex flex-col items-center">
              <div className="text-[7.5px] text-stone-500 uppercase tracking-widest leading-none mb-1 font-mono font-bold">
                KREDITS
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-black font-mono text-rose-500">
                  {opponentKredits}
                </span>
                <span className="text-stone-700 text-xs font-mono">/</span>
                <span className="text-xs font-bold font-mono text-stone-500">
                  {maxKredits}
                </span>
              </div>
              
              {/* Energy indicator bits */}
              <div className="flex gap-0.5 mt-1.5 justify-center max-w-full flex-wrap">
                {Array.from({ length: maxKredits }).map((_, id) => (
                  <div key={id} className={`w-2 h-1.5 rounded-sm ${id < opponentKredits ? 'bg-red-500 shadow border border-red-405' : 'bg-stone-950 border border-stone-850'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Player Profile Port-plate */}
          <div className="bg-stone-900/95 border border-stone-800 rounded-xl p-3 relative shadow-2xl text-center w-full flex flex-col items-center gap-1.5">
            <div className="absolute -top-3 left-3 bg-stone-950 text-[7px] font-black text-emerald-500 uppercase px-2 py-0.5 rounded border border-stone-800 tracking-widest font-mono">
              COMMANDER
            </div>

            {/* PROCEDURAL PLAYER AVATAR */}
            <div className="w-12 h-12 rounded-full border-2 border-stone-800 flex items-center justify-center text-xl shadow-inner relative overflow-hidden mt-1.5" style={{ backgroundImage: playerProfile.gradient }}>
              <span className="font-serif font-black uppercase tracking-tighter">{playerProfile.flag}</span>
            </div>

            <div className="font-extrabold text-[10px] text-stone-200 tracking-wide uppercase leading-none font-mono">
              {playerProfile.name}
            </div>
            <div className="text-[6.5px] text-stone-550 uppercase font-black tracking-widest font-mono">
              {playerProfile.role}
            </div>

            {/* Kredit Counter Badges */}
            <div className="w-full border-t border-stone-850 pt-2 mt-1 flex flex-col items-center">
              <div className="text-[7.5px] text-stone-500 uppercase tracking-widest leading-none mb-1 font-mono font-bold">
                KREDITS
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-black font-mono text-emerald-400">
                  {playerKredits}
                </span>
                <span className="text-stone-700 text-xs font-mono">/</span>
                <span className="text-xs font-bold font-mono text-stone-500">
                  {maxKredits}
                </span>
              </div>
              
              {/* Energy indicator bits */}
              <div className="flex gap-0.5 mt-1.5 justify-center max-w-full flex-wrap">
                {Array.from({ length: maxKredits }).map((_, id) => (
                  <div key={id} className={`w-2 h-1.5 rounded-sm ${id < playerKredits ? 'bg-emerald-500 shadow border border-emerald-405' : 'bg-stone-950 border border-stone-850'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: ACTIVE BATTLE MAP + PLAY WORKSPACE HAND (8 COLS) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full lg:min-h-0 justify-between gap-2 justify-stretch w-full">
          
          {/* MOBILE/TABLET TACTICAL HERO RIBBON (Only visible on < lg screens) */}
          <div className="flex lg:hidden w-full items-center justify-between bg-stone-900/95 border border-stone-850 rounded-xl p-2 gap-2 shadow-2xl shrink-0">
            {/* Opponent Profile (PAVN) */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full border border-stone-800 flex items-center justify-center text-md shadow-inner shrink-0" style={{ backgroundImage: opponentProfile.gradient }}>
                <span className="text-[14px] leading-none shrink-0">{opponentProfile.flag}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-[8px] text-stone-200 tracking-wide uppercase leading-none truncate">
                  {opponentProfile.name}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] font-black text-rose-500 font-mono leading-none">
                    {opponentKredits}
                  </span>
                  <span className="text-stone-700 text-[8px] font-mono leading-none">/</span>
                  <span className="text-[8px] font-bold text-stone-500 font-mono leading-none">
                    {maxKredits}
                  </span>
                </div>
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(10, maxKredits) }).map((_, id) => (
                    <div key={id} className={`w-1.5 h-1 rounded-sm ${id < opponentKredits ? 'bg-red-500 shadow' : 'bg-stone-950'}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Center Action (End Turn / Status) */}
            <div className="flex flex-col items-center shrink-0 px-2 border-x border-stone-800">
              <button
                onClick={() => {
                  if (currentTurnOwner === 'USA' && battlePhase === 'deploy') {
                    setSelectedBoardUnit(null);
                    setSelectedOrderCard(null);
                    setCurrentTurnOwner('NVA');
                    setBattlePhase('resolve');
                    executeOpponentAITurn();
                  }
                }}
                disabled={currentTurnOwner !== 'USA' || battlePhase !== 'deploy'}
                className="px-3 py-1.5 border border-stone-100 bg-stone-950 font-sans font-extrabold text-stone-100 uppercase text-[9px] tracking-widest duration-300 hover:bg-stone-100 hover:text-stone-950 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed leading-none shadow relative active:scale-95 transition-all rounded"
              >
                {currentTurnOwner === 'USA' ? 'END TURN' : 'ENEMY TURN'}
              </button>
            </div>

            {/* Player Profile (Allied) */}
            <div className="flex items-center gap-2 flex-1 justify-end min-w-0 text-right">
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-[8px] text-stone-200 tracking-wide uppercase leading-none truncate">
                  {playerProfile.name}
                </div>
                <div className="flex items-center gap-1 mt-0.5 justify-end">
                  <span className="text-[10px] font-black text-emerald-400 font-mono leading-none">
                    {playerKredits}
                  </span>
                  <span className="text-stone-700 text-[8px] font-mono leading-none">/</span>
                  <span className="text-[8px] font-bold text-stone-500 font-mono leading-none">
                    {maxKredits}
                  </span>
                </div>
                <div className="flex gap-0.5 mt-0.5 justify-end">
                  {Array.from({ length: Math.min(10, maxKredits) }).map((_, id) => (
                    <div key={id} className={`w-1.5 h-1 rounded-sm ${id < playerKredits ? 'bg-emerald-400 shadow' : 'bg-stone-950'}`} />
                  ))}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full border border-stone-800 flex items-center justify-center text-md shadow-inner shrink-0" style={{ backgroundImage: playerProfile.gradient }}>
                <span className="text-[14px] leading-none shrink-0">{playerProfile.flag}</span>
              </div>
            </div>
          </div>

          {/* TACTICAL GRID AND FIELD (WOOD TABLE SKIN) */}
          <div 
            className="flex-grow border border-stone-850 rounded-xl p-2.5 relative shadow-2xl overflow-hidden bg-cover bg-center flex flex-col justify-stretch min-h-0 h-[48vh] sm:h-[55vh] lg:h-[62vh]"
            style={{ backgroundImage: "url('/src/assets/images/battlefield_table_1781640579159.jpg')" }}
          >
            {/* Grungy war-room overlays */}
            <div className="absolute inset-0 bg-stone-950/45 mix-blend-multiply pointer-events-none z-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-stone-950/60 pointer-events-none z-0" />

            {/* Vertical 3-Lines Grid representation */}
            <div className="grid grid-rows-3 gap-2.5 h-full justify-stretch relative z-10 flex-grow">
              {grid.map((row, r) => {
                const bgRowColor = 'bg-stone-950/5 border-stone-900/10';

                return (
                  <div
                    key={r}
                    className={`relative p-1.5 rounded-lg border flex flex-col justify-between transition-all duration-300 ${bgRowColor}`}
                  >
                    {/* CENTRED STEEL FRONT LINE DECORATOR */}
                    {r === 1 && (
                      <div className="absolute -top-1 inset-x-0 flex items-center justify-center pointer-events-none z-20">
                        <div className="w-full h-0.5 bg-stone-800/40 relative flex justify-between px-2">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <span key={i} className="text-[6px] text-stone-600/40 leading-none -translate-y-1">▲</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 5 Column Blocks / Lanes */}
                    <div className="grid grid-cols-5 gap-1.5 h-full items-center">
                      {row.map((slot, c) => {
                        const isHighlighted = selectedOrderCard !== null;
                        const isActing = activeUnitActing?.r === r && activeUnitActing?.c === c;
                        const isSelectedBoardUnit = selectedBoardUnit?.r === r && selectedBoardUnit?.c === c;

                        // Eligibility checks for interactive visual overlays
                        let isEligibleMove = false;
                        let isEligibleAttack = false;

                        if (selectedBoardUnit) {
                          const u = grid[selectedBoardUnit.r][selectedBoardUnit.c];
                          if (u && playerKredits >= u.o) {
                            if (!slot) {
                              isEligibleMove = selectedBoardUnit.c === c && (r === selectedBoardUnit.r - 1 || r === selectedBoardUnit.r + 1);
                            } else {
                              const isEnemy = slot.faction === 'NVA' || slot.faction === 'VC' || slot.id === 'hq_opponent';
                              if (isEnemy) {
                                if (u.isAir) {
                                  isEligibleAttack = true;
                                } else if (u.isArtillery) {
                                  isEligibleAttack = selectedBoardUnit.c === c;
                                } else {
                                  const rDiff = Math.abs(selectedBoardUnit.r - r);
                                  const cDiff = Math.abs(selectedBoardUnit.c - c);
                                  isEligibleAttack = (rDiff <= 1 && cDiff === 0) || (cDiff <= 1 && rDiff === 0);
                                }
                              }
                            }
                          }
                        }

                        let isEligibleDeployCell = false;
                        const activeDeployCard = draggedCard || selectedHandUnit;
                        if (activeDeployCard && activeDeployCard.type === 'Unit' && !slot) {
                          const isAirmobile = activeDeployCard.id === 'us_1st_cav_heli';
                          const isScreamingEagles = activeDeployCard.id === 'us_101st_airborne';
                          if (isAirmobile || isScreamingEagles) {
                            isEligibleDeployCell = r === 1 || r === 2;
                          } else {
                            isEligibleDeployCell = r === 2;
                          }
                        }

                        let cellStatusClass = '';
                        if (isSelectedBoardUnit) {
                          cellStatusClass = 'border-yellow-400 ring-2 ring-yellow-400 bg-stone-900/90 shadow-2xl scale-102 z-20';
                        } else if (isEligibleMove) {
                          cellStatusClass = 'border-emerald-500 bg-emerald-950/20 shadow-lg cursor-pointer scale-102 hover:bg-emerald-950/45 animate-pulse';
                        } else if (isEligibleAttack) {
                          cellStatusClass = 'border-red-500 ring-2 ring-red-500/50 bg-red-950/30 cursor-crosshair scale-102 hover:bg-red-950/45 animate-pulse z-10';
                        } else if (slot) {
                          cellStatusClass = slot.id.startsWith('hq_') ? 'border-amber-600/70 bg-stone-900/80 shadow-md' : 'border-stone-700 bg-stone-900/50';
                        } else if (isEligibleDeployCell) {
                          cellStatusClass = 'border-dashed border-emerald-500/70 bg-emerald-950/25 ring-2 ring-emerald-500/20 animate-pulse cursor-pointer z-10';
                        } else if (isHighlighted) {
                          cellStatusClass = 'border-dashed border-cyan-500/80 bg-cyan-950/20 hover:bg-cyan-950/45 cursor-crosshair z-10';
                        } else {
                          cellStatusClass = 'border-dashed border-stone-850 hover:border-stone-750 bg-stone-950/15';
                        }

                        return (
                          <div
                            key={`${r}-${c}`}
                            data-grid-r={r}
                            data-grid-c={c}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDropOnGrid(r, c)}
                            onClick={() => handleGridCellClick(r, c)}
                            onPointerDown={(e) => {
                              if (slot) handlePointerDownBoardUnit(e, r, c, slot);
                            }}
                            className={`relative h-full max-h-[17vh] aspect-[3/3.8] mx-auto flex flex-col items-center justify-center rounded-lg border transition-all duration-300 cursor-pointer touch-none ${cellStatusClass}`}
                          >
                            {slot ? (
                              renderCard(slot, true)
                            ) : (
                              <div className="flex flex-col items-center select-none pointer-events-none gap-0.5">
                                {isEligibleMove ? (
                                  <span className="text-[7px] text-emerald-400 font-extrabold animate-pulse tracking-wider">
                                    ▲ MOVE
                                  </span>
                                ) : isEligibleDeployCell ? (
                                  <div className="flex flex-col items-center opacity-40">
                                    <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider animate-bounce">
                                      ↓ DEPLOY
                                    </span>
                                    <span className="text-[5.5px] text-stone-300 font-mono text-center truncate max-w-[50px]">
                                      {activeDeployCard.name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[5.5px] text-stone-800 tracking-widest font-mono uppercase bg-stone-950/30 px-1 rounded">
                                    EMPTY
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Attack Crosshair Overlays */}
                            {isEligibleAttack && (
                              <div className="absolute inset-0 bg-red-950/30 flex flex-col items-center justify-center pointer-events-none select-none rounded-lg">
                                <span className="text-[7.5px] text-red-400 font-black tracking-widest uppercase">
                                  🎯 STRIKE
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PLAYER OPERATIONAL CODES IN-HAND - OVERLAPPING PHYSICAL STACK (22vh h) */}
          <div className="w-full h-[22vh] flex items-center justify-center relative select-none">
            
            {/* The cards overlapping fan */}
            <div className="flex justify-center -space-x-12 hover:-space-x-6 transition-all duration-300 items-stretch h-full flex-grow py-1 max-w-full">
              {playerHand.map((card, idx) => (
                <div
                  key={`${card.id}-${idx}`}
                  onPointerDown={(e) => handlePointerDownHand(e, card)}
                  className="relative flex-shrink-0 h-full aspect-[3/4.2] transform transition-all duration-350 hover:scale-115 hover:-translate-y-5 hover:z-40 focus:outline-none touch-none"
                  style={{
                    transform: `rotate(${(idx - (playerHand.length - 1) / 2) * 2}deg) translateY(${Math.abs(idx - (playerHand.length - 1) / 2) * 1.5}px)`
                  }}
                >
                  {renderCard(card, false, selectedOrderCard?.id === card.id)}
                </div>
              ))}

              {playerHand.length === 0 && (
                <div className="text-center py-6 w-full text-stone-600 font-semibold tracking-wider font-mono text-[9px] uppercase border border-dashed border-stone-850 rounded-xl bg-stone-900/20">
                  HAND EMPTY. EXHAUSTED LOGISTICS SUPPLY CHANNELS.
                </div>
              )}
            </div>
          </div>

          {/* MOBILE LOGISTICS DECK & COMBAT REPORT MONITOR PILL (Only visible on < lg screens) */}
          <div className="flex lg:hidden w-full items-center justify-between bg-stone-900/80 border border-stone-850/50 rounded-xl px-4 py-2 mt-1 shadow-md shrink-0 gap-3">
            {/* Logging Wire Button (Toggles slide log modal) */}
            <button
              onClick={() => setShowMobileLogs(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 text-[9px] uppercase font-bold tracking-wider rounded"
            >
              <Terminal size={11} className="text-amber-500" />
              <span>LOG WIRE ({battleReportLogs.length})</span>
            </button>

            {/* Left Deck Draw Counter (Simulated pile) */}
            <div 
              onClick={() => {
                sound.playCardDraw();
                addLog(`Physical Reserve pile remaining: ${playerDeckRemaining.length} logistical communiques.`, 'SYSTEM');
              }}
              className="flex items-center gap-2 text-emerald-400 bg-stone-950 border border-stone-800/80 px-3 py-1.5 rounded cursor-pointer select-none"
            >
              <span className="text-[10px] font-mono leading-none">🦅</span>
              <span className="text-[9px] font-mono font-bold tracking-wider uppercase flex items-center">DECK: {playerDeckRemaining.length} CARDS</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTION HUD, RESERVE DECK PILE, LOGGING WIRE (2 COLS) */}
        <div className="col-span-2 hidden lg:flex flex-col justify-between py-6 h-full items-center">
          
          {/* Classic KARDs styled END TURN button */}
          <div className="w-full flex justify-center shrink-0">
            <button
              onClick={() => {
                if (currentTurnOwner === 'USA' && battlePhase === 'deploy') {
                  setSelectedBoardUnit(null);
                  setSelectedOrderCard(null);
                  setCurrentTurnOwner('NVA');
                  setBattlePhase('resolve');
                  executeOpponentAITurn();
                }
              }}
              disabled={currentTurnOwner !== 'USA' || battlePhase !== 'deploy'}
              className="w-full border-3 border-stone-100 bg-stone-950 font-sans font-extrabold text-stone-100 uppercase text-center text-sm py-4 tracking-widest duration-300 hover:bg-stone-100 hover:text-stone-950 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed leading-none shadow-2xl active:scale-95 transition-all"
            >
              END TURN
            </button>
          </div>

          {/* PHYSICAL-SHAPED NEST BACK DRAW DECK */}
          <div className="relative w-24 h-32 flex flex-col items-center justify-center select-none shrink-0 group">
            {/* Multi layers representing card thickness */}
            <div className="absolute w-full h-full border border-stone-900 bg-stone-950 rounded-lg shadow-sm border-b-2 translate-y-1.5 translate-x-1" />
            <div className="absolute w-full h-full border border-stone-850 bg-stone-900/90 rounded-lg shadow-md border-b-2 translate-y-1 translate-x-0.5" />
            <div 
              onClick={() => {
                sound.playCardDraw();
                addLog(`Physical Reserve pile remaining: ${playerDeckRemaining.length} logistical communiques.`, 'SYSTEM');
              }}
              className="absolute w-full h-full border border-emerald-900 bg-stone-900 rounded-lg shadow-xl hover:border-amber-500 cursor-pointer transition-all duration-300 flex flex-col justify-between p-2 select-none"
              style={{ backgroundImage: "linear-gradient(45deg, #2b3a2a 0%, #152213 100%)" }}
            >
              {/* Back card insignias */}
              <div className="w-full h-full border border-emerald-800/40 rounded flex flex-col items-center justify-between p-1">
                <span className="text-[6.5px] text-emerald-500 tracking-wider font-extrabold font-mono uppercase">MILITARY</span>
                <div className="w-7 h-7 rounded-full border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  🦅
                </div>
                <span className="text-[6.5px] text-emerald-500 tracking-wider font-mono font-bold">{playerDeckRemaining.length} CARDS</span>
              </div>
            </div>
            
            {/* Invisible tag label hovering details */}
            <div className="absolute -bottom-5 text-stone-500 font-mono text-[7px] tracking-wider uppercase font-bold text-center w-full">
              RESERVE POOL
            </div>
          </div>

          {/* COLLAPSIBLE / COMPACT CHRONICLE COMBAT MONITOR */}
          <div className="bg-stone-900/90 border border-stone-850 rounded-xl p-2.5 w-full flex-grow min-h-0 flex flex-col overflow-hidden max-h-[30vh] shadow-2xl mt-4 relative">
            <div className="absolute -top-2.5 left-3 bg-stone-950 text-[7px] font-black tracking-widest uppercase border border-stone-800 text-stone-400 px-1.5 py-0.5 rounded leading-none flex items-center gap-1">
              <Terminal size={9} className="text-amber-500" />
              LOGGING WIRE
            </div>

            <div className="flex-grow overflow-y-auto space-y-1.5 pr-0.5 mt-1.5 custom-scrollbar text-[8.5px] font-mono leading-relaxed text-stone-400 select-text">
              {battleReportLogs.length === 0 ? (
                <div className="text-stone-700 text-center uppercase py-8 text-[7.5px]">
                  No signals intercepted...
                </div>
              ) : (
                battleReportLogs.map((log) => {
                  let tagColor = 'text-stone-500';
                  if (log.tag === 'ATTACK') tagColor = 'text-red-400 font-bold';
                  if (log.tag === 'DEATH') tagColor = 'text-red-500 font-bold';
                  if (log.tag === 'DEPLOY') tagColor = 'text-emerald-400';
                  if (log.tag === 'ORDER') tagColor = 'text-cyan-400';
                  if (log.tag === 'HQ') tagColor = 'text-amber-400 font-bold';

                  return (
                    <div key={log.id} className="border-b border-stone-900/65 pb-1 select-none">
                      <span className="text-stone-600 text-[7.5px] mr-1">[{log.time}]</span>
                      <span className={`text-[7px] font-bold px-1 rounded bg-stone-950 mr-1 ${tagColor}`}>
                        {log.tag}
                      </span>
                      <span className="text-stone-300 leading-snug">{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED CARD BRIEFING MODAL OVERLAY */}
      {detailedCard && (
        <CardDetailModal
          card={detailedCard}
          onClose={() => setDetailedCard(null)}
        />
      )}

      {/* MOBILE LOG DIRECTIVE DRAWER / MODAL OVERLAY */}
      {showMobileLogs && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowMobileLogs(false)}>
          <div 
            className="w-full max-w-md bg-stone-900 border-t border-stone-800 rounded-t-2xl p-4 shadow-2xl flex flex-col max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-stone-800 pb-2 mb-3">
              <div className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-stone-200">
                <Terminal size={14} className="text-amber-500" />
                <span>CHRONICLE COMBAT WIRE</span>
              </div>
              <button 
                onClick={() => setShowMobileLogs(false)}
                className="text-stone-400 hover:text-white px-2 py-0.5 bg-stone-950/80 rounded border border-stone-800 font-bold text-[10px]"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Scrollable logs */}
            <div className="flex-grow overflow-y-auto space-y-2 pr-0.5 custom-scrollbar text-[10px] font-mono leading-relaxed text-stone-400 max-h-[50vh]">
              {battleReportLogs.length === 0 ? (
                <div className="text-stone-700 text-center uppercase py-12 text-[9px]">
                  No operational signals intercepted...
                </div>
              ) : (
                battleReportLogs.map((log) => {
                  let tagColor = 'text-stone-500';
                  if (log.tag === 'ATTACK') tagColor = 'text-red-400 font-bold';
                  if (log.tag === 'DEATH') tagColor = 'text-red-500 font-bold';
                  if (log.tag === 'DEPLOY') tagColor = 'text-emerald-400';
                  if (log.tag === 'ORDER') tagColor = 'text-cyan-400';
                  if (log.tag === 'HQ') tagColor = 'text-amber-400 font-bold';

                  return (
                    <div key={log.id} className="border-b border-stone-950 pb-1.5">
                      <span className="text-stone-600 text-[8.5px] mr-1">[{log.time}]</span>
                      <span className={`text-[8px] font-bold px-1 rounded bg-stone-950 mr-1.5 ${tagColor}`}>
                        {log.tag}
                      </span>
                      <span className="text-stone-300 leading-snug">{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DRAG / TACTICAL ARROW LAYER */}
      {activeDrag && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* SVG Tactical Arrow for Board Units */}
          {activeDrag.sourceType === 'board' && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <polygon points="0 0, 6 3, 0 6" fill="rgba(239, 68, 68, 0.9)" />
                </marker>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <line
                x1={activeDrag.startX}
                y1={activeDrag.startY}
                x2={activeDrag.currentX}
                y2={activeDrag.currentY}
                stroke="rgba(239, 68, 68, 0.8)"
                strokeWidth="4"
                strokeDasharray="8,4"
                markerEnd="url(#arrowhead)"
                filter="url(#glow)"
                className="animate-pulse"
              />
            </svg>
          )}

          {/* Floated Ghost Card for Hand Units */}
          {activeDrag.sourceType === 'hand' && (
            <div 
              style={{ 
                position: 'absolute', 
                left: activeDrag.currentX, 
                top: activeDrag.currentY,
                transform: 'translate(-50%, -50%) rotate(3deg) scale(1.05)',
                width: '120px',
                height: '168px'
              }}
              className="opacity-90 shadow-2xl z-[100]"
            >
              {renderCard(activeDrag.card, false)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
