// ═══════════════════════════════════════════════
// render.js  —  All DOM updates
// Reads the model output object, writes to DOM.
// No financial calculations here.
// ═══════════════════════════════════════════════

// ── Formatting helpers ──
const fmt    = (v, dec=0) => { const n=Number(v); if(isNaN(n)) return '—'; const s=Math.abs(n).toLocaleString('de-DE',{minimumFractionDigits:dec,maximumFractionDigits:dec}); return n<0?'('+s+')':s; };
const fmtEur = v => '€\u202f' + fmt(v);
const fmtPct = (v, dec=1) => fmt(v, dec) + '%';
const cls    = v => v >= 0 ? 'val-pos' : 'val-neg';

function row(label, mo, yr, rowCls='', moCls='', yrCls='') {
  return `<tr class="${rowCls}"><td>${label}</td><td class="${moCls}">${mo}</td><td class="${yrCls}">${yr}</td></tr>`;
}

// ── Section registry ──
// To add a new section: add one entry here + write a renderXxx function below.
const SECTIONS = [
  { id: 'sec-kpi',          render: renderKPIs           },
  { id: 'sec-construction', render: renderConstruction   },
  { id: 'sec-phase2',       render: renderPhase2         },
  { id: 'sec-phase3',       render: renderPhase3         },
  { id: 'sec-cash',         render: renderCash           },
  { id: 'sec-exit',         render: renderExit           },
  { id: 'sec-chart',        render: renderChart          },
];

function renderAll(m) {
  for (const sec of SECTIONS) {
    try {
      sec.render(m);
      document.getElementById(sec.id).style.display = '';
    } catch(e) {
      console.error(`[${sec.id}]`, e);
      const el = document.getElementById(sec.id);
      if (el) el.innerHTML = `<div class="err-inline">⚠ Error in ${sec.id}: ${e.message}</div>`;
      el.style.display = '';
    }
  }
}

function renderKPIs(m) {
  document.getElementById('kpiGrid').innerHTML = [
    kpi('Total Upfront Costs',      fmtEur(m.acq.equity),         'Downpayment + Additional costs', 'accent'),
    kpi('Total Capital at Risk',    fmtEur(m.exit.totalIn),         'Acquisition + phase costs', 'accent'),
    kpi('Equity at Exit',           fmtEur(m.exit.equityAtExit),    `At ${fmtPct(m.inp.customAppreciation*100)}/yr appreciation`, m.exit.equityAtExit>=0?'positive':'negative'),
    kpi('Net Profit',               fmtEur(m.exit.netProfit),       'After selling costs & loans', m.exit.netProfit>=0?'positive':'negative'),
    kpi('Annualised ROI',           m.exit.annualisedROI.toFixed(1)+'%', `Over ${m.inp.holdYears} years`, m.exit.annualisedROI>=0?'positive':'negative'),
    kpi('Monthly Net CF (Yrs 1–4)', fmtEur(m.cf43.netCFMonthly),   'After tax saving', m.cf43.netCFMonthly>=0?'positive':'negative'),
    kpi('Monthly Net CF (Yr 5+)',   fmtEur(m.cf44.netCFMonthly),   '§7b expired', m.cf44.netCFMonthly>=0?'positive':'negative'),
    kpi('Vacancy-adj. Rent',        fmtEur(m.ops.effectiveRent),    `${fmtPct(m.inp.vacancyRate*100)} vacancy applied`, ''),
  ].join('');
}

function kpi(label, value, sub, variant='') {
  return `<div class="kpi ${variant}">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-sub">${sub}</div>
  </div>`;
}

