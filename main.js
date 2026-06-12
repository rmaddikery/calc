// ═══════════════════════════════════════════════
// main.js  —  Wires everything together
// Handles: sidebar generation, input reading,
// theme toggle, scenario pills, error display.
// ═══════════════════════════════════════════════

// ── Build sidebar from INPUTS config ──
function buildSidebar() {
  const sidebar = document.getElementById('sidebar-fields');
  let currentGroup = null;
  let html = '';

  for (const [key, cfg] of Object.entries(INPUTS)) {
    if (cfg.group !== currentGroup) {
      currentGroup = cfg.group;
      html += `<p class="sidebar-title">${cfg.group}</p>`;
    }
    const display = cfg.showIf ? 'style="display:none"' : '';
    html += `<div class="field" id="wrap-${key}" ${display}>`;
    html += `<label for="${key}">${cfg.label}</label>`;
    if (cfg.type === 'select') {
      html += `<select id="${key}">`;
      for (const [val, label] of cfg.options) {
        html += `<option value="${val}"${val==cfg.default?' selected':''}>${label}</option>`;
      }
      html += `</select>`;
    } else {
      const step  = cfg.step  != null ? `step="${cfg.step}"`   : '';
      const min   = cfg.min   != null ? `min="${cfg.min}"`     : '';
      html += `<input id="${key}" type="number" value="${cfg.default}" ${step} ${min}>`;
    }
    html += `</div>`;
  }
  sidebar.innerHTML = html;

  // Attach change listeners for showIf fields
  for (const [key, cfg] of Object.entries(INPUTS)) {
    const el = document.getElementById(key);
    if (el) el.addEventListener('change', updateConditionalFields);
  }
  updateConditionalFields();
}

// ── Show/hide conditional fields ──
function updateConditionalFields() {
  const raw = readRawInputs();
  for (const [key, cfg] of Object.entries(INPUTS)) {
    if (cfg.showIf) {
      const wrap = document.getElementById('wrap-' + key);
      if (wrap) wrap.style.display = cfg.showIf(raw) ? '' : 'none';
    }
  }
}

// ── Read raw (unscaled) inputs ──
function readRawInputs() {
  const out = {};
  for (const [key, cfg] of Object.entries(INPUTS)) {
    const el = document.getElementById(key);
    if (!el) { out[key] = cfg.default; continue; }
    out[key] = cfg.type === 'select' ? el.value : (+el.value ?? cfg.default);
  }
  return out;
}

// ── Read scaled inputs (ready for model) ──
function readInputs() {
  const raw = readRawInputs();
  const out = {};
  for (const [key, cfg] of Object.entries(INPUTS)) {
    out[key] = cfg.scale ? raw[key] * cfg.scale : raw[key];
  }
  return out;
}

// ── Main calculate entry point ──
function recalculate() {
  const errBanner = document.getElementById('errBanner');
  errBanner.className = 'err-banner';
  try {
    const inp = readInputs();
    const m   = model.compute(inp);
    renderAll(m);
  } catch(e) {
    errBanner.textContent = '⚠ ' + e.message;
    errBanner.className = 'err-banner show';
    console.error(e);
  }
}

// ── Scenario pills ──
function buildPills() {
  const container = document.getElementById('scenario-pills');
  container.innerHTML = SCENARIO_PRESETS.map((s, i) => {
    const label = s.app != null ? `${s.label} (${s.app}%)` : s.label;
    return `<button class="pill${i===2?' active':''}" data-app="${s.app ?? 'custom'}">${label}</button>`;
  }).join('');

  container.querySelectorAll('.pill').forEach(p => {
    p.addEventListener('click', () => {
      container.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      const v = p.dataset.app;
      if (v !== 'custom') {
        const el = document.getElementById('customAppreciation');
        // reverse-scale: config says scale:0.01, input field shows raw %
        if (el) el.value = v;
      }
      recalculate();
    });
  });
}

// ── Theme toggle ──
function initTheme() {
  const btn  = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let d = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', d);
  const moonSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const sunSVG  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  if (btn) {
    btn.innerHTML = d === 'dark' ? sunSVG : moonSVG;
    btn.addEventListener('click', () => {
      d = d === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', d);
      btn.innerHTML = d === 'dark' ? sunSVG : moonSVG;
    });
  }
}

// ── Init ──
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  buildSidebar();
  buildPills();
  recalculate();
});
