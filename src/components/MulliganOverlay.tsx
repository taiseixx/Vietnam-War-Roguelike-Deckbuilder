import React, { useState, useEffect } from 'react';
import { Card } from '../types';
import { PropagandaPoster } from './PropagandaPoster';
import { CardFrame } from './CardFrame';
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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const fn = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

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
      <div className="absolute top-4 w-full px-4 flex flex-col md:flex-row justify-between items-start md:items-center z-10 pointer-events-none">
        <div className="font-mono text-[10px] sm:text-xs text-stone-500 tracking-wider">
          STATUS CODE: MULLIGAN_STATE_ALPHA
        </div>
        <div className="font-mono text-[10px] sm:text-xs text-red-500 tracking-wider animate-pulse pt-1 md:pt-0">
          ● TACTICAL DECISION
        </div>
      </div>

      <div className="max-w-4xl text-center space-y-2 mb-8">
        <h1 className="text-3xl md:text-5xl font-mono tracking-tight text-amber-500 font-bold uppercase">
          Universal Mulligan Phase
        </h1>
        <p className="text-stone-400 font-mono text-xs md:text-sm max-w-2xl mx-auto">
          Discard unwanted command cards to configure your opening offensive. Select any number of cards below to shuffle back into your logistics registry for redrafting (Once per battle).
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 md:gap-6 w-full max-w-5xl px-4 select-none mb-10">
        {initialHand.map((card, idx) => {
          const isSelected = selectedIndices.includes(idx);
          const cardWidth = Math.min(180, (windowWidth - 48) / 2); // 2 columns minimum on small screens
          
          return (
            <div key={`${card.id}-${idx}`} className="relative">
              <CardFrame
                card={card}
                width={cardWidth}
                isSelected={isSelected}
                onClick={() => handleToggleCard(idx)}
              />
              {/* Selection indicator overlay */}
              {isSelected && (
                <div className="absolute inset-x-0 bottom-4 flex flex-col items-center justify-center pointer-events-none z-50">
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