function renderConstruction(m) {
  const c = m.con;
  document.getElementById('tbody42').innerHTML = [
    row('Bank loan interest', fmtEur(c.bankInterestMo), fmtEur(c.bankInterestMo*12)),
    row('KfW loan interest',  fmtEur(c.kfwInterestMo),  fmtEur(c.kfwInterestMo*12)),
    row('Commitment fee',     fmtEur(c.commitFeeMo),     fmtEur(c.commitFeeMo*12)),
    row('Total monthly out',  `<strong>${fmtEur(c.monthlyOut)}</strong>`, `<strong>${fmtEur(c.annualOut)}</strong>`, 'total', 'val-neg', 'val-neg'),
    row(`Phase total (${m.inp.constMonths} mo)`, '—', `<strong>${fmtEur(c.phaseTotal)}</strong>`, 'subtotal', '', 'val-neg'),
  ].join('');
  document.getElementById('note42').textContent =
    `Construction: ${m.inp.constMonths} months, no rental income. Total outlay: ${fmtEur(c.phaseTotal)}.`;
}

function renderPhase2(m) {
  const cf = m.cf43, afa = m.afa, fin = m.fin;
  document.getElementById('tbody43').innerHTML = [
    row('Gross rent (vacancy-adj.)',   fmtEur(cf.rentMonthly),          fmtEur(cf.rentAnnual),           '', 'val-pos','val-pos'),
    row('Operating costs',            fmtEur(-m.ops.totalCostsMonthly),fmtEur(-m.ops.totalCostsAnnual), '', 'val-neg','val-neg'),
    row('Loan interest',              fmtEur(-fin.monthlyInterest),     fmtEur(-fin.totalAnnualInterest),'', 'val-neg','val-neg'),
    row('Loan repayment',             fmtEur(-fin.monthlyRepayment),    fmtEur(-fin.annualRepayment),    '', 'val-neg','val-neg'),
    row('Pre-tax cash flow',          fmtEur(cf.preCFMonthly),          fmtEur(cf.preCFAnnual),          'subtotal', cls(cf.preCFMonthly), cls(cf.preCFAnnual)),
    row(`AfA tax saving (§7${m.inp.para7bEligible==='yes'?'+§7b':''})`,
        `<em>${fmtEur(cf.taxSavingMonthly)}</em>`, `<em>${fmtEur(cf.taxSavingAnnual)}</em>`,
        '', 'val-pos','val-pos'),
    row('Net cash flow', `<strong>${fmtEur(cf.netCFMonthly)}</strong>`, `<strong>${fmtEur(cf.netCFAnnual)}</strong>`, 'total', cls(cf.netCFMonthly), cls(cf.netCFAnnual)),
  ].join('');
  document.getElementById('note43').textContent =
    `Tax rate: ${fmtPct(cf.taxRate*100)}. §7 AfA: ${fmtEur(afa.para7Annual)}/yr` +
    (m.inp.para7bEligible==='yes' ? `. §7b AfA: ${fmtEur(afa.para7bAnnual)}/yr.` : '.') +
    ` Combined: ${fmtEur(afa.combinedYr14)}/yr.`;
}

function renderPhase3(m) {
  const cf = m.cf44, afa = m.afa, fin = m.fin;
  document.getElementById('tbody44').innerHTML = [
    row('Gross rent yr 5 (vacancy-adj.)', fmtEur(cf.rentMonthly),          fmtEur(cf.rentAnnual),           '', 'val-pos','val-pos'),
    row('Operating costs',               fmtEur(-m.ops.totalCostsMonthly),fmtEur(-m.ops.totalCostsAnnual), '', 'val-neg','val-neg'),
    row('Loan interest',                 fmtEur(-fin.monthlyInterest),     fmtEur(-fin.totalAnnualInterest),'', 'val-neg','val-neg'),
    row('Loan repayment',                fmtEur(-fin.monthlyRepayment),    fmtEur(-fin.annualRepayment),    '', 'val-neg','val-neg'),
    row('Pre-tax cash flow',             fmtEur(cf.preCFMonthly),          fmtEur(cf.preCFAnnual),          'subtotal', cls(cf.preCFMonthly), cls(cf.preCFAnnual)),
    row('AfA tax saving (§7 only)',      `<em>${fmtEur(cf.taxSavingMonthly)}</em>`, `<em>${fmtEur(cf.taxSavingAnnual)}</em>`, '', 'val-pos','val-pos'),
    row('Net cash flow', `<strong>${fmtEur(cf.netCFMonthly)}</strong>`, `<strong>${fmtEur(cf.netCFAnnual)}</strong>`, 'total', cls(cf.netCFMonthly), cls(cf.netCFAnnual)),
  ].join('');
  document.getElementById('note44').textContent =
    `§7b expired after year 4. §7 AfA: ${fmtEur(afa.para7Annual)}/yr. ` +
    `Rent grown by ${fmtPct(m.inp.rentGrowth*100)}/yr over 4 years.`;
}

