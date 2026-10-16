#!/usr/bin/env node
/**
 * render-schematic.mjs
 * Renders a flow model (see references/flow-schema.md) into two artifacts:
 * - a standalone SVG overview of the whole connected system, and
 * - an interactive HTML page that embeds the same SVG plus a per-stage inspector.
 * Both are fully pre-rendered, work offline, and have no runtime dependencies.
 */

import { readFileSync, writeFileSync } from 'node:fs';

export const TIERS = {
  low: { button: 'Low (Quick)', heading: 'Low tier · executive summary' },
  med: { button: 'Medium (Steps)', heading: 'Medium tier · step-by-step sequence' },
  high: { button: 'High (Deep)', heading: 'High tier · deep technical specification' }
};
const TIER_ALIASES = { low: 'low', quick: 'low', med: 'med', medium: 'med', steps: 'med', high: 'high', deep: 'high' };
export const NODE_TYPES = ['ingress', 'interlock', 'processor', 'egress', 'error'];

export function resolveTier(value) {
  const tier = TIER_ALIASES[String(value || 'high').toLowerCase()];
  if (!tier) throw new Error(`Unknown tier "${value}". Use low, med, or high.`);
  return tier;
}

/** Returns a list of human-readable problems; an empty list means the flow is valid. */
export function validateFlow(flow, tier) {
  const errors = [];
  const check = (ok, msg) => ok || errors.push(msg);
  if (!flow || typeof flow !== 'object') return ['Flow must be a JSON object.'];
  check(typeof flow.title === 'string' && flow.title.trim(), '"title" must be a non-empty string.');
  check(Array.isArray(flow.nodes) && flow.nodes.length, '"nodes" must be a non-empty array.');
  const ids = new Set();
  (flow.nodes || []).forEach((n, i) => {
    const at = `nodes[${i}]`;
    check(typeof n.id === 'string' && n.id, `${at}.id must be a non-empty string.`);
    check(!ids.has(n.id), `${at}.id "${n.id}" is a duplicate.`);
    ids.add(n.id);
    check(typeof n.label === 'string' && n.label, `${at}.label must be a non-empty string.`);
    check(NODE_TYPES.includes(n.type), `${at}.type must be one of: ${NODE_TYPES.join(', ')}.`);
    if (tier) check(n.ste100?.[tier], `${at}.ste100.${tier} is missing (the requested tier).`);
    else check(Object.keys(TIERS).some(t => n.ste100?.[t]), `${at}.ste100 needs at least one of low, med, high.`);
    check(n.validations === undefined || Array.isArray(n.validations), `${at}.validations must be an array.`);
  });
  check(flow.connections === undefined || Array.isArray(flow.connections), '"connections" must be an array.');
  (flow.connections || []).forEach((c, i) =>
    check(ids.has(c.from) && ids.has(c.to), `connections[${i}] references an unknown node (${c.from} → ${c.to}).`));
  (flow.scenarios || []).forEach((s, i) => {
    check(s.id && s.name, `scenarios[${i}] needs "id" and "name".`);
    (s.path || []).forEach(id => check(ids.has(id), `scenarios[${i}].path references unknown node "${id}".`));
  });
  return errors;
}

