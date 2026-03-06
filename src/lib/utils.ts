export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'long') {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(dateObj);
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
}

export function calculateRunway(balance: number, avgDailyExpense: number): number {
  if (avgDailyExpense === 0) return Infinity;
  return Math.floor(balance / avgDailyExpense);
}

export function getRunwayColor(days: number): string {
  if (days < 30) return 'text-red-600 bg-red-50';
  if (days < 90) return 'text-amber-600 bg-amber-50';
  return 'text-emerald-600 bg-emerald-50';
}

export function maskCurrency(amount: number, masked: boolean): string {
  if (masked) return 'Rp ********';
  return formatCurrency(amount);
}

export function autoTagCategory(description: string): string {
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('pln') || lowerDesc.includes('listrik')) return 'Listrik';
  if (lowerDesc.includes('pdam') || lowerDesc.includes('air')) return 'Air';
  if (lowerDesc.includes('internet') || lowerDesc.includes('wifi')) return 'Internet';
  if (lowerDesc.includes('gaji') || lowerDesc.includes('salary')) return 'Gaji';
  if (lowerDesc.includes('sewa') || lowerDesc.includes('rent')) return 'Sewa';
  if (lowerDesc.includes('makan') || lowerDesc.includes('food')) return 'Konsumsi';
  if (lowerDesc.includes('transport')) return 'Transport';
  if (lowerDesc.includes('bpjs')) return 'BPJS';
  if (lowerDesc.includes('pajak') || lowerDesc.includes('tax')) return 'Pajak';

  return 'Lainnya';
}

export function calculatePPh21(grossIncome: number, ptkpStatus: string = 'TK/0'): number {
  const ptkpRates: Record<string, number> = {
    'TK/0': 54000000,
    'TK/1': 58500000,
    'TK/2': 63000000,
    'K/0': 58500000,
    'K/1': 63000000,
    'K/2': 67500000,
    'K/3': 72000000,
  };

  const yearlyGross = grossIncome * 12;
  const ptkp = ptkpRates[ptkpStatus] || 54000000;
  const taxableIncome = Math.max(0, yearlyGross - ptkp);

  let tax = 0;
  if (taxableIncome <= 60000000) {
    tax = taxableIncome * 0.05;
  } else if (taxableIncome <= 250000000) {
    tax = 3000000 + (taxableIncome - 60000000) * 0.15;
  } else if (taxableIncome <= 500000000) {
    tax = 31500000 + (taxableIncome - 250000000) * 0.25;
  } else {
    tax = 94000000 + (taxableIncome - 500000000) * 0.30;
  }

  return Math.floor(tax / 12);
}

export function calculateBPJS(baseSalary: number) {
  return {
    kesehatan: Math.floor(baseSalary * 0.01),
    jht: Math.floor(baseSalary * 0.02),
    jp: Math.floor(baseSalary * 0.01),
  };
}
