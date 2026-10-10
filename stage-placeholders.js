// Drawn stand-ins for the stage backdrops (art slots stage/ferry/asleep,
// stage/ferry/awake and stage/marsh, 1600 × 900). A stage is the picture a road
// puzzle is played in: dist/road-stage.js draws the pieces (travelers, bell
// wheels, lanterns, boardwalks, Hops) over it at fixed spots, so finished art
// must keep the same layout. docs/art/batches/03-stage-boards.md describes it.

const sea = `<defs><linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ed8f7"/><stop offset="1" stop-color="#e3f5ff"/></linearGradient><linearGradient id="st-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55c3e8"/><stop offset="1" stop-color="#2390c4"/></linearGradient><radialGradient id="st-shell" cx=".45" cy=".35" r=".8"><stop offset="0" stop-color="#6fb85a"/><stop offset="1" stop-color="#3f8a3e"/></radialGradient><pattern id="st-planks" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)"><rect width="60" height="60" fill="#d39a5c"/><path d="M0 0v60" stroke="#a96f3a" stroke-width="3"/><path d="M30 0v60" stroke="#c48a4f" stroke-width="2"/></pattern></defs>
<rect width="1600" height="900" fill="url(#st-sea)"/>
<rect width="1600" height="150" fill="url(#st-sky)"/>
<path d="M0 150 C120 92 230 96 330 128 C420 104 520 112 610 150Z" fill="#4f9a5a"/><path d="M1030 150 C1140 110 1250 100 1370 124 C1460 96 1540 104 1600 120V150Z" fill="#5aa565"/>
<path d="M0 150H1600" stroke="#e7f7ff" stroke-width="4"/>
<g fill="none" stroke="#bdeeff" stroke-width="4" stroke-linecap="round" opacity=".55"><path d="M70 230q30-12 60 0t60 0"/><path d="M1450 260q30-12 60 0t60 0"/><path d="M90 840q30-12 60 0t60 0"/><path d="M1300 860q30-12 60 0t60 0"/><path d="M820 860q30-12 60 0t60 0"/><path d="M1420 520q30-12 60 0t60 0"/></g>`;

// The jetty in the bottom-left corner, where the caravan waits on the map.
const jetty = `<g><polygon points="0,700 230,610 300,650 70,745" fill="#b98250" stroke="#7a5230" stroke-width="5"/><polygon points="0,745 70,745 300,650 300,672 70,770 0,770" fill="#8d5f36"/>${[[30,770],[110,742],[200,700],[280,668]].map(([x, y]) => `<rect x="${x - 9}" y="${y}" width="18" height="70" rx="5" fill="#6b4527"/>`).join('')}</g>`;

function turtle(awake) {
  const eyes = awake
    ? `<circle cx="1452" cy="560" r="17" fill="#1f2a1c"/><circle cx="1458" cy="554" r="6" fill="#fff"/><circle cx="1522" cy="560" r="15" fill="#1f2a1c"/><circle cx="1527" cy="554" r="5" fill="#fff"/><path d="M1470 612q28 18 54 0" fill="none" stroke="#2c4a25" stroke-width="7" stroke-linecap="round"/>`
    : `<path d="M1432 566q20 14 40 0M1504 566q18 13 36 0" fill="none" stroke="#2c4a25" stroke-width="7" stroke-linecap="round"/><text x="1500" y="470" font-family="Georgia,serif" font-size="46" fill="#ffffff" opacity=".9">z</text><text x="1535" y="430" font-family="Georgia,serif" font-size="34" fill="#ffffff" opacity=".8">z</text>`;
  return `<g>
  <ellipse cx="640" cy="640" rx="640" ry="230" fill="#1c7aa8" opacity=".55"/>
  <ellipse cx="250" cy="760" rx="150" ry="55" fill="#77b764" stroke="#3f7b39" stroke-width="6" transform="rotate(-18 250 760)"/>
  <ellipse cx="1020" cy="790" rx="160" ry="55" fill="#77b764" stroke="#3f7b39" stroke-width="6" transform="rotate(16 1020 790)"/>
  <ellipse cx="150" cy="420" rx="120" ry="45" fill="#77b764" stroke="#3f7b39" stroke-width="6" transform="rotate(20 150 420)"/>
  <path d="M1180 560 C1260 520 1330 520 1390 540 L1400 640 C1330 650 1250 650 1180 640Z" fill="#86c46f" stroke="#3f7b39" stroke-width="6"/>
  <ellipse cx="1490" cy="580" rx="110" ry="92" fill="#86c46f" stroke="#3f7b39" stroke-width="7"/>
  <circle cx="1440" cy="520" r="14" fill="#6aaa58"/><circle cx="1545" cy="620" r="12" fill="#6aaa58"/>
  ${eyes}
  <ellipse cx="620" cy="575" rx="600" ry="255" fill="url(#st-shell)" stroke="#2f6b31" stroke-width="8"/>
  <path d="M40 600 Q620 900 1210 600" fill="none" stroke="#e1c27a" stroke-width="22" opacity=".9"/>
  ${[[150,520],[300,700],[520,770],[760,770],[980,700],[1120,560]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="80" ry="40" fill="#5ca24f" stroke="#3a7a3a" stroke-width="5"/>`).join('')}
  </g>`;
}

// The deck the travelers sit on, and the bow frame the game hangs the bell and
// the bell wheels from (between the posts, x 1110–1380).
const deck = `<g>
  <ellipse cx="650" cy="569" rx="470" ry="208" fill="#8d5f36"/>
  <ellipse cx="650" cy="548" rx="470" ry="208" fill="url(#st-planks)" stroke="#7a5230" stroke-width="7"/>
  <ellipse cx="650" cy="548" rx="410" ry="200" fill="none" stroke="#b67b45" stroke-width="5" stroke-dasharray="2 22" stroke-linecap="round"/>
  <polygon points="1040,610 1410,560 1410,780 1040,790" fill="#b98250" stroke="#7a5230" stroke-width="6"/>
  <rect x="1078" y="40" width="30" height="750" rx="8" fill="#8a5a33" stroke="#5e3b1f" stroke-width="4"/>
  <rect x="1384" y="40" width="30" height="735" rx="8" fill="#8a5a33" stroke="#5e3b1f" stroke-width="4"/>
  <rect x="1060" y="24" width="372" height="36" rx="10" fill="#9c6a3e" stroke="#5e3b1f" stroke-width="4"/>
  </g>`;

export function ferryStage(awake = false) {
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sea}${jetty}${turtle(awake)}${deck}</svg>`;
}

