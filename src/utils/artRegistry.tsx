import React from 'react';

export const ART_ICON_REGISTRY: Record<string, (bgAccent: string, primaryColor: string) => React.ReactNode> = {
  'star': (bgAccent) => <polygon points="50,30 52,36 58,36 53,39 55,45 50,42 45,45 47,39 42,36 48,36" fill={bgAccent} />,
  'crosshairs': (bgAccent) => <g stroke={bgAccent} strokeWidth="1"><circle cx="50" cy="35" r="10" fill="none" /><line x1="40" y1="35" x2="60" y2="35" /><line x1="50" y1="25" x2="50" y2="45" /></g>,
  'shield': (bgAccent) => <g stroke={bgAccent} strokeWidth="2" fill="none"><polygon points="40,25 60,25 60,35 50,45 40,35" /></g>,
  'wings': (bgAccent) => <path d="M 30,35 Q 40,25 50,35 Q 60,25 70,35 Q 60,40 50,38 Q 40,40 30,35" fill="none" stroke={bgAccent} strokeWidth="2" />,
  'bomb': (bgAccent) => <g fill={bgAccent}><circle cx="50" cy="38" r="7" /><rect x="48" y="30" width="4" height="4" /><path d="M 50,30 Q 55,25 55,20" fill="none" stroke={bgAccent} strokeWidth="1" strokeDasharray="1,1" /></g>,
  'skull': (bgAccent, primaryColor) => <g fill={bgAccent}><circle cx="50" cy="33" r="6" /><rect x="47" y="38" width="6" height="4" /><circle cx="47" cy="33" r="1.5" fill={primaryColor} /><circle cx="53" cy="33" r="1.5" fill={primaryColor} /></g>,
  'radio': (bgAccent) => <g stroke={bgAccent} strokeWidth="1" fill="none"><rect x="42" y="30" width="16" height="15" rx="1" /><circle cx="46" cy="38" r="2" /><line x1="44" y1="30" x2="44" y2="20" /><path d="M 40,15 A 8,8 0 0 1 48,15 M 38,12 A 12,12 0 0 1 50,12" strokeWidth="0.5" /></g>,
  'flag': (bgAccent) => <g stroke={bgAccent} strokeWidth="1.5"><line x1="40" y1="45" x2="40" y2="25" /><polygon points="40,25 60,30 40,35" fill={bgAccent} /></g>
};

export function getOverlayIconElement(id?: string, bgAccent: string = '#CBBF99', primaryColor: string = '#3E4E30'): React.ReactNode | null {
  if (!id) return null;
  const renderer = ART_ICON_REGISTRY[id];
  return renderer ? renderer(bgAccent, primaryColor) : null;
}
