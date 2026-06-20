import React from 'react';

interface PropagandaPosterProps {
  keyword: string;
  faction: 'US' | 'NVA' | 'VC' | 'ARVN';
  name: string;
  className?: string;
}

export const PropagandaPoster: React.FC<PropagandaPosterProps> = ({
  keyword,
  faction,
  name,
  className = '',
}) => {
  const isEastern = faction === 'NVA' || faction === 'VC';
  const primaryColor = isEastern ? '#A8201A' : '#3E4E30'; // Crimson vs Olive Drab
  const bgAccent = isEastern ? '#F9C80E' : '#CBBF99'; // Vintage Yellow vs Khaki
  const textColor = isEastern ? '#F9C80E' : '#E8E5DA';

  // Procedural SVG artwork selection based on keyword
  const renderArt = () => {
    switch (keyword) {
      // ----------------- NVA / VC UNITS -----------------
      case 'militia':
        return (
          <>
            <rect width="100" height="70" fill="#A8201A" />
            <circle cx="50" cy="35" r="25" fill="#E2AF13" opacity="0.15" />
            {/* Palm forest silhouette */}
            <path d="M 10,70 L 15,45 L 5,45 M 15,45 L 20,70 M 20,70 L 25,50 M 90,70 L 85,42 L 95,47" stroke="#681512" strokeWidth="2" fill="none" />
            {/* Guerrilla pith helmet silhouette */}
            <path d="M 35,45 Q 50,30 65,45 Q 68,48 50,48 Q 32,48 35,45 Z" fill="#4B583E" />
            <rect x="47" y="48" width="6" height="8" fill="#4B583E" />
            {/* Red Star emblem */}
            <polygon points="50,32 52,37 57,37 53,40 55,45 50,42 45,45 47,40 43,37 48,37" fill="#E2AF13" />
            {/* Slogan */}
            <text x="50" y="62" fill="#E2AF13" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">DU KÍCH ĐỊA PHƯƠNG</text>
          </>
        );

      case 'regulars':
        return (
          <>
            <rect width="100" height="70" fill="#B32620" />
            {/* Sunburst rays */}
            <path d="M 50,70 L 10,0 L 25,0 Z" fill="#F9C80E" opacity="0.2" />
            <path d="M 50,70 L 40,0 L 55,0 Z" fill="#F9C80E" opacity="0.2" />
            <path d="M 50,70 L 70,0 L 85,0 Z" fill="#F9C80E" opacity="0.2" />
            {/* Slogan star */}
            <circle cx="50" cy="22" r="14" fill="#F9C80E" />
            <polygon points="50,13 53,19 60,19 55,23 57,29 50,25 43,29 45,23 40,19 47,19" fill="#B32620" />
            {/* Soldier profile silhouette */}
            <path d="M 50,70 Q 30,50 30,35 Q 50,32 70,35 Q 70,50 50,70 Z" fill="#3A4D39" opacity="0.8" />
            <text x="50" y="60" fill="#F9C80E" fontSize="6" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">QUYẾT CHIẾN QUYẾT THẮNG</text>
          </>
        );

      case 'steel_division':
        return (
          <>
            <rect width="100" height="70" fill="#2B2D42" />
            <rect x="0" y="55" width="100" height="15" fill="#A8201A" />
            {/* Bayonets and stencils */}
            <path d="M 30,60 L 30,15 L 35,5 L 40,15 L 40,60" fill="#8D99AE" />
            <path d="M 70,60 L 70,15 L 65,5 L 60,15 L 60,60" fill="#8D99AE" stroke="#A8201A" strokeWidth="1" />
            {/* Gear or Star emblem */}
            <circle cx="50" cy="30" r="12" fill="none" stroke="#F9C80E" strokeWidth="3" strokeDasharray="4,2" />
            <text x="50" y="34" fill="#F9C80E" fontSize="10" fontFamily="monospace" fontWeight="heavy" textAnchor="middle">320</text>
            <text x="50" y="65" fill="#FFFFFF" fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">THÉP TỔ QUỐC</text>
          </>
        );

      case 'logistics':
        return (
          <>
            <rect width="100" height="70" fill="#8D99AE" />
            {/* Mountain vector backdrop */}
            <polygon points="0,70 30,30 60,70" fill="#1B4931" />
            <polygon points="40,70 70,25 100,70" fill="#143624" />
            {/* Dynamic trail line */}
            <path d="M 0,65 Q 40,55 50,45 T 100,25" fill="none" stroke="#F9C80E" strokeWidth="2" strokeDasharray="3,3" />
            {/* Bicycle delivery cart silhouette */}
            <circle cx="35" cy="55" r="5" fill="#A8201A" />
            <circle cx="48" cy="55" r="5" fill="#A8201A" />
            <rect x="35" y="47" width="13" height="3" fill="#F9C80E" />
            <text x="50" y="15" fill="#A8201A" fontSize="7" fontFamily="sans-serif" fontWeight="black" textAnchor="middle">HO CHI MINH TRAIL</text>
          </>
        );

      case 'river_boats':
        return (
          <>
            <rect width="100" height="70" fill="#2E5A88" />
            {/* Rising red sun */}
            <circle cx="50" cy="30" r="18" fill="#A8201A" />
            {/* Water waves */}
            <path d="M 0,55 Q 15,50 30,55 T 60,55 T 90,55 T 120,55" fill="none" stroke="#F9C80E" strokeWidth="2" />
            <path d="M 0,63 Q 20,58 40,63 T 80,63 T 120,63" fill="none" stroke="#102542" strokeWidth="3" />
            {/* River gunboat procedural blocks */}
            <rect x="25" y="42" width="45" height="10" rx="3" fill="#3D405B" />
            <rect x="35" y="32" width="20" height="10" fill="#222" />
            <line x1="55" y1="36" x2="68" y2="36" stroke="#222" strokeWidth="2" />
            <text x="50" y="67" fill="#F9C80E" fontSize="5" fontFamily="monospace" textAnchor="middle">ĐOÀN 803 SÔNG LÔ</text>
          </>
        );

      case 'sapper':
        return (
          <>
            <rect width="100" height="70" fill="#102542" />
            {/* Flashlight beam effect */}
            <polygon points="10,0 90,70 100,55 25,0" fill="#F9C80E" opacity="0.15" />
            {/* Bamboo leaf foliage */}
            <path d="M 5,70 Q 15,20 30,70 M 70,70 Q 80,10 95,70" fill="none" stroke="#2B6B40" strokeWidth="3" />
            {/* Sapper shadowed figure with mud face paint */}
            <ellipse cx="50" cy="45" rx="12" ry="15" fill="#3D405B" />
            <circle cx="45" cy="42" r="2" fill="#F9C80E" />
            <circle cx="55" cy="42" r="2" fill="#F9C80E" />
            <rect x="42" y="32" width="16" height="5" fill="#2B6B40" rx="2" />
            <text x="50" y="65" fill="#F9C80E" fontSize="5" fontFamily="sans-serif" textAnchor="middle">ĐẶC CÔNG BÁM SÁT</text>
          </>
        );

      case 'machine_gun':
        return (
          <>
            <rect width="100" height="70" fill="#3A506B" />
            {/* Tracers firing upwards */}
            <line x1="45" y1="40" x2="10" y2="5" stroke="#F9C80E" strokeWidth="2" strokeDasharray="4,4" />
            <line x1="55" y1="40" x2="90" y2="5" stroke="#F9C80E" strokeWidth="1.5" strokeDasharray="3,3" />
            {/* HMG Turret and base */}
            <polygon points="40,70 60,70 55,50 45,50" fill="#1C2541" />
            <rect x="44" y="42" width="12" height="8" rx="2" fill="#0B132B" />
            <line x1="50" y1="44" x2="35" y2="44" stroke="#0B132B" strokeWidth="3" />
            <line x1="50" y1="48" x2="30" y2="48" stroke="#F9C80E" strokeWidth="1.5" />
            <text x="50" y="67" fill="#F9C80E" fontSize="5" fontFamily="monospace" textAnchor="middle">PHÒNG KHÔNG TRẬN ĐỊA</text>
          </>
        );

      case 'artillery':
        return (
          <>
            <rect width="100" height="70" fill="#A8201A" />
            <circle cx="50" cy="70" r="30" fill="#F9C80E" opacity="0.2" />
            {/* Big Canon barrel */}
            <line x1="30" y1="65" x2="70" y2="15" stroke="#4B583E" strokeWidth="6" strokeLinecap="round" />
            <line x1="30" y1="65" x2="70" y2="15" stroke="#1A2413" strokeWidth="2" />
            {/* Wheels */}
            <circle cx="30" cy="60" r="10" fill="#1A2413" />
            <circle cx="30" cy="60" r="5" fill="#E8D8A6" />
            {/* Explosion rings */}
            <circle cx="70" cy="15" r="10" fill="none" stroke="#F9C80E" strokeWidth="2" strokeDasharray="3,3" opacity="0.8" />
            <text x="50" y="66" fill="#F9C80E" fontSize="5" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">PHÁO BINH TOÀN DIỆN</text>
          </>
        );

      case 'jet':
        return (
          <>
            <rect width="100" height="70" fill="#14213D" />
            <circle cx="80" cy="20" r="40" fill="#F9C80E" opacity="0.15" />
            {/* Jet outline */}
            <path d="M 15,55 L 75,25 L 85,26 L 45,62 M 75,25 L 55,20 L 50,12" fill="#E5E5E5" />
            <path d="M 40,40 L 55,20 L 60,35" fill="#A8201A" />
            {/* Engine fire exhaust */}
            <polygon points="15,55 5,58 10,54 3,51 15,55" fill="#FCA311" />
            <text x="50" y="64" fill="#F9C80E" fontSize="6" fontFamily="sans-serif" textAnchor="middle">TỔ QUỐC KHÔNG PHẬN</text>
          </>
        );

      case 'officer':
        return (
          <>
            <rect width="100" height="70" fill="#5F0F40" />
            {/* Red gold shield */}
            <polygon points="50,5 65,15 65,40 50,50 35,40 35,15" fill="#A8201A" />
            <polygon points="50,8 61,16 61,38 50,47 39,38 39,16" fill="#F9C80E" />
            {/* Commander profile inside */}
            <circle cx="50" cy="26" r="9" fill="#1D2A44" />
            {/* General peak cap */}
            <path d="M 40,20 Q 50,11 60,20 L 58,18 Q 50,13 42,18 Z" fill="#F9C80E" />
            <text x="50" y="62" fill="#F9C80E" fontSize="6" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">BỘ TỔNG TƯ LỆNH</text>
          </>
        );

      // ----------------- US ARMY UNITS -----------------
      case 'advisor':
        return (
          <>
            <rect width="100" height="70" fill="#2E3C26" />
            {/* Stencil Grid lines of map */}
            <line x1="0" y1="20" x2="100" y2="20" stroke="#485D3D" strokeWidth="0.5" />
            <line x1="0" y1="40" x2="100" y2="40" stroke="#485D3D" strokeWidth="0.5" />
            <line x1="0" y1="60" x2="100" y2="60" stroke="#485D3D" strokeWidth="0.5" />
            <line x1="33" y1="0" x2="33" y2="70" stroke="#485D3D" strokeWidth="0.5" />
            <line x1="66" y1="0" x2="66" y2="70" stroke="#485D3D" strokeWidth="0.5" />
            {/* Tactical icons */}
            <circle cx="50" cy="35" r="16" fill="none" stroke="#CBBF99" strokeWidth="2" />
            <line x1="34" y1="35" x2="66" y2="35" stroke="#CBBF99" strokeWidth="2" />
            <line x1="50" y1="19" x2="50" y2="51" stroke="#CBBF99" strokeWidth="2" />
            <text x="50" y="65" fill="#CBBF99" fontSize="6" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">MAAG TACTICAL ADVISOR</text>
          </>
        );

      case 'mp':
        return (
          <>
            <rect width="100" height="70" fill="#1C1F22" />
            {/* Crossed police batons */}
            <line x1="20" y1="15" x2="80" y2="55" stroke="#A8201A" strokeWidth="4" />
            <line x1="80" y1="15" x2="20" y2="55" stroke="#A8201A" strokeWidth="4" />
            {/* Heavy Shield with MP stencil */}
            <rect x="35" y="10" width="30" height="42" rx="3" fill="#D8D1B1" stroke="#222" strokeWidth="2" />
            <text x="50" y="35" fill="#1C1F22" fontSize="16" fontFamily="sans-serif" fontWeight="900" textAnchor="middle">MP</text>
            <text x="50" y="64" fill="#CBBF99" fontSize="6" fontFamily="sans-serif" textAnchor="middle">SECURE REAR LINES</text>
          </>
        );

      case 'engineers':
        return (
          <>
            <rect width="100" height="70" fill="#403D39" />
            {/* Shovel and Hammer outline */}
            <line x1="30" y1="50" x2="70" y2="10" stroke="#EB5E28" strokeWidth="4" strokeLinecap="round" />
            <line x1="70" y1="50" x2="30" y2="10" stroke="#D8D1B1" strokeWidth="4" strokeLinecap="round" />
            <circle cx="30" cy="50" r="5" fill="#EB5E28" />
            <circle cx="70" cy="50" r="5" fill="#D8D1B1" />
            {/* Stencil wall */}
            <rect x="15" y="45" width="70" height="15" fill="#252422" stroke="#EB5E28" strokeWidth="1" />
            <text x="50" y="63" fill="#E8E5DA" fontSize="5" fontFamily="monospace" textAnchor="middle">US ARMY ENGINEERS</text>
          </>
        );

      case 'us_boats':
        return (
          <>
            <rect width="100" height="70" fill="#2B3A42" />
            {/* Swamp grass reeds and water waves */}
            <path d="M 0,55 Q 25,60 50,55 T 100,55" fill="none" stroke="#E0FBFC" strokeWidth="1.5" />
            <path d="M 10,70 L 15,40 M 85,70 L 90,38" stroke="#3F5941" strokeWidth="2" />
            {/* PBR (Patrol Boat Riverine) silhouette */}
            <path d="M 20,52 L 25,40 L 68,40 L 78,52 L 20,52 Z" fill="#3D4B39" />
            <rect x="35" y="32" width="18" height="8" fill="#1C1F22" />
            <line x1="45" y1="32" x2="45" y2="24" stroke="#1C1F22" strokeWidth="1.5" />
            <text x="50" y="65" fill="#D8D1B1" fontSize="5" fontFamily="monospace" textAnchor="middle">MOBILE RIVERINE FORCE</text>
          </>
        );

      case 'armoured_pc':
        return (
          <>
            <rect width="100" height="70" fill="#4B583E" />
            {/* White Allied Star logo and tracks */}
            <circle cx="30" cy="54" r="5" fill="#1A2413" />
            <circle cx="43" cy="54" r="5" fill="#1A2413" />
            <circle cx="56" cy="54" r="5" fill="#1A2413" />
            <circle cx="69" cy="54" r="5" fill="#1A2413" />
            <rect x="25" y="47" width="50" height="12" fill="none" stroke="#E8E5DA" strokeWidth="2" strokeDasharray="3,2" />
            {/* M113 armor shell */}
            <path d="M 20,47 L 27,33 L 73,33 L 78,47 Z" fill="#333" />
            {/* Star stencil */}
            <polygon points="50,34 52,38 56,38 53,40 55,44 50,42 45,44 47,40 44,38 48,38" fill="#E8E5DA" />
            <text x="50" y="66" fill="#E8E5DA" fontSize="5" fontFamily="sans-serif" textAnchor="middle">M113 ACAV COMMAND</text>
          </>
        );

      case 'screaming_eagles':
        return (
          <>
            <rect width="100" height="70" fill="#0A0908" />
            {/* Blue airborne shield */}
            <path d="M 35,10 L 65,10 L 65,35 Q 50,52 35,35 Z" fill="#2E5A88" />
            <rect x="35" y="10" width="30" height="7" fill="#EB5E28" />
            <text x="50" y="15" fill="#E8E5DA" fontSize="5" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">AIRBORNE</text>
            {/* Screaming eagle white mascot outline */}
            <path d="M 50,22 Q 40,24 42,32 Q 44,42 54,32 Q 58,28 50,22" fill="#E8E5DA" />
            <path d="M 43,28 Q 48,28 47,31 Z" fill="#EB5E28" /> {/* gold beak */}
            <text x="50" y="61" fill="#CBBF99" fontSize="6" fontFamily="monospace" fontWeight="bold" textAnchor="middle">101ST DIVISION</text>
          </>
        );

      case 'huey':
        return (
          <>
            <rect width="100" height="70" fill="#3F4E3F" />
            {/* Concentric rotating blade vector dashes */}
            <ellipse cx="50" cy="18" rx="45" ry="4" fill="none" stroke="#CBBF99" strokeWidth="1.5" strokeDasharray="6,4" />
            {/* Huey heli-body profile */}
            <path d="M 20,28 Q 15,20 10,18 M 20,28 L 56,28 Q 63,22 68,22 L 85,15 L 85,24 L 68,26 Z" stroke="#1A2413" strokeWidth="4" fill="#1A2413" strokeLinejoin="round" />
            {/* Rotors */}
            <line x1="50" y1="18" x2="50" y2="25" stroke="#222" strokeWidth="3" />
            {/* Landing skids */}
            <line x1="30" y1="36" x2="60" y2="36" stroke="#222" strokeWidth="2.5" />
            <line x1="38" y1="28" x2="38" y2="36" stroke="#222" strokeWidth="1.5" />
            <line x1="52" y1="28" x2="52" y2="36" stroke="#222" strokeWidth="1.5" />
            <text x="50" y="65" fill="#CBBF99" fontSize="6" fontFamily="sans-serif" fontWeight="heavy" textAnchor="middle">1ST CAV AIRMOBILE</text>
          </>
        );

      case 'phantom':
        return (
          <>
            <rect width="100" height="70" fill="#1B263B" />
            {/* Vapor trails */}
            <line x1="5" y1="65" x2="45" y2="25" stroke="#E0E1DD" strokeWidth="3" opacity="0.4" />
            <line x1="15" y1="68" x2="55" y2="28" stroke="#E0E1DD" strokeWidth="2" opacity="0.3" />
            {/* Phantom sweep plane block */}
            <path d="M 45,25 L 80,12 L 85,15 L 60,40 M 80,12 L 68,8 L 65,12" fill="#778DA9" />
            <polygon points="50,18 45,15 38,20" fill="#EB5E28" />
            <text x="50" y="63" fill="#D8D1B1" fontSize="6" fontFamily="sans-serif" textAnchor="middle">F-4 AIR SUPPORT</text>
          </>
        );

      case 'green_beret':
        return (
          <>
            <rect width="100" height="70" fill="#1A1C1A" />
            {/* Shield backdrop */}
            <path d="M 25,15 L 75,15 L 75,35 Q 50,55 25,35 Z" fill="#4B583E" />
            {/* Beret silhouette */}
            <path d="M 38,24 Q 45,15 62,21 Q 68,24 60,30 Q 42,30 38,24" fill="#1D3A20" />
            {/* Flash badge */}
            <polygon points="46,21 52,21 54,26 48,26" fill="#EB5E28" />
            {/* Skull motif or star */}
            <polygon points="50,33 52,37 56,37 53,39 54,43 50,41 46,43 47,39 44,37 48,37" fill="#CBBF99" />
            <text x="50" y="64" fill="#CBBF99" fontSize="6" fontFamily="monospace" textAnchor="middle">5TH SPECIAL FORCES</text>
          </>
        );

      case 'patton_tank':
        return (
          <>
            <rect width="100" height="70" fill="#252422" />
            {/* Danger yellow border stencil */}
            <rect x="5" y="5" width="90" height="60" fill="none" stroke="#EB5E28" strokeWidth="1" strokeDasharray="4,4" />
            {/* Giant tank turret */}
            <rect x="25" y="32" width="50" height="18" fill="#3D4B39" rx="3" />
            <circle cx="35" cy="50" r="6" fill="#111" />
            <circle cx="50" cy="50" r="6" fill="#111" />
            <circle cx="65" cy="50" r="6" fill="#111" />
            {/* Heavy barrels */}
            <line x1="75" y1="38" x2="98" y2="38" stroke="#3D4B39" strokeWidth="4" />
            <line x1="75" y1="38" x2="98" y2="38" stroke="#111" strokeWidth="1" />
            <text x="50" y="63" fill="#EB5E28" fontSize="6" fontFamily="sans-serif" fontWeight="black" textAnchor="middle">M48 PATTON CRUSHER</text>
          </>
        );

      // ----------------- VC SUB-FACTION -----------------
      case 'vc_guerrilla':
        return (
          <>
            <rect width="100" height="70" fill="#0D1F10" />
            <circle cx="50" cy="35" r="22" fill="#A8201A" opacity="0.3" />
            {/* Reeds overlay */}
            <path d="M 12,70 C 20,40 25,30 20,10 M 80,70 C 70,45 65,30 85,5" fill="none" stroke="#355E3B" strokeWidth="2" />
            {/* Cone leaf hat profile */}
            <polygon points="30,42 50,22 70,42" fill="#E2AF13" />
            <polygon points="32,42 50,42 68,42" fill="#8E6E0F" />
            <text x="50" y="63" fill="#F9C80E" fontSize="5" fontFamily="sans-serif" textAnchor="middle">MẶT TRẬN GIẢI PHÓNG</text>
          </>
        );

      case 'vc_sapper':
        return (
          <>
            <rect width="100" height="70" fill="#A8201A" />
            {/* Firework radial sparks */}
            <path d="M 50,35 L 20,10 M 50,35 L 80,10 M 50,35 L 15,45 M 50,35 L 85,45 M 50,35 L 50,5" stroke="#F9C80E" strokeWidth="1.5" strokeDasharray="3,2" />
            <circle cx="50" cy="35" r="9" fill="#102542" />
            <text x="50" y="38" fill="#F9C80E" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">TNT</text>
            <text x="50" y="65" fill="#E8D8A6" fontSize="5" fontFamily="monospace" textAnchor="middle">ĐẶC CÔNG QUYẾT TỬ</text>
          </>
        );

      case 'vc_mortar':
        return (
          <>
            <rect width="100" height="70" fill="#3D3A45" />
            <line x1="30" y1="65" x2="65" y2="18" stroke="#102542" strokeWidth="4" />
            <line x1="45" y1="45" x2="65" y2="65" stroke="#102542" strokeWidth="2.5" />
            {/* Concentric rings coming out */}
            <path d="M 60,10 Q 70,2 80,12" fill="none" stroke="#F9C80E" strokeWidth="1.5" />
            <path d="M 65,5 Q 78,-5 90,8" fill="none" stroke="#F9C80E" strokeWidth="2" strokeDasharray="2,2" />
            <text x="50" y="64" fill="#F9C80E" fontSize="5" fontFamily="sans-serif" textAnchor="middle">HỎA LỰC DU KÍCH</text>
          </>
        );

      // ----------------- ARVN SUB-FACTION -----------------
      case 'arvn_soldier':
        return (
          <>
            <rect width="100" height="70" fill="#606C38" />
            {/* South Vietnam emblem background (Yellow shielding + 3 red stripes) */}
            <rect x="40" y="10" width="20" height="25" fill="#F9C80E" rx="1" />
            <line x1="44" y1="13" x2="44" y2="32" stroke="#A8201A" strokeWidth="1.5" />
            <line x1="50" y1="13" x2="50" y2="32" stroke="#A8201A" strokeWidth="1.5" />
            <line x1="56" y1="13" x2="56" y2="32" stroke="#A8201A" strokeWidth="1.5" />
            {/* Soldier in helmet */}
            <path d="M 33,52 C 33,40 67,40 67,52 L 33,52" fill="#283618" />
            <path d="M 35,46 Q 50,35 65,46 Z" fill="#DDA15E" />
            <text x="50" y="65" fill="#F9C80E" fontSize="5" fontFamily="monospace" fontStyle="italic" textAnchor="middle">ĐỊA PHƯƠNG QUÂN ARVN</text>
          </>
        );

      case 'arvn_regulars':
        return (
          <>
            <rect width="100" height="70" fill="#4F5D2F" />
            {/* Bayonets charging */}
            <path d="M 20,55 L 45,35 L 50,38 L 25,58 Z" fill="#222" />
            <line x1="45" y1="35" x2="65" y2="20" stroke="#F8F9FA" strokeWidth="2" strokeLinecap="round" />
            {/* South Vietnam flag icon top-left */}
            <rect x="5" y="5" width="15" height="10" fill="#F9C80E" />
            <line x1="5" y1="7.5" x2="20" y2="7.5" stroke="#A8201A" strokeWidth="0.8" />
            <line x1="5" y1="9" x2="20" y2="9" stroke="#A8201A" strokeWidth="0.8" />
            <line x1="5" y1="10.5" x2="20" y2="10.5" stroke="#A8201A" strokeWidth="0.8" />
            <text x="50" y="62" fill="#E8D8A6" fontSize="6" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">SƯ ĐOÀN 1 BỘ BINH</text>
          </>
        );

      case 'arvn_apc':
        return (
          <>
            <rect width="100" height="70" fill="#4B583E" />
            {/* Retro horizon yellow */}
            <rect x="0" y="45" width="100" height="25" fill="#CBBF99" />
            {/* Tank track lines inside */}
            <circle cx="34" cy="54" r="5" fill="#3D4E30" />
            <circle cx="50" cy="54" r="5" fill="#3D4E30" />
            <circle cx="66" cy="54" r="5" fill="#3D4E30" />
            <path d="M 22,46 L 78,46 L 72,36 L 28,36 Z" fill="#1C1F22" />
            <text x="50" y="65" fill="#3D4E30" fontSize="5" fontFamily="monospace" textAnchor="middle">THIẾT GIÁP KỴ BINH</text>
          </>
        );

      // ----------------- ORDERS / TRAPS -----------------
      case 'order_march':
        return (
          <>
            <rect width="100" height="70" fill="#A8201A" />
            <polygon points="50,10 63,45 25,23 75,23 37,45" fill="#F9C80E" />
            {/* Dynamic wind sweeps */}
            <path d="M 10,55 Q 30,50 90,55" fill="none" stroke="#F9C80E" strokeWidth="2" />
            <path d="M 20,62 Q 50,58 80,62" fill="none" stroke="#F9C80E" strokeWidth="1" />
            <text x="50" y="66" fill="#F9C80E" fontSize="5" fontFamily="sans-serif" fontWeight="heavy" textAnchor="middle">HÀNH QUÂN THẦN TỐC</text>
          </>
        );

      case 'order_drive':
        return (
          <>
            <rect width="100" height="70" fill="#8D1814" />
            <g opacity="0.3">
              <polygon points="0,70 20,25 45,70" fill="#1C3822" />
              <polygon points="35,70 65,15 90,70" fill="#152B1B" />
              <polygon points="70,70 85,35 100,70" fill="#0E1F13" />
            </g>
            {/* Mountain trail path tracks */}
            <path d="M 15,65 L 50,45 L 85,15" fill="none" stroke="#F9C80E" strokeWidth="2" strokeDasharray="3,3" />
            {/* Military vehicle silhouette profile */}
            <g transform="translate(32, 38) scale(0.65)">
              <rect x="5" y="10" width="30" height="10" fill="#1C3822" rx="2" />
              <rect x="15" y="2" width="15" height="10" fill="#1C3822" rx="1" />
              <circle cx="10" cy="20" r="4" fill="#000" />
              <circle cx="20" cy="20" r="4" fill="#000" />
              <circle cx="30" cy="20" r="4" fill="#000" />
            </g>
            <text x="50" y="18" fill="#F9C80E" fontSize="6.5" fontFamily="sans-serif" fontWeight="black" textAnchor="middle">XẺ DỌC TRƯỜNG SƠN</text>
            <text x="50" y="66" fill="#F9C80E" fontSize="4.5" fontFamily="monospace" textAnchor="middle">QUYẾT TÂM GIẢI PHÓNG</text>
          </>
        );

      case 'order_appeal':
        return (
          <>
            <rect width="100" height="70" fill="#A8201A" />
            {/* Megaphone dynamic soundwaves radiating */}
            <path d="M 25,35 L 45,22 L 45,48 Z" fill="#222" />
            <circle cx="55" cy="35" r="10" fill="none" stroke="#F9C80E" strokeWidth="2" strokeDasharray="3,3" />
            <circle cx="55" cy="35" r="16" fill="none" stroke="#F9C80E" strokeWidth="2" />
            <circle cx="55" cy="35" r="22" fill="none" stroke="#F9C80E" strokeWidth="1.5" strokeDasharray="4,2" />
            <text x="50" y="65" fill="#F9C80E" fontSize="5" fontFamily="sans-serif" textAnchor="middle">LỜI KÊU GỌI THI ĐUA</text>
          </>
        );

      case 'order_camo':
        return (
          <>
            <rect width="100" height="70" fill="#3D4B39" />
            {/* Camouflage patterns */}
            <path d="M 0,0 C 30,10 40,30 20,40 Z" fill="#24301B" />
            <path d="M 60,20 C 80,10 95,30 80,50 Z" fill="#1C1F16" />
            <path d="M 25,45 C 50,40 60,65 30,70 Z" fill="#2A3323" />
            <text x="50" y="63" fill="#D8D1B1" fontSize="6" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">NGỤY TRANG CHIẾN THUẬT</text>
          </>
        );

      case 'order_vacate':
        return (
          <>
            <rect width="100" height="70" fill="#7D2010" />
            {/* Burning elements */}
            <path d="M 10,70 Q 25,35 40,70" fill="#C95A11" />
            <path d="M 70,70 Q 80,45 90,70" fill="#E28F13" />
            {/* Broken or empty straw huts silhouette */}
            <polygon points="30,70 30,55 50,55 50,70" fill="#1C1410" />
            <polygon points="25,55 40,40 55,55" fill="#C95A11" stroke="#1C1410" strokeWidth="1" />
            <line x1="30" y1="58" x2="50" y2="58" stroke="#7D2010" strokeWidth="1" />
            <text x="50" y="22" fill="#E28F13" fontSize="7" fontFamily="sans-serif" fontWeight="heavy" textAnchor="middle">VƯỜN KHÔNG NHÀ TRỐNG</text>
            <text x="50" y="65" fill="#E28F13" fontSize="5" fontFamily="monospace" textAnchor="middle">TRIỆT TIÊU TIẾP TẾ</text>
          </>
        );

      case 'order_isolate':
        return (
          <>
            <rect width="100" height="70" fill="#5E1410" />
            <circle cx="50" cy="35" r="22" fill="none" stroke="#F9C80E" strokeWidth="1.5" strokeDasharray="3,3" />
            {/* Enveloping red arrows from left, right, top, bottom, squeezing the target */}
            <path d="M 24,35 L 34,30 L 34,40 Z" fill="#F9C80E" />
            <line x1="10" y1="35" x2="34" y2="35" stroke="#F9C80E" strokeWidth="3" />
            
            <path d="M 76,35 L 66,30 L 66,40 Z" fill="#F9C80E" />
            <line x1="90" y1="35" x2="66" y2="35" stroke="#F9C80E" strokeWidth="3" />
            
            {/* Starved blue vehicle symbol inside the trap */}
            <rect x="42" y="30" width="16" height="10" fill="#1B2A44" rx="1" />
            <circle cx="50" cy="35" r="3" fill="#A8201A" />
            
            <text x="50" y="64" fill="#F9C80E" fontSize="6" fontFamily="sans-serif" fontWeight="black" textAnchor="middle">VÂY CHẶT CÔ LẬP</text>
          </>
        );

      case 'order_tunnel':
        return (
          <>
            <rect width="100" height="70" fill="#4B2413" />
            {/* Underground tunnel schematic */}
            <path d="M 5,20 H 95 V 30 H 60 V 55 H 35 V 30 H 5 Z" fill="none" stroke="#F9C80E" strokeWidth="2" />
            {/* Tunnels label */}
            <circle cx="48" cy="42" r="5" fill="#A8201A" />
            <text x="50" y="15" fill="#F9C80E" fontSize="6" fontFamily="sans-serif" textAnchor="middle">ĐỊA ĐẠO CỦ CHI</text>
            <text x="50" y="65" fill="#F9C80E" fontSize="5" fontFamily="monospace" textAnchor="middle">AN TOÀN TUYỆT ĐỐI</text>
          </>
        );

      case 'order_fortify':
        return (
          <>
            <rect width="100" height="70" fill="#3D4D30" />
            {/* Strategic hamlet fences */}
            <line x1="5" y1="50" x2="95" y2="50" stroke="#CBBF99" strokeWidth="3" />
            <line x1="15" y1="35" x2="15" y2="60" stroke="#CBBF99" strokeWidth="2" />
            <line x1="35" y1="35" x2="35" y2="60" stroke="#CBBF99" strokeWidth="2" />
            <line x1="55" y1="35" x2="55" y2="60" stroke="#CBBF99" strokeWidth="2" />
            <line x1="75" y1="35" x2="75" y2="60" stroke="#CBBF99" strokeWidth="2" />
            <text x="50" y="24" fill="#CBBF99" fontSize="6.5" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">STRATEGIC HAMLET</text>
          </>
        );

      case 'order_draft':
        return (
          <>
            <rect width="100" height="70" fill="#D2AC43" />
            <rect x="5" y="5" width="90" height="60" fill="#BF911A" />
            {/* Peace scale and ARVN crest theme */}
            <circle cx="50" cy="30" r="14" fill="#1C3F1B" />
            {/* Scale beams */}
            <line x1="38" y1="28" x2="62" y2="28" stroke="#F1C40F" strokeWidth="2" />
            <line x1="50" y1="20" x2="50" y2="40" stroke="#F1C40F" strokeWidth="1.5" />
            <circle cx="38" cy="34" r="3" fill="#F1C40F" />
            <circle cx="62" cy="34" r="3" fill="#F1C40F" />
            <text x="50" y="58" fill="#1C3F1B" fontSize="6" fontFamily="sans-serif" fontWeight="black" textAnchor="middle">CHƯƠNG TRÌNH BÌNH ĐỊNH</text>
          </>
        );

      case 'order_supply':
        return (
          <>
            <rect width="100" height="70" fill="#3D3A30" />
            {/* Big wooden supply crate */}
            <rect x="35" y="15" width="30" height="30" fill="#8C7D52" stroke="#403D30" strokeWidth="2" />
            <line x1="35" y1="15" x2="65" y2="45" stroke="#403D30" strokeWidth="2" />
            <line x1="65" y1="15" x2="35" y2="45" stroke="#403D30" strokeWidth="2" />
            <text x="50" y="60" fill="#E8D8A6" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">SUPPLY EXPANSION</text>
          </>
        );

      case 'order_mobilize':
        return (
          <>
            <rect width="100" height="70" fill="#E8BD35" />
            {/* Three red horizontal stripes of the ARVN republic heritage flag */}
            <rect x="10" y="15" width="80" height="4" fill="#C0392B" />
            <rect x="10" y="24" width="80" height="4" fill="#C0392B" />
            <rect x="10" y="33" width="80" height="4" fill="#C0392B" />
            {/* High-tension military command trumpet/shield */}
            <polygon points="50,42 42,62 58,62" fill="#2C3E50" />
            <circle cx="50" cy="42" r="3" fill="#2C3E50" />
            <text x="50" y="56" fill="#C0392B" fontSize="7" fontFamily="sans-serif" fontWeight="black" textAnchor="middle">TỔNG ĐỘNG VIÊN</text>
            <text x="50" y="65" fill="#2C3E50" fontSize="4" fontFamily="monospace" textAnchor="middle" letterSpacing="0.5">GENERAL MOBILIZATION</text>
          </>
        );

      case 'order_spy':
        return (
          <>
            <rect width="100" height="70" fill="#1C1F22" />
            {/* Top secret stamp */}
            <circle cx="50" cy="35" r="22" fill="none" stroke="#A8201A" strokeWidth="2" />
            <rect x="30" y="30" width="40" height="10" fill="#A8201A" />
            <text x="50" y="38" fill="#F9C80E" fontSize="7" fontFamily="sans-serif" fontWeight="heavy" textAnchor="middle">TOP SECRET</text>
            <text x="50" y="64" fill="#CBBF99" fontSize="5" fontFamily="monospace" textAnchor="middle">INTELLIGENCE REPORT</text>
          </>
        );

      case 'order_airdrop':
        return (
          <>
            <rect width="100" height="70" fill="#3E4E30" />
            {/* Parachute drop */}
            <path d="M 35,25 Q 50,10 65,25 Z" fill="#E8E5DA" />
            <line x1="35" y1="25" x2="50" y2="45" stroke="#E8E5DA" strokeWidth="1" />
            <line x1="65" y1="25" x2="50" y2="45" stroke="#E8E5DA" strokeWidth="1" />
            <rect x="45" y="45" width="10" height="8" fill="#EB5E28" />
            <text x="50" y="63" fill="#CBBF99" fontSize="6" fontFamily="sans-serif" textAnchor="middle">AIRDROP SUPPORT</text>
          </>
        );

      case 'order_napalm':
        return (
          <>
            <rect width="100" height="70" fill="#1C0A00" />
            {/* Fierce orange firestorms */}
            <path d="M 10,70 Q 25,10 40,70 Q 55,20 70,70 Q 85,5 100,70 Z" fill="#EB5E28" />
            <path d="M 20,70 Q 35,25 50,70 Q 65,30 80,70 Z" fill="#E2AF13" />
            {/* Silhouetted plane dropping bombs */}
            <path d="M 10,15 L 40,10 L 50,12 L 20,20 Z" fill="#222" />
            <text x="50" y="30" fill="#E2AF13" fontSize="10" fontFamily="sans-serif" fontWeight="black" textAnchor="middle">NAPALM ZONE</text>
          </>
        );

      case 'trap_ambush':
        return (
          <>
            <rect width="100" height="70" fill="#0D1F10" />
            {/* Punji spike trap drawing */}
            <polygon points="15,70 20,40 25,70" fill="#4E3629" />
            <polygon points="35,70 40,35 45,70" fill="#4E3629" />
            <polygon points="55,70 60,38 65,70" fill="#4E3629" />
            <polygon points="75,70 80,35 85,70" fill="#4E3629" />
            <line x1="5" y1="36" x2="95" y2="36" stroke="#2B6B40" strokeWidth="3" />
            <text x="50" y="20" fill="#A8201A" fontSize="7" fontFamily="sans-serif" fontWeight="black" textAnchor="middle">TRẬN ĐỊA PHỤC KÍCH</text>
          </>
        );

      case 'trap_radar':
        return (
          <>
            <rect width="100" height="70" fill="#1B263B" />
            {/* Concentric green radar grids */}
            <circle cx="50" cy="50" r="15" fill="none" stroke="#2ECC71" strokeWidth="1" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="#2ECC71" strokeWidth="1" strokeDasharray="3,3" />
            {/* Scanning radar line */}
            <line x1="50" y1="50" x2="71" y2="29" stroke="#2ECC71" strokeWidth="2" />
            <text x="50" y="15" fill="#2ECC71" fontSize="6" fontFamily="monospace" textAnchor="middle">RADAR GRID INTERCEPT</text>
          </>
        );

      case 'hq_hanoi':
        return (
          <>
            <rect width="100" height="70" fill="#A8201A" />
            {/* Elegant retro sunburst rays */}
            <path d="M 50,70 L 12,0 L 22,0 Z" fill="#F9C80E" opacity="0.18" />
            <path d="M 50,70 L 32,0 L 42,0 Z" fill="#F9C80E" opacity="0.18" />
            <path d="M 50,70 L 58,0 L 68,0 Z" fill="#F9C80E" opacity="0.18" />
            <path d="M 50,70 L 78,0 L 88,0 Z" fill="#F9C80E" opacity="0.18" />
            
            {/* Hanoi Citadel or Bunker style silhouette */}
            <path d="M 15,70 L 25,48 L 75,48 L 85,70 Z" fill="#143624" opacity="0.9" />
            <rect x="35" y="40" width="30" height="8" fill="#1B4931" />
            <polygon points="50,30 54,38 63,38 56,42 58,50 50,45 42,50 44,42 37,38 46,38" fill="#F9C80E" />
            
            {/* Vietnam/Soviet style border design */}
            <rect x="3" y="3" width="94" height="64" fill="none" stroke="#F9C80E" strokeWidth="1" opacity="0.7" />
            <text x="50" y="62" fill="#F9C80E" fontSize="5" fontFamily="monospace" fontWeight="black" textAnchor="middle" letterSpacing="1">HANOI FRONT COMMAND</text>
          </>
        );

      case 'hq_saigon':
        return (
          <>
            <rect width="100" height="70" fill="#2E3823" />
            {/* US Allied style emblem: military shield */}
            <path d="M 35,15 Q 50,12 65,15 L 65,42 Q 50,58 35,42 Z" fill="#1A2D1F" stroke="#CBBF99" strokeWidth="1.5" />
            {/* Gold/Yellow stars on shield */}
            <circle cx="50" cy="24" r="3" fill="#CBBF99" />
            <polygon points="50,29 51.5,33 55,33 52,35.5 53.5,39 50,37 46.5,39 48,35.5 45,33 48.5,33" fill="#CBBF99" />
            
            {/* Radio / Radar grid mast on Saigon HQ */}
            <line x1="20" y1="70" x2="20" y2="35" stroke="#CBBF99" strokeWidth="1" opacity="0.5" />
            <line x1="80" y1="70" x2="80" y2="35" stroke="#CBBF99" strokeWidth="1" opacity="0.5" />
            <polygon points="17,35 23,35 20,31" fill="#CBBF99" opacity="0.7" />
            <polygon points="77,35 83,35 80,31" fill="#CBBF99" opacity="0.7" />

            {/* Shield accent line & stenciling */}
            <rect x="3" y="3" width="94" height="64" fill="none" stroke="#CBBF99" strokeWidth="1" opacity="0.6" strokeDasharray="4,2" />
            <text x="50" y="62" fill="#E8E5DA" fontSize="4.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">MACV SAIGON COMMAND</text>
          </>
        );

      default:
        return (
          <>
            <rect width="100" height="70" fill={primaryColor} />
            <circle cx="50" cy="35" r="25" fill={bgAccent} opacity="0.3" />
            {/* Standard retro military crest */}
            <polygon points="50,15 60,45 35,25 65,25 40,45" fill={textColor} />
            <text x="50" y="60" fill={textColor} fontSize="5" fontFamily="monospace" textAnchor="middle">MILITARY COMMUNIQUE</text>
          </>
        );
    }
  };

  return (
    <div className={`relative overflow-hidden w-full h-full bg-stone-900 border-2 select-none ${className}`} style={{ borderColor: primaryColor }}>
      {/* Reticle grid overlay for vintage HUD card print */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.6)_100%)] opacity-80" />
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]" />

      <svg
        viewBox="0 0 100 70"
        className="w-full h-full block"
        style={{ imageRendering: 'pixelated' }}
      >
        {renderArt()}
      </svg>
    </div>
  );
};
