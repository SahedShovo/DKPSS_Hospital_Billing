/**
 * শুধু Display-এর জন্য (২ ঘর দশমিক, কমা সহ ফরম্যাট)।
 * কোনো authoritative calculation এখানে হয় না — সেটা সবসময় Backend করে।
 */
export function formatMoney(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '0.00';
  return num.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatMoneyWithSymbol(value: string | number): string {
  return `৳${formatMoney(value)}`;
}