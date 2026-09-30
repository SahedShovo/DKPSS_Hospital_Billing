import { Card } from '@/components/ui/card';
import { formatMoneyWithSymbol } from '@/lib/money';

interface StatCardProps {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative';
}

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  const toneClass = {
    default: 'text-gray-900',
    positive: 'text-green-700',
    negative: 'text-red-700',
  }[tone];

  return (
    <Card>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{formatMoneyWithSymbol(value)}</p>
    </Card>
  );
}