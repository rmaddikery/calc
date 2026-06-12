// ═══════════════════════════════════════════════
// model.js  —  Pure financial calculations
// NO DOM access here. All functions take plain
// numbers in, return plain numbers/objects out.
// Test any formula in the browser console:
//   model.calcExit({purchasePrice:500000, ...})
// ═══════════════════════════════════════════════

const model = (() => {

  // ── German marginal income tax approximation ──
  function marginalTaxRate(income) {
    if (income <= 11604)  return 0;
    if (income <= 17005)  return 0.14 + (income - 11604) / 58000 * 0.10;
    if (income <= 66760)  return 0.24 + (income - 17005) / 50000 * 0.18;
    if (income <= 277826) return 0.42;
    return 0.45;
  }

  // ── AfA (depreciation) ──
  function calcAfa(inp) {
    const buildingValue = Math.max(inp.purchasePrice - inp.landValue, 0);
    const rate = inp.afaMethod === 'degressive'
      ? inp.degressiveRate
      : (AFA_RATES[inp.afaMethod] ?? 0.02);

    const para7Annual   = buildingValue * rate;
    const para7Monthly  = para7Annual / 12;

    const para7bBasis   = inp.para7bEligible === 'yes'
      ? Math.min(inp.purchasePrice, inp.sqm * inp.para7bCap)
      : 0;
    const para7bAnnual  = para7bBasis * 0.05;
    const para7bMonthly = para7bAnnual / 12;

    return {
      buildingValue,
      para7Annual, para7Monthly,
      para7bBasis, para7bAnnual, para7bMonthly,
      combinedYr14:   para7Annual + para7bAnnual,  // years 1–4 (§7b applies)
      combinedYr5plus: para7Annual,                 // years 5+ (§7b expired)
    };
  }

  // ── Financing ──
  function calcFinancing(inp) {
    const totalLoan           = inp.bankLoan + inp.kfwLoan;
    const annualBankInterest  = inp.bankLoan * inp.bankRate;
    const annualKfwInterest   = inp.kfwLoan  * inp.kfwRate;
    const totalAnnualInterest = annualBankInterest + annualKfwInterest;
    const annualRepayment     = totalLoan * inp.repaymentRate;
    return {
      totalLoan,
      annualBankInterest, annualKfwInterest,
      totalAnnualInterest,
      monthlyInterest:  totalAnnualInterest / 12,
      annualRepayment,
      monthlyRepayment: annualRepayment / 12,
    };
  }

  // ── Acquisition costs ──
  function calcAcquisition(inp) {
    const notaryCost     = inp.purchasePrice * inp.notaryPct;
    const transferTax    = inp.purchasePrice * inp.transferTaxPct;
    const commission      = inp.purchasePrice * inp.commission;
    const signingFees     = inp.signingFees;
    return {
      notaryCost, transferTax,
      total: inp.purchasePrice + notaryCost + transferTax + commission + signingFees,
      equity: inp.downPayment + notaryCost + transferTax + commission + signingFees,
    };
  }

  // ── Operations ──
  function calcOps(inp) {
    const effectiveRent = inp.grossRent * (1 - inp.vacancyRate);
    const totalCostsMonthly = inp.hausgeld + inp.mgmtFees + inp.maintReserve;
    return { effectiveRent, totalCostsMonthly, totalCostsAnnual: totalCostsMonthly * 12 };
  }

  // ── Tax saving from deductions ──
  function calcTaxSaving(inp, afaAnnual, totalAnnualInterest) {
    const taxRate   = marginalTaxRate(inp.householdIncome);
    const deductible = afaAnnual + totalAnnualInterest;
    return { taxRate, taxSavingAnnual: deductible * taxRate, taxSavingMonthly: deductible * taxRate / 12 };
  }

  // ── Construction phase ──
  function calcConstruction(inp, fin) {
  const commitFeeMo = inp.bankLoan * inp.commitFeeRate * inp.commitFeeRemainingPct;
  const feeMonths   = Math.max(inp.constMonths - inp.commitFeeMonths, 0);
  const phaseTotal  = fin.monthlyInterest * inp.constMonths
                    + commitFeeMo * feeMonths;
    return {
      bankInterestMo:   fin.annualBankInterest / 12,
      kfwInterestMo:    fin.annualKfwInterest  / 12,
      commitFeeMo,
      feeMonths,
      monthlyOut:       fin.monthlyInterest + commitFeeMo,  // monthly cost when fee IS active
      annualOut:        (fin.monthlyInterest + commitFeeMo) * 12,
      phaseTotal,
    };
  }

  // ── Cash flow for a given phase ──
  function calcCashFlow(inp, fin, ops, afaAnnual, rentMultiplier) {
    const rent   = ops.effectiveRent * (rentMultiplier ?? 1);
    const ts     = calcTaxSaving(inp, afaAnnual, fin.totalAnnualInterest);
    const preCFmo  = rent - ops.totalCostsMonthly - fin.monthlyInterest - fin.monthlyRepayment;
    const netCFmo  = preCFmo + ts.taxSavingMonthly;
    return {
      rentMonthly: rent, rentAnnual: rent * 12,
      preCFMonthly: preCFmo,  preCFAnnual:  preCFmo  * 12,
      netCFMonthly: netCFmo,  netCFAnnual:  netCFmo  * 12,
      ...ts,
    };
  }

  // ── Exit calculation ──
  function calcExit(inp, fin, acq, con, cf43, cf44, appRate) {
    const yrs        = inp.holdYears;
    const exitPrice  = inp.purchasePrice * Math.pow(1 + appRate, yrs);
    const sellingCosts = exitPrice * inp.sellingCostPct;
    const remainingLoan = fin.totalLoan * Math.pow(1 - inp.repaymentRate, yrs);
    const equityAtExit  = exitPrice - sellingCosts - Math.max(remainingLoan, 0);
    const totalIn       = acq.equity + con.phaseTotal
                          + Math.max(-cf43.netCFAnnual * 4, 0)
                          + Math.max(-cf44.netCFAnnual * Math.max(yrs - 4, 0), 0);
    const netProfit     = equityAtExit - totalIn;
    const annualisedROI = totalIn > 0
      ? (Math.pow(equityAtExit / totalIn, 1 / yrs) - 1) * 100
      : 0;
    return { exitPrice, sellingCosts, remainingLoan: Math.max(remainingLoan, 0),
             equityAtExit, totalIn, netProfit, annualisedROI };
  }

  // ── Equity build-up series (for chart) ──
  function calcEquitySeries(inp, fin, appRate) {
    const years = [], equity = [], loans = [];
    for (let yr = 0; yr <= inp.holdYears; yr++) {
      const prop = inp.purchasePrice * Math.pow(1 + appRate, yr);
      const loan = fin.totalLoan * Math.pow(1 - inp.repaymentRate, yr);
      years.push(yr);
      equity.push(Math.round(prop - Math.max(loan, 0)));
      loans.push(Math.round(Math.max(loan, 0)));
    }
    return { years, equity, loans };
  }

  // ── Master compute — call this once with raw inputs ──
  function compute(inp) {
    const afa  = calcAfa(inp);
    const fin  = calcFinancing(inp);
    const acq  = calcAcquisition(inp);
    const ops  = calcOps(inp);
    const con  = calcConstruction(inp, fin);

    // rent multiplier at year 5: grown by rentGrowth for 4 years
    const rentMult5 = Math.pow(1 + inp.rentGrowth, 4);

    const cf43 = calcCashFlow(inp, fin, ops, afa.combinedYr14,   1);
    const cf44 = calcCashFlow(inp, fin, ops, afa.combinedYr5plus, rentMult5);

    const appRate = inp.customAppreciation;
    const exit    = calcExit(inp, fin, acq, con, cf43, cf44, appRate);

    const scenarios = SCENARIO_PRESETS.map(s => ({
      ...s,
      app: s.app ?? appRate * 100,
      result: calcExit(inp, fin, acq, con, cf43, cf44, (s.app ?? appRate * 100) / 100),
    }));

    const chart = calcEquitySeries(inp, fin, appRate);

    return { inp, afa, fin, acq, ops, con, cf43, cf44, exit, scenarios, chart };
  }

  return { compute, marginalTaxRate };  // expose for console testing
})();