export function marshStage() {
  const stars = [[90, 40], [260, 90], [420, 30], [610, 70], [790, 28], [980, 86], [1130, 44], [1290, 92], [1460, 36], [1550, 110]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff6c8"/>`).join('');
  const reeds = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#2f6b46" stroke-width="7" stroke-linecap="round"><path d="M0 0q-10-90 -30-170"/><path d="M14 0q4-110 -4-200"/><path d="M28 0q16-80 40-150"/><ellipse cx="-30" cy="-170" rx="7" ry="22" fill="#6b4a2e" stroke="none"/></g>`;
  const pads = [[180, 300], [1440, 360], [260, 620], [1380, 720], [560, 820], [1050, 860], [1500, 560], [120, 860], [820, 220]].map(([x, y], i) => `<path d="M${x} ${y} m-58 0 a58 26 0 1 0 116 0 a58 26 0 1 0 -116 0" fill="#2f7a4f" stroke="#1d5236" stroke-width="4" transform="rotate(${(i * 37) % 40 - 20} ${x} ${y})"/><path d="M${x} ${y} l50 -10" stroke="#163f2a" stroke-width="5"/>`).join('');
  const flies = [[330, 210], [1240, 250], [700, 790], [1500, 470], [150, 520], [980, 140]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#e8ff8a" opacity=".18"/><circle cx="${x}" cy="${y}" r="5" fill="#f2ffb0"/>`).join('');
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="st-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1838"/><stop offset="1" stop-color="#1c3150"/></linearGradient><linearGradient id="st-pond" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16404a"/><stop offset="1" stop-color="#0d2a31"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#st-pond)"/><rect width="1600" height="160" fill="url(#st-night)"/>${stars}
  <path d="M0 165 Q80 100 160 140 T340 130 T520 150 T720 120 T900 145 T1100 118 T1300 140 T1480 115 T1600 135 V190 H0Z" fill="#0f2a2e"/>
  <g fill="none" stroke="#2a5a62" stroke-width="4" stroke-linecap="round" opacity=".6"><path d="M200 420q40-14 80 0t80 0"/><path d="M1180 520q40-14 80 0t80 0"/><path d="M560 300q40-14 80 0t80 0"/><path d="M900 780q40-14 80 0t80 0"/><path d="M300 760q40-14 80 0t80 0"/></g>
  ${pads}
  <ellipse cx="800" cy="880" rx="300" ry="70" fill="#24493a" stroke="#183a2b" stroke-width="6"/>
  ${reeds(70, 340, 1.1)}${reeds(130, 560, .9)}${reeds(1530, 300, 1.1)}${reeds(1470, 640, 1)}${reeds(60, 880, 1.2)}${reeds(1560, 880, 1.2)}${reeds(1010, 210, .7)}${reeds(470, 200, .6)}
  ${flies}</svg>`;
}

// The bell the game hangs from the bow frame (art slot stage/ferry/bell).
export const bellArt = () => `<svg viewBox="0 0 120 140" aria-hidden="true"><path d="M60 6v18" stroke="#5e3b1f" stroke-width="8"/><path d="M60 22c-26 0-36 22-38 52-2 22-10 34-16 42h108c-6-8-14-20-16-42-2-30-12-52-38-52Z" fill="#e3b23c" stroke="#8a6215" stroke-width="5"/><path d="M38 60q4-22 18-28" fill="none" stroke="#fff3c4" stroke-width="6" stroke-linecap="round"/><circle cx="60" cy="122" r="12" fill="#b0841f" stroke="#8a6215" stroke-width="4"/></svg>`;

// Hops walking, for the marsh boardwalks (art slot stage/marsh/hops).
export const hopsArt = color => `<svg viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="112" rx="30" ry="6" fill="#000" opacity=".25"/><ellipse cx="60" cy="78" rx="30" ry="32" fill="${color || '#4f9a3e'}" stroke="#25451c" stroke-width="4"/><circle cx="46" cy="44" r="13" fill="#fff" stroke="#25451c" stroke-width="4"/><circle cx="74" cy="44" r="13" fill="#fff" stroke="#25451c" stroke-width="4"/><circle cx="47" cy="45" r="5"/><circle cx="73" cy="45" r="5"/><rect x="40" y="4" width="40" height="28" rx="3" fill="#1d1d24"/><rect x="32" y="28" width="56" height="7" rx="3" fill="#1d1d24"/><path d="M48 92q12 8 24 0" fill="none" stroke="#25451c" stroke-width="4" stroke-linecap="round"/><path d="M96 30v84" stroke="#7a5230" stroke-width="5"/><circle cx="96" cy="26" r="7" fill="#ffd34d" stroke="#b07d10" stroke-width="3"/></svg>`;
