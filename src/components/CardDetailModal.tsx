import React, { useEffect } from 'react';
import { Card, Faction } from '../types';
import { PropagandaPoster } from './PropagandaPoster';
import { X, Globe, Shield, Swords, ShieldAlert, Award, Compass } from 'lucide-react';

interface CardDetailModalProps {
  card: Card | null;
  onClose: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({ card, onClose }) => {
  // Listen to Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!card) return null;

  // Helper inside detail
  const getFactionCurrency = (fac: string) => {
    if (fac === 'US' || fac === 'ARVN' || fac === 'USA' || fac === 'US/ARVN') {
      return { symbol: '$', name: 'US Dollars Budget', color: 'text-emerald-400 bg-emerald-950/90 border-emerald-500/40' };
    }
    return { symbol: '🎫', name: 'Ration Coupons', color: 'text-red-400 bg-red-950/90 border-red-500/40' };
  };

  const getUnitClassSymbol = (unit: Card) => {
    if (unit.id === 'hq_player' || unit.id === 'hq_opponent') return '⭐';
    const idLower = unit.id?.toLowerCase() || '';
    if (idLower.includes('chopper') || idLower.includes('huey') || idLower.includes('mig') || idLower.includes('air') || idLower.includes('sky')) return '🚁';
    if (idLower.includes('arty') || idLower.includes('artillery') || idLower.includes('howitzer')) return '💥';
    if (idLower.includes('tank') || idLower.includes('patton') || idLower.includes('apc') || idLower.includes('acav') || idLower.includes('armoured') || idLower.includes('armored')) return '🚜';
    return '🪖';
  };

  const currency = getFactionCurrency(card.faction);
  const isHQ = card.id === 'hq_player' || card.id === 'hq_opponent';
  const isUS = card.faction === 'US';

  return (
    <div 
      className="fixed inset-0 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="relative bg-stone-900 border border-stone-880 rounded-xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl text-stone-300 font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE BUTTON */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-500 hover:text-white p-1 rounded-full hover:bg-stone-850 duration-200 z-20 cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* LEFT VIEW: ENLARGED AUTHENTIC CARD VIEW */}
        <div className="p-6 md:p-8 flex items-center justify-center bg-stone-950/60 md:w-[45%] border-b md:border-b-0 md:border-r border-stone-850">
          <div className="relative w-52 h-76 md:w-56 md:h-80 rounded-xl overflow-hidden border-2 border-stone-700 bg-stone-950 shadow-2xl flex flex-col justify-between">
            {/* Top Bar Overlay */}
            {!isHQ && (
              <div className="absolute top-2 left-2 z-10 flex gap-2">
                <span className={`text-[11px] font-black px-2 py-0.5 rounded border shadow-lg ${currency.color}`}>
                  {currency.symbol}{card.k}
                </span>
              </div>
            )}
            <div className="absolute top-2 right-2 z-10">
              <span className={`text-[8px] px-1.5 py-0.5 border rounded font-black shadow-lg font-mono uppercase tracking-widest ${
                isHQ 
                  ? card.faction === 'US' 
                    ? 'bg-amber-950/95 border-amber-500/50 text-amber-400' 
                    : 'bg-red-950/95 border-red-500/50 text-red-400'
                  : 'bg-stone-950/90 border-stone-850 text-stone-400'
              }`}>
                {isHQ ? 'HQ SITE' : card.type}
              </span>
            </div>

            {/* Poster Artwork */}
            <div className="aspect-[4/3] w-full border-b border-stone-950 shrink-0">
              <PropagandaPoster keyword={card.artworkKeyword} faction={card.faction} name={card.name} />
            </div>

            {/* Stats body */}
            <div className="p-3 bg-stone-900 flex-grow flex flex-col justify-between items-stretch gap-1">
              <div>
                <h3 className="font-extrabold text-stone-100 text-xs md:text-sm font-sans tracking-wide leading-tight">
                  {card.name}
                </h3>
                {/* Operation Cost */}
                {!isHQ ? (
                  <div className="text-[9px] text-amber-500 uppercase font-black opacity-90 mt-1 tracking-wider">
                    Op Cost: {card.o} {currency.symbol}
                  </div>
                ) : (
                  <div className="text-[9px] text-amber-500 uppercase font-black opacity-90 mt-1 tracking-wider">
                    {card.faction === 'US' ? 'Saigon Command Zone' : 'Hanoi Front Sector'}
                  </div>
                )}
              </div>

              {/* Description Block */}
              <p className="text-[9.5px] text-stone-300 font-typewriter leading-tight line-clamp-3 min-h-[38px] my-1 border-t border-stone-850/50 pt-1.5">
                {card.ability}
              </p>

              {/* Stats Bar */}
              {card.type === 'Unit' ? (
                <div className="grid grid-cols-3 bg-stone-100 text-stone-950 font-black text-center text-[11px] border border-stone-300 rounded-md shadow-md items-center divide-x divide-stone-300 py-0.5 z-10 select-none">
                  <span className="text-red-700 flex items-center justify-center gap-0.5 font-extrabold">{card.atk}</span>
                  <span className="text-[9px] flex items-center justify-center py-0.5">{getUnitClassSymbol(card)}</span>
                  <span className="text-emerald-800 flex items-center justify-center gap-0.5 font-extrabold">{card.def}</span>
                </div>
              ) : (
                <div className="text-center py-0.5 bg-cyan-950/70 border border-cyan-800/40 text-cyan-400 text-[8.5px] font-black uppercase tracking-widest rounded shadow-sm">
                  ⚡ TACTICAL DIRECTIVE
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT VIEW: RICH SPECS DETAILED LIST */}
        <div className="p-6 md:p-8 flex-grow flex flex-col justify-between gap-6 overflow-y-auto max-h-[50vh] md:max-h-none">
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest flex items-center gap-1.5 font-typewriter">
                ● OPERATIONS INTELLIGENCE BRIEFING
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider font-heading mt-1">
                {card.name}
              </h2>
            </div>

            {/* Speccing Table */}
            <div className="space-y-2 border-t border-b border-stone-800 py-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-500 uppercase font-bold flex items-center gap-1">
                  <Globe size={13} /> Faction Affiliation:
                </span>
                <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                  card.faction === 'US' || card.faction === 'ARVN' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/80 text-red-400 border border-red-800/40'
                }`}>
                  {card.faction === 'US' ? '🇺🇸 US ARMY (ALLIES)' : card.faction === 'ARVN' ? '🇻🇳 ARVN REGULAR' : card.faction === 'VC' ? '🇻🇳 VIET CONG GUERRILLA' : '🇻🇳 NVA DIVISION'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-500 uppercase font-bold flex items-center gap-1">
                  <Shield size={13} /> Military Type:
                </span>
                <span className="text-stone-200 font-bold uppercase text-[11px] font-heading tracking-widest">
                  {card.type === 'Unit' ? 'Active Unit Battalion' : 'Tactical Order Command'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-500 uppercase font-bold flex items-center gap-1">
                  <Award size={13} /> Production Rarity:
                </span>
                <span className={`text-xs font-black ${
                  card.rarity === 'Elite' ? 'text-amber-400 animate-pulse' : card.rarity === 'Rare' ? 'text-cyan-400' : 'text-stone-400'
                }`}>
                  ✦ {card.rarity.toUpperCase()} COMMANDER SECT
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-500 uppercase font-bold flex items-center gap-1">
                  <Swords size={13} /> Kredit Deploy Cost:
                </span>
                <span className="text-stone-100 font-black">
                  {card.k} {currency.name}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-500 uppercase font-bold flex items-center gap-1">
                  <Compass size={13} /> Field Operation Cost:
                </span>
                <span className="text-stone-100 font-black">
                  {card.o} {currency.symbol} per action
                </span>
              </div>
            </div>

            {/* Strategic Directive Description */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-stone-500 uppercase font-bold">Tactical Ability & Impact Summary:</span>
              <div className="bg-stone-950 p-3 rounded-lg border border-stone-850 font-typewriter text-[11px] leading-relaxed text-amber-500/90 whitespace-pre-wrap">
                {card.ability}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 border border-stone-700 bg-stone-850 hover:bg-stone-800 hover:border-amber-500 hover:text-amber-400 duration-250 rounded font-extrabold uppercase tracking-widest text-xs cursor-pointer text-center font-heading"
          >
            ← Resume Operations
          </button>
        </div>
      </div>
    </div>
  );
};
