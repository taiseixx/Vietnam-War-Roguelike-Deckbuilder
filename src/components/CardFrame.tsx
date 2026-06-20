import React from 'react';
import { Card, CardRarity } from '../types';
import { PropagandaPoster } from './PropagandaPoster';
import { motion } from 'motion/react';

interface CardFrameProps {
  card: Card;
  width: number; // The exact pixel width to use when rendering this specific instance
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: (card: Card) => void;
  isDetailed?: boolean; // If true, do not render ability inside the card (used for board/hand vs modal)
  showBadge?: boolean;
}

const getFactionCurrency = (fac: string) => {
  if (fac === 'US' || fac === 'ARVN' || fac === 'USA' || fac === 'US/ARVN') {
    return { bg: '#022c22', border: '#059669', text: '#34d399' }; // emerald
  }
  return { bg: '#450a0a', border: '#dc2626', text: '#f87171' }; // red
};

const getRarityGlow = (rarity: CardRarity) => {
  switch (rarity) {
    case 'Elite': return '0 0 1.5em rgba(245,158,11,0.4)';
    case 'Rare': return '0 0 1em rgba(6,182,212,0.3)';
    case 'Uncommon': return '0 0 0.8em rgba(34,197,94,0.2)';
    default: return '0 0.2em 0.5em rgba(0,0,0,0.5)';
  }
};

const getRarityBorder = (rarity: CardRarity) => {
  switch (rarity) {
    case 'Elite': return '#ef4444'; // red-500
    case 'Rare': return '#d97706'; // amber-600
    case 'Uncommon': return '#0d9488'; // teal-600
    default: return '#44403c'; // stone-700
  }
};

const getFactionShellStyle = (card: Card) => {
  const isHQ = card.id === 'hq_player' || card.id === 'hq_opponent';
  
  switch (card.faction) {
    case 'US':
      const isFullColor = card.k > 3 || card.rarity === 'Elite' || card.rarity === 'Rare' || isHQ;
      return {
        frameClass: isHQ ? "border-amber-600/60" : "border-stone-700/80",
        bgClass: isFullColor 
          ? "bg-[#0B1527] bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E1B4B] text-amber-50" 
          : "bg-[#27321B] text-stone-100",
        titleFont: "font-sans uppercase tracking-tight font-black text-stone-100",
      };
    case 'ARVN':
      return {
        frameClass: "border-stone-400 shadow-[inset_0_3px_6px_rgba(255,255,255,0.7),_inset_0_-3px_5px_rgba(0,0,0,0.35)]",
        bgClass: "bg-gradient-to-br from-[#D4D4D8] via-[#F4F4F5] to-[#A1A1AA] text-stone-950",
        titleFont: "font-serif font-black text-stone-900 border-b border-stone-400/40",
      };
    case 'NVA':
      const isInfantry = card.unitType === 'Infantry' || card.type === 'Order';
      const isAir = card.unitType === 'Aircraft';
      return {
        frameClass: "border-[#821313]",
        bgClass: isInfantry 
          ? "bg-[#7c1414] bg-[radial-gradient(circle_at_center,_#901616_0%,_#540404_100%)] text-red-50" 
          : isAir
            ? "bg-[#115591] bg-[radial-gradient(circle_at_center,_#166BB7_0%,_#09345C_100%)] text-indigo-50"
            : "bg-[#19163b] bg-[radial-gradient(circle_at_center,_#242054_0%,_#0B091B_100%)] text-slate-100",
        titleFont: "font-sans tracking-wide font-black text-yellow-50",
      };
    case 'VC':
      return {
        frameClass: "border-[#8d5d11]",
        bgClass: "bg-gradient-to-b from-[#8C1313] via-[#101010] to-[#124B8C] text-stone-100",
        titleFont: "font-typewriter font-extrabold text-stone-100 uppercase",
      };
    default:
      return {
        frameClass: "border-stone-800",
        bgClass: "bg-stone-950 text-stone-100",
        titleFont: "font-mono font-bold text-stone-100",
      };
  }
};

