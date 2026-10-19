/**
 * শুধু Display-এর জন্য নিকটতম পূর্ণ টাকায় ফরম্যাট।
 * কোনো authoritative calculation এখানে হয় না — সেটা সবসময় Backend করে।
 */
export function formatMoney(value: string | number): string {
  const text = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return '0';
  const rounded = BigInt(match[2]) + (Number((match[3] ?? '0')[0]) >= 5 ? BigInt(1) : BigInt(0));
  const signed = match[1] === '-' ? -rounded : rounded;
  return Number(signed).toLocaleString('en-BD', { maximumFractionDigits: 0 });
}

export function roundMoneyToWhole(value: string | number): string {
  const text = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return '0';
  const rounded = BigInt(match[2]) + (Number((match[3] ?? '0')[0]) >= 5 ? BigInt(1) : BigInt(0));
  return `${match[1]}${rounded.toString()}`;
}

export function formatMoneyWithSymbol(value: string | number): string {
  return `৳${formatMoney(value)}`;
}
