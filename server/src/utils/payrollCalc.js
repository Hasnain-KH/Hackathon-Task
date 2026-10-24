export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcGross(salary = {}) {
  const basic = Number(salary.basic) || 0;
  const hra = Number(salary.hra) || 0;
  const medical = Number(salary.medical) || 0;
  const transport = Number(salary.transport) || 0;
  const other = Number(salary.other) || 0;
  if (hra + medical + transport + other === 0) return round2(basic * 1.5);
  return round2(basic + hra + medical + transport + other);
}

export function calcPerDay(gross, workingDays) {
  if (!Number.isFinite(gross) || !Number.isFinite(workingDays) || workingDays <= 0) return 0;
  return round2(gross / workingDays);
}

export function calcTax(grossMonthly) {
  const annualGross = round2(Math.max(0, Number(grossMonthly) || 0) * 12);
  let annualTax = 0;
  let slabLabel = '0–600,000 (0%)';
  if (annualGross > 3600000) {
    annualTax = 510000 + ((annualGross - 3600000) * 0.35);
    slabLabel = 'Above 3,600,000 (510,000 + 35%)';
  } else if (annualGross > 2400000) {
    annualTax = 210000 + ((annualGross - 2400000) * 0.25);
    slabLabel = '2,400,001–3,600,000 (210,000 + 25%)';
  } else if (annualGross > 1200000) {
    annualTax = 30000 + ((annualGross - 1200000) * 0.15);
    slabLabel = '1,200,001–2,400,000 (30,000 + 15%)';
  } else if (annualGross > 600000) {
    annualTax = (annualGross - 600000) * 0.05;
    slabLabel = '600,001–1,200,000 (5%)';
  }
  annualTax = round2(annualTax);
  return { annualGross, annualTax, monthlyTax: round2(annualTax / 12), slabLabel };
}
