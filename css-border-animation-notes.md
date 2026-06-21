# CSS Border Animation — UI Implementation Guide
### Vietnam War Roguelike Deckbuilder
> Nguồn kỹ thuật: [Fantastic CSS Border Animation – Chokcoco](https://dev.to/chokcoco/fantastic-css-border-animation-5166)
> Áp dụng vào: `taiseixx/Vietnam-War-Roguelike-Deckbuilder`

---

## Design Language của game

Theo GDD, game theo aesthetic **"Tactical Command Center"**:

```
Background  #111108   đen olive — màn hình radar phòng chỉ huy
Text chính  #c8860a   amber CRT — typography monospace
Accent US   #4a7c3f   olive xanh — phe USA/ARVN  
Accent NVA  #b22222   đỏ thẫm — phe NVA/VC
Elite glow  #ff4500   đỏ cam — Elite cards
Stone       #8c8c80   xám stone — Common cards
Teal        #2e8b8b   teal — Uncommon cards
```

Mỗi kỹ thuật dưới đây được map **trực tiếp vào một UI element cụ thể** trong game.

---

## 1. Card Rarity Border — Rotating Gradient

**Dùng cho:** Thẻ **Rare** (Amber) và **Elite** (Red)

GDD định nghĩa 4 độ hiếm: Common/Stone, Uncommon/Teal, Rare/Amber, Elite/Red. Rare và Elite cần visual border động để phân biệt với mắt thường.

```css
/* Wrapper card — Rare tier */
.card-rare {
  position: relative;
  border-radius: 4px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: conic-gradient(
      from 0deg,
      #c8860a 0%,      /* amber */
      #ff9a00 25%,
      transparent 40%,
      transparent 60%,
      #ff9a00 75%,
      #c8860a 100%
    );
    border-radius: inherit;
    animation: rareRotate 3s linear infinite;
    z-index: 0;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 2px;       /* mask phần giữa — chỉ giữ border */
    background: #111108;
    border-radius: 3px;
    z-index: 1;
  }
}

/* Elite tier — đỏ dữ dội hơn, nhanh hơn */
.card-elite::before {
  background: conic-gradient(
    from 0deg,
    #b22222 0%,
    #ff4500 20%,
    #ff6a00 35%,
    transparent 50%,
    #ff4500 80%,
    #b22222 100%
  );
  animation: rareRotate 1.8s linear infinite;
}

@keyframes rareRotate {
  100% { transform: rotate(1turn); }
}
```

**Lưu ý quan trọng:** Card content (artwork, stats) phải có `position: relative; z-index: 2` để nằm trên `::after` mask.

---

## 2. Active Unit Selection — clip-path Inset Running Border

**Dùng cho:** Unit đang được chọn trên battlefield (3×5 grid)

Khi người chơi click vào một ô trên board, border "chạy vòng" quanh unit để hiển thị selection. Đây là technique sạch nhất — hỗ trợ border-radius, không tạo artifact góc.

```css
.board-cell.selected .unit-card {
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -3px;
    border: 2px solid #c8860a; /* amber */
    border-radius: 4px;
    animation: unitSelect 1.2s infinite linear;
  }
}

/* Running highlight quanh unit */
@keyframes unitSelect {
  0%        { clip-path: inset(0 0 96% 0 round 4px); }  /* top */
  25%       { clip-path: inset(0 96% 0 0 round 4px); }  /* right ← lỗi thường gặp, cần đúng thứ tự top/right/bottom/left */
  50%       { clip-path: inset(96% 0 0 0 round 4px); }  /* bottom */
  75%       { clip-path: inset(0 0 0 96% round 4px); }  /* left */
  100%      { clip-path: inset(0 0 96% 0 round 4px); }
}
```

**Variant: Summoning Sickness** — unit vừa deploy, chưa thể action:

```css
.unit-card.summoning-sick::before {
  border-color: #555;    /* dim gray — disabled state */
  animation: unitSelect 2.5s infinite linear; /* chậm hơn */
  opacity: 0.5;
}
```

---

## 3. Conflict Zone Terrain — Animated Dashed Border

**Dùng cho:** **Hàng 1 (Conflict Zone)** — vùng giao tranh Jungle/Swamp

GDD mô tả hàng 1 là "điểm nóng — ai kiểm soát hàng này có lợi thế tấn công". Cần visual phân biệt rõ với hàng 0 và hàng 2.

`border-style: dashed` không animate được → dùng gradient giả:

```css
/* Row separator — Conflict Zone boundary */
.conflict-zone-border {
  position: relative;
  height: 2px;
  background:
    /* Top border dashed: di chuyển sang phải → cảm giác "nguy hiểm" */
    linear-gradient(90deg, #b22222 50%, transparent 0) repeat-x,
    linear-gradient(90deg, #b22222 50%, transparent 0) repeat-x;
  background-size: 8px 2px, 8px 2px;
  background-position: 0 0, 0 100%;
  animation: conflictDash 0.4s infinite linear;
}

@keyframes conflictDash {
  100% {
    background-position: 8px 0, -8px 100%;
  }
}
```

**Variant: Swamp tile** (penalty ground cho non-Amphibious units):

```css
.board-cell.swamp {
  background:
    linear-gradient(90deg, #1a3a1a 50%, transparent 0) repeat-x,
    linear-gradient(90deg, #1a3a1a 50%, transparent 0) repeat-x,
    linear-gradient(0deg,  #1a3a1a 50%, transparent 0) repeat-y,
    linear-gradient(0deg,  #1a3a1a 50%, transparent 0) repeat-y;
  background-size: 4px 1px, 4px 1px, 1px 4px, 1px 4px;
  background-position: 0 0, 0 100%, 0 0, 100% 0;
  animation: swampDash 1.2s infinite linear;
}

@keyframes swampDash {
  100% {
    background-position: 4px 0, -4px 100%, 0 -4px, 100% 4px;
  }
}
```

---

## 4. Countermeasure Card (Hidden Trap) — Pseudo-element Corner Brackets

**Dùng cho:** Thẻ **Countermeasure** ở trạng thái ẩn trên board

Countermeasure đặt xuống ở trạng thái face-down. Cần visual subtly cho thấy "có gì đó ở đây" mà không reveal nội dung.

```css
/* Face-down trap card — chỉ thấy corner brackets */
.countermeasure-hidden {
  position: relative;
  background: #0d0d0a;
  border: 1px dashed #333;  /* dim baseline */

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    transition: all 0.3s ease;
    opacity: 0.6;
  }

  &::before {
    top: -2px; left: -2px;
    border-top: 2px solid #c8860a;
    border-left: 2px solid #c8860a;
  }

  &::after {
    bottom: -2px; right: -2px;
    border-bottom: 2px solid #c8860a;
    border-right: 2px solid #c8860a;
  }

  /* Reveal animation khi trigger */
  &.triggered {
    &::before, &::after {
      width: calc(100% + 4px);
      height: calc(100% + 4px);
      opacity: 1;
    }
  }
}
```

**Trap reveal sequence** — Ambush Trap, Punji Stake, Landmine:

```css
/* Trigger flash khi trap kích hoạt */
@keyframes trapReveal {
  0%   { box-shadow: 0 0 0px #ff4500; }
  30%  { box-shadow: 0 0 20px #ff4500, 0 0 40px #ff4500; }
  60%  { box-shadow: 0 0 10px #b22222; }
  100% { box-shadow: 0 0 0px #b22222; }
}

.countermeasure-hidden.triggered {
  animation: trapReveal 0.6s ease-out forwards;
}
```

---

## 5. HQ Critical State — border-image + hue-rotate Pulse

**Dùng cho:** HQ Defense thấp (≤ 5 DEF còn lại)

Khi HQ gần thất thủ, toàn bộ HQ card cần visual alert rõ ràng.

```css
.hq-card {
  border: 4px solid;
  border-image: linear-gradient(45deg, #4a7c3f, #c8860a) 1;
  clip-path: inset(0 round 4px);  /* fix border-radius với border-image */
  transition: filter 0.3s;
}

/* State: Critical (DEF ≤ 5) */
.hq-card.critical {
  border-image: linear-gradient(45deg, #b22222, #ff4500) 1;
  animation: hqCritical 0.8s infinite alternate;
}

@keyframes hqCritical {
  0%   { filter: hue-rotate(0deg) brightness(1); }
  100% { filter: hue-rotate(30deg) brightness(1.4); }
}
```

---

## 6. Faction Selection Screen — Conic-gradient Atmospheric Border

**Dùng cho:** Màn hình chọn phe (USA/ARVN vs NVA/VC)

Hai faction card lớn cần visual identity mạnh. Conic-gradient tạo "light beam" effect.

```css
/* USA/ARVN — olive & steel */
.faction-card.usa {
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: -50%; top: -50%;
    width: 200%; height: 200%;
    background: conic-gradient(
      transparent 0deg,
      rgba(74, 124, 63, 0.8) 60deg,  /* olive */
      rgba(200, 136, 10, 0.3) 90deg, /* amber flash */
      transparent 120deg
    );
    animation: factionSweep 4s linear infinite;
  }
}

/* NVA/VC — red & gold */
.faction-card.nva::before {
  background: conic-gradient(
    transparent 0deg,
    rgba(178, 34, 34, 0.8) 60deg,   /* đỏ NVA */
    rgba(255, 215, 0, 0.3) 90deg,   /* vàng sao */
    transparent 120deg
  );
  animation: factionSweep 4s linear infinite reverse;
}

@keyframes factionSweep {
  100% { transform: rotate(1turn); }
}
```

---

## 7. Campaign Map Node — clip-path Border theo Loại Node

**Dùng cho:** 5 node trên Campaign Map (Combat/Event/Campfire/Elite/Boss)

Mỗi node type có màu và animation tốc độ khác nhau:

```css
/* Base node styles */
.campaign-node {
  position: relative;
  clip-path: polygon(...); /* hexagonal hoặc diamond shape tùy design */

  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border: 2px solid var(--node-color);
    animation: nodeActive var(--node-speed) infinite linear;
  }
}

/* Node type tokens */
.campaign-node[data-type="combat"]   { --node-color: #c8860a; --node-speed: 2s; }
.campaign-node[data-type="event"]    { --node-color: #2e8b8b; --node-speed: 3s; }
.campaign-node[data-type="campfire"] { --node-color: #4a7c3f; --node-speed: 4s; }
.campaign-node[data-type="elite"]    { --node-color: #b22222; --node-speed: 1.5s; }
.campaign-node[data-type="boss"]     { --node-color: #ff4500; --node-speed: 0.9s; }

@keyframes nodeActive {
  0%   { clip-path: inset(0 0 96% 0); }
  25%  { clip-path: inset(0 96% 0 0); }
  50%  { clip-path: inset(96% 0 0 0); }
  75%  { clip-path: inset(0 0 0 96%); }
  100% { clip-path: inset(0 0 96% 0); }
}
```

---

## 8. Turn Indicator — overflow + transform-origin Spin

**Dùng cho:** Chỉ thị lượt hiện tại (YOUR TURN / ENEMY TURN)

```css
.turn-indicator {
  position: relative;
  overflow: hidden;
  border: 1px solid #333;

  &::before {
    content: '';
    position: absolute;
    width: 200%;
    height: 200%;
    top: -50%;
    left: -50%;
    background: conic-gradient(
      #c8860a 0deg 90deg,
      transparent 90deg 360deg
    );
    transform-origin: center;
    animation: turnSpin 1s steps(1, end) infinite;
    opacity: 0.3;
  }
}

/* Player turn — amber pulse */
.turn-indicator.player-turn::before {
  background: conic-gradient(#c8860a 0deg 90deg, transparent 90deg 360deg);
  animation: turnSpin 0.8s linear infinite;
}

/* Enemy turn — red */
.turn-indicator.enemy-turn::before {
  background: conic-gradient(#b22222 0deg 90deg, transparent 90deg 360deg);
  animation: turnSpin 0.8s linear infinite;
}

@keyframes turnSpin {
  100% { transform: rotate(1turn); }
}
```

---

## Implementation Matrix

| UI Element | Kỹ thuật | CSS property chính | Trigger |
|---|---|---|---|
| Rare card border | Rotating conic-gradient | `animation: rotate` + `::before` | Always on |
| Elite card border | Rotating conic-gradient | Tốc độ nhanh hơn, màu đỏ | Always on |
| Active unit selection | clip-path inset running | `clip-path: inset()` | `.selected` class |
| Summoning sickness | clip-path (chậm, dim) | Opacity 0.5 | `.summoning-sick` |
| Conflict Zone boundary | Gradient dashed animated | `background-position` animation | Row 1 always |
| Swamp tile | Gradient dashed 4 cạnh | 4 gradients + animation | `.swamp` cells |
| Countermeasure hidden | Pseudo corner brackets | `::before` / `::after` expand | Face-down state |
| Trap triggered | Flash + expand brackets | `box-shadow` + border expand | `.triggered` |
| HQ critical ≤5 DEF | border-image + hue-rotate | `filter: hue-rotate()` | `.critical` state |
| Faction selection | Conic sweep | Full-size rotating `::before` | Hover / always |
| Campaign node | clip-path running (speed varies) | `--node-speed` CSS var | Node type |
| Turn indicator | overflow + spin | `conic-gradient` + `transform-origin` | Turn change |

---

## Gotchas cần tránh

**`border-image` không hỗ trợ `border-radius`**
→ Fix bằng `clip-path: inset(0 round Npx)` trên chính element đó.

**Rotating gradient tạo tam giác ở góc**
→ Thay thế bằng `conic-gradient` hoặc dùng `clip-path: inset()` approach.

**Gradient dashed bị lệch box model khi switch từ `border`**
→ Dùng `outline` + `outline-offset: -1px` thay `border` để tránh layout shift.

**Aura buff không nên ảnh hưởng HQ ATK**
→ Đây là game logic (GDD §C10), nhưng visual HQ cũng không nên nhận rotating elite border — HQ là fixed element, dùng static `border: 1px dashed #c8860a` là đủ.

**Performance với nhiều ô trên 3×5 grid**
→ Dùng `will-change: transform` chỉ cho animated elements. Card animation nên dùng `transform` / `opacity` thay `border-width` để GPU accelerate.

---

*Mọi CodePen minh họa: [codepen.io/Chokcoco](https://codepen.io/Chokcoco/) · Repo gốc: [taiseixx/Vietnam-War-Roguelike-Deckbuilder](https://github.com/taiseixx/Vietnam-War-Roguelike-Deckbuilder)*