function assertFlow(flow, tier) {
  const errors = validateFlow(flow, tier);
  if (errors.length) throw new Error(`Invalid flow model:\n  - ${errors.join('\n  - ')}`);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (s, n) => (s = String(s ?? '')).length > n ? s.slice(0, n - 1) + '…' : s;

/** Word-wraps text to `max` chars per line; the last allowed line absorbs and clips the rest. */
function wrap(text, max, maxLines) {
  const lines = [];
  for (const word of String(text ?? '').split(/\s+/).filter(Boolean)) {
    const last = lines.length - 1;
    if (last >= 0 && (lines[last] + ' ' + word).length <= max) lines[last] += ' ' + word;
    else lines.push(word);
  }
  if (lines.length > maxLines) lines.splice(maxLines - 1, Infinity, lines.slice(maxLines - 1).join(' '));
  return lines.map(l => clip(l, max));
}

const textLines = (lines, x, y, lineHeight, cls, anchor = 'start') =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${lines
    .map((l, i) => `<tspan x="${x}" dy="${i ? lineHeight : 0}">${esc(l)}</tspan>`).join('')}</text>`;

// ---------------------------------------------------------------------------
// Layout: main nodes flow left→right and wrap into rows; each error node sits
// in a lane directly below the node that rejects into it.
// ---------------------------------------------------------------------------
export const GEOMETRY = { W: 190, H: 104, GAP: 130, PAD: 48, LANE: 96, ROW_GAP: 96 };

export function layoutFlow(flow, { top = 64 } = {}) {
  const { W, H, GAP, PAD, LANE, ROW_GAP } = GEOMETRY;
  const conns = flow.connections || [];
  const main = flow.nodes.filter(n => n.type !== 'error');
  const rows = Math.ceil(main.length / 5) || 1;
  const cols = Math.max(1, Math.ceil(main.length / rows));
  const pos = {};
  main.forEach((n, k) => (pos[n.id] = { row: Math.floor(k / cols), col: k % cols, lane: false }));

  const taken = new Set();
  flow.nodes.filter(n => n.type === 'error').forEach(n => {
    const src = pos[conns.find(c => c.to === n.id && pos[c.from] && !pos[c.from].lane)?.from] || { row: rows - 1, col: 0 };
    let col = src.col;
    while (taken.has(`${src.row}:${col}`)) col++;
    taken.add(`${src.row}:${col}`);
    pos[n.id] = { row: src.row, col, lane: true };
  });

  const usedCols = Math.max(cols, ...Object.values(pos).map(p => p.col + 1));
  const rowY = [];
  let y = top;
  for (let r = 0; r < rows; r++) {
    const hasLane = Object.values(pos).some(p => p.lane && p.row === r);
    rowY.push({ main: y, lane: y + H + LANE });
    y += H + (hasLane ? LANE + H : 0) + ROW_GAP;
  }
  for (const p of Object.values(pos)) {
    p.x = PAD + p.col * (W + GAP);
    p.y = p.lane ? rowY[p.row].lane : rowY[p.row].main;
  }
  return { pos, width: PAD * 2 + usedCols * W + (usedCols - 1) * GAP, height: y - ROW_GAP + 64 };
}

/** SVG path + label anchor for one connection. */
function routeCable(a, b) {
  const { W, H, PAD, ROW_GAP } = GEOMETRY;
  if (!a.lane && !b.lane && a.row === b.row && b.col === a.col + 1) {
    const y = a.y + H / 2, x1 = a.x + W, x2 = b.x;
    return { d: `M${x1} ${y}H${x2 - 4}`, lx: (x1 + x2) / 2, ly: y - 10, stack: 'up' };
  }
  if (!a.lane && !b.lane && b.row === a.row + 1 && b.col === 0) {
    // Row wrap: leave right, run back along the gap above the next row, enter from the left.
    const xr = a.x + W + PAD / 2, xl = b.x - PAD / 2, ym = b.y - ROW_GAP / 2, y1 = a.y + H / 2, y2 = b.y + H / 2;
    return { d: `M${a.x + W} ${y1}H${xr}V${ym}H${xl}V${y2}H${b.x - 4}`, lx: (xr + xl) / 2, ly: ym - 8, stack: 'up' };
  }
  if (a.y === b.y) {
    // Skip or back edge on the same row: arc over the top.
    const x1 = a.x + W / 2, x2 = b.x + W / 2, peak = a.y - 44;
    return { d: `M${x1} ${a.y}C${x1} ${peak} ${x2} ${peak} ${x2} ${a.y - 4}`, lx: (x1 + x2) / 2, ly: a.y - 39, stack: 'up' };
  }
  const down = b.y > a.y;
  const x1 = a.x + W / 2, y1 = down ? a.y + H : a.y, x2 = b.x + W / 2, y2 = down ? b.y - 4 : b.y + H + 4, ym = (y1 + y2) / 2;
  return { d: `M${x1} ${y1}C${x1} ${ym} ${x2} ${ym} ${x2} ${y2}`, lx: (x1 + x2) / 2 + 10, ly: ym + 4, anchor: 'start', stack: 'down' };
}

const SVG_CSS = `
.diagram{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.diagram .bg{fill:var(--surface,#fff)}
.ttl{font-size:20px;font-weight:700;fill:var(--text-1,#09090b)}
.cpt{font-size:12px;fill:var(--text-3,#71717a)}
.card{fill:var(--surface,#fff);stroke:var(--border,#e4e4e7);stroke-width:1.5}
.head{fill:var(--surface-2,#f4f4f5)}
.tag,.code,.lbl,.leg{font-family:ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace}
.tag{font-size:9px;font-weight:600;letter-spacing:.06em;fill:var(--text-3,#71717a)}
.name{font-size:13px;font-weight:600;fill:var(--text-1,#09090b)}
.sub{font-size:11px;fill:var(--text-3,#71717a)}
.code{font-size:9.5px;fill:var(--text-4,#a1a1aa)}
.wire path{fill:none;stroke:var(--wire,#a1a1aa);stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.wire.err path{stroke:var(--err,#dc2626);stroke-dasharray:6 5}
.ah{fill:var(--wire,#a1a1aa)} .ah.err{fill:var(--err,#dc2626)}
.lbl,.leg{font-size:10px;fill:var(--text-3,#52525b)}
.lbl{paint-order:stroke;stroke:var(--surface,#fff);stroke-width:5px;stroke-linejoin:round}
.t-error .card{stroke:var(--err,#dc2626)} .t-error .head{fill:var(--err-soft,#fef2f2)} .t-error .tag{fill:var(--err,#dc2626)}`;

/** The full connected-system diagram. `standalone` adds a title band and background for use as an image. */
export function renderDiagramSvg(flow, { standalone = true } = {}) {
  assertFlow(flow);
  const { W, H } = GEOMETRY;
  const { pos, width, height } = layoutFlow(flow, { top: standalone ? 120 : 64 });
  const byId = Object.fromEntries(flow.nodes.map(n => [n.id, n]));

  const wires = (flow.connections || []).filter(c => pos[c.from] && pos[c.to]).map(c => {
    const r = routeCable(pos[c.from], pos[c.to]);
    const err = byId[c.to].type === 'error';
    const lines = c.label ? wrap(c.label, 18, 2) : [];
    const ly = r.stack === 'up' ? r.ly - (lines.length - 1) * 12 : r.ly - ((lines.length - 1) * 12) / 2;
    return `<g class="wire${err ? ' err' : ''}" data-edge="${esc(c.from)}--${esc(c.to)}"><path d="${r.d}" marker-end="url(#ah${err ? '-err' : ''})"/>` +
      (lines.length ? textLines(lines, r.lx, ly, 12, 'lbl', r.anchor || 'middle') : '') + '</g>';
  }).join('');

  const cards = flow.nodes.map((n, i) => {
    const p = pos[n.id];
    const name = wrap(n.label, 24, 2);
    const subY = 46 + name.length * 17;
    return `<g class="node t-${n.type}" data-id="${esc(n.id)}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${esc(n.label)}">` +
      `<title>${esc([n.label, n.sub, n.codeRef].filter(Boolean).join('\n'))}</title>` +
      `<rect class="card" width="${W}" height="${H}" rx="10"/>` +
      `<path class="head" d="M0 26V10A10 10 0 0 1 10 0H${W - 10}A10 10 0 0 1 ${W} 10V26Z"/>` +
      `<text class="tag" x="12" y="17">${String(i + 1).padStart(2, '0')} · ${esc(n.type.toUpperCase())}</text>` +
      textLines(name, 12, 46, 17, 'name') +
      `<text class="sub" x="12" y="${subY}">${esc(clip(n.sub, 30))}</text>` +
      (n.codeRef ? `<text class="code" x="12" y="${H - 11}">${esc(clip(n.codeRef.split('/').pop(), 30))}</text>` : '') + '</g>';
  }).join('');

  const hasErrors = flow.nodes.some(n => n.type === 'error');
  const ly = height - 26;
  const legend = `<g transform="translate(${GEOMETRY.PAD} ${ly})"><path d="M0 0H28" stroke="var(--wire,#a1a1aa)" stroke-width="1.75"/>` +
    `<text class="leg" x="36" y="3.5">Main path</text>` + (hasErrors
      ? `<path d="M120 0H148" stroke="var(--err,#dc2626)" stroke-width="1.75" stroke-dasharray="6 5"/><text class="leg" x="156" y="3.5">Error / rejection path</text>` : '') + '</g>';

  const marker = (id, cls) => `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="${cls}" d="M0 1L9 5L0 9z"/></marker>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="diagram" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(flow.title)}">` +
    `<style>${SVG_CSS}</style><defs>${marker('ah', 'ah')}${marker('ah-err', 'ah err')}</defs>` +
    (standalone ? `<rect class="bg" width="100%" height="100%"/>${textLines([flow.title], GEOMETRY.PAD, 52, 0, 'ttl')}` +
      (flow.concept ? textLines(wrap(flow.concept, 110, 2), GEOMETRY.PAD, 76, 16, 'cpt') : '') : '') +
    `<g>${wires}</g><g>${cards}</g>${legend}${standalone ? '' : '<circle class="pulse" r="5"/>'}</svg>`;
}

// ---------------------------------------------------------------------------
// Interactive HTML page
// ---------------------------------------------------------------------------
const PAGE_CSS = `
:root{--bg:#fafafa;--surface:#fff;--surface-2:#f4f4f5;--border:#e4e4e7;--border-strong:#a1a1aa;--text-1:#09090b;--text-2:#3f3f46;--text-3:#71717a;--text-4:#a1a1aa;--wire:#a1a1aa;--err:#dc2626;--err-soft:#fef2f2;--pill:#09090b;--pill-text:#fff;
  --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--mono:ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b0d;--surface:#141417;--surface-2:#1c1c20;--border:#2a2a30;--border-strong:#52525b;--text-1:#f4f4f5;--text-2:#d4d4d8;--text-3:#a1a1aa;--text-4:#71717a;--wire:#52525b;--err:#f87171;--err-soft:#2a1416;--pill:#f4f4f5;--pill-text:#09090b;color-scheme:dark}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text-1);font-family:var(--sans);min-height:100vh;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased}
.bar{background:var(--surface);border-bottom:1px solid var(--border);padding:12px clamp(16px,3vw,32px);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
header.bar{position:sticky;top:0;z-index:5}
.brand{display:flex;align-items:center;gap:12px;min-width:0} h1{font-size:15px;font-weight:600}
.badge,.pill,kbd,.ref,.count{font-family:var(--mono);font-size:11px;border:1px solid var(--border);background:var(--surface-2);border-radius:6px;padding:3px 8px;color:var(--text-2)}
.pill{background:var(--pill);color:var(--pill-text);border-color:var(--pill);font-weight:600}
.chips,.controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.caption,h3{font-family:var(--mono);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text-4)}
button{font:500 12px var(--sans);background:var(--surface);color:var(--text-2);border:1px solid var(--border);border-radius:999px;padding:5px 12px;cursor:pointer;transition:color .16s,border-color .16s,transform .1s}
button:hover{color:var(--text-1);border-color:var(--border-strong)} button:active{transform:scale(.97)}
button[aria-pressed=true],button.primary{background:var(--pill);color:var(--pill-text);border-color:var(--pill)}
.controls button{border-radius:6px}
main{flex:1;width:100%;max-width:1480px;margin:0 auto;padding:clamp(16px,3vw,32px);display:flex;flex-direction:column;gap:24px}
.card-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.card-head{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;font-size:13px;font-weight:600}
.hint{font:11px var(--mono);color:var(--text-4);display:flex;gap:6px;align-items:center}
.viewport{overflow-x:auto;padding:8px}
.viewport svg{display:block;margin:0 auto;height:auto;width:100%;min-width:var(--min-w)}
.node{cursor:pointer;outline:none} .node,.wire{transition:opacity .2s}
.node:hover .card{stroke:var(--border-strong)} .node:focus-visible .card{stroke:var(--text-2);stroke-dasharray:4 3}
.node.active .card{stroke:var(--text-1);stroke-width:2.4} .t-error.active .card{stroke:var(--err)}
.node.dim,.wire.dim{opacity:.25} .wire.on path{stroke:var(--text-1);stroke-width:2.6} .wire.err.on path{stroke:var(--err)}
.pulse{fill:var(--text-1);opacity:0;pointer-events:none}
.stage{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:24px} .stage[hidden]{display:none}
@media (max-width:900px){.stage{grid-template-columns:1fr}}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:16px}
.panel h2{font-size:22px;letter-spacing:-.02em} .muted{color:var(--text-3);font-size:14px;line-height:1.5} .ref{align-self:flex-start;word-break:break-all}
.story{background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:8px} .story p{font-size:15px;line-height:1.6}
.tier{border:1px solid var(--border);border-radius:8px;padding:14px 16px;display:flex;flex-direction:column;gap:6px} .tier p{font-size:14px;line-height:1.55;color:var(--text-2)}
ul{list-style:none;display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--text-2)} li::before{content:"✓ ";font-weight:700;color:var(--text-1)} li.none::before{content:"— "}
.t-error-panel h2{color:var(--err)}
pre{background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:16px;font:12px/1.5 var(--mono);color:var(--text-2);overflow-x:auto}
footer.bar{font:11px var(--mono);color:var(--text-3);border-top:1px solid var(--border);border-bottom:0}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}`;

function stagePanel(n, i, total, tier) {
  const checks = n.validations?.length ? n.validations.map(v => `<li>${esc(v)}</li>`).join('') : '<li class="none">No guard checks on this stage.</li>';
  return `<article class="stage" data-id="${esc(n.id)}"${i ? ' hidden' : ''}>
  <section class="panel${n.type === 'error' ? ' t-error-panel' : ''}">
    <h3>Stage ${i + 1} of ${total} · ${esc(n.type)}</h3>
    <div><h2>${esc(n.label)}</h2>${n.sub ? `<p class="muted">${esc(n.sub)}</p>` : ''}</div>
    <span class="ref">${n.codeRef ? `Source: ${esc(n.codeRef)}` : 'Framework boundary'}</span>
    ${n.story ? `<div class="story"><h3>How it works in plain English</h3><p>${esc(n.story)}</p></div>` : ''}
    <div class="tier"><h3>${TIERS[tier].heading}</h3><p>${esc(n.ste100[tier])}</p></div>
    <h3>Rules enforced at this stage</h3><ul>${checks}</ul>
    <h3>What happens if something fails?</h3><p class="muted">${esc(n.edgeCases || 'Standard operating path.')}</p>
  </section>
  <section class="panel"><h3>Data contract in transit</h3><pre>${esc(JSON.stringify(n.payload ?? {}, null, 2))}</pre></section>
</article>`;
}

// Client script: all content is pre-rendered, so it only toggles classes and `hidden`.
const CLIENT_JS = `
const $ = s => [...document.querySelectorAll(s)];
const vp = document.querySelector('.viewport'), dot = document.querySelector('.pulse');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
let path = SCENARIOS[0].path, step = 0, timer = null;
const edges = upto => new Set(path.slice(0, upto).map((id, k) => id + '--' + path[k + 1]));

function show(i) {
  step = (i + path.length) % path.length;
  const id = path[step], lit = edges(step), onPath = edges(path.length - 1);
  $('.node').forEach(g => { g.classList.toggle('active', g.dataset.id === id); g.classList.toggle('dim', !path.includes(g.dataset.id)); });
  $('.wire').forEach(w => { w.classList.toggle('on', lit.has(w.dataset.edge)); w.classList.toggle('dim', !onPath.has(w.dataset.edge)); });
  $('.stage').forEach(s => (s.hidden = s.dataset.id !== id));
  document.getElementById('stepBadge').textContent = 'Step ' + (step + 1) + ' of ' + path.length;
  const g = $('.node').find(n => n.dataset.id === id), r = g.getBoundingClientRect(), v = vp.getBoundingClientRect();
  vp.scrollBy({ left: r.left + r.width / 2 - (v.left + v.width / 2), behavior: still ? 'auto' : 'smooth' });
  if (step) pulse(path[step - 1] + '--' + id);
}

function pulse(edge) {
  const p = $('.wire').find(w => w.dataset.edge === edge)?.querySelector('path');
  if (!p || still) return;
  const len = p.getTotalLength(), t0 = performance.now();
  dot.style.opacity = 1;
  requestAnimationFrame(function frame(t) {
    const k = Math.min((t - t0) / 450, 1), pt = p.getPointAtLength(k * len);
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    k < 1 ? requestAnimationFrame(frame) : (dot.style.opacity = 0);
  });
}

function useScenario(sc, at = 0) {
  path = sc.path;
  $('[data-scenario]').forEach(b => b.setAttribute('aria-pressed', b.dataset.scenario === sc.id));
  show(at);
}

function stopAuto() { clearInterval(timer); timer = null; document.getElementById('btnAuto').textContent = 'Auto-play'; }

$('[data-scenario]').forEach(b => b.addEventListener('click', () => { stopAuto(); useScenario(SCENARIOS.find(s => s.id === b.dataset.scenario)); }));
$('.node').forEach(g => {
  const pick = () => {
    const id = g.dataset.id;
    if (path.includes(id)) return show(path.indexOf(id));
    const sc = SCENARIOS.find(s => s.path.includes(id)) || { id: null, path: [id] };
    useScenario(sc, sc.path.indexOf(id));
  };
  g.addEventListener('click', pick);
  g.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick()));
});
document.getElementById('btnPrev').onclick = () => show(step - 1);
document.getElementById('btnNext').onclick = () => show(step + 1);
document.getElementById('btnReset').onclick = () => { stopAuto(); show(0); };
document.getElementById('btnAuto').onclick = e => timer ? stopAuto() : (e.target.textContent = 'Pause', timer = setInterval(() => show(step + 1), 2200));
addEventListener('keydown', e => {
  if (e.target.closest('button, .node')) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(step + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); show(step - 1); }
});
useScenario(SCENARIOS[0]);`;

export function renderSchematicHtml(flow, options = {}) {
  const tier = resolveTier(options.tier || flow.tier);
  assertFlow(flow, tier);
  const mainPath = flow.nodes.filter(n => n.type !== 'error').map(n => n.id);
  const declared = (flow.scenarios || []).map(s => ({ id: s.id, name: s.name, description: s.description, path: s.path?.length ? s.path : mainPath }));
  const scenarios = declared.length ? declared : [{ id: 'main', name: 'Main path', path: mainPath }];
  const svg = renderDiagramSvg(flow, { standalone: false });
  const minWidth = Math.round(layoutFlow(flow).width * 0.72);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(flow.title)} · explain-it</title>
<style>${PAGE_CSS}</style>
</head>
<body>
<header class="bar">
  <div class="brand"><span class="badge">explain-it</span><h1>${esc(flow.title)}</h1></div>
  <span class="pill" title="Explanation depth" data-tier="${tier}">${TIERS[tier].button}</span>
</header>
<nav class="bar">
  <div class="chips"><span class="caption">Walkthrough path</span>
    ${scenarios.map(s => `<button data-scenario="${esc(s.id)}" aria-pressed="false" title="${esc(s.description || '')}">${esc(s.name)}</button>`).join('\n    ')}
  </div>
  <div class="controls">
    <span class="count" id="stepBadge"></span>
    <button id="btnPrev" title="Previous stage (←)">◀ Previous</button>
    <button id="btnNext" class="primary" title="Next stage (Space / →)">Next ▶</button>
    <button id="btnAuto">Auto-play</button>
    <button id="btnReset">Reset</button>
  </div>
</nav>
<main>
  <section class="card-box">
    <div class="card-head"><span>● How everything connects</span>
      <span class="hint">Click a block or press <kbd>Space</kbd><kbd>→</kbd><kbd>←</kbd></span></div>
    <div class="viewport" style="--min-w:${minWidth}px">${svg}</div>
  </section>
  ${flow.nodes.map((n, i) => stagePanel(n, i, flow.nodes.length, tier)).join('\n  ')}
</main>
<footer class="bar"><span>EXPLAIN-IT ARCHITECTURE TRACE</span><span>${esc(flow.concept || '')}</span></footer>
<script>
const SCENARIOS = ${JSON.stringify(scenarios).replace(/</g, '\\u003c')};
${CLIENT_JS}
</script>
</body>
</html>`;
}

// CLI
if (process.argv[1]?.endsWith('render-schematic.mjs')) {
  const arg = name => { const i = process.argv.indexOf(name); return i > 1 ? process.argv[i + 1] : undefined; };
  const fixture = arg('--fixture');
  if (!fixture) {
    console.log('Usage: node render-schematic.mjs --fixture <flow.json> --out <page.html> [--tier low|med|high] [--svg <overview.svg>]');
    process.exit(1);
  }
  try {
    const out = arg('--out') || 'schematic.html';
    const svgOut = arg('--svg') || out.replace(/\.html?$/i, '') + '.svg';
    const flow = JSON.parse(readFileSync(fixture, 'utf8'));
    const tier = resolveTier(arg('--tier') || flow.tier);
    writeFileSync(out, renderSchematicHtml(flow, { tier }), 'utf8');
    writeFileSync(svgOut, renderDiagramSvg(flow), 'utf8');
    console.log(`\n✨ Interactive page (${tier} tier): ${out}\n🗺️  System overview SVG: ${svgOut}`);
  } catch (err) {
    console.error(`Error rendering schematic: ${err.message}`);
    process.exit(1);
  }
}
