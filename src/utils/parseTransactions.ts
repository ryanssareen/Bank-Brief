export const calculateFDMaturity = (
  principal: number,
  annualRate: number,
  tenureMonths: number,
  frequency: 'monthly' | 'quarterly' | 'annually'
): number => {
  const n = frequency === 'monthly' ? 12 : frequency === 'quarterly' ? 4 : 1;
  const t = tenureMonths / 12;
  const r = annualRate / 100;
  return Math.round(principal * Math.pow(1 + r / n, n * t));
};