const renderUS_SSI = (card: Card) => {
  if (card.artworkKeyword === 'huey' || card.name.includes('Cav') || card.id.includes('cav') || card.name.includes('Airmobile')) {
    return (
      <svg style={{ width: '2.5em', height: '2.6em', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }} viewBox="0 0 30 36" fill="none">
        <path d="M 0 6 A 6 6 0 0 0 6 12 L 24 12 A 6 6 0 0 0 30 6 Q 15 36 0 6" fill="#F4D03F" stroke="#111" strokeWidth="1.5"/>
        <line x1="4" y1="4" x2="26" y2="26" stroke="#111" strokeWidth="3.5"/>
        <path d="M 12 11 Q 14 6 18 8 L 22 11 L 18 16 Q 14 16 12 13 Z" fill="#111"/>
      </svg>
    );
  } else if (card.artworkKeyword === 'screaming_eagles' || card.name.includes('101st') || card.id.includes('airborne') || card.name.includes('Eagles')) {
    return (
      <svg style={{ width: '2.5em', height: '2.6em', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }} viewBox="0 0 30 36" fill="none">
        <path d="M 3 6 L 27 6 L 27 24 Q 15 36 3 24 Z" fill="#1B4F72" stroke="#111" strokeWidth="1.5"/>
        <rect x="3" y="1" width="24" height="6" fill="#922B21" rx="1"/>
        <circle cx="15" cy="18" r="8" fill="#FFF" stroke="#111" strokeWidth="0.5"/>
        <path d="M 18 19 L 24 20 L 20 22 C 18 22 17 21 17 19" fill="#F1C40F"/>
        <circle cx="13" cy="16" r="1.2" fill="#000"/>
      </svg>
    );
  } else {
    return (
      <svg style={{ width: '2.5em', height: '2.6em', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }} viewBox="0 0 30 36" fill="none">
        <path d="M 0 6 L 15 1 L 30 6 L 30 24 Q 15 36 0 24 Z" fill="#2E4053" stroke="#BA4A00" strokeWidth="1.5" />
        <path d="M 18 8 L 10 18 L 16 18 L 12 28 L 22 16 L 16 16 Z" fill="#F1C40F" stroke="#111" strokeWidth="0.5"/>
      </svg>
    );
  }
};

