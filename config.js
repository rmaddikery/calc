// ═══════════════════════════════════════════════
// config.js  —  All inputs + constants defined here
// To add a new input: add one entry to INPUTS.
// To change a formula constant: edit AFA_RATES etc.
// ═══════════════════════════════════════════════

const INPUTS = {
  // ── Property ──
  purchasePrice:    { label: 'Purchase Price (€)',       group: 'Property',      type: 'number',  default: 284924, min: 0 },
  landValue:        { label: 'Land Value (€)',           group: 'Property',      type: 'number',  default: 57000, min: 0 },
  sqm:              { label: 'Size (m²)',                group: 'Property',      type: 'number',  default: 37,     min: 0 },
  notaryPct:        { label: 'Notary %',                 group: 'Property',      type: 'number',  default: 2,    step: 0.1, scale: 0.01 },
  transferTaxPct:   { label: 'Transfer Tax %',           group: 'Property',      type: 'number',  default: 6,    step: 0.1, scale: 0.01 },
  signingFees:      { label: 'Signing Fees',             group: 'Property',      type: 'number',  default: 924,   min: 0 },
  commission:       { label: 'Agent Commission %',       group: 'Property',      type: 'number',  default: 0,      step: 0.1, scale: 0.01 },

  // ── Financing ──
  downPayment:      { label: 'Down Payment (€)',         group: 'Financing',     type: 'number',  default: 0, min: 0 },
  bankLoan:         { label: 'Bank Loan (€)',            group: 'Financing',     type: 'number',  default: 134000, min: 0 },
  bankRate:         { label: 'Bank Rate %',              group: 'Financing',     type: 'number',  default: 3.84,    step: 0.1, scale: 0.01 },
  kfwLoan:          { label: 'KfW Loan (€)',             group: 'Financing',     type: 'number',  default: 150000,  min: 0 },
  kfwRate:          { label: 'KfW Rate %',               group: 'Financing',     type: 'number',  default: 2.54,    step: 0.1, scale: 0.01 },
  repaymentRate:    { label: 'Annual Repayment %',       group: 'Financing',     type: 'number',  default: 2.5,    step: 0.1, scale: 0.01 },

  // ── Construction ──
  constMonths:      { label: 'Duration (months)',        group: 'Construction',  type: 'number',  default: 24,     min: 0 },
  commitFeeRate:    { label: 'Commitment Fee %',         group: 'Construction',  type: 'number',  default: 0.17,   step: 0.01, scale: 0.01 },
  commitFeeMonths:  { label: 'Fee Months',               group: 'Construction',  type: 'number',  default: 12,     min: 0 },
  commitFeeRemainingPct: { label: 'Remaining Loan %',    group: 'Construction',  type: 'number',  default: 15,     scale: 0.01 },

  // ── Operations ──
  rentPerM2:        { label: 'Monthly Rent/m2 (€)',      group: 'Operations',    type: 'number',  default: 16,     min: 0 },
  grossRent:        { label: 'Monthly Gross Rent (€)',   group: 'Operations',    type: 'number',  default: 592,   min: 0 },
  vacancyRate:      { label: 'Vacancy Rate %',           group: 'Operations',    type: 'number',  default: 4.0,    step: 0.5, scale: 0.01 },
  rentGrowth:       { label: 'Rent Growth %/yr',         group: 'Operations',    type: 'number',  default: 0.0,    step: 0.1, scale: 0.01 },
  hausgeld:         { label: 'Hausgeld (€/mo)',          group: 'Operations',    type: 'number',  default: 200,    min: 0 },
  mgmtFees:         { label: 'Mgmt Fees (€/mo)',         group: 'Operations',    type: 'number',  default: 60,     min: 0 },
  maintReserve:     { label: 'Maintenance Reserve (€/mo)',group:'Operations',    type: 'number',  default: 80,     min: 0 },

  // ── Tax ──
  householdIncome:  { label: 'Household Income (€/yr)',  group: 'Tax',           type: 'number',  default: 80000,  min: 0 },
  incomeType:       { label: 'Income Type',              group: 'Tax',           type: 'select',  default: 'employed',
    options: [['employed','Employed'],['self','Self-Employed']] },
  taxClass:         { label: 'Tax Class',                group: 'Tax',           type: 'select',  default: '1',
    options: [['1','I'],['3','III'],['4','IV'],['5','V']] },
  afaMethod:        { label: 'AfA Method',               group: 'Tax',           type: 'select',  default: 'degressive',
    options: [['linear','Linear §7 (2%)'],['linear3','Linear §7 (3%)'],['degressive','Degressive §7g']] },
  degressiveRate:   { label: 'Degressive Rate %',        group: 'Tax',           type: 'number',  default: 5.0, step: 0.5, scale: 0.01,
    showIf: inp => inp.afaMethod === 'degressive' },
  para7bEligible:   { label: '§7b Eligible (new-build)', group: 'Tax',           type: 'select',  default: 'yes',
    options: [['no','No'],['yes','Yes']] },
  para7bCap:        { label: '§7b Cap (€/m²)',           group: 'Tax',           type: 'number',  default: 4000,
    showIf: inp => inp.para7bEligible === 'yes' },

  // ── Exit ──
  holdYears:        { label: 'Hold Period (years)',      group: 'Exit',          type: 'number',  default: 10,     min: 1 },
  sellingCostPct:   { label: 'Selling Costs %',          group: 'Exit',          type: 'number',  default: 3.0,    step: 0.1, scale: 0.01 },
  customAppreciation:{ label: 'Appreciation %/yr',       group: 'Exit',          type: 'number',  default: 3.0,    step: 0.1, scale: 0.01 },
};

// ── Financial constants ──
const AFA_RATES = {
  linear:    0.02,
  linear3:   0.03,
  degressive: null,  // user-supplied via degressiveRate
};

const SCENARIO_PRESETS = [
  { label: 'Worst',        app: 0.0 },
  { label: 'Conservative', app: 2.0 },
  { label: 'Base',         app: 3.0 },
  { label: 'Optimistic',   app: 4.5 },
  { label: 'Custom',       app: null },   // reads customAppreciation from inputs
];
