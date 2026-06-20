import React, { useState, useEffect, useRef } from 'react';
import { startTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, GridUnit, Grid, BattleLog, Faction, CampaignNode, CardRarity } from '../types';
import { CARD_DATABASE } from '../data/cards';
import { generateDynamicDeck } from '../utils/deck';
import tableBg from '../assets/images/wood_battlefield_table_1781636718604.jpg';

import {
  resolveCombatEngagement as engineResolveCombat,
  checkMoveTriggers as engineCheckMoveTriggers,
  executeDeployEffects as engineExecuteDeployEffects
} from '../logic/combatEngine';

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
  const playerSideFactions = faction === 'USA' ? ['US', 'ARVN'] : ['NVA', 'VC'];
  const opponentSideFactions = faction === 'USA' ? ['NVA', 'VC'] : ['US', 'ARVN'];

  // Opponent state
  const [opponentDeckRemaining, setOpponentDeckRemaining] = useState<Card[]>([]);
  const [playerHQ, setPlayerHQ] = useState(20);
  const playerHQRef = useRef(20);
  const [playerHQArmor, setPlayerHQArmor] = useState(0);
  const [opponentHQ, setOpponentHQ] = useState(20);
  const opponentHQRef = useRef(20);
  const [opponentHQArmor, setOpponentHQArmor] = useState(0);

  const [playerMaxKredits, setPlayerMaxKredits] = useState(0);
  const playerMaxKreditsRef = useRef(0);
  const [opponentMaxKredits, setOpponentMaxKredits] = useState(0);
  const opponentMaxKreditsRef = useRef(0);
  const [playerKredits, setPlayerKredits] = useState(0);
  const [opponentKredits, setOpponentKredits] = useState(0);

  const [playerDeckRemaining, setPlayerDeckRemaining] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [opponentHand, setOpponentHand] = useState<Card[]>([]);
  const opponentHandRef = useRef<Card[]>([]);

  // 3 rows x 5 columns grid
  const [grid, setGrid] = useState<Grid>([
    [null, null, null, null, null], // Row 0: Opponent Base line (Line 1/3 check)
    [null, null, null, null, null], // Row 1: Conflict Zone (Line 2/3 check)
    [null, null, null, null, null], // Row 2: Player Base line (Line 3/3 check)
  ]);
  const gridRef = useRef<Grid>(grid);

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
  const [currentTurnOwner, setCurrentTurnOwner] = useState<Faction>(faction); // Player first
  const [selectedOrderCard, setSelectedOrderCard] = useState<Card | null>(null);
  const [playedOrderCard, setPlayedOrderCard] = useState<{ card: Card; isPlayer: boolean } | null>(null);
  const [targetingIndex, setTargetingIndex] = useState<{ r: number; c: number } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSiren, setActiveSiren] = useState(false);
  const [totalTurns, setTotalTurns] = useState(0);

  // Stats


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
  const [selectedHandUnit, setSelectedHandUnit] = useState<Card[] | null | any>(null);
  const [lastDeployedCell, setLastDeployedCell] = useState<{ r: number; c: number; isPlayer: boolean } | null>(null);

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
    if (unit.unitType === 'Aircraft') return '🚁';
    if (unit.unitType === 'Artillery') return '💥';
    if (unit.isAmphibious) return '⚓';
    const idLower = unit.id?.toLowerCase() || '';
    if (idLower.includes('tank') || idLower.includes('patton') || idLower.includes('apc') || idLower.includes('acav') || idLower.includes('armoured') || idLower.includes('armored')) return '🚜';
    return '🪖';
  };

  // VECTORS FOR BESPOKE FACTION EMBLEMS
  const renderUS_SSI = (card: Card, isMini: boolean) => {
    const sizeClass = isMini ? 'w-4 h-4' : 'w-7 h-8';
    if (card.artworkKeyword === 'huey' || card.name.includes('Cav') || card.id.includes('cav') || card.name.includes('Airmobile')) {
      // 1st Cavalry Division
      return (
        <svg className={`${sizeClass} drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]`} viewBox="0 0 30 36" fill="none">
          <path d="M 0 6 A 6 6 0 0 0 6 12 L 24 12 A 6 6 0 0 0 30 6 Q 15 36 0 6" fill="#F4D03F" stroke="#111" strokeWidth="1.5"/>
          <line x1="4" y1="4" x2="26" y2="26" stroke="#111" strokeWidth="3.5"/>
          <path d="M 12 11 Q 14 6 18 8 L 22 11 L 18 16 Q 14 16 12 13 Z" fill="#111"/>
        </svg>
      );
    } else if (card.artworkKeyword === 'screaming_eagles' || card.name.includes('101st') || card.id.includes('airborne') || card.name.includes('Eagles')) {
      // 101st Airborne
      return (
        <svg className={`${sizeClass} drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]`} viewBox="0 0 30 36" fill="none">
          <path d="M 3 6 L 27 6 L 27 24 Q 15 36 3 24 Z" fill="#1B4F72" stroke="#111" strokeWidth="1.5"/>
          <rect x="3" y="1" width="24" height="6" fill="#922B21" rx="1"/>
          <circle cx="15" cy="18" r="8" fill="#FFF" stroke="#111" strokeWidth="0.5"/>
          <path d="M 18 19 L 24 20 L 20 22 C 18 22 17 21 17 19" fill="#F1C40F"/>
          <circle cx="13" cy="16" r="1.2" fill="#000"/>
        </svg>
      );
    } else {
      // 1st Signal / standard US Army shield
      return (
        <svg className={`${sizeClass} drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]`} viewBox="0 0 30 36" fill="none">
          <path d="M 0 6 L 15 1 L 30 6 L 30 24 Q 15 36 0 24 Z" fill="#2E4053" stroke="#BA4A00" strokeWidth="1.5" />
          <path d="M 18 8 L 10 18 L 16 18 L 12 28 L 22 16 L 16 16 Z" fill="#F1C40F" stroke="#111" strokeWidth="0.5"/>
        </svg>
      );
    }
  };

  const renderARVN_badge = (card: Card, isMini: boolean) => {
    const sizeClass = isMini ? 'w-4 h-4' : 'w-7 h-7';
    if (card.name.includes('Ranger') || card.id.includes('ranger') || card.id.includes('spec_ops') || card.id.includes('specops')) {
      // Rangers - Hắc Hổ (Black Tiger)
      return (
        <svg className={`${sizeClass} drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]`} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" fill="#E67E22" stroke="#222" strokeWidth="1.5"/>
          <path d="M 6 16 Q 16 26 26 16 M 8 13 Q 16 7 24 13 M 12 16 H 20" stroke="#111" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="16" cy="11" r="2" fill="#000"/>
          <path d="M 13 18 L 14 21 L 15 18 M 17 18 L 18 21 L 19 18" fill="#FFF" stroke="#222" strokeWidth="0.5"/>
        </svg>
      );
    } else if (card.name.includes('Airborne') || card.name.includes('regulars') || card.name.includes('1st Infantry')) {
      // Airborne badge (white parachute on blue/red)
      return (
        <svg className={`${sizeClass} drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]`} viewBox="0 0 32 32" fill="none">
          <path d="M 2 16 C 2 7 9 2 16 2 C 23 2 30 7 30 16 C 30 25 23 30 16 30 C 9 30 2 25 2 16 Z" fill="#2980B9" stroke="#E74C3C" strokeWidth="1.5"/>
          <path d="M 2 16 C 2 25 9 30 16 30 C 23 30 30 25 30 16 Z" fill="#C0392B"/>
          <path d="M 8 15 Q 16 5 24 15 C 24 15 22 18 16 18 C 10 18 8 15 8 15 Z" fill="#FFF" stroke="#222" strokeWidth="1"/>
          <line x1="8" y1="16" x2="16" y2="26" stroke="#FFF" strokeWidth="0.7"/>
          <line x1="12" y1="18" x2="16" y2="26" stroke="#FFF" strokeWidth="0.7"/>
          <line x1="16" y1="18" x2="16" y2="26" stroke="#FFF" strokeWidth="0.7"/>
          <line x1="20" y1="18" x2="16" y2="26" stroke="#FFF" strokeWidth="0.7"/>
          <line x1="24" y1="16" x2="16" y2="26" stroke="#FFF" strokeWidth="0.7"/>
        </svg>
      );
    } else {
      // Anchor and Sword (Thủy quân lục chiến or general regional forces)
      return (
        <svg className={`${sizeClass} drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]`} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" fill="#27AE60" stroke="#F1C40F" strokeWidth="1.5"/>
          <line x1="16" y1="6" x2="16" y2="26" stroke="#F1C40F" strokeWidth="3"/>
          <path d="M 8 14 Q 16 24 24 14" stroke="#F1C40F" strokeWidth="2.5" fill="none"/>
          <line x1="11" y1="10" x2="21" y2="20" stroke="#FFF" strokeWidth="1.5"/>
        </svg>
      );
    }
  };

  const renderNVA_BranchInsignia = (card: Card, isMini: boolean) => {
    const sizeClass = isMini ? 'w-4 h-4' : 'w-6 h-6';
    if (card.artworkKeyword === 'sapper' || card.name.includes('Sapper') || card.id.includes('sapper')) {
      // Special Recon/Sapper - Dagger and explosives block
      return (
        <svg className={`${sizeClass} inline-block mx-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]`} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="14" width="16" height="6" fill="#D4AC0D" stroke="#111" strokeWidth="1"/>
          <line x1="12" y1="2" x2="12" y2="16" stroke="#B2BABB" strokeWidth="2.5"/>
          <line x1="7" y1="16" x2="17" y2="16" stroke="#D4AC0D" strokeWidth="1.5"/>
        </svg>
      );
    } else if (card.unitType === 'Artillery' || card.artworkKeyword === 'machine_gun' || card.name.includes('Artillery')) {
      // Cannon barrels crossed
      return (
        <svg className={`${sizeClass} inline-block mx-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]`} viewBox="0 0 24 24" fill="none">
          <line x1="4" y1="4" x2="20" y2="20" stroke="#D4AC0D" strokeWidth="3" strokeLinecap="round"/>
          <line x1="4" y1="20" x2="20" y2="4" stroke="#D4AC0D" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="3" fill="#FFF" stroke="#111" strokeWidth="1"/>
        </svg>
      );
    } else {
      // Crossed rifle/sword + Star (Infantry)
      return (
        <svg className={`${sizeClass} inline-block mx-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]`} viewBox="0 0 24 24" fill="none">
          <line x1="4" y1="4" x2="20" y2="20" stroke="#D4AC0D" strokeWidth="2" strokeLinecap="round"/>
          <line x1="4" y1="20" x2="20" y2="4" stroke="#B2BABB" strokeWidth="1.5" strokeLinecap="round"/>
          <polygon points="12,5 14,10 19,10 15,13 17,18 12,15 7,18 9,13 5,10 10,10" fill="#D4AC0D" stroke="#111" strokeWidth="0.5"/>
        </svg>
      );
    }
  };

  const renderNVA_CollarTab = (card: Card, isMini: boolean) => {
    const numStars = card.rarity === 'Elite' ? 4 : card.rarity === 'Rare' ? 3 : card.rarity === 'Uncommon' ? 2 : 1;
    const numStripes = (card.rarity === 'Elite' || card.rarity === 'Rare') ? 2 : 1;
    
    let tabBg = 'from-red-600 via-red-700 to-red-800'; 
    if (card.unitType === 'Aircraft') {
      tabBg = 'from-sky-500 via-sky-600 to-sky-700'; // AA / Air Force
    } else if (card.unitType === 'Artillery' || card.unitType === 'Tank') {
      tabBg = 'from-indigo-900 via-indigo-950 to-slate-950'; // Artillery / Heavy weapons
    }
    
    const sizeClass = isMini ? 'h-3.5 px-1 py-0' : 'h-6 px-2 py-0.5';
    const textClass = isMini ? 'text-[5px]' : 'text-[9px]';
    const stripeClass = isMini ? 'w-[1px]' : 'w-[1.5px]';

    return (
      <div 
        className={`relative flex items-center justify-center font-black ${sizeClass} text-yellow-300 bg-gradient-to-r ${tabBg} border border-yellow-500 overflow-hidden shadow-inner select-none pointer-events-none`}
        style={{ transform: 'skewX(-15deg)', borderRadius: '2px' }}
      >
        {/* Collar Tab vertical yellow stripes */}
        <div className={`absolute inset-y-0 left-1 ${stripeClass} bg-yellow-400 opacity-90`} />
        {numStripes === 2 && (
          <div className={`absolute inset-y-0 left-2 ${stripeClass} bg-yellow-400 opacity-90`} />
        )}

        {/* Tiny stars */}
        <span className={`ml-2 font-mono ${textClass} tracking-tighter`} style={{ transform: 'skewX(15deg)' }}>
          {Array.from({ length: numStars }).map(() => '★').join('')}
        </span>
      </div>
    );
  };

  const renderVCMedallion = (card: Card, isMini: boolean) => {
    const sizeClass = isMini ? 'w-4 h-4' : 'w-7 h-7';
    // Medal "Dũng sĩ diệt Mỹ" or "Huân chương Quyết thắng"
    if (card.id === 'vc_order_vuon_khong' || card.id === 'vc_order_dia_dao') {
      return (
        <svg className={`${sizeClass} drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]`} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" fill="#C0392B" stroke="#D4AC0D" strokeWidth="2"/>
          <polygon points="16,4 19,11 26,11 21,16 23,23 16,19 9,23 11,16 6,11 13,11" fill="#D4AC0D" stroke="#111" strokeWidth="0.5"/>
        </svg>
      );
    } else {
      return (
        <svg className={`${sizeClass} drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]`} viewBox="0 0 32 32" fill="none">
          <path d="M 4 8 L 16 2 L 28 8 L 28 22 Q 16 30 4 22 Z" fill="#D35400" stroke="#F1C40F" strokeWidth="1.5"/>
          <path d="M 10 16 Q 16 8 22 16 L 20 18 Q 16 14 12 18 Z" fill="#2C3E50" stroke="#111" strokeWidth="0.5"/>
          <polygon points="16,3 17,6 20,6 18,8 19,11 16,9 13,11 14,8 12,6 15,6" fill="#F1C40F"/>
        </svg>
      );
    }
  };

  // FACTION VISUAL DEFINITIONS
  const getFactionShellStyle = (card: Card) => {
    const isHQ = card.id === 'hq_player' || card.id === 'hq_opponent';
    
    switch (card.faction) {
      case 'US':
        const isFullColor = card.k > 3 || card.rarity === 'Elite' || card.rarity === 'Rare' || isHQ;
        return {
          frameClass: isHQ ? "rounded border-2 border-amber-600/60" : "rounded border-2 border-stone-700/80",
          bgClass: isFullColor 
            ? "bg-[#0B1527] bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E1B4B] text-amber-50" 
            : "bg-[#27321B] text-stone-100", // Olive Drab Field look
          bgStyle: isFullColor ? undefined : {
            backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1.5px, transparent 1.5px, transparent 4px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1.5px, transparent 1.5px, transparent 4px), radial-gradient(circle at center, #2e3c20 0%, #171f0f 100%)"
          },
          insigniaPosition: "top-1 left-[32px]",
          titleFont: "font-sans uppercase tracking-tight font-black text-stone-100",
          accentColor: "border-amber-500/30 shadow-amber-950/50"
        };
      case 'ARVN':
        // Stamped Aluminum Hand-Cut Look (Beer Can Badge)
        return {
          frameClass: "rounded border-2 border-stone-400 shadow-[inset_0_3px_6px_rgba(255,255,255,0.7),_inset_0_-3px_5px_rgba(0,0,0,0.35)]",
          bgClass: "bg-gradient-to-br from-[#D4D4D8] via-[#F4F4F5] to-[#A1A1AA] text-stone-950",
          bgStyle: undefined,
          insigniaPosition: "top-1 left-[32px]",
          titleFont: "font-serif font-black text-stone-900 border-b border-stone-400/40 pb-0.5",
          accentColor: "border-stone-500 shadow-stone-950/60"
        };
      case 'NVA':
        // Regular clean Rectangle with collar tab detailing
        const isInfantry = card.unitType === 'Infantry' || card.type === 'Order';
        const isAir = card.unitType === 'Aircraft';
        return {
          frameClass: "rounded border-2 border-[#821313]",
          bgClass: isInfantry 
            ? "bg-[#7c1414] bg-[radial-gradient(circle_at_center,_#901616_0%,_#540404_100%)] text-red-50" 
            : isAir
              ? "bg-[#115591] bg-[radial-gradient(circle_at_center,_#166BB7_0%,_#09345C_100%)] text-indigo-50"
              : "bg-[#19163b] bg-[radial-gradient(circle_at_center,_#242054_0%,_#0B091B_100%)] text-slate-100",
          bgStyle: undefined,
          insigniaPosition: "top-1 left-1/2 -translate-x-1/2",
          titleFont: "font-sans tracking-wide font-black text-yellow-50",
          accentColor: "border-yellow-600/40 shadow-red-950/60"
        };
      case 'VC':
        // Asymmetric handmade cloth armband divider
        return {
          frameClass: "rounded border-2 border-[#8d5d11]",
          bgClass: "bg-gradient-to-b from-[#8C1313] via-[#101010] to-[#124B8C] text-stone-100",
          bgStyle: undefined,
          insigniaPosition: "top-1 left-1.5",
          titleFont: "font-typewriter font-extrabold text-stone-100 uppercase",
          accentColor: "border-yellow-500/30 shadow-black"
        };
      default:
        return {
          frameClass: "rounded border-2 border-stone-800",
          bgClass: "bg-stone-950 text-stone-100",
          bgStyle: undefined,
          insigniaPosition: "top-1 left-7",
          titleFont: "font-mono font-bold text-stone-100",
          accentColor: "border-stone-700 shadow-black"
        };
    }
  };

  const getRarityGlow = (rarity: CardRarity) => {
    switch (rarity) {
      case 'Elite': return 'shadow-[0_0_20px_rgba(245,158,11,0.4)] border-amber-400/60';
      case 'Rare': return 'shadow-[0_0_15px_rgba(6,182,212,0.3)] border-cyan-400/60';
      case 'Uncommon': return 'shadow-[0_0_10px_rgba(34,197,94,0.2)] border-emerald-400/60';
      default: return 'border-stone-800';
    }
  };

  const getFactionCurrency = (fac: string) => {
    if (fac === 'US' || fac === 'ARVN' || fac === 'USA' || fac === 'US/ARVN') {
      return { symbol: '$', name: 'Dollars', color: 'text-emerald-400 bg-emerald-950/90 border-emerald-500/40' };
    }
    return { symbol: '🎫', name: 'Ration Coupons', color: 'text-red-400 bg-red-950/90 border-red-500/40' };
  };

  const renderCard = (card: Card, isMini: boolean = false, isSelected: boolean = false) => {
    const currency = getFactionCurrency(card.faction);
    const factionStyle = getFactionShellStyle(card);
    const rarityStyle = getRarityGlow(card.rarity);
    const isHQ = card.id === 'hq_player' || card.id === 'hq_opponent';
    const isAffordable = isHQ || playerKredits >= card.k;

    // Scale factors for board (isMini) vs hand (normal)
    const cardClass = isMini 
      ? `relative w-full h-full overflow-hidden cursor-pointer shadow-xl transition-all duration-300 flex flex-col justify-between ${factionStyle.frameClass} ${
          isSelected 
            ? 'border-yellow-400 ring-2 ring-yellow-400/50 z-20 shadow-2xl scale-102 font-mono' 
            : `${rarityStyle} bg-stone-900/90`
        }` 
      : `relative flex-shrink-0 h-[17vh] xs:h-[18vh] sm:h-[19vh] lg:h-[20vh] aspect-[3/4.2] overflow-hidden cursor-pointer shadow-xl transition-all duration-300 transform scale-100 hover:scale-[1.12] hover:-translate-y-2 flex flex-col justify-between ${factionStyle.frameClass} ${
          isSelected
            ? 'border-cyan-500 ring-2 ring-cyan-500/50 scale-103 bg-stone-900 shadow-2xl z-40'
            : isAffordable 
              ? `${rarityStyle} hover:border-amber-500 hover:shadow-[0_10px_25px_rgb(0,0,0,0.75)]`
              : 'grayscale brightness-75 opacity-70 cursor-not-allowed border-stone-900'
        }`;

    const badgeSymbolSize = isMini ? 'text-[8px] px-1 py-0.5' : 'text-xs px-1.5 py-0.5';
    const badgeTypeSize = isMini ? 'text-[6px] px-0.5 bg-stone-950/90 text-stone-400' : 'text-[8.5px] px-1.5 bg-stone-950/90 text-stone-400';
    const textGap = isMini ? 'p-1 gap-0.5' : 'p-2 gap-1.5';
    const titleSize = isMini ? 'text-[8px] sm:text-[9px]' : 'text-xs sm:text-sm';
    const opCostSize = isMini ? 'text-[6.5px]' : 'text-[9.5px]';
    const abilitySize = isMini ? 'text-[6px] sm:text-[7px] leading-tight line-clamp-1 h-3 min-h-0 border-t border-stone-850/40 my-0.5 pt-0.5' : 'text-[10px] sm:text-xs font-typewriter leading-tight line-clamp-3 min-h-[36px] my-1 border-t border-stone-850/50 pt-1.5 text-stone-350';
    const statsBoxSize = isMini ? 'text-[8px] sm:text-[9.5px] py-0 border-stone-250 font-bold' : 'text-[11px] sm:text-sm py-0.5 border-stone-300 font-bold';
    const statsDivClass = isMini ? 'grid grid-cols-3 bg-stone-100 text-stone-950 border rounded shadow-xs items-center divide-x divide-stone-250 py-0.5' : 'grid grid-cols-3 bg-stone-100 text-stone-950 border rounded shadow-lg items-center divide-x divide-stone-300 py-1';

    const motionProps = isMini 
      ? {
          initial: { scale: 1.4, y: -25, opacity: 0 },
          animate: { scale: 1, y: 0, opacity: 1 },
          transition: { type: "spring", stiffness: 350, damping: 16 }
        }
      : {};

    return (
      <motion.div 
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
        {...motionProps}
      >
        {/* Dynamic Faction Insignia Overlay (SSI / Branch Badge) */}
        {!isHQ && (
          <div className={`absolute pointer-events-none select-none z-20 ${factionStyle.insigniaPosition} ${isMini ? 'scale-75 top-[1.5vh]' : 'scale-100 top-2'} opacity-90`}>
            {card.faction === 'US' && renderUS_SSI(card, isMini)}
            {card.faction === 'ARVN' && renderARVN_badge(card, isMini)}
            {card.faction === 'NVA' && renderNVA_BranchInsignia(card, isMini)}
            {card.faction === 'VC' && card.type === 'Order' && renderVCMedallion(card, isMini)}
          </div>
        )}

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

        {/* Poster Artwork Render with specific historical styling filters */}
        <div className={`aspect-[4/3] w-full border-b border-stone-950 shrink-0 select-none pointer-events-none relative overflow-hidden ${
          card.faction === 'VC' ? 'grayscale brightness-110 sepia-[0.3]' : 
          card.faction === 'ARVN' ? 'contrast-[1.1] brightness-[0.95] sepia-[0.2]' : ''
        }`}>
          <PropagandaPoster keyword={card.artworkKeyword} faction={card.faction} name={card.name} />
          {/* Faction Overlay Scratches/Dents */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dust.png')]" />

          {/* Absolute overlays for NVA / VC that previously pushed stats down */}
          {card.faction === 'NVA' && !isHQ && (
            <div className={`absolute z-30 shadow-md ${isMini ? 'bottom-0.5 left-0.5 scale-[0.8] origin-bottom-left' : 'bottom-1 left-1.5'}`}>
              {renderNVA_CollarTab(card, isMini)}
            </div>
          )}

          {card.faction === 'VC' && !isHQ && (
            <div className={`absolute bottom-0 left-0 right-0 z-30 flex overflow-hidden border-t border-yellow-500/30 select-none ${isMini ? 'h-1.5' : 'h-2.5'}`}>
              <div className="w-1/2 bg-[#B81D1D]/90" />
              <div className="w-1/2 bg-[#1d52b8]/90" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`${isMini ? 'text-[5px]' : 'text-[8.5px]'} text-yellow-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]`}>★</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats HUD footer */}
        <div 
          style={factionStyle.bgStyle}
          className={`${textGap} ${factionStyle.bgClass} flex-grow flex flex-col justify-between items-stretch select-none border-t border-white/5`}
        >
          {/* Faction Header Banner details */}
          <div className="pointer-events-none">
            <div className={`truncate tracking-wide leading-tight ${factionStyle.titleFont} ${titleSize}`}>
              {card.name}
            </div>
            {/* Operation/Action Cost */}
            <div className={`uppercase font-black opacity-85 tracking-wider font-mono ${opCostSize} ${card.faction === 'ARVN' ? 'text-blue-900 font-bold' : 'text-amber-500 text-opacity-90'}`}>
              Op Cost: {card.o} {currency.symbol}
            </div>
          </div>

          {/* Card ability in small typewriter script */}
          <p className={`font-typewriter select-none pointer-events-none ${abilitySize} ${card.faction === 'ARVN' ? 'text-stone-850 font-medium' : 'text-stone-300'}`}>
            {card.ability}
          </p>

          {/* Bottom stats row for units, or action label for orders */}
          {card.type === 'Unit' ? (
            <div className={`${statsDivClass} font-mono select-none z-10 shrink-0 pointer-events-none ${card.faction === 'ARVN' ? 'bg-stone-50 border-stone-400 text-stone-950 font-extrabold' : ''}`}>
              {/* Attack */}
              <span className={`text-red-700 flex items-center justify-center gap-0.5 ${statsBoxSize}`}>{card.atk}</span>
              {/* Class Icon */}
              <span className="text-[7px] flex items-center justify-center py-0">{getUnitClassSymbol(card)}</span>
              {/* Defense */}
              <span className={`text-emerald-800 flex items-center justify-center gap-0.5 ${statsBoxSize}`}>{card.def}</span>
            </div>
          ) : (
            <div className={`text-center py-0.2 uppercase tracking-widest rounded shadow-sm select-none shrink-0 border-opacity-40 font-mono font-bold pointer-events-none ${isMini ? 'text-[5.5px]' : 'text-[8px]'} ${
              card.faction === 'NVA' ? 'bg-[#901616] border-red-500/40 text-red-50' : 
              card.faction === 'VC' ? 'bg-[#ffcc00]/20 border-[#ffcc00]/40 text-[#ffcc00]' : 
              card.faction === 'ARVN' ? 'bg-stone-400/40 border-stone-500 text-stone-900 font-black' : 'bg-cyan-950/70 border-cyan-800/40 text-cyan-400'
            }`}>
              ⚡ TACTICAL DIRECTIVE
            </div>
          )}
        </div>
      </motion.div>
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
    const openingHandCount = 4; // Both sides start with 4 cards
    const startingHand = shuffledDeck.slice(0, openingHandCount);
    const remainingDeck = shuffledDeck.slice(openingHandCount);

    setPlayerHand(startingHand);
    setPlayerDeckRemaining(remainingDeck);

    // Prepare Opponent Deck (opposite faction) (Both tactical Directives and Units)
    const opponentFaction = faction === 'USA' ? 'NVA' : 'USA';
    const startingOpponentCount = 4;
    
    // Generate dynamic opponent deck balancing limits
    const aiDeck = generateDynamicDeck(opponentFaction, 30);
    const oppHand = aiDeck.slice(0, startingOpponentCount);
    const oppRemainingDeck = aiDeck.slice(startingOpponentCount);
    
    setOpponentHand(oppHand);
    setOpponentDeckRemaining(oppRemainingDeck);

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
      unitType: 'Infantry',
      camouflage: false,
      frozenTurns: 0,
      armor: 0,
      isAmphibious: false,
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
      unitType: 'Infantry',
      rarity: 'Elite',
      ability: 'Your Command HQ base station. Guard this line with your life!',
      artworkKeyword: playerFactionName === 'US' ? 'hq_saigon' : 'hq_hanoi',
      instanceId: 'hq-player-default',
      hasMovedOrAttackedThisTurn: true,
      camouflage: false,
      frozenTurns: 0,
      armor: 0,
      isAmphibious: false,
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

  // Sync refs for async access
  useEffect(() => {
    playerHQRef.current = playerHQ;
    opponentHQRef.current = opponentHQ;
    gridRef.current = grid;
    playerMaxKreditsRef.current = playerMaxKredits;
    opponentMaxKreditsRef.current = opponentMaxKredits;
    opponentHandRef.current = opponentHand;
  }, [playerHQ, opponentHQ, grid, playerMaxKredits, opponentMaxKredits, opponentHand]);

  // ==========================================
  // COMMON COMBAT RESOLUTION ENGINE - MANAGES ALL CRITICAL GAME SYNERGIES
  // ==========================================
  const resolveCombatEngagement = (
    attacker: GridUnit,
    defender: GridUnit,
    attPos: { r: number; c: number },
    defPos: { r: number; c: number },
    nextGrid: Grid,
    isPlayerAttacking: boolean
  ) => {
    const result = engineResolveCombat(attacker, defender, attPos, defPos, nextGrid, isPlayerAttacking);

    // Apply state changes
    if (result.playerHQDmg > 0) {
      setPlayerHQ((prev) => Math.max(0, prev - result.playerHQDmg));
    }
    if (result.opponentHQDmg > 0) {
      setOpponentHQ((prev) => Math.max(0, prev - result.opponentHQDmg));
    }

    // Process logs
    result.logs.forEach((log) => {
      addLog(log.message, log.tag);
    });

    // Sync elements of nextGrid to caller reference
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        nextGrid[r][c] = result.nextGrid[r][c];
      }
    }
  };

  // ==========================================
  // COMMON MOVE TRIGGERS - HANDLES MINES, SPECIAL POSITION SYNERGIES, AND DEMOLITION STRIKE
  // ==========================================
  const checkMoveTriggers = (r: number, c: number, activeUnit: GridUnit, nextGrid: Grid, isPlayerMoving: boolean) => {
    const result = engineCheckMoveTriggers(
      r,
      c,
      activeUnit,
      nextGrid,
      isPlayerMoving,
      activeTraps,
      faction,
      playerSideFactions
    );

    // Assign sound effects
    if (result.soundEffect === 'explosion') {
      sound.playExplosion();
    }

    // Apply HQ damage
    if (result.playerHQDmg > 0) {
      setPlayerHQ((prev) => Math.max(0, prev - result.playerHQDmg));
    }
    if (result.opponentHQDmg > 0) {
      setOpponentHQ((prev) => Math.max(0, prev - result.opponentHQDmg));
    }

    // Update active traps
    setActiveTraps(result.activeTraps);

    // Process logs
    result.logs.forEach((log) => {
      addLog(log.message, log.tag);
    });

    // Sync elements of nextGrid to caller reference
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        nextGrid[row][col] = result.nextGrid[row][col];
      }
    }
  };

  // COMBAT TRIGGERS FOR SPECIAL ABILITIES
  const applyAuraBuffs = (currentGrid: Grid): Grid => {
    // Return grid copying original stats and then applying local dynamic aura increases
    const tempGrid = currentGrid.map((row, r) =>
      row.map((unit) => {
        if (!unit) return null;
        
        let baseAtk = unit.baseAtk;
        if (baseAtk === undefined) {
          if (unit.id === 'hq_player' || unit.id === 'hq_opponent') {
            baseAtk = 0;
          } else {
            baseAtk = CARD_DATABASE.find((c) => c.id === unit.id)?.atk ?? unit.atk;
          }
        }

        // Apply constant static positional bonuses
        let staticAtkBonus = 0;
        let staticDefBonus = 0;

        // 304th Regulars (+1 DEF inside Row index 1 / Conflict Zone)
        if (unit.id === 'nva_304th_division' && r === 1) {
          staticDefBonus += 1;
        }

        // Reset dynamic buff properties to clean baseline stats
        return {
          ...unit,
          baseAtk: baseAtk,
          atk: baseAtk + staticAtkBonus,
          def: unit.def, // Def can be altered but maximum remains limit
          maxDef: (CARD_DATABASE.find((c) => c.id === unit.id)?.maxDef ?? unit.maxDef) + staticDefBonus,
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

          // ARVN Regional Forces guard alliance: Gains +2 DEF if sharing a line with a US unit
          if (unit.id === 'arvn_regional_forces') {
            const hasUSAlly = row.some((ally) => ally && ally.faction === 'US');
            if (hasUSAlly) {
              unit.maxDef += 2;
              if (unit.def < unit.maxDef) {
                unit.def += 2;
              }
            }
          }
        }
      });
    });

    // 1. Apply NVA Command Vanguard aura
    if (nvaAuraCount > 0) {
      for (let r = 0; r < tempGrid.length; r++) {
        for (let c = 0; c < 5; c++) {
          const unit = tempGrid[r][c];
          if (
            unit && 
            (unit.faction === 'NVA' || unit.faction === 'VC') && 
            unit.id !== 'nva_command_vanguard' &&
            unit.id !== 'hq_player' &&
            unit.id !== 'hq_opponent'
          ) {
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
          if (
            unit && 
            unit.faction === 'ARVN' && 
            unit.id !== 'hq_player' && 
            unit.id !== 'hq_opponent'
          ) {
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
  const handleConfirmMulligan = (cardsToKeep: Card[], cardsToSwap: Card[]) => {
    sound.playRadioStatic();
    if (cardsToSwap.length > 0) {
      addLog(`Mulligan Redraft: Exchanging ${cardsToSwap.length} cards.`, 'SYSTEM');
      
      const pool = [...playerDeckRemaining].sort(() => Math.random() - 0.5);
      const freshCards = pool.slice(0, cardsToSwap.length);
      const leftoverDeck = [...pool.slice(cardsToSwap.length), ...cardsToSwap];

      setPlayerHand([...cardsToKeep, ...freshCards]);
      setPlayerDeckRemaining(leftoverDeck);
    } else {
      addLog(`Commander accepted starting hand unchanged.`, 'SYSTEM');
    }
    setShowMulligan(false);
    
    // Start Turn 1 for the player under official gameplay constraints
    startNextTurn(faction);
  };

  const handleToggleMulliganItem = (cardId: string) => {
    sound.playCardDraw();
    setMulliganSelected((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // TURN BEGIN CYCLE
  const startNextTurn = (nextOwner: Faction) => {
    console.log(`[Turn Sync] Rotating to ${nextOwner}`);
    setCurrentTurnOwner(nextOwner);
    setPlayedOrderCard(null); // Clear any ghost cards
    
    setTotalTurns((prev) => prev + 1);
    const updatedTurnCount = totalTurns + 1;

    if (nextOwner === faction) {
      setPlayerMaxKredits((prev) => {
        const newMax = Math.min(12, prev + 1);
        setPlayerKredits(newMax);
        return newMax;
      });
    } else {
      setOpponentMaxKredits((prev) => {
        const newMax = Math.min(12, prev + 1);
        setOpponentKredits(newMax);
        return newMax;
      });
    }

    setGrid((prevGrid) => {
      // Replenish status of grid units
      let updatedGrid = prevGrid.map((row) =>
        row.map((unit) => {
          if (!unit) return null;
          const isCurrentOwnerUnit = 
            (nextOwner === faction && playerSideFactions.includes(unit.faction)) ||
            (nextOwner !== faction && opponentSideFactions.includes(unit.faction));
          if (isCurrentOwnerUnit) {
            return {
              ...unit,
              hasMovedOrAttackedThisTurn: false,
              hasMovedThisTurn: false,
              hasAttackedThisTurn: false,
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
            (r < 2 && updatedGrid[r + 1][c]?.id === 'nva_group_559') ||
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

      return applyAuraBuffs(updatedGrid);
    });

    // Draw card
    if (nextOwner === faction) {
      if (updatedTurnCount === 1) {
        addLog(`COMMAND: Turn 1 Engagement Protocol. Starting hand maintained.`, 'SYSTEM');
        return;
      }

      setPlayerDeckRemaining((prevDeck) => {
        if (prevDeck.length > 0) {
          const [drawn, ...rest] = prevDeck;
          sound.playCardDraw();
          setPlayerHand((prevHand) => {
            if (prevHand.length < 9) {
              addLog(`Allied Logistics drew: ${drawn.name}.`, 'DEPLOY');
              return [...prevHand, drawn];
            } else {
              addLog(`Hand overflow. Burned ${drawn.name}.`, 'SYSTEM');
              return prevHand;
            }
          });
          return rest;
        } else {
          addLog(`WARNING: Allied Reserves depleted! HQ absorbs damage.`, 'HQ');
          setPlayerHQ((h) => Math.max(0, h - 2));
          return prevDeck;
        }
      });
    } else {
      // Opponent AI turn actions
      executeOpponentAITurn();
    }
  };

  // CLIENT CARD USAGE (DEPLOY CODES)
  const handleSelectCard = (card: Card) => {
    if (battlePhase !== 'deploy' || currentTurnOwner !== faction) return;

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
    if (card.type !== 'Unit') {
      addLog(`Command Alert: Order and Countermeasure cards cannot be deployed as physical units.`, 'SYSTEM');
      setSelectedHandUnit(null);
      return;
    }
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

    if (grid?.[r]?.[c] !== null) {
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

    const deployRes = engineExecuteDeployEffects(
      card,
      grid,
      true,
      activeTraps,
      playerSideFactions,
      opponentSideFactions
    );

    if (deployRes.soundEffect === 'explosion') {
      sound.playExplosion();
    }
    if (deployRes.playerHQArmorDiff > 0) {
      setPlayerHQArmor((a) => a + deployRes.playerHQArmorDiff);
    }
    if (deployRes.opponentHQArmorDiff > 0) {
      setOpponentHQArmor((a) => a + deployRes.opponentHQArmorDiff);
    }
    setActiveTraps(deployRes.activeTraps);
    deployRes.logs.forEach((log) => addLog(log.message, log.tag));

    const nextGrid = deployRes.nextGrid;

    const newUnit: GridUnit = {
      ...card,
      instanceId: `unit-${Date.now()}-${r}-${c}`,
      hasMovedOrAttackedThisTurn: true, // Summoning sickness
      hasMovedThisTurn: true,
      hasAttackedThisTurn: true,
      camouflage: card.id === 'vc_guerrilla_cell' || card.id === 'nva_304th_division' || card.ability?.toLowerCase().includes('camouflage'),
      frozenTurns: 0,
      armor: 0,
      isAmphibious: card.id === 'nva_803rd_riverine' || card.id === 'us_9th_riverines' || card.ability?.toLowerCase().includes('amphibious'),
    };

    nextGrid[r][c] = newUnit;

    setGrid(applyAuraBuffs(nextGrid));
    setPlayerKredits((k) => k - card.k);
    setPlayerHand((prev) => {
      const idx = prev.findIndex((cd) => cd.id === card.id);
      if (idx !== -1) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return prev;
    });
    setSelectedHandUnit(null);
    setLastDeployedCell({ r, c, isPlayer: true });
    setTimeout(() => setLastDeployedCell(null), 1000);

    addLog(`Deployed ${card.name} to Row ${r + 1}, Lane ${c + 1}.`, 'DEPLOY');
  };

  // HANDLES DETAILED MANUAL CLICK AND COMMITTED SELECTION (KARDS-STYLE PLAY)
  const handleGridCellClick = (r: number, c: number) => {
    if (currentTurnOwner !== faction || battlePhase !== 'deploy') return;

    // If there is an active selected unit card from hand, prioritize deploying it!
    if (selectedHandUnit) {
      handleDeployHandUnit(selectedHandUnit, r, c);
      return;
    }

    const clickedUnit = grid?.[r]?.[c];

    // If there is an active selected order card from hand, prioritize casting it!
    if (selectedOrderCard) {
      handleCastOrder(c, r);
      return;
    }

    // Step 1: No card is selected on the board yet
    if (!selectedBoardUnit) {
      if (clickedUnit) {
        const isFriendly = playerSideFactions.includes(clickedUnit.faction);
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
      const selectedUnit = grid?.[selectedBoardUnit.r]?.[selectedBoardUnit.c];
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
      if (clickedUnit && playerSideFactions.includes(clickedUnit.faction)) {
        if (clickedUnit.id === 'hq_player') {
          setSelectedBoardUnit(null);
          return;
        }
        const isTank = clickedUnit.unitType === 'Tank';
        const canAct = isTank ? (!clickedUnit.hasMovedThisTurn || !clickedUnit.hasAttackedThisTurn) : !clickedUnit.hasMovedOrAttackedThisTurn;
        if (!canAct || clickedUnit.frozenTurns > 0) {
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
        const rowDiff = r - selectedBoardUnit.r;
        const colDiff = c - selectedBoardUnit.c;

        const isValidMove = Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1 && (rowDiff !== 0 || colDiff !== 0);
        
        if (!isValidMove) {
          addLog("Invalid Command. Battalions can only advance to adjacent sectors.", "SYSTEM");
          setSelectedBoardUnit(null);
          return;
        }

        const isTank = selectedUnit.unitType === 'Tank';
        if (isTank && selectedUnit.hasMovedThisTurn) {
          addLog("Tanks can only move once per turn.", "SYSTEM");
          setSelectedBoardUnit(null);
          return;
        }

        // Execute board move action
        sound.playDeploy();
        const nextGrid = grid.map((row) => [...row]);
        const movingUnitObj = { 
          ...selectedUnit, 
          hasMovedThisTurn: true,
          hasMovedOrAttackedThisTurn: !isTank // For non-tanks, moving ends turn
        };
        nextGrid[r][c] = movingUnitObj;
        nextGrid[selectedBoardUnit.r][selectedBoardUnit.c] = null;

        // Check positional/move triggers (Mines, Demolition strike, etc.)
        checkMoveTriggers(r, c, movingUnitObj, nextGrid, true);

        setPlayerKredits(k => k - selectedUnit.o);
        setGrid(applyAuraBuffs(nextGrid));
        addLog(`${selectedUnit.name} moved to Sector Row ${r + 1}, Lane ${c + 1}.`, "MOVE");
        setSelectedBoardUnit(null);
        return;
      }

      // Subcase B: Targeted cell is preoccupied - attempting COMBAT ATTACK!
      const isEnemy = opponentSideFactions.includes(clickedUnit.faction) || clickedUnit.id === 'hq_opponent';
      if (isEnemy) {
        // Range check
        let isRangeValid = false;
        if (selectedUnit.unitType === 'Aircraft' || selectedUnit.unitType === 'Artillery') {
          isRangeValid = true; // Air planes and Artillery can strike any valid target!
        } else {
          if (clickedUnit.id === 'hq_opponent') {
            // HQ can be attacked by any ground unit that has reached the frontline (Row 1)
            isRangeValid = selectedBoardUnit.r === 1;
          } else {
            // Regular infantry & tanks: adjacent row or column
            const rDiff = Math.abs(selectedBoardUnit.r - r);
            const cDiff = Math.abs(selectedBoardUnit.c - c);
            isRangeValid = (rDiff <= 1 && cDiff <= 1);
          }
        }

        if (!isRangeValid) {
          if (clickedUnit.id === 'hq_opponent') {
            addLog(`HQ out of range. ${selectedUnit.name} must advance to the Frontline (Row 2) to strike the HQ!`, "SYSTEM");
          } else {
            addLog(`Target out of strategic range for ${selectedUnit.name}.`, "SYSTEM");
          }
          setSelectedBoardUnit(null);
          return;
        }

        // Camouflage checks (Line 1 camouflage: cannot be targeted by ranged/artillery attacks until it attacks)
        const isRangedAttack = selectedUnit.unitType === 'Aircraft' || selectedUnit.unitType === 'Artillery';
        if (clickedUnit.camouflage && isRangedAttack) {
          addLog(`TACTICAL BLOCK! Kẻ địch ${clickedUnit.name} đang ẩn nấp ngụy trang kỹ càng, không thể bị khóa mục tiêu từ xa!`, "SYSTEM");
          setSelectedBoardUnit(null);
          return;
        }

        // Execute attack sequence!
        sound.playGunshot();
        const nextGrid = grid.map((row) => [...row]);

        if (clickedUnit.id === 'hq_opponent') {
          // Direct attack on the Enemy Command HQ
          sound.playExplosion();
          const damage = selectedUnit.atk;
          const remainingDefense = Math.max(0, opponentHQ - damage);
          setOpponentHQ(remainingDefense);
          addLog(`DIRECT IMPACT! Allied ${selectedUnit.name} bombarded Enemy HQ for ${damage} damage!`, "HQ");

          nextGrid[selectedBoardUnit.r][selectedBoardUnit.c] = { 
            ...selectedUnit, 
            hasAttackedThisTurn: true, 
            hasMovedOrAttackedThisTurn: true,
            camouflage: false // loses camouflage when attacking
          };
        } else {
          // Combat Resolver
          const attacker = { ...selectedUnit, camouflage: false }; // loses camouflage when attacking
          const defender = { ...clickedUnit };

          resolveCombatEngagement(attacker, defender, selectedBoardUnit, { r, c }, nextGrid, true);
        }

        setPlayerKredits(k => k - selectedUnit.o);
        setGrid(applyAuraBuffs(nextGrid));
        setSelectedBoardUnit(null);
        return;
      }
    }
  };

  const handleCastOrder = (colIdx: number, rowIdx?: number) => {
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
      setPlayerHand((hand) => {
        const idx = hand.findIndex((c) => c.id === selectedOrderCard.id);
        if (idx !== -1) {
          const next = [...hand];
          next.splice(idx, 1);
          return next;
        }
        return hand;
      });
      
      const castedCard = selectedOrderCard;
      setPlayedOrderCard({ card: castedCard, isPlayer: true });
      setTimeout(() => setPlayedOrderCard(null), 2000);

      setSelectedOrderCard(null);
      return;
    }

    let nextGrid = grid.map((row) => [...row]);

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
      const specificTarget = rowIdx !== undefined ? nextGrid[rowIdx][colIdx] : null;
      if (specificTarget) {
        specificTarget.def -= 4;
        if (specificTarget.def <= 0) {
          addLog(`${specificTarget.name} destroyed by direct Napalm Strike!`, 'DEATH');
          nextGrid[rowIdx!][colIdx] = null;
        } else {
          addLog(`${specificTarget.name} hit by Napalm Strike! Took 4 damage.`, 'ORDER');
        }
      } else {
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
      }
    } else if (orderId === 'arvn_order_binh_dinh') {
      // Draw 1 card and give +2 DEF to chosen ARVN unit on column
      let targetUnit = rowIdx !== undefined && nextGrid[rowIdx][colIdx]?.faction === 'ARVN' 
        ? nextGrid[rowIdx][colIdx] 
        : nextGrid.find((row) => row[colIdx]?.faction === 'ARVN')?.[colIdx];
        
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
      // Rapid March: Grants +2 ATK this turn to a friendly selected unit
      const targetUnit = (rowIdx !== undefined && nextGrid[rowIdx][colIdx] && (nextGrid[rowIdx][colIdx]?.faction === 'NVA' || nextGrid[rowIdx][colIdx]?.faction === 'VC'))
        ? nextGrid[rowIdx][colIdx]
        : nextGrid.find((row) => row[colIdx] && (row[colIdx]?.faction === 'NVA' || row[colIdx]?.faction === 'VC'))?.[colIdx];

      if (targetUnit) {
        const currentBase = targetUnit.baseAtk ?? CARD_DATABASE.find((c) => c.id === targetUnit.id)?.atk ?? targetUnit.atk;
        targetUnit.baseAtk = currentBase + 2;
        targetUnit.atk = targetUnit.baseAtk;
        addLog(`Rapid March: Friendly unit ${targetUnit.name} gained +2 ATK this turn.`, 'ORDER');
      } else {
        addLog(`Rapid March cast, but no target friendly PAVN/VC force in Column ${colIdx + 1}.`, 'ORDER');
      }
    } else if (orderId === 'nva_order_nguy_trang') {
      // Foliage Camouflage: Grants Camouflage (+3 max DEF and full heal) to a friendly unit
      const targetUnit = (rowIdx !== undefined && nextGrid[rowIdx][colIdx] && (nextGrid[rowIdx][colIdx]?.faction === 'NVA' || nextGrid[rowIdx][colIdx]?.faction === 'VC'))
        ? nextGrid[rowIdx][colIdx]
        : nextGrid.find((row) => row[colIdx] && (row[colIdx]?.faction === 'NVA' || row[colIdx]?.faction === 'VC'))?.[colIdx];

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
      const enemyUnit = (rowIdx !== undefined && nextGrid[rowIdx][colIdx] && (nextGrid[rowIdx][colIdx]?.faction === 'US' || nextGrid[rowIdx][colIdx]?.faction === 'ARVN'))
        ? nextGrid[rowIdx][colIdx]
        : nextGrid.find((row) => row[colIdx] && (row[colIdx]?.faction === 'US' || row[colIdx]?.faction === 'ARVN'))?.[colIdx];

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
            const currentBase = unit.baseAtk ?? CARD_DATABASE.find((c) => c.id === unit.id)?.atk ?? unit.atk;
            return { 
              ...unit, 
              baseAtk: currentBase + 1,
              atk: currentBase + 1, 
              def: unit.def + 1, 
              maxDef: unit.maxDef + 1 
            };
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
          unitType: 'Infantry',
          rarity: 'Common',
          ability: 'Ambush: First-strike on friendly ground engagements.',
          artworkKeyword: 'vc_guerrilla',
          instanceId: `spawn-tunnel-${Date.now()}-${colIdx}`,
          hasMovedOrAttackedThisTurn: true,
          camouflage: false,
          frozenTurns: 0,
          armor: 0,
          isAmphibious: false,
        };
        addLog(`Cu Chi Tunnel transport breached! Local Guerrilla Cell deployed in Column ${colIdx + 1}.`, 'ORDER');
      } else {
        addLog(`Cu Chi Tunnel transport blocked: Column is already fortified.`, 'SYSTEM');
        setSelectedOrderCard(null);
        return;
      }
    }

    const castedCard = selectedOrderCard;
    setPlayedOrderCard({ card: castedCard, isPlayer: true });
    setTimeout(() => setPlayedOrderCard(null), 2000);

    setPlayerKredits((k) => k - selectedOrderCard.k);
    setPlayerHand((hand) => {
      const idx = hand.findIndex((c) => c.id === selectedOrderCard.id);
      if (idx !== -1) {
        const next = [...hand];
        next.splice(idx, 1);
        return next;
      }
      return hand;
    });
    setGrid(applyAuraBuffs(nextGrid));
    setSelectedOrderCard(null);
  };

  // UNIT DRAG AND DROP REGISTRY (Modern Pointer)
  const handlePointerDownHand = (e: React.PointerEvent<HTMLDivElement>, card: Card) => {
    if (battlePhase !== 'deploy' || currentTurnOwner !== faction) return;
    if (playerKredits < card.k) return; 

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
    if (currentTurnOwner !== faction || battlePhase !== 'deploy') return;
    const isFriendly = playerSideFactions.includes(unit.faction);
    if (!isFriendly || unit.id === 'hq_player') return;
    if (unit.hasMovedOrAttackedThisTurn || unit.frozenTurns > 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    setActiveDrag({
      card: unit,
      sourceType: 'board',
      sourceR: r,
      sourceC: c,
      startX: startX,
      startY: startY,
      currentX: startX,
      currentY: startY,
    });
    setSelectedBoardUnit({ r, c });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (activeDrag) {
        let currentX = e.clientX;
        let currentY = e.clientY;

        // Snapping logic if we are dragging a board unit (Tactical Arrow)
        if (activeDrag.sourceType === 'board' && activeDrag.sourceR !== undefined && activeDrag.sourceC !== undefined) {
          const cells = document.querySelectorAll('[data-grid-r]');
          let snappedCell: { r: number; c: number; rect: DOMRect } | null = null;
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const rect = cell.getBoundingClientRect();
            if (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            ) {
              const r = parseInt(cell.getAttribute('data-grid-r') || '-1');
              const c = parseInt(cell.getAttribute('data-grid-c') || '-1');
              if (r !== -1 && c !== -1) {
                // Check if eligible
                const slot = grid?.[r]?.[c];
                const u = grid?.[activeDrag.sourceR]?.[activeDrag.sourceC];
                let isEligible = false;
                
                if (u && playerKredits >= u.o) {
                  if (!slot) {
                    // Eligible Move
                    const rowDiff = Math.abs(r - activeDrag.sourceR);
                    const colDiff = Math.abs(c - activeDrag.sourceC);
                    isEligible = rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0);
                  } else {
                    // Eligible Attack
                    const isEnemy = opponentSideFactions.includes(slot.faction) || slot.id === 'hq_opponent';
                    if (isEnemy) {
                      if (u.isAir || u.isArtillery) {
                        isEligible = true;
                      } else if (slot.id === 'hq_opponent') {
                        isEligible = activeDrag.sourceR === 1;
                      } else {
                        const rDiff = Math.abs(activeDrag.sourceR - r);
                        const cDiff = Math.abs(activeDrag.sourceC - c);
                        isEligible = (rDiff <= 1 && cDiff <= 1);
                      }
                    }
                  }
                }
                
                if (isEligible) {
                  snappedCell = { r, c, rect };
                }
              }
              break;
            }
          }

          if (snappedCell) {
            currentX = snappedCell.rect.left + snappedCell.rect.width / 2;
            currentY = snappedCell.rect.top + snappedCell.rect.height / 2;
          }
        }

        // Snapping logic if we are dragging a hand unit card over eligible cell
        if (activeDrag.sourceType === 'hand') {
          const cells = document.querySelectorAll('[data-grid-r]');
          let snappedCell: { r: number; c: number; rect: DOMRect } | null = null;
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const rect = cell.getBoundingClientRect();
            if (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            ) {
              const r = parseInt(cell.getAttribute('data-grid-r') || '-1');
              const c = parseInt(cell.getAttribute('data-grid-c') || '-1');
              if (r !== -1 && c !== -1) {
                const slot = grid?.[r]?.[c];
                let isEligible = false;
                if (activeDrag.card.type === 'Order' || activeDrag.card.type === 'Countermeasure') {
                  // Orders can target cells with or without units, but usually we just allow snapping search
                  isEligible = true;
                } else {
                  if (!slot) {
                    const isAirmobile = activeDrag.card.id === 'us_1st_cav_heli';
                    const isScreamingEagles = activeDrag.card.id === 'us_101st_airborne';
                    if (isAirmobile || isScreamingEagles) {
                      isEligible = r === 1 || r === 2;
                    } else {
                      isEligible = r === 2;
                    }
                  }
                }
                if (isEligible) {
                  snappedCell = { r, c, rect };
                }
              }
              break;
            }
          }

          if (snappedCell) {
            currentX = snappedCell.rect.left + snappedCell.rect.width / 2;
            currentY = snappedCell.rect.top + snappedCell.rect.height / 2;
          }
        }

        setActiveDrag(prev => prev ? { ...prev, currentX, currentY } : null);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activeDrag) {
        const cells = document.querySelectorAll('[data-grid-r]');
        let cellNode: Element | null = null;
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const rect = cell.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            cellNode = cell;
            break;
          }
        }

        let dropProcessed = false;
        if (cellNode) {
          const r = parseInt(cellNode.getAttribute('data-grid-r') || '-1');
          const c = parseInt(cellNode.getAttribute('data-grid-c') || '-1');
          
          if (r !== -1 && c !== -1) {
            if (activeDrag.sourceType === 'hand') {
              if (activeDrag.card.type === 'Order' || activeDrag.card.type === 'Countermeasure') {
                setSelectedOrderCard(activeDrag.card);
                handleCastOrder(c, r);
              } else {
                handleDeployHandUnit(activeDrag.card, r, c);
              }
              dropProcessed = true;
            } else if (activeDrag.sourceType === 'board' && activeDrag.sourceR !== undefined && activeDrag.sourceC !== undefined) {
              if (activeDrag.sourceR !== r || activeDrag.sourceC !== c || grid?.[r]?.[c] !== null) {
                handleGridCellClick(r, c);
                dropProcessed = true;
              }
            }
          }
        }
        
        const dist = Math.hypot(activeDrag.currentX - activeDrag.startX, activeDrag.currentY - activeDrag.startY);
        if (dist > 15 && !dropProcessed) {
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
  }, [activeDrag, grid, playerKredits]);

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
    let currentGrid = grid.map((row) => [...row]);
    const isPlayerUS = faction === 'USA';

    // Step 1: Scan and simulate Player forces
    for (let r = 2; r >= 0; r--) {
      for (let c = 0; c < 5; c++) {
        const unit = currentGrid[r][c];
        if (unit && playerSideFactions.includes(unit.faction)) {
          if (unit.hasMovedOrAttackedThisTurn || unit.frozenTurns > 0) continue;
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
          if (blockingUnit && opponentSideFactions.includes(blockingUnit.faction)) {
            // Camouflage check in auto-combat
            const isRanged = unit.unitType === 'Artillery' || unit.unitType === 'Aircraft';
            if (blockingUnit.camouflage && isRanged) {
              addLog(`AUTO-COMBAT CAP: ${unit.name} cannot lock target or bombard camouflaged ${blockingUnit.name}!`, 'SYSTEM');
            } else {
              // FIGHT!
              sound.playGunshot();
              // Deduct Operation Cost
              setPlayerKredits((k) => k - unit.o);

              const attObj = { ...unit, camouflage: false };
              const defObj = { ...blockingUnit };

              resolveCombatEngagement(attObj, defObj, { r, c }, { r: targetRow, c }, currentGrid, true);

              currentGrid = applyAuraBuffs(currentGrid);
              setGrid([...currentGrid]);
            }
          } else {
            // No blocking enemy, MOVE FORWARD!
            // Cost paid
            setPlayerKredits((k) => k - unit.o);
            const isTank = unit.unitType === 'Tank';
            const movingUnit = { 
              ...unit, 
              hasMovedThisTurn: true,
              hasMovedOrAttackedThisTurn: !isTank 
            };
            currentGrid[targetRow][c] = movingUnit;
            currentGrid[r][c] = null;
            addLog(`Allied ${unit.name} advanced forward to operational Line ${3 - targetRow}.`, 'MOVE');

            // Positional/Move triggers check
            checkMoveTriggers(targetRow, c, movingUnit, currentGrid, true);

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
         if (unit && opponentSideFactions.includes(unit.faction)) {
           if (unit.hasMovedOrAttackedThisTurn || unit.frozenTurns > 0) continue;
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
          if (blockingUnit && playerSideFactions.includes(blockingUnit.faction)) {
            // Camouflage check in AI auto-combat
            const isRanged = unit.unitType === 'Artillery' || unit.unitType === 'Aircraft';
            if (blockingUnit.camouflage && isRanged) {
              addLog(`AI AUTO-COMBAT CAP: Enemy ${unit.name} cannot pinpoint camouflaged Allied ${blockingUnit.name}!`, 'SYSTEM');
            } else {
              // FIGHT!
              sound.playGunshot();
              setOpponentKredits((k) => k - unit.o);

              const attObj = { ...unit, camouflage: false };
              const defObj = { ...blockingUnit };

              resolveCombatEngagement(attObj, defObj, { r, c }, { r: targetRow, c }, currentGrid, false);

              currentGrid = applyAuraBuffs(currentGrid);
              setGrid([...currentGrid]);
            }
          } else {
            // MOVE!
            setOpponentKredits((k) => k - unit.o);
            const isTank = unit.unitType === 'Tank';
            const movingUnit = { 
              ...unit, 
              hasMovedThisTurn: true,
              hasMovedOrAttackedThisTurn: !isTank 
            };
            currentGrid[targetRow][c] = movingUnit;
            currentGrid[r][c] = null;
            addLog(`Opponent ${unit.name} slipped forward in the shadows to Line ${targetRow + 1}.`, 'MOVE');

            // Positional/Move triggers check
            checkMoveTriggers(targetRow, c, movingUnit, currentGrid, false);

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
    startNextTurn(faction);
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
    try {
      addLog(`OPPONENT CHANNELS CONNECTED. Enemy commander devising counter-offensive...`, 'SYSTEM');
      await new Promise((res) => setTimeout(res, 1200));

      // Step A: Draw 1 card from deck pool (All card types allowed)
      // Skip draw if AI starts first and it is actually Turn 1 (not possible with current setup as player starts)
      // but let's be robust and respect 1 card draw.
      let currentHand = [...opponentHandRef.current];
      let currentOppDeck = [...opponentDeckRemaining];

      if (currentOppDeck.length > 0) {
        const drawnCard = currentOppDeck.shift()!;
        currentHand.push(drawnCard);
        setOpponentHand(currentHand);
        setOpponentDeckRemaining(currentOppDeck);
        sound.playCardDraw();
        addLog(`Intel report: Opponent drew 1 tactical deployment card.`, 'SYSTEM');
        await new Promise((res) => setTimeout(res, 1000));
      }

      // Set opponent active budget for this turn
      let aiKredits = opponentMaxKreditsRef.current;
      setOpponentKredits(aiKredits);

      let nextGrid = gridRef.current.map((row) => [...row]);

      // Step B: Deploy affordable cards from hand
      for (let i = 0; i < currentHand.length; i++) {
        if (playerHQRef.current <= 0 || opponentHQRef.current <= 0) return;
        const card = currentHand[i];
        if (card && aiKredits >= card.k) {
          if (card.type === 'Unit') {
            let placed = false;
            // Search row 0 (Opponent support row)
            for (let r = 0; r <= 0 && !placed; r++) {
              const checkCols = [0, 1, 3, 4].filter(c => !(c === 2));
              for (const c of checkCols) {
                if (!nextGrid[r][c]) {
                  const newAIUnit: GridUnit = {
                    ...card,
                    instanceId: `ai-unit-${Date.now()}-${Math.random()}`,
                    hasMovedOrAttackedThisTurn: true, // Summoning sickness
                    hasMovedThisTurn: true,
                    hasAttackedThisTurn: true,
                    camouflage: card.id === 'vc_guerrilla_cell' || card.id === 'nva_304th_division' || card.ability?.toLowerCase().includes('camouflage'),
                    frozenTurns: 0,
                    armor: 0,
                    isAmphibious: card.id === 'nva_803rd_riverine' || card.id === 'us_9th_riverines' || card.ability?.toLowerCase().includes('amphibious'),
                  };

                  const deployRes = engineExecuteDeployEffects(
                    card,
                    nextGrid,
                    false,
                    activeTraps,
                    playerSideFactions,
                    opponentSideFactions
                  );

                  if (deployRes.soundEffect === 'explosion') {
                    sound.playExplosion();
                  }
                  if (deployRes.playerHQArmorDiff > 0) {
                    setPlayerHQArmor((a) => a + deployRes.playerHQArmorDiff);
                  }
                  if (deployRes.opponentHQArmorDiff > 0) {
                    setOpponentHQArmor((a) => a + deployRes.opponentHQArmorDiff);
                  }
                  setActiveTraps(deployRes.activeTraps);
                  deployRes.logs.forEach((log) => addLog(log.message, log.tag));

                  // Sync grid from deploy result
                  for (let tr = 0; tr < 5; tr++) {
                    for (let tc = 0; tc < 5; tc++) {
                      nextGrid[tr][tc] = deployRes.nextGrid[tr][tc];
                    }
                  }

                  nextGrid[r][c] = newAIUnit;
                  aiKredits -= card.k;
                  setOpponentKredits(aiKredits);
                  currentHand.splice(i, 1);
                  i--; // shift index down
                  setOpponentHand([...currentHand]);

                  setLastDeployedCell({ r, c, isPlayer: false });
                  setTimeout(() => setLastDeployedCell(null), 1000);

                  sound.playDeploy();
                  addLog(`Enemy deployed: ${card.name} covertly in Sector Row ${r + 1}, Lane ${c + 1}.`, 'DEPLOY');
                  placed = true;
                  nextGrid = applyAuraBuffs(nextGrid);
                  setGrid(nextGrid.map((row) => [...row]));
                  await new Promise((res) => setTimeout(res, 1000));
                  break;
                }
              }
            }
          } else if (card.type === 'Order' || card.type === 'Countermeasure') {
            // Check Player's Radar Trap to counter Enemy Order
            const isRadarCountered = activeTraps.some((t) => t.faction === faction && t.cardId === 'us_trap_radar');
            if (isRadarCountered) {
              sound.playRadioStatic();
              addLog(`COUNTERMEASURE TRIGGERED! Your "Mạng lưới Radar" intercepted and canceled Enemy Order: ${card.name}!`, 'SYSTEM');
              setActiveTraps((traps) => traps.filter((t) => !(t.faction === faction && t.cardId === 'us_trap_radar')));
              aiKredits -= card.k;
              setOpponentKredits(aiKredits);
              currentHand.splice(i, 1);
              i--; // shift index down
              setOpponentHand([...currentHand]);
              await new Promise((res) => setTimeout(res, 1200));
              continue;
            }

            // Validate if order actually has a target before executing
            let hasValidTarget = true; // Assume true for global orders
            const orderId = card.id;
            if (orderId === 'nva_order_hanh_quan' || orderId === 'nva_order_nguy_trang') {
              hasValidTarget = nextGrid.some(row => row.some(u => u && (u.faction === 'NVA' || u.faction === 'VC')));
            } else if (orderId === 'nva_order_bao_vay') {
              hasValidTarget = nextGrid.some(row => row.some(u => u && (u.faction === 'US' || u.faction === 'ARVN')));
            } else if (orderId === 'vc_order_vuon_khong') {
              hasValidTarget = nextGrid.some(row => row.some(u => u && (u.faction === 'VC' || u.faction === 'NVA') && u.def < u.maxDef));
            } else if (orderId === 'vc_order_dia_dao') {
              hasValidTarget = nextGrid[0].some(u => !u) || nextGrid[1].some(u => !u);
            }
            
            if (!hasValidTarget) {
              continue; // Skip playing this order card
            }

            // Deduct kredits and remove from opponent hand
            aiKredits -= card.k;
            setOpponentKredits(aiKredits);
            currentHand.splice(i, 1);
            i--; // shift index down
            setOpponentHand([...currentHand]);

            // Visual overlay activation!
            setPlayedOrderCard({ card, isPlayer: false });
            addLog(`Enemy command executed Tactical Directive: "${card.name}"`, 'ORDER');
            sound.playRadioStatic();
            sound.playExplosion();

            // Wait for display time
            await new Promise((res) => setTimeout(res, 2500));
            setPlayedOrderCard(null);

            // Execute tactical directive action!
            if (orderId === 'nva_order_hanh_quan') {
              let found = false;
              for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 5; c++) {
                  const u = nextGrid[r][c];
                  if (u && (u.faction === 'NVA' || u.faction === 'VC')) {
                    const currentBase = u.baseAtk ?? CARD_DATABASE.find((cd) => cd.id === u.id)?.atk ?? u.atk;
                    u.baseAtk = currentBase + 2;
                    u.atk = u.baseAtk;
                    addLog(`Enemy Rapid March: friendly ${u.name} gained +2 ATK.`, 'ORDER');
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
            } else if (orderId === 'nva_order_nguy_trang') {
              let found = false;
              for (let r = 0; r < 3; r++) {
                 for (let c = 0; c < 5; c++) {
                   const u = nextGrid[r][c];
                   if (u && (u.faction === 'NVA' || u.faction === 'VC')) {
                     u.maxDef += 3;
                     u.def = u.maxDef;
                     u.camouflage = true;
                     addLog(`Enemy Foliage Camouflage: friendly ${u.name} gained +3 Max DEF and camouflage status.`, 'ORDER');
                     found = true;
                     break;
                   }
                 }
                 if (found) break;
               }
            } else if (orderId === 'nva_order_bao_vay') {
              let found = false;
              for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 5; c++) {
                  const u = nextGrid[r][c];
                  if (u && (u.faction === 'US' || u.faction === 'ARVN')) {
                    u.frozenTurns = 2;
                    addLog(`Enemy Surround & Isolate: Allied ${u.name} frozen for 1 turn.`, 'ORDER');
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
            } else if (orderId === 'nva_order_loi_keu_goi') {
              nextGrid = nextGrid.map(row => row.map(u => {
                if (u && (u.faction === 'NVA' || u.faction === 'VC')) {
                  const currentBase = u.baseAtk ?? CARD_DATABASE.find((cd) => cd.id === u.id)?.atk ?? u.atk;
                  return { 
                    ...u, 
                    baseAtk: currentBase + 1,
                    atk: currentBase + 1, 
                    def: u.def + 1, 
                    maxDef: u.maxDef + 1 
                  };
                }
                return u;
              }));
              addLog(`Enemy Emulation Appeal: All active friendly PAVN/VC fighters awarded +1 ATK & +1 DEF.`, 'ORDER');
            } else if (orderId === 'nva_order_xe_doc') {
              let drawnCount = 0;
              while (drawnCount < 2 && currentOppDeck.length > 0) {
                const drawn = currentOppDeck.shift()!;
                currentHand.push(drawn);
                drawnCount++;
              }
              setOpponentDeckRemaining(currentOppDeck);
              setOpponentHand([...currentHand]);
              addLog(`Enemy Truong Son Drive: Dispatched 2 logistics draws to hand.`, 'ORDER');
            } else if (orderId === 'nva_trap_amber') {
              setActiveTraps((traps) => [...traps, { faction: 'NVA', cardId: 'nva_trap_amber' }]);
              addLog(`Enemy Amber Trap primed.`, 'ORDER');
            } else if (orderId === 'vc_order_vuon_khong') {
              let found = false;
              for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 5; c++) {
                  const u = nextGrid[r][c];
                  if (u && (u.faction === 'VC' || u.faction === 'NVA') && u.def < u.maxDef) {
                    const originalCard = CARD_DATABASE.find(item => item.id === u.id);
                    if (originalCard && currentHand.length < 9) {
                      currentHand.push(originalCard);
                      setOpponentHand([...currentHand]);
                      nextGrid[r][c] = null;
                      addLog(`Enemy Scorched Earth: recalled damaged guerrilla ${u.name} back to operational hand.`, 'ORDER');
                      found = true;
                      break;
                    }
                  }
                }
                if (found) break;
              }
            } else if (orderId === 'vc_order_dia_dao') {
              let found = false;
              for (let r = 1; r >= 0; r--) {
                for (let c = 0; c < 5; c++) {
                  if (!nextGrid[r][c]) {
                     nextGrid[r][c] = {
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
                       instanceId: `spawn-tunnel-ai-${Date.now()}-${c}`,
                       hasMovedOrAttackedThisTurn: true,
                       unitType: 'Infantry',
                       camouflage: false,
                       frozenTurns: 0,
                       armor: 0,
                       isAmphibious: false,
                     };
                     addLog(`Enemy Cu Chi Tunnel Transport: deployed Guerrilla Cell inside lane ${c + 1}.`, 'ORDER');
                     found = true;
                     break;
                  }
                }
                if (found) break;
              }
            } else if (orderId === 'us_order_hamlet') {
              setOpponentHQArmor((a) => a + 4);
              addLog(`Enemy casted Fortified Hamlet Program: Enemy HQ base secured +4 Armor.`, 'ORDER');
            } else if (orderId === 'us_order_logistics') {
              aiKredits += 3;
              setOpponentKredits(aiKredits);
              addLog(`Enemy casted Logistical Superiority: Secured +3 temporary Kredits.`, 'ORDER');
            } else if (orderId === 'us_order_briefing') {
              if (playerHand.length > 0) {
                const discardedIdx = Math.floor(Math.random() * playerHand.length);
                const discarded = playerHand[discardedIdx];
                setPlayerHand((hand) => {
                  const next = [...hand];
                  next.splice(discardedIdx, 1);
                  return next;
                });
                addLog(`Enemy Intelligence Briefing: Leaked intelligence! You discarded ${discarded.name}.`, 'ORDER');
              }
            } else if (orderId === 'us_order_chopper') {
              let found = false;
              for (let c = 0; c < 5; c++) {
                if (!nextGrid[1][c]) {
                  nextGrid[1][c] = {
                    id: 'spaw_helitroop',
                    name: '1st Cav Heli-Troop',
                    faction: 'US',
                    k: 0,
                    o: 1,
                    atk: 2,
                    def: 2,
                    maxDef: 2,
                    type: 'Unit',
                    unitType: 'Infantry',
                    rarity: 'Common',
                    ability: 'Heli Dropped tactical backup unit.',
                    artworkKeyword: 'screaming_eagles',
                    instanceId: `spawn-chopper-ai-${Date.now()}-${c}`,
                    hasMovedOrAttackedThisTurn: true,
                    camouflage: false,
                    frozenTurns: 0,
                    armor: 0,
                    isAmphibious: false,
                  };
                  addLog(`Enemy Operation Chopper: deployed Heli-troop inside Line 2, Lane ${c + 1}.`, 'ORDER');
                  found = true;
                  break;
                }
              }
            } else if (orderId === 'us_order_airstrike') {
              let bestCol = 0;
              let maxFriendlyCount = -1;
              for (let c = 0; c < 5; c++) {
                let count = 0;
                for (let r = 0; r < 3; r++) {
                  const u = nextGrid[r][c];
                  if (u && (u.faction === 'NVA' || u.faction === 'VC')) count++;
                }
                if (count > maxFriendlyCount) {
                  maxFriendlyCount = count;
                  bestCol = c;
                }
              }
              for (let r = 0; r < 3; r++) {
                const u = nextGrid[r][bestCol];
                if (u && (u.faction === 'NVA' || u.faction === 'VC')) {
                  u.def -= 2;
                  if (u.def <= 0) {
                    addLog(`Guerrilla ${u.name} in lane ${bestCol + 1} was eliminated in Airstrike.`, 'DEATH');
                    nextGrid[r][bestCol] = null;
                  } else {
                    addLog(`Guerrilla ${u.name} in lane ${bestCol + 1} struck for 2 damage in Airstrike.`, 'ORDER');
                  }
                }
              }
              addLog(`Enemy Napalm Strike support leveled Column ${bestCol + 1}!`, 'ORDER');
            } else if (orderId === 'arvn_order_binh_dinh') {
              let found = false;
              for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 5; c++) {
                  const u = nextGrid[r][c];
                  if (u && u.faction === 'ARVN') {
                    u.def += 2;
                    u.maxDef += 2;
                    addLog(`Enemy Pacification Scheme: ARVN ${u.name} secured +2 DEF.`, 'ORDER');
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
              if (currentOppDeck.length > 0) {
                const drawn = currentOppDeck.shift()!;
                currentHand.push(drawn);
                setOpponentDeckRemaining(currentOppDeck);
                setOpponentHand([...currentHand]);
              }
            } else if (orderId === 'arvn_order_tong_dong_vien') {
              nextGrid = nextGrid.map(row => row.map(u => {
                if (u && u.faction === 'ARVN') return { ...u, def: u.maxDef };
                return u;
              }));
              addLog(`Enemy General Mobilization: All deployed friendly ARVN divisions healed.`, 'ORDER');
            }

            nextGrid = applyAuraBuffs(nextGrid);
            setGrid(nextGrid.map((row) => [...row]));
            await new Promise((res) => setTimeout(res, 1000));
          }
        }
      }

      // Step C: Action already deployed opponent units on the field
      const enemyBattalions: { r: number; c: number }[] = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          const u = nextGrid[r][c];
          const isEnemyUnit = u && opponentSideFactions.includes(u.faction) && u.id !== 'hq_opponent';
          if (isEnemyUnit) {
            enemyBattalions.push({ r, c });
          }
        }
      }

      // Sort battalions from bottom-to-top so units closest to row 2 (Player HQ) operate first!
      enemyBattalions.sort((a, b) => b.r - a.r);

      for (const pos of enemyBattalions) {
        if (playerHQRef.current <= 0 || opponentHQRef.current <= 0) return;
        
        const u = nextGrid[pos.r][pos.c];
        if (!u) continue;
        
        const isTank = u.unitType === 'Tank';
        const canAct = isTank ? (!u.hasMovedThisTurn || !u.hasAttackedThisTurn) : !u.hasMovedOrAttackedThisTurn;
        if (!canAct || u.frozenTurns > 0) {
          if (u.frozenTurns > 0) {
            nextGrid[pos.r][pos.c] = { ...u, frozenTurns: Math.max(0, u.frozenTurns - 1) };
          }
          continue;
        }

        if (aiKredits >= u.o) {
          // Action decision logic
          
          // 1. Can we directly strike the Player HQ?
          // Player HQ is at Row 2, Col 2.
          const isDirectAbovePlayerHQ = pos.r === 1 && pos.c === 2;
          const isNearPlayerHQ = pos.r >= 1 && Math.abs(pos.c - 2) <= 1;

          if (isDirectAbovePlayerHQ || (u.unitType === 'Aircraft' && isNearPlayerHQ) || (u.unitType === 'Artillery' && pos.c === 2)) {
            // Blast player Command base!
            sound.playExplosion();
            const damage = u.atk;
            setPlayerHQ((v) => Math.max(0, v - damage));
            aiKredits -= u.o;
            setOpponentKredits(aiKredits);
            addLog(`BASE CONTACT! Enemy ${u.name} shelled player HQ base for ${damage} damage!`, 'HQ');
            
            nextGrid[pos.r][pos.c] = { ...u, hasAttackedThisTurn: true, hasMovedOrAttackedThisTurn: true };
            setGrid(nextGrid.map((row) => [...row]));
            await new Promise((res) => setTimeout(res, 1000));
            continue;
          }

          // 2. Can we attack any player infantry/tanks blocking directly below?
          let attackTarget: { r: number; c: number } | null = null;
          
          const rowBelow = pos.r + 1;
          if (rowBelow <= 2) {
            const pot = nextGrid[rowBelow][pos.c];
            if (pot && (playerSideFactions.includes(pot.faction) || pot.id === 'hq_player')) {
              // Camouflage check
              const isRanged = u.unitType === 'Aircraft' || u.unitType === 'Artillery';
              if (!(pot.camouflage && isRanged)) {
                attackTarget = { r: rowBelow, c: pos.c };
              }
            }
          }

          // Artillery: check entire column
          if (u.unitType === 'Artillery' && !attackTarget) {
            for (let rowIdx = pos.r + 1; rowIdx <= 2; rowIdx++) {
              const pot = nextGrid[rowIdx][pos.c];
              if (pot && playerSideFactions.includes(pot.faction)) {
                if (!pot.camouflage) {
                  attackTarget = { r: rowIdx, c: pos.c };
                  break;
                }
              }
            }
          }

          // Air planes: attack any friendly target found
          if (u.unitType === 'Aircraft' && !attackTarget) {
            for (let r = 2; r >= 0; r--) {
              for (let c = 0; c < 5; c++) {
                const pot = nextGrid[r][c];
                if (pot && playerSideFactions.includes(pot.faction)) {
                  if (!pot.camouflage) {
                    attackTarget = { r, c };
                    break;
                  }
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
                addLog(`DIRECT IMPACT! Enemy ${u.name} slammed player HQ for ${u.atk} damage.`, 'HQ');
              } else {
                // Combat Resolver
                const attacker = { ...u, camouflage: false };
                const defender = { ...friendlyUnit };

                resolveCombatEngagement(attacker, defender, pos, attackTarget, nextGrid, false);
              }

              nextGrid = applyAuraBuffs(nextGrid);
              setGrid(nextGrid.map((row) => [...row]));
              await new Promise((res) => setTimeout(res, 1000));
              continue;
            }
          }

          // 3. Walk forward downwards if cell below is empty
          const nextRow = pos.r + 1;
          if (nextRow <= 2 && !nextGrid[nextRow][pos.c]) {
            sound.playDeploy();
            const isTank = u.unitType === 'Tank';
            const movingUnit = { 
              ...u, 
              hasMovedThisTurn: true,
              hasMovedOrAttackedThisTurn: !isTank 
            };
            nextGrid[nextRow][pos.c] = movingUnit;
            nextGrid[pos.r][pos.c] = null;
            aiKredits -= u.o;
            setOpponentKredits(aiKredits);
            addLog(`Enemy ${u.name} advanced to Sector Row ${nextRow + 1}, Lane ${pos.c + 1}.`, 'MOVE');

            // Positional/Move triggers check for AI (Punji, Satchel charge...)
            checkMoveTriggers(nextRow, pos.c, movingUnit, nextGrid, false);

            nextGrid = applyAuraBuffs(nextGrid);
            setGrid(nextGrid.map((row) => [...row]));
            await new Promise((res) => setTimeout(res, 1000));
            continue;
          }
        }
      }
    } catch (err) {
      console.error("Opponent AI turn error: ", err);
    } finally {
      // Step D: End Opponent turn, start player turn!
      if (playerHQRef.current <= 0 || opponentHQRef.current <= 0) {
        setBattlePhase('gameover');
      } else {
        setBattlePhase('deploy');
        startNextTurn(faction);
      }
    }
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
    <div 
      className="relative w-full h-screen max-h-screen flex flex-col items-center bg-stone-900 font-mono text-xs overflow-hidden select-none p-2 justify-between"
    >
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
                  {opponentMaxKredits}
                </span>
              </div>
              
              {/* Energy indicator bits */}
              <div className="flex gap-0.5 mt-1.5 justify-center max-w-full flex-wrap">
                {Array.from({ length: opponentMaxKredits }).map((_, id) => (
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
                  {playerMaxKredits}
                </span>
              </div>
              
              {/* Energy indicator bits */}
              <div className="flex gap-0.5 mt-1.5 justify-center max-w-full flex-wrap">
                {Array.from({ length: playerMaxKredits }).map((_, id) => (
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
                    {opponentMaxKredits}
                  </span>
                </div>
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(10, opponentMaxKredits) }).map((_, id) => (
                    <div key={id} className={`w-1.5 h-1 rounded-sm ${id < opponentKredits ? 'bg-red-500 shadow' : 'bg-stone-950'}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Center Action (End Turn / Status) */}
            <div className="flex flex-col items-center shrink-0 px-2 border-x border-stone-800">
              <button
                onClick={() => {
                  if (currentTurnOwner === faction && battlePhase === 'deploy') {
                    setSelectedBoardUnit(null);
                    setSelectedOrderCard(null);
                    setBattlePhase('resolve');
                    const oppFaction = faction === 'USA' ? 'NVA' : 'USA';
                    startNextTurn(oppFaction);
                  }
                }}
                disabled={currentTurnOwner !== faction || battlePhase !== 'deploy'}
                className="px-3 py-1.5 border border-stone-100 bg-stone-950 font-sans font-extrabold text-stone-100 uppercase text-[9px] tracking-widest duration-300 hover:bg-stone-100 hover:text-stone-950 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed leading-none shadow relative active:scale-95 transition-all rounded"
              >
                {currentTurnOwner === faction ? 'END TURN' : 'ENEMY TURN'}
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
                    {playerMaxKredits}
                  </span>
                </div>
                <div className="flex gap-0.5 mt-0.5 justify-end">
                  {Array.from({ length: Math.min(10, playerMaxKredits) }).map((_, id) => (
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
            style={{ backgroundImage: `url(${tableBg})` }}
          >
            {/* Grungy war-room overlays */}
            <div className="absolute inset-0 bg-stone-950/40 pointer-events-none z-0 backdrop-blur-[1px]" />
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
                          const u = grid?.[selectedBoardUnit.r]?.[selectedBoardUnit.c];
                          if (u && playerKredits >= u.o) {
                            if (!slot) {
                              const rowDiff = Math.abs(r - selectedBoardUnit.r);
                              const colDiff = Math.abs(c - selectedBoardUnit.c);
                              isEligibleMove = rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0);
                            } else {
                              const isEnemy = opponentSideFactions.includes(slot.faction) || slot.id === 'hq_opponent';
                              if (isEnemy) {
                                if (u.unitType === 'Aircraft' || u.unitType === 'Artillery') {
                                  isEligibleAttack = true;
                                } else if (slot.id === 'hq_opponent') {
                                  isEligibleAttack = selectedBoardUnit.r === 1;
                                } else {
                                  const rDiff = Math.abs(selectedBoardUnit.r - r);
                                  const cDiff = Math.abs(selectedBoardUnit.c - c);
                                  isEligibleAttack = (rDiff <= 1 && cDiff <= 1);
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

                            {/* Shockwave Stomp Effect on newly deployed cells */}
                            {lastDeployedCell?.r === r && lastDeployedCell?.c === c && (
                              <div 
                                className={`absolute inset-0 pointer-events-none rounded-lg border-2 z-30 animate-ping opacity-90 ${
                                  lastDeployedCell.isPlayer 
                                    ? 'border-emerald-500 bg-emerald-500/10' 
                                    : 'border-red-500 bg-red-500/10'
                                }`} 
                                style={{ animationDuration: '0.8s' }}
                              />
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
              <AnimatePresence>
                {playerHand.map((card, idx) => {
                  const angle = (idx - (playerHand.length - 1) / 2) * 25 / (playerHand.length || 1);
                  const translateY = Math.abs(idx - (playerHand.length - 1) / 2) * 2;

                  return (
                    <motion.div
                      key={`${card.id}-${idx}`}
                      onPointerDown={(e) => handlePointerDownHand(e, card)}
                      initial={{ x: 120, y: 250, rotate: 18, scale: 0.35, opacity: 0 }}
                      animate={{ x: 0, y: translateY, rotate: angle, scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0, y: -100 }}
                      whileHover={{ 
                        scale: 1.18, 
                        y: -32, 
                        rotate: 0,
                        zIndex: 50, 
                        transition: { type: 'spring', stiffness: 450, damping: 20 } 
                      }}
                      transition={{ type: 'spring', stiffness: 130, damping: 16 }}
                      className="relative flex-shrink-0 h-full aspect-[3/4.2] focus:outline-none touch-none cursor-pointer"
                    >
                      {renderCard(card, false, selectedOrderCard?.id === card.id)}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {playerHand.length === 0 && null}
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
                if (currentTurnOwner === faction && battlePhase === 'deploy') {
                  setSelectedBoardUnit(null);
                  setSelectedOrderCard(null);
                  setBattlePhase('resolve');
                  const oppFaction = faction === 'USA' ? 'NVA' : 'USA';
                  startNextTurn(oppFaction);
                }
              }}
              disabled={currentTurnOwner !== faction || battlePhase !== 'deploy'}
              className="w-full border-3 border-stone-100 bg-stone-950 font-sans font-extrabold text-stone-100 uppercase text-center text-sm py-4 tracking-widest duration-300 hover:bg-stone-100 hover:text-stone-950 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed leading-none shadow-2xl active:scale-95 transition-all animate-pulse"
            >
              {currentTurnOwner === faction ? 'END TURN' : 'ENEMY TURN'}
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

      {/* PLAYED ORDER/COUNTERMEASURE CARD VISUAL OVERLAY */}
      {playedOrderCard && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto animate-fadeIn cursor-pointer"
          onClick={() => setPlayedOrderCard(null)}
        >
          <div 
            className="relative p-6 border-3 border-amber-500 bg-stone-900/95 max-w-sm w-full rounded-lg shadow-2xl space-y-4 text-center select-none animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Stamp label */}
            <div className={`absolute top-2 right-2 text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded border uppercase ${playedOrderCard.isPlayer ? 'text-emerald-500 border-emerald-500' : 'text-rose-500 border-rose-500'}`}>
              {playedOrderCard.isPlayer ? 'COMMAND DIRECTIVE' : 'OPPOSING COUNTER'}
            </div>

            <div className="py-2">
              <span className="text-stone-500 text-[9px] uppercase tracking-wider font-bold">TACTICAL RESOLUTION</span>
              <h2 className="text-lg font-black text-amber-500 tracking-wider uppercase mt-1">
                {playedOrderCard.card.name}
              </h2>
            </div>

            {/* Simulated document print artwork block */}
            <div className="w-48 h-28 mx-auto bg-stone-950 border border-stone-800 rounded relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-15 grayscale contrast-125" style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }} />
              <div className="text-[28px] z-10 filter drop-shadow">
                {playedOrderCard.card.type === 'Countermeasure' ? '⚡' : '📜'}
              </div>
            </div>

            <div className="p-2.5 bg-stone-950 rounded border border-stone-850">
              <p className="text-[9.5px] font-medium leading-relaxed uppercase text-stone-300 font-mono">
                {playedOrderCard.card.ability}
              </p>
            </div>

            <div className="text-[7.5px] text-stone-500 uppercase tracking-widest pt-1">
              Click anywhere to dismiss...
            </div>
          </div>
        </div>
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
          {/* SVG Tactical Arrow */}
          {(activeDrag.sourceType === 'board' || (activeDrag.sourceType === 'hand' && (activeDrag.card.type === 'Order' || activeDrag.card.type === 'Countermeasure'))) && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                  <polygon points="0 0, 10 5, 0 10" fill={activeDrag.sourceType === 'hand' ? "#083344" : "#7f1d1d"} />
                </marker>
                <filter id="glow">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={activeDrag.sourceType === 'hand' ? "#083344" : "#450a0a"} floodOpacity="0.8"/>
                </filter>
              </defs>
              <line
                x1={activeDrag.startX}
                y1={activeDrag.startY}
                x2={activeDrag.currentX}
                y2={activeDrag.currentY}
                stroke={activeDrag.sourceType === 'hand' ? "#06b6d4" : "#991b1b"}
                strokeWidth="7"
                strokeDasharray="12,6"
                markerEnd="url(#arrowhead)"
                filter="url(#glow)"
                className="animate-pulse"
              />
            </svg>
          )}

          {/* Floated Ghost Card for Hand Units (Only for Units) */}
          {activeDrag.sourceType === 'hand' && activeDrag.card.type === 'Unit' && (
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
