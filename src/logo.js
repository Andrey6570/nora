// The logo of Nora: a little fox peeking out of its burrow (a mound) with a star above. One drawing in a 512 x 512 box,
// used by the app (inline SVG) and by tools/make-icons.mjs, which turns it into every icon and splash file.

export const COLORS = {
  cream: "#FFF1E4", creamDark: "#FFDFC6", orange: "#F2762E", ear: "#5A2E1B", cheek: "#FFF8F0",
  ink: "#2B1A12", mound: "#B5603A", moundDark: "#8F4727", moundHi: "#E0A06E", grass: "#5F9A57", star: "#FFC857", accent: "#C8643B"
};

// The head: ears, cheeks and chin, symmetrical around x = 256
export const HEAD = "M256 384 C190 384 120 304 118 218 L140 112 L215 170 Q256 158 297 170 L372 112 L394 218 C392 304 322 384 256 384 Z";
const EAR_L = "M152 152 L197 184 L150 207 Z", EAR_R = "M360 152 L315 184 L362 207 Z";
const CHEEKS = "M256 384 C215 384 160 334 150 262 Q200 288 256 292 Q312 288 362 262 C352 334 297 384 256 384 Z";
export const MOUND = { cx: 256, cy: 424, rx: 156, ry: 80 };
export const EYES = [[205, 236], [307, 236]];
const PAWS = [200, 312];
// grass tufts on the rim of the mound: [x, direction of the lean]
const TUFTS = [[132, 1], [380, -1]];
export const NOSE = [256, 320];

export function starPath(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? r : R;
    pts.push((cx + d * Math.cos(a)).toFixed(1) + " " + (cy + d * Math.sin(a)).toFixed(1));
  }
  return "M" + pts.join(" L") + " Z";
}
export const STAR = starPath(256, 96, 36, 15);

// The colour drawing (no background)
export const ART = `
  <path d="${HEAD}" fill="${COLORS.orange}"/>
  <path d="${EAR_L}" fill="${COLORS.ear}"/><path d="${EAR_R}" fill="${COLORS.ear}"/>
  <path d="${CHEEKS}" fill="${COLORS.cheek}"/>
  ${EYES.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="18" fill="${COLORS.ink}"/><circle cx="${x + 4}" cy="${y - 6}" r="4.5" fill="#fff"/>`).join("")}
  <ellipse cx="${NOSE[0]}" cy="${NOSE[1]}" rx="21" ry="14" fill="${COLORS.ink}"/>
  <ellipse cx="${MOUND.cx}" cy="${MOUND.cy}" rx="${MOUND.rx}" ry="${MOUND.ry}" fill="${COLORS.mound}"/>
  <path d="M126 396 Q256 336 386 396" fill="none" stroke="${COLORS.moundHi}" stroke-width="14" stroke-linecap="round" opacity=".55"/>
  <path d="M120 478 Q256 500 392 478" fill="none" stroke="${COLORS.moundDark}" stroke-width="12" stroke-linecap="round" opacity=".35"/>
  ${PAWS.map(x => `<ellipse cx="${x}" cy="350" rx="27" ry="19" fill="${COLORS.orange}"/><path d="M${x - 8} 344 v10 M${x + 8} 344 v10" stroke="#D95F1C" stroke-width="4.5" stroke-linecap="round"/>`).join("")}
  ${TUFTS.map(([x, dir]) => `<path d="M${x} 392 Q${x - 5 * dir} 374 ${x - 11 * dir} 364 M${x + 8 * dir} 394 Q${x + 8 * dir} 372 ${x + 8 * dir} 358 M${x + 16 * dir} 392 Q${x + 21 * dir} 376 ${x + 28 * dir} 368" fill="none" stroke="${COLORS.grass}" stroke-width="8" stroke-linecap="round"/>`).join("")}
  <path d="${STAR}" fill="${COLORS.star}" stroke="#E5A92F" stroke-width="4" stroke-linejoin="round"/>`;

// A one-colour silhouette with the eyes and nose cut out: the "themed" Android icon and the notification icon
export const SILHOUETTE_MASK = `<mask id="m"><rect width="512" height="512" fill="#fff"/>
  ${EYES.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="19" ry="24" fill="#000"/>`).join("")}
  <ellipse cx="${NOSE[0]}" cy="${NOSE[1]}" rx="27" ry="18" fill="#000"/>
  <path d="M110 400 Q256 334 402 400" fill="none" stroke="#000" stroke-width="16" stroke-linecap="round"/></mask>`;
export const SILHOUETTE = fill => `<g mask="url(#m)" fill="${fill}"><path d="${HEAD}"/><ellipse cx="${MOUND.cx}" cy="${MOUND.cy}" rx="${MOUND.rx}" ry="${MOUND.ry}"/><path d="${STAR}"/></g>`;

// The art centred and scaled inside the 512 box (the drawing's own centre is a little below the middle of the box)
const centred = scale => `translate(256 256) scale(${scale}) translate(-256 -280)`;

// A transparent mark for the app screens
export function markSvg(size = 96, label = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><g transform="${centred(0.98)}">${ART}</g></svg>`;
}

// The app icon: cream rounded square with the mark. scale is how much of the square the mark fills.
export function iconSvg({ size = 512, scale = 0.86, round = false, background = true } = {}) {
  const bg = background ? `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.cream}"/><stop offset="1" stop-color="${COLORS.creamDark}"/></linearGradient></defs>
    <rect width="512" height="512" rx="${round ? 256 : 112}" fill="url(#g)"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${bg}<g transform="${centred(scale)}">${ART}</g></svg>`;
}