function renderCash(m) {
  const acq = m.acq, con = m.con, cf43 = m.cf43, cf44 = m.cf44;
  const opsCF14   = cf43.netCFAnnual * 4;
  const opsCF5p   = cf44.netCFAnnual * Math.max(m.inp.holdYears - 4, 0);
  document.getElementById('tbodyCash').innerHTML = [
    `<tr><td>Down payment</td><td>${fmtEur(m.inp.downPayment)}</td></tr>`,
    `<tr><td>Notary & legal fees</td><td>${fmtEur(acq.notaryCost)}</td></tr>`,
    `<tr><td>Property transfer tax</td><td>${fmtEur(acq.transferTax)}</td></tr>`,
    `<tr class="subtotal"><td>Acquisition equity</td><td><strong>${fmtEur(acq.equity)}</strong></td></tr>`,
    `<tr><td>Construction phase costs</td><td class="val-neg">${fmtEur(con.phaseTotal)}</td></tr>`,
    `<tr><td>Net operating CF (yrs 1–4)</td><td class="${cls(opsCF14)}">${fmtEur(opsCF14)}</td></tr>`,
    `<tr><td>Net operating CF (yrs 5+)</td><td class="${cls(opsCF5p)}">${fmtEur(opsCF5p)}</td></tr>`,
    `<tr class="total"><td>Total capital at risk</td><td><strong>${fmtEur(m.exit.totalIn)}</strong></td></tr>`,
  ].join('');
}

function renderExit(m) {
  document.getElementById('scenarioGrid').innerHTML = m.scenarios.map(sc => {
    const r = sc.result;
    const isBest  = sc.label === 'Optimistic';
    const isWorst = sc.label === 'Worst';
    return `<div class="sc-card ${isBest?'best':isWorst?'worst':''}">
      <div class="sc-card-title">${sc.label} (${Number(sc.app).toFixed(1)}%/yr)</div>
      <div class="big" style="color:${r.annualisedROI>=0?'var(--success)':'var(--error)'}">${r.annualisedROI.toFixed(1)}%</div>
      <div class="sub">Annualised ROI</div>
      <div style="margin-top:var(--sp3);font-size:0.78rem;color:var(--muted)">
        Exit price: ${fmtEur(r.exitPrice)}<br>
        Equity: ${fmtEur(r.equityAtExit)}<br>
        Net profit: <span style="color:${r.netProfit>=0?'var(--success)':'var(--error)'}"><strong>${fmtEur(r.netProfit)}</strong></span>
      </div>
    </div>`;
  }).join('');
}

let roiChartInstance = null;
function renderChart(m) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#797876' : '#7a7974';
  const labels = m.chart.years.map(y => 'Yr ' + y);

  if (roiChartInstance) roiChartInstance.destroy();
  const ctx = document.getElementById('roiChart').getContext('2d');
  roiChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Equity (€)',          data: m.chart.equity, backgroundColor: 'rgba(1,105,111,0.75)', borderRadius: 4, stack: 's' },
        { label: 'Remaining Loan (€)',  data: m.chart.loans,  backgroundColor: 'rgba(150,66,25,0.45)', borderRadius: 4, stack: 's' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, font: { family: 'Inter', size: 12 } } },
        tooltip: { callbacks: { label: ctx => '€ ' + Math.round(ctx.raw).toLocaleString('de-DE') } }
      },
      scales: {
        x: { stacked: true, ticks: { color: textColor }, grid: { color: gridColor } },
        y: { stacked: true, ticks: { color: textColor, callback: v => '€' + Math.round(v/1000) + 'k' }, grid: { color: gridColor } },
      }
    }
  });
}
