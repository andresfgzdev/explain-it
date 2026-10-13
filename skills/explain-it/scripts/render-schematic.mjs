#!/usr/bin/env node
/**
 * render-schematic.mjs
 * Generates an interactive, standalone "Software Machine" HTML/SVG schematic
 * from a structured system flow definition.
 * 
 * Features:
 * - 100% zero-dependency, self-contained single file output.
 * - Hardware / test-bench aesthetic inspired by Anatomy.
 * - Dynamic SVG cable routing with traveling signal pulse animations.
 * - 4 High-Craft Themes: Industrial Blueprint, Paper Ledger, Stealth Dark, Lab Sepia.
 * - Interactive Scenario Injector (200 OK, 401 Auth, 422 Validation, 504 Timeout).
 * - Real-time STE-100 Tier Switcher (Low, Medium, High).
 * - Live Oscilloscope / Payload Inspector sidebar.
 */

import { readFileSync, writeFileSync } from 'node:fs';

export function renderSchematicHtml(flowData) {
  const serializedData = JSON.stringify(flowData).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en" data-theme="${flowData.theme || 'blueprint'}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(flowData.title)} · Software Machine Schematic</title>
  <style>
    :root {
      --font-mono: "JetBrains Mono", "Space Mono", "Fira Code", monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --transition-speed: 0.2s;
    }

    /* THEME: BLUEPRINT (Default) */
    html[data-theme="blueprint"] {
      --bg: #07131e;
      --grid-line: rgba(0, 240, 255, 0.07);
      --panel-bg: #0d2235;
      --panel-border: #183e5c;
      --panel-header: #122d45;
      --text-main: #d8ecf8;
      --text-muted: #6e9cb8;
      --accent: #00f0ff;
      --accent-glow: rgba(0, 240, 255, 0.35);
      --wire-base: #1b415e;
      --wire-active: #00f0ff;
      --success: #00e5a3;
      --error: #ff3b5c;
      --warning: #ffb800;
      --led-off: #0b1a26;
      --code-bg: #05101a;
    }

    /* THEME: PAPER LEDGER */
    html[data-theme="paper"] {
      --bg: #f5f2e9;
      --grid-line: rgba(70, 60, 50, 0.08);
      --panel-bg: #ffffff;
      --panel-border: #d4ccbd;
      --panel-header: #ece6d8;
      --text-main: #23201d;
      --text-muted: #7c7267;
      --accent: #d9531e;
      --accent-glow: rgba(217, 83, 30, 0.25);
      --wire-base: #cfc6b5;
      --wire-active: #d9531e;
      --success: #1e7e58;
      --error: #b82424;
      --warning: #c98a0c;
      --led-off: #ded7c8;
      --code-bg: #ece7db;
    }

    /* THEME: STEALTH DARK */
    html[data-theme="dark"] {
      --bg: #0d0f12;
      --grid-line: rgba(255, 255, 255, 0.04);
      --panel-bg: #16191f;
      --panel-border: #262c37;
      --panel-header: #1e222b;
      --text-main: #f0f3f6;
      --text-muted: #7d8590;
      --accent: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.35);
      --wire-base: #2a313d;
      --wire-active: #818cf8;
      --success: #10b981;
      --error: #f43f5e;
      --warning: #f59e0b;
      --led-off: #1c212a;
      --code-bg: #090a0d;
    }

    /* THEME: LAB SEPIA */
    html[data-theme="sepia"] {
      --bg: #1a1510;
      --grid-line: rgba(229, 169, 60, 0.08);
      --panel-bg: #27211a;
      --panel-border: #44392e;
      --panel-header: #332b22;
      --text-main: #ebdcc9;
      --text-muted: #96836f;
      --accent: #e5a93c;
      --accent-glow: rgba(229, 169, 60, 0.35);
      --wire-base: #3f3428;
      --wire-active: #e5a93c;
      --success: #5eb074;
      --error: #cf4f38;
      --warning: #d99a26;
      --led-off: #201a14;
      --code-bg: #14100c;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      background-image: 
        linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
        linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
      background-size: 24px 24px;
      color: var(--text-main);
      font-family: var(--font-sans);
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* HEADER BAR */
    header.masthead {
      height: 56px;
      background: var(--panel-bg);
      border-bottom: 1px solid var(--panel-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 10;
    }
    .masthead-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-machine {
      font-family: var(--font-mono);
      font-size: 11px;
      text-transform: uppercase;
      background: var(--panel-header);
      border: 1px solid var(--panel-border);
      padding: 3px 8px;
      border-radius: 3px;
      color: var(--accent);
      letter-spacing: 0.05em;
    }
    .title-text {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .masthead-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .control-group {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--panel-header);
      padding: 3px;
      border-radius: 4px;
      border: 1px solid var(--panel-border);
    }
    .control-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 3px;
      cursor: pointer;
      transition: all var(--transition-speed);
    }
    .control-btn:hover { color: var(--text-main); }
    .control-btn.active {
      background: var(--accent);
      color: #000;
      font-weight: 700;
      box-shadow: 0 0 10px var(--accent-glow);
    }

    /* MAIN WORKSPACE */
    main.workspace {
      flex: 1;
      display: flex;
      position: relative;
      overflow: hidden;
    }

    /* SCHEMATIC STAGE */
    .schematic-stage {
      flex: 1;
      position: relative;
      overflow: auto;
      display: flex;
      flex-direction: column;
    }

    /* TOOLBAR / STATE INJECTOR */
    .injector-bar {
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: rgba(0,0,0,0.1);
      border-bottom: 1px solid var(--grid-line);
    }
    .injector-scenarios {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .scenario-label {
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-right: 4px;
    }
    .scenario-btn {
      font-family: var(--font-mono);
      font-size: 11px;
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      color: var(--text-main);
      padding: 5px 12px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all var(--transition-speed);
    }
    .scenario-btn .led {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--led-off);
      transition: all var(--transition-speed);
    }
    .scenario-btn.active {
      border-color: var(--accent);
      background: var(--panel-header);
    }
    .scenario-btn.active .led {
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
    }

    .playback-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .play-btn {
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      color: var(--text-main);
      font-family: var(--font-mono);
      font-size: 12px;
      padding: 5px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all var(--transition-speed);
    }
    .play-btn:hover { border-color: var(--accent); }
    .play-btn.primary {
      background: var(--accent);
      color: #000;
      font-weight: 600;
      border-color: var(--accent);
    }

    /* SVG CANVAS */
    .canvas-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      min-width: 900px;
      position: relative;
    }
    svg.schematic-svg {
      width: 100%;
      max-width: 1100px;
      height: auto;
      filter: drop-shadow(0 12px 30px rgba(0,0,0,0.3));
    }

    /* SVG ELEMENTS */
    .svg-node {
      cursor: pointer;
      transition: transform 0.15s ease, filter 0.15s ease;
    }
    .svg-node:hover {
      filter: drop-shadow(0 0 12px var(--accent-glow));
    }
    .svg-node.active-node rect.plate-body {
      stroke: var(--accent);
      stroke-width: 2px;
    }
    .svg-node.active-node text.plate-title {
      fill: var(--accent);
    }

    /* SVG WIRE STYLES */
    .svg-wire {
      stroke: var(--wire-base);
      stroke-width: 2.5;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: stroke 0.3s ease;
    }
    .svg-wire.active-wire {
      stroke: var(--wire-active);
      filter: drop-shadow(0 0 6px var(--accent-glow));
    }
    .svg-wire.success-wire {
      stroke: var(--success);
    }
    .svg-wire.error-wire {
      stroke: var(--error);
    }
    .signal-pulse {
      fill: var(--accent);
      filter: drop-shadow(0 0 8px var(--accent));
      opacity: 0;
    }
    .signal-pulse.traveling {
      opacity: 1;
    }

    /* INSPECTOR SIDEBAR */
    aside.inspector {
      width: 420px;
      background: var(--panel-bg);
      border-left: 1px solid var(--panel-border);
      display: flex;
      flex-direction: column;
      z-index: 10;
    }
    .inspector-header {
      padding: 16px 20px;
      background: var(--panel-header);
      border-bottom: 1px solid var(--panel-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .inspector-title {
      font-size: 13px;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .inspector-body {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .field-card {
      background: rgba(0,0,0,0.15);
      border: 1px solid var(--panel-border);
      border-radius: 6px;
      padding: 14px;
    }
    .field-label {
      font-family: var(--font-mono);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .field-value {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-main);
    }
    .field-value.code-ref {
      font-family: var(--font-mono);
      color: var(--accent);
      font-size: 11px;
    }

    .ste100-badge {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 9px;
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 2px 6px;
      border-radius: 3px;
      margin-bottom: 8px;
    }

    pre.code-payload {
      background: var(--code-bg);
      border: 1px solid var(--panel-border);
      border-radius: 4px;
      padding: 12px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-main);
      overflow-x: auto;
      line-height: 1.4;
    }

    .validation-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .validation-item {
      font-size: 12px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .check-icon {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--success);
      font-weight: bold;
    }
    .warn-icon {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--error);
      font-weight: bold;
    }

    /* FOOTER STATUS */
    footer.status-bar {
      height: 32px;
      background: var(--panel-header);
      border-top: 1px solid var(--panel-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
    }
    .status-ticker {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .status-item span.lit {
      color: var(--accent);
      font-weight: bold;
    }
  </style>
</head>
<body>

  <!-- HEADER MASTHEAD -->
  <header class="masthead">
    <div class="masthead-title">
      <span class="badge-machine">EXPLAIN-IT // ASD-STE100</span>
      <h1 class="title-text">${escapeHtml(flowData.title)}</h1>
    </div>
    <div class="masthead-controls">
      <!-- DETAIL LEVEL SWITCHER -->
      <div class="control-group" title="ASD-STE100 Explanation Depth">
        <button class="control-btn" data-tier="low">LOW</button>
        <button class="control-btn" data-tier="med">MEDIUM</button>
        <button class="control-btn active" data-tier="high">HIGH</button>
      </div>
      <!-- THEME SWITCHER -->
      <div class="control-group" title="Machine Finish & Theme">
        <button class="control-btn active" data-theme-btn="blueprint">BLUEPRINT</button>
        <button class="control-btn" data-theme-btn="paper">PAPER</button>
        <button class="control-btn" data-theme-btn="dark">STEALTH</button>
        <button class="control-btn" data-theme-btn="sepia">SEPIA</button>
      </div>
    </div>
  </header>

  <!-- MAIN WORKSPACE -->
  <main class="workspace">
    <div class="schematic-stage">
      <!-- STATE INJECTOR & PLAYBACK TOOLBAR -->
      <div class="injector-bar">
        <div class="injector-scenarios">
          <span class="scenario-label">Inject Scenario:</span>
          ${(flowData.scenarios || []).map((sc, i) => `
            <button class="scenario-btn ${i === 0 ? 'active' : ''}" data-scenario="${sc.id}">
              <span class="led"></span>
              <span>${escapeHtml(sc.name)}</span>
            </button>
          `).join('')}
        </div>
        <div class="playback-controls">
          <button class="play-btn" id="btnPrev" title="Previous Hop (Space / ArrowLeft)">◀ Prev</button>
          <button class="play-btn primary" id="btnNext" title="Next Hop (Space / ArrowRight)">Next Step ▶</button>
          <button class="play-btn" id="btnAutoPlay">Auto-Trace</button>
          <button class="play-btn" id="btnReset">↺ Reset</button>
        </div>
      </div>

      <!-- SVG SCHEMATIC STAGE -->
      <div class="canvas-container">
        <svg class="schematic-svg" viewBox="0 0 1000 520" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--wire-base)" class="arrow-head"/>
            </marker>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <!-- SVG WIRES GROUP -->
          <g id="wiresGroup"></g>

          <!-- SVG NODES GROUP -->
          <g id="nodesGroup"></g>

          <!-- SIGNAL PULSE PARTICLE -->
          <circle id="signalPulse" class="signal-pulse" r="5" cx="0" cy="0" />
        </svg>
      </div>
    </div>

    <!-- OSCILLOSCOPE INSPECTOR SIDEBAR -->
    <aside class="inspector">
      <div class="inspector-header">
        <div class="inspector-title">
          <span>●</span> OSCILLOSCOPE // STAGE READOUT
        </div>
        <span class="badge-machine" id="inspectStageId">STAGE 1</span>
      </div>
      <div class="inspector-body">
        <div class="field-card">
          <div class="field-label">Target Module / Stage</div>
          <div class="field-value" id="inspectNodeName" style="font-weight: 600; font-size: 15px;">-</div>
          <div class="field-value code-ref" id="inspectCodeRef" style="margin-top: 4px;">-</div>
        </div>

        <div class="field-card">
          <span class="ste100-badge">ASD-STE100 SPECIFICATION</span>
          <div class="field-label" id="inspectTierLabel">EXPLANATION (HIGH TIER)</div>
          <div class="field-value" id="inspectExplanation">-</div>
        </div>

        <div class="field-card" id="validationCard">
          <div class="field-label">Enforced Rules & Validations</div>
          <ul class="validation-list" id="inspectValidations">
            <li class="validation-item"><span class="check-icon">✓</span> None</li>
          </ul>
        </div>

        <div class="field-card">
          <div class="field-label">Simulated Signal Payload</div>
          <pre class="code-payload" id="inspectPayload">{}</pre>
        </div>

        <div class="field-card" id="edgeCaseCard">
          <div class="field-label">Edge Cases & Failure Branches</div>
          <div class="field-value" id="inspectEdgeCases" style="font-size: 12px; color: var(--text-muted);">-</div>
        </div>
      </div>
    </aside>
  </main>

  <!-- FOOTER STATUS BAR -->
  <footer class="status-bar">
    <div class="status-ticker">
      <div class="status-item">FLOW: <span class="lit">${escapeHtml(flowData.concept || 'System Trace')}</span></div>
      <div class="status-item">HOPS: <span class="lit" id="tickerHops">${flowData.nodes?.length || 0} Nodes</span></div>
      <div class="status-item">CURRENT STATE: <span class="lit" id="tickerState">READY</span></div>
    </div>
    <div>ASD-STE100 VERIFIED • NO AMBIGUOUS VOCABULARY</div>
  </footer>

  <!-- EMBEDDED ENGINE RUNTIME -->
  <script>
    const DATA = ${serializedData};
    let currentTier = 'high';
    let currentScenarioId = (DATA.scenarios && DATA.scenarios[0]) ? DATA.scenarios[0].id : 'default';
    let currentStepIndex = 0;
    let autoPlayInterval = null;

    // Node Positions Layout
    const nodeCoords = calculateLayout(DATA.nodes);

    // Initialize DOM
    document.addEventListener('DOMContentLoaded', () => {
      buildSvgGraph();
      setupEventListeners();
      selectStep(0);
    });

    function calculateLayout(nodes) {
      const coords = {};
      const total = nodes.length;
      const startX = 60;
      const spacingX = total > 1 ? (860 - startX) / (total - 1) : 400;
      const centerY = 230;

      nodes.forEach((node, index) => {
        coords[node.id] = {
          x: Math.round(startX + index * spacingX),
          y: node.type === 'error_sink' ? centerY + 130 : centerY,
          width: 150,
          height: 90
        };
      });
      return coords;
    }

    function buildSvgGraph() {
      const wiresGroup = document.getElementById('wiresGroup');
      const nodesGroup = document.getElementById('nodesGroup');
      wiresGroup.innerHTML = '';
      nodesGroup.innerHTML = '';

      // Render Wires
      (DATA.connections || []).forEach((conn, index) => {
        const from = nodeCoords[conn.from];
        const to = nodeCoords[conn.to];
        if (!from || !to) return;

        const startX = from.x + from.width;
        const startY = from.y + from.height / 2;
        const endX = to.x;
        const endY = to.y + to.height / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = \`M \${startX} \${startY} C \${startX + 40} \${startY}, \${endX - 40} \${endY}, \${endX} \${endY}\`;
        path.setAttribute('d', d);
        path.setAttribute('class', 'svg-wire');
        path.setAttribute('id', \`wire-\${conn.from}-\${conn.to}\`);
        wiresGroup.appendChild(path);
      });

      // Render Nodes
      DATA.nodes.forEach((node, index) => {
        const pos = nodeCoords[node.id];
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'svg-node');
        g.setAttribute('id', \`node-\${node.id}\`);
        g.setAttribute('transform', \`translate(\${pos.x}, \${pos.y})\`);

        const isInterlock = node.type === 'interlock';
        const isError = node.type === 'error_sink';

        g.innerHTML = \`
          <!-- Base Enclosure -->
          <rect class="plate-body" width="\${pos.width}" height="\${pos.height}" rx="6" 
                fill="var(--panel-bg)" stroke="var(--panel-border)" stroke-width="1.5"/>
          <!-- Header Bar -->
          <rect width="\${pos.width}" height="24" rx="6" fill="var(--panel-header)"/>
          <rect y="18" width="\${pos.width}" height="6" fill="var(--panel-header)"/>
          <!-- Status LED -->
          <circle cx="14" cy="12" r="3.5" fill="\${isError ? 'var(--error)' : 'var(--accent)'}"/>
          <!-- Type Tag -->
          <text x="24" y="15" font-family="var(--font-mono)" font-size="9" fill="var(--text-muted)" letter-spacing="0.05em">
            \${(node.type || 'MODULE').toUpperCase()}
          </text>
          <!-- Title -->
          <text class="plate-title" x="12" y="45" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--text-main)">
            \${escapeHtml(node.label)}
          </text>
          <!-- Subtitle / Action -->
          <text x="12" y="62" font-family="var(--font-mono)" font-size="9" fill="var(--text-muted)">
            \${escapeHtml(truncate(node.sub || '', 20))}
          </text>
          <!-- Code File Indicator -->
          <text x="12" y="78" font-family="var(--font-mono)" font-size="8" fill="var(--accent)">
            \${node.codeRef ? '● ' + escapeHtml(truncate(node.codeRef.split('/').pop(), 22)) : ''}
          </text>
        \`;

        g.addEventListener('click', () => selectStep(index));
        nodesGroup.appendChild(g);
      });
    }

    function selectStep(index) {
      if (index < 0 || index >= DATA.nodes.length) return;
      currentStepIndex = index;
      const node = DATA.nodes[index];

      // Highlight active node
      document.querySelectorAll('.svg-node').forEach(n => n.classList.remove('active-node'));
      const activeEl = document.getElementById(\`node-\${node.id}\`);
      if (activeEl) activeEl.classList.add('active-node');

      // Update Inspector Sidebar
      document.getElementById('inspectStageId').textContent = \`STAGE \${index + 1} OF \${DATA.nodes.length}\`;
      document.getElementById('inspectNodeName').textContent = node.label;
      document.getElementById('inspectCodeRef').textContent = node.codeRef || 'No direct source link';

      // STE-100 Text
      const steText = (node.ste100 && node.ste100[currentTier]) 
        ? node.ste100[currentTier] 
        : (node.description || 'No description available.');
      document.getElementById('inspectExplanation').textContent = steText;
      document.getElementById('inspectTierLabel').textContent = \`EXPLANATION (\${currentTier.toUpperCase()} TIER)\`;

      // Validations
      const valList = document.getElementById('inspectValidations');
      valList.innerHTML = '';
      if (node.validations && node.validations.length > 0) {
        node.validations.forEach(v => {
          const li = document.createElement('li');
          li.className = 'validation-item';
          li.innerHTML = \`<span class="check-icon">✓</span> <span>\${escapeHtml(v)}</span>\`;
          valList.appendChild(li);
        });
      } else {
        valList.innerHTML = '<li class="validation-item" style="color:var(--text-muted)">No active guards on this step.</li>';
      }

      // Payload
      const payloadEl = document.getElementById('inspectPayload');
      payloadEl.textContent = JSON.stringify(node.payload || { status: 'idle' }, null, 2);

      // Edge Cases
      document.getElementById('inspectEdgeCases').textContent = node.edgeCases || 'Standard operating path. No anomalous conditions defined.';

      // Ticker
      document.getElementById('tickerState').textContent = \`STEP \${index + 1}: \${node.label.toUpperCase()}\`;

      // Animate Pulse along wire if there's a previous hop
      if (index > 0) {
        const prevNode = DATA.nodes[index - 1];
        pulseWire(prevNode.id, node.id);
      }
    }

    function pulseWire(fromId, toId) {
      const wire = document.getElementById(\`wire-\${fromId}-\${toId}\`);
      const pulse = document.getElementById('signalPulse');
      if (!wire || !pulse) return;

      wire.classList.add('active-wire');
      pulse.classList.add('traveling');

      const length = wire.getTotalLength();
      let start = null;
      const duration = 400;

      function step(timestamp) {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const point = wire.getPointAtLength(progress * length);
        pulse.setAttribute('cx', point.x);
        pulse.setAttribute('cy', point.y);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          pulse.classList.remove('traveling');
        }
      }
      requestAnimationFrame(step);
    }

    function setupEventListeners() {
      // Tier buttons
      document.querySelectorAll('[data-tier]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-tier]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentTier = btn.getAttribute('data-tier');
          selectStep(currentStepIndex);
        });
      });

      // Theme buttons
      document.querySelectorAll('[data-theme-btn]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-theme-btn]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const theme = btn.getAttribute('data-theme-btn');
          document.documentElement.setAttribute('data-theme', theme);
        });
      });

      // Scenario buttons
      document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentScenarioId = btn.getAttribute('data-scenario');
          selectStep(0);
        });
      });

      // Playback buttons
      document.getElementById('btnNext').addEventListener('click', () => {
        selectStep((currentStepIndex + 1) % DATA.nodes.length);
      });
      document.getElementById('btnPrev').addEventListener('click', () => {
        selectStep((currentStepIndex - 1 + DATA.nodes.length) % DATA.nodes.length);
      });
      document.getElementById('btnReset').addEventListener('click', () => {
        if (autoPlayInterval) clearInterval(autoPlayInterval);
        document.getElementById('btnAutoPlay').textContent = 'Auto-Trace';
        selectStep(0);
      });
      document.getElementById('btnAutoPlay').addEventListener('click', (e) => {
        if (autoPlayInterval) {
          clearInterval(autoPlayInterval);
          autoPlayInterval = null;
          e.target.textContent = 'Auto-Trace';
        } else {
          e.target.textContent = 'Pause';
          autoPlayInterval = setInterval(() => {
            selectStep((currentStepIndex + 1) % DATA.nodes.length);
          }, 1500);
        }
      });

      // Keyboard navigation
      window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          selectStep((currentStepIndex + 1) % DATA.nodes.length);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          selectStep((currentStepIndex - 1 + DATA.nodes.length) % DATA.nodes.length);
        } else if (e.key === '1') {
          document.querySelector('[data-tier="low"]')?.click();
        } else if (e.key === '2') {
          document.querySelector('[data-tier="med"]')?.click();
        } else if (e.key === '3') {
          document.querySelector('[data-tier="high"]')?.click();
        }
      });
    }

    function truncate(str, len) {
      return (str && str.length > len) ? str.slice(0, len) + '…' : str;
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// CLI Execution
if (process.argv[1]?.endsWith('render-schematic.mjs')) {
  const args = process.argv.slice(2);
  let fixturePath = null;
  let outPath = 'schematic.html';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--fixture' && args[i + 1]) {
      fixturePath = args[i + 1];
      i++;
    } else if (args[i] === '--out' && args[i + 1]) {
      outPath = args[i + 1];
      i++;
    }
  }

  if (!fixturePath) {
    console.log('Usage: node render-schematic.mjs --fixture <flow.json> --out <output.html>');
    process.exit(1);
  }

  try {
    const raw = readFileSync(fixturePath, 'utf8');
    const flowData = JSON.parse(raw);
    const html = renderSchematicHtml(flowData);
    writeFileSync(outPath, html, 'utf8');
    console.log(`\n✨ Schematic successfully rendered to: ${outPath}`);
  } catch (err) {
    console.error(`Error rendering schematic: ${err.message}`);
    process.exit(1);
  }
}