const renderARVN_badge = (card: Card) => {
  if (card.name.includes('Ranger') || card.id.includes('ranger') || card.id.includes('spec_ops') || card.id.includes('specops')) {
    return (
      <svg style={{ width: '2.5em', height: '2.5em', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" fill="#E67E22" stroke="#222" strokeWidth="1.5"/>
        <path d="M 6 16 Q 16 26 26 16 M 8 13 Q 16 7 24 13 M 12 16 H 20" stroke="#111" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="16" cy="11" r="2" fill="#000"/>
        <path d="M 13 18 L 14 21 L 15 18 M 17 18 L 18 21 L 19 18" fill="#FFF" stroke="#222" strokeWidth="0.5"/>
      </svg>
    );
  } else if (card.name.includes('Airborne') || card.name.includes('regulars') || card.name.includes('1st Infantry')) {
    return (
      <svg style={{ width: '2.5em', height: '2.5em', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }} viewBox="0 0 32 32" fill="none">
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
    return (
      <svg style={{ width: '2.5em', height: '2.5em', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" fill="#27AE60" stroke="#F1C40F" strokeWidth="1.5"/>
        <line x1="16" y1="6" x2="16" y2="26" stroke="#F1C40F" strokeWidth="3"/>
        <path d="M 8 14 Q 16 24 24 14" stroke="#F1C40F" strokeWidth="2.5" fill="none"/>
        <line x1="11" y1="10" x2="21" y2="20" stroke="#FFF" strokeWidth="1.5"/>
      </svg>
    );
  }
};

const renderNVA_BranchInsignia = (card: Card) => {
  if (card.artworkKeyword === 'sapper' || card.name.includes('Sapper') || card.id.includes('sapper')) {
    return (
      <svg style={{ width: '2.2em', height: '2.2em', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))' }} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="14" width="16" height="6" fill="#D4AC0D" stroke="#111" strokeWidth="1"/>
        <line x1="12" y1="2" x2="12" y2="16" stroke="#B2BABB" strokeWidth="2.5"/>
        <line x1="7" y1="16" x2="17" y2="16" stroke="#D4AC0D" strokeWidth="1.5"/>
      </svg>
    );
  } else if (card.unitType === 'Artillery' || card.artworkKeyword === 'machine_gun' || card.name.includes('Artillery')) {
    return (
      <svg style={{ width: '2.2em', height: '2.2em', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))' }} viewBox="0 0 24 24" fill="none">
        <line x1="4" y1="4" x2="20" y2="20" stroke="#D4AC0D" strokeWidth="3" strokeLinecap="round"/>
        <line x1="4" y1="20" x2="20" y2="4" stroke="#D4AC0D" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="3" fill="#FFF" stroke="#111" strokeWidth="1"/>
      </svg>
    );
  } else {
    return (
      <svg style={{ width: '2.2em', height: '2.2em', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))' }} viewBox="0 0 24 24" fill="none">
        <line x1="4" y1="4" x2="20" y2="20" stroke="#D4AC0D" strokeWidth="2" strokeLinecap="round"/>
        <line x1="4" y1="20" x2="20" y2="4" stroke="#B2BABB" strokeWidth="1.5" strokeLinecap="round"/>
        <polygon points="12,5 14,10 19,10 15,13 17,18 12,15 7,18 9,13 5,10 10,10" fill="#D4AC0D" stroke="#111" strokeWidth="0.5"/>
      </svg>
    );
  }
};

const renderVCMedallion = (card: Card) => {
  if (card.id === 'vc_order_vuon_khong' || card.id === 'vc_order_dia_dao') {
    return (
      <svg style={{ width: '2.5em', height: '2.5em', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" fill="#C0392B" stroke="#D4AC0D" strokeWidth="2"/>
        <polygon points="16,4 19,11 26,11 21,16 23,23 16,19 9,23 11,16 6,11 13,11" fill="#D4AC0D" stroke="#111" strokeWidth="0.5"/>
      </svg>
    );
  } else {
    return (
      <svg style={{ width: '2.5em', height: '2.5em', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }} viewBox="0 0 32 32" fill="none">
        <path d="M 4 8 L 16 2 L 28 8 L 28 22 Q 16 30 4 22 Z" fill="#D35400" stroke="#F1C40F" strokeWidth="1.5"/>
        <path d="M 10 16 Q 16 8 22 16 L 20 18 Q 16 14 12 18 Z" fill="#2C3E50" stroke="#111" strokeWidth="0.5"/>
        <polygon points="16,3 17,6 20,6 18,8 19,11 16,9 13,11 14,8 12,6 15,6" fill="#F1C40F"/>
      </svg>
    );
  }
};

export const CardFrame: React.FC<CardFrameProps> = ({ 
  card, 
  width, 
  isSelected = false, 
  isDisabled = false, 
  onClick,
  isDetailed = false,
  showBadge = true
}) => {
  const isHQ = card.id === 'hq_player' || card.id === 'hq_opponent';
  const currency = getFactionCurrency(card.faction);
  const shellStyle = getFactionShellStyle(card);
  const rarityGlow = getRarityGlow(card.rarity);
  
  const baseFontSize = width * 0.055;
  const height = width * 1.4;

  const cardStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    fontSize: `${baseFontSize}px`,
    boxShadow: isSelected ? '0 0.5em 1.5em rgba(0,0,0,0.5), ' + rarityGlow : '0 0.2em 0.5em rgba(0,0,0,0.3), ' + rarityGlow,
    borderColor: isSelected ? '#38bdf8' : getRarityBorder(card.rarity),
    borderWidth: '0.15em',
    borderStyle: 'solid',
    transform: isSelected ? 'scale(1.02)' : 'none',
    opacity: isDisabled ? 0.6 : 1,
    filter: isDisabled ? 'grayscale(0.6)' : 'none',
    cursor: onClick && !isDisabled ? 'pointer' : 'default',
  };

  return (
    <div 
      className={`relative flex flex-col justify-between overflow-hidden rounded-[0.4em] transition-all duration-200 select-none ${shellStyle.bgClass}`}
      style={cardStyle}
      onClick={() => onClick && !isDisabled && onClick(card)}
    >
      {/* Cost & Type Header */}
      {!isHQ && (
        <div className="absolute top-[0.4em] left-[0.4em] right-[0.4em] flex justify-between z-10 pointer-events-none">
          <div 
            className="flex items-center rounded-full font-mono font-bold leading-none"
            style={{ 
              backgroundColor: currency.bg, 
              color: currency.text, 
              boxShadow: '0 0.1em 0.3em rgba(0,0,0,0.5)',
              border: `0.1em solid ${currency.border}`,
              padding: '0.25em 0.5em',
              fontSize: '1em'
            }}
          >
            {card.k} | {card.o}
          </div>

          <div 
            className="flex items-center rounded bg-stone-950/90 text-stone-300 font-mono font-bold uppercase tracking-widest leading-none border border-stone-800"
            style={{ 
              padding: '0.3em 0.5em',
              fontSize: '0.75em'
            }}
          >
            {card.type}
          </div>
        </div>
      )}

      {/* Title & Insignia below header */}
      <div className="absolute top-[2.2em] left-[0.4em] right-[0.4em] z-10 flex flex-col items-center pointer-events-none space-y-[0.2em]">
        {showBadge && !isHQ && (
          <div className="flex justify-center flex-shrink-0">
            {card.faction === 'US' && renderUS_SSI(card)}
            {card.faction === 'ARVN' && renderARVN_badge(card)}
            {card.faction === 'NVA' && renderNVA_BranchInsignia(card)}
            {card.faction === 'VC' && card.type === 'Order' && renderVCMedallion(card)}
          </div>
        )}
      </div>
      
      {/* Top Banner (Visual Only) */}
      <div 
        className="relative flex-none aspect-[4/3] w-full shrink-0 border-b border-stone-900 pointer-events-none"
        style={{
          filter: card.faction === 'VC' ? 'grayscale(1) brightness(1.1) sepia(0.3)' : 
                 card.faction === 'ARVN' ? 'contrast(1.1) brightness(0.95) sepia(0.2)' : 'none'
        }}
      >
        <PropagandaPoster keyword={card.artworkKeyword} faction={card.faction} name={card.name} artConfig={card.artConfig} />
        <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/dust.png')]" />
      </div>

      <div className="flex-grow flex flex-col justify-between" style={{ padding: '0.4em 0.4em 0.2em 0.4em' }}>
        <div className="text-center">
          <div className={`${shellStyle.titleFont} leading-tight text-center`} style={{ fontSize: '1.2em' }}>
            {card.name}
          </div>
          {/* Simple Keyword line */}
          {!isDetailed && card.ability && (
            <div className="text-stone-300 font-typewriter italic leading-tight mt-[0.2em]" style={{ fontSize: '0.8em' }}>
              {card.ability.split(':')[0]} {/* Show only the prefix keyword before colon */}
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div 
          className="grid grid-cols-3 bg-stone-100 text-stone-950 font-bold items-center divide-x divide-stone-300 border border-stone-300"
          style={{ borderRadius: '0.2em', fontSize: '1.4em', margin: '0.2em 0' }}
        >
          <div className="flex flex-col items-center">
            <span style={{ fontSize: '0.4em', color: '#6b7280', fontWeight: 900 }}>ATK</span>
            <span style={{ marginTop: '-0.1em' }} className="text-amber-700">{card.atk}</span>
          </div>
          <div className="flex flex-col items-center">
            <span style={{ fontSize: '0.4em', color: '#6b7280', fontWeight: 900 }}>UNIT</span>
            <span style={{ fontSize: '0.6em' }}>
              {isHQ ? 'HQ' : 
               card.unitType === 'Infantry' ? 'INF' : 
               card.unitType === 'Tank' ? 'TNK' : 
               card.unitType === 'Aircraft' ? 'AIR' : 
               card.unitType === 'Artillery' ? 'ART' : 'ORD'}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span style={{ fontSize: '0.4em', color: '#6b7280', fontWeight: 900 }}>DEF</span>
            <span style={{ marginTop: '-0.1em' }} className="text-emerald-700">{card.def}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

