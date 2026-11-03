import { writeFileSync } from 'node:fs';
import { SCENE_LAYOUTS, floorHorizonY } from '../src/config/sceneLayout.ts';

// Repo-native SVG drafts, generated without editing or embedding the old raster image.
for (const layout of Object.values(SCENE_LAYOUTS)) {
  const mobile = layout.id === 'mobile';
  const W = mobile ? 900 : 1600, H = mobile ? 1600 : 900;
  const x = percent => W * percent / 100, y = percent => H * percent / 100;
  const statueScale = H / 900 * 1.12;
  const columns = (mobile ? [7, 93] : [10, 25, 75, 90]).map(p => `<g>
    <rect x="${x(p)-W*.014}" y="${y(12)}" width="${W*.028}" height="${y(54)}" fill="url(#wood)" stroke="#9c743d" stroke-width="2"/>
    <path d="M${x(p)-W*.018} ${y(14)}h${W*.036}M${x(p)-W*.018} ${y(63)}h${W*.036}" stroke="#c59a51" stroke-width="${H*.012}"/>
    <path d="M${x(p)-W*.007} ${y(18)}v${y(42)}" stroke="#b98b45" stroke-width="2" opacity=".5"/>
  </g>`).join('');
  const floorLines = [-50, -20, 0, 20, 40, 60, 80, 100, 120, 150].map(p => `<path d="M${x(50)} ${y(floorHorizonY(layout))}L${x(p)} ${H}"/>`).join('');
  const floorRows = [69, 77, 88, 99].map(p => `<path d="M0 ${y(p)}H${W}"/>`).join('');
  const burnerWidth = W * (mobile ? .19 : .075);
  const burnerHeight = H * .042;
  const bx = x(layout.points.burner.x), by = y(layout.points.burner.y);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="floor-clip"><rect y="${y(64)}" width="${W}" height="${y(36)}"/></clipPath>
    <linearGradient id="wall" x2="0" y2="1"><stop stop-color="#24160f"/><stop offset=".6" stop-color="#594026"/><stop offset="1" stop-color="#2a1b13"/></linearGradient>
    <linearGradient id="wood"><stop stop-color="#24140e"/><stop offset=".4" stop-color="#614128"/><stop offset=".65" stop-color="#422719"/><stop offset="1" stop-color="#23160f"/></linearGradient>
    <linearGradient id="gold"><stop stop-color="#725025"/><stop offset=".25" stop-color="#e8c77a"/><stop offset=".56" stop-color="#b68a43"/><stop offset=".8" stop-color="#e1bb66"/><stop offset="1" stop-color="#755026"/></linearGradient>
    <linearGradient id="floor" x2="0" y2="1"><stop stop-color="#6c5235"/><stop offset="1" stop-color="#322419"/></linearGradient>
    <radialGradient id="light"><stop stop-color="#f0cc82" stop-opacity=".2"/><stop offset="1" stop-color="#f0cc82" stop-opacity="0"/></radialGradient>
    <pattern id="lattice" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M18 0L36 18 18 36 0 18z" fill="none" stroke="#b38e51" stroke-width="1" opacity=".14"/></pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#wall)"/>
  <rect x="${x(18)}" y="${y(13)}" width="${x(64)}" height="${y(48)}" fill="url(#lattice)"/>
  <path d="M0 0H${W}V${y(7)}H0z" fill="#22140f"/>
  <path d="M0 ${y(8)}H${W}M0 ${y(11)}H${W}" stroke="#a67f44" stroke-width="${H*.005}"/>
  <path d="M${x(12)} ${y(14)}L${x(50)} ${y(3)} ${x(88)} ${y(14)}" fill="none" stroke="#906a36" stroke-width="${H*.015}"/>
  <ellipse cx="${x(50)}" cy="${y(40)}" rx="${W*.42}" ry="${H*.48}" fill="url(#light)"/>
  ${columns}
  <path d="M0 ${y(64)}H${W}V${H}H0z" fill="url(#floor)"/>
  <g clip-path="url(#floor-clip)" stroke="#bfa277" stroke-width="1.2" opacity=".2">${floorLines}${floorRows}</g>
  <path d="M${x(47)} ${y(65)}H${x(53)}L${x(mobile?70:61)} ${H}H${x(mobile?30:39)}z" fill="#653c2d" opacity=".8"/>
  <path d="M${x(47)} ${y(65)}L${x(mobile?30:39)} ${H}M${x(53)} ${y(65)}L${x(mobile?70:61)} ${H}" stroke="#b68c51" stroke-width="2" opacity=".7"/>
  <g fill="#4a2e1c" stroke="#b38a49" stroke-width="2">
    <rect x="${x(mobile?17:35)}" y="${y(47)}" width="${x(mobile?66:30)}" height="${y(7)}" rx="4"/>
    <path d="M${x(mobile?15:33)} ${y(54)}H${x(mobile?85:67)}L${x(mobile?90:71)} ${y(60)}H${x(mobile?10:29)}z"/>
    <path d="M${x(mobile?10:29)} ${y(60)}H${x(mobile?90:71)}L${x(mobile?95:75)} ${y(65)}H${x(mobile?5:25)}z"/>
  </g>
  <g transform="translate(${x(50)} ${y(layout.points.halo.y)}) scale(${statueScale})" fill="url(#gold)" stroke="#79562a" stroke-width="1.5">
    <path d="M-28 20Q-58 28-68 84L-114 127Q-130 149-91 155H91Q130 149 114 127L68 84Q58 28 28 20Z"/>
    <ellipse cx="0" cy="-2" rx="27" ry="34"/>
    <path d="M-26-12Q-28-40 0-42Q28-40 26-12Q12-24 0-22Q-12-24-26-12" fill="#8d6835"/>
    <ellipse cx="0" cy="-43" rx="9" ry="10"/>
    <path d="M-55 48Q-66 111-12 114L20 113M56 49Q69 99 23 115M-85 137Q-30 113 15 139Q54 122 88 141M-17 28L-35 98M15 32Q25 70 12 106" fill="none" stroke="#8c632d" stroke-width="3"/>
    <path d="M-16 0q6 4 11 0M5 0q6 4 11 0M-6 18q6 3 12 0" fill="none" stroke="#6e4c26" stroke-width="1.5"/>
    <path d="M-125 156Q0 174 125 156L112 173H-112z"/>
  </g>
  <g transform="translate(${bx} ${by})" fill="url(#gold)" stroke="#705029" stroke-width="2">
    <path d="M${-burnerWidth*.45} 0Q${-burnerWidth*.43} ${burnerHeight} 0 ${burnerHeight}Q${burnerWidth*.43} ${burnerHeight} ${burnerWidth*.45} 0Z"/>
    <ellipse rx="${burnerWidth*.5}" ry="${burnerHeight*.13}"/>
    <path d="M${-burnerWidth*.3} ${burnerHeight*.7}l${-burnerWidth*.04} ${burnerHeight*.5}M${burnerWidth*.3} ${burnerHeight*.7}l${burnerWidth*.04} ${burnerHeight*.5}" fill="none" stroke-width="${burnerWidth*.06}"/>
    <path d="M${-burnerWidth*.46} ${burnerHeight*.15}Q${-burnerWidth*.8} ${-burnerHeight*.3} ${-burnerWidth*.52} ${-burnerHeight*.45}M${burnerWidth*.46} ${burnerHeight*.15}Q${burnerWidth*.8} ${-burnerHeight*.3} ${burnerWidth*.52} ${-burnerHeight*.45}" fill="none"/>
  </g>
  <g fill="#e8c581">
    <rect x="${x(mobile?14:31)}" y="${y(49)}" width="${W*.009}" height="${H*.07}" rx="3"/>
    <rect x="${x(mobile?85:68)}" y="${y(49)}" width="${W*.009}" height="${H*.07}" rx="3"/>
  </g>
  <g fill="#ffe6a1"><ellipse cx="${x(mobile?14.45:31.45)}" cy="${y(48)}" rx="${W*.005}" ry="${H*.012}"/><ellipse cx="${x(mobile?85.45:68.45)}" cy="${y(48)}" rx="${W*.005}" ry="${H*.012}"/></g>
  </svg>`;
  writeFileSync(new URL(`../public/assets/web/temple-layout-${layout.id}.svg`, import.meta.url), svg);
}
console.log('Wrote desktop/mobile SVG layout drafts. Anchors from src/config/sceneLayout.ts.');
