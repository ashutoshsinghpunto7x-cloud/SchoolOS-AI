const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatCurrency = (amount: number): string => currencyFormatter.format(amount);

export const formatPercent = (value: number): string => `${Math.round(value)}%`;
