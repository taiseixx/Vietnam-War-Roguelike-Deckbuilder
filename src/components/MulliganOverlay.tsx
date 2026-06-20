import React, { useState } from 'react';
import { Card } from '../types';
import { PropagandaPoster } from './PropagandaPoster';
import { sound } from '../utils/sound';

interface MulliganOverlayProps {
  initialHand: Card[];
  onConfirmMulligan: (cardsToKeep: Card[], cardsToSwap: Card[]) => void;
}

export const MulliganOverlay: React.FC<MulliganOverlayProps> = ({
  initialHand,
  onConfirmMulligan,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const handleToggleCard = (idx: number) => {
    sound.playCardDraw();
    setSelectedIndices((prev) =>
      prev.includes(idx)
        ? prev.filter((i) => i !== idx)
        : [...prev, idx]
    );
  };

  const handleConfirm = () => {
    sound.playRadioStatic();
    const cardsToSwap = initialHand.filter((_, idx) => selectedIndices.includes(idx));
    const cardsToKeep = initialHand.filter((_, idx) => !selectedIndices.includes(idx));
    onConfirmMulligan(cardsToKeep, cardsToSwap);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 md:p-8 backdrop-blur-md">
      {/* Decorative tactical design element */}
      <div className="absolute top-4 left-4 font-mono text-xs text-stone-500 tracking-wider">
        STATUS CODE: MULLIGAN_STATE_ALPHA
      </div>
      <div className="absolute top-4 right-4 font-mono text-xs text-red-500 tracking-wider animate-pulse">
        ● TACTICAL DECISION
      </div>

      <div className="max-w-4xl text-center space-y-2 mb-8">
        <h1 className="text-3xl md:text-5xl font-mono tracking-tight text-amber-500 font-bold uppercase">
          Universal Mulligan Phase
        </h1>
        <p className="text-stone-400 font-mono text-xs md:text-sm max-w-2xl mx-auto">
          Discard unwanted command cards to configure your opening offensive. Select any number of cards below to shuffle back into your logistics registry for redrafting (Once per battle).
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-5xl px-4 select-none mb-10">
        {initialHand.map((card, idx) => {
          const isSelected = selectedIndices.includes(idx);
          return (
            <div
              key={`${card.id}-${idx}`}
              onClick={() => handleToggleCard(idx)}
              className={`relative cursor-pointer group rounded-lg overflow-hidden border transition-all duration-300 transform ${
                isSelected
                  ? 'border-amber-500 scale-102 ring-2 ring-amber-500/30'
                  : 'border-stone-800 hover:border-stone-600 scale-100 hover:-translate-y-1'
              }`}
            >
              {/* Card Rarity Indicator Badge */}
              <div
                className={`absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shadow-md ${
                  card.rarity === 'Elite'
                    ? 'bg-red-500 text-white'
                    : card.rarity === 'Rare'
                    ? 'bg-amber-600 text-stone-900'
                    : card.rarity === 'Uncommon'
                    ? 'bg-teal-600 text-white'
                    : 'bg-stone-700 text-stone-300'
                }`}
              >
                {card.rarity}
              </div>

              {/* Poster Artwork render */}
              <div className="aspect-[4/3] w-full">
                <PropagandaPoster keyword={card.artworkKeyword} faction={card.faction} name={card.name} artConfig={card.artConfig} />
              </div>

              {/* Card Stats & Details */}
              <div className="p-3 bg-stone-950 font-mono text-xs text-stone-300 border-t border-stone-850">
                <div className="flex justify-between items-start gap-1 mb-1">
                  <span className="font-bold text-amber-100 truncate group-hover:text-amber-400">
                    {card.name}
                  </span>
                  <span className="shrink-0 text-[10px] bg-stone-800 px-1 py-0.5 rounded text-amber-500">
                    K:{card.k}
                  </span>
                </div>

                <div className="flex gap-2 text-[10px] text-stone-500 mb-2">
                  <span className="text-blue-400">O:{card.o}</span>
                  {card.type === 'Unit' && (
                    <>
                      <span className="text-red-400">ATK:{card.atk}</span>
                      <span className="text-emerald-400">DEF:{card.def}</span>
                    </>
                  )}
                  <span className="ml-auto text-[9px] bg-stone-900 px-1 text-stone-400">
                    {card.faction}
                  </span>
                </div>

                <p className="text-[10px] leading-relaxed text-stone-400 line-clamp-3">
                  {card.ability}
                </p>
              </div>

              {/* Selection Checkbox indicator overlay */}
              {isSelected && (
                <div className="absolute inset-0 bg-amber-500/10 flex flex-col items-center justify-center pointer-events-none">
                  <div className="bg-amber-500 text-black px-2 py-1 rounded font-mono text-[10px] font-bold uppercase tracking-wider shadow">
                     SWAP OUT
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        className="px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-mono font-black text-sm uppercase tracking-widest rounded-md cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform active:scale-95 flex items-center gap-3 border border-amber-400"
      >
        <span className="tracking-widest">DEPLOY FORCES</span>
        <span className="text-stone-800 text-[10px] bg-amber-200/50 px-1.5 py-0.5 rounded">
          {selectedIndices.length > 0 ? `SWAPPING ${selectedIndices.length}` : 'KEEP ALL'}
        </span>
      </button>
    </div>
  );
};
