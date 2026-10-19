'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BedDouble,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Package,
  ReceiptText,
  Stethoscope,
  UserRound,
  UsersRound,
  WalletCards,
  ChartNoAxesCombined,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'কাজ',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'রোগী (Patients)', href: '/patients', icon: UserRound },
      { label: 'বিল (Bills)', href: '/bills', icon: ReceiptText },
      { label: 'ভর্তি (Admissions)', href: '/admissions', icon: BedDouble },
      { label: 'পুরোনো বাকি (Due Payments)', href: '/due-payments', icon: WalletCards },
    ],
  },
  {
    label: 'পরিচালনা',
    items: [
      { label: 'ডাক্তার (Doctors)', href: '/doctors', icon: Stethoscope, adminOnly: true },
      { label: 'টেস্ট (Tests)', href: '/tests', icon: FlaskConical, adminOnly: true },
      { label: 'প্যাকেজ (Packages)', href: '/packages', icon: Package, adminOnly: true },
      { label: 'খরচ (Expenses)', href: '/expenses', icon: Activity, adminOnly: true },
      { label: 'ইউজার (Users)', href: '/users', icon: UsersRound, adminOnly: true },
      { label: 'রিপোর্ট (Reports)', href: '/reports', icon: ChartNoAxesCombined, adminOnly: true },
      { label: 'Audit Log', href: '/audit-logs', icon: ClipboardList, adminOnly: true },
    ],
  },
];

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || user?.role === 'ADMIN'),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className="relative z-20 flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5 lg:py-5">
        <Link
          href="/dashboard"
          aria-label="DKPSSHP Billing & Care Dashboard-এ যান"
          title="Dashboard-এ যান"
          className="flex cursor-pointer items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm shadow-teal-900/20">
            <Activity size={21} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900">DKPSSHP</h1>
            <p className="text-xs text-slate-500">Billing &amp; Care</p>
          </div>
        </Link>
      </div>

      <nav aria-label="প্রধান নেভিগেশন" className="flex gap-2 overflow-x-auto px-3 py-2 lg:flex-1 lg:flex-col lg:gap-5 lg:overflow-x-hidden lg:overflow-y-auto lg:px-3 lg:py-5">
        {visibleGroups.map((group) => (
          <div key={group.label} className="flex shrink-0 items-center gap-1 lg:block lg:space-y-1">
            <p className="hidden px-3 pb-1 text-[10px] font-semibold uppercase text-slate-400 lg:block">
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                  className={`group relative inline-flex min-h-10 shrink-0 items-center gap-3 whitespace-nowrap rounded-md px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 lg:min-h-11 lg:w-full ${
                    isActive
                      ? 'bg-teal-50 font-semibold text-teal-800'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className={isActive ? 'text-teal-700' : 'text-slate-400 group-hover:text-teal-700'}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-1 left-3 right-3 h-0.5 rounded-full bg-teal-600 lg:bottom-2 lg:left-0 lg:right-auto lg:top-2 lg:h-auto lg:w-0.5" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="hidden border-t border-slate-200 px-5 py-4 lg:block">
        <p className="text-xs font-medium text-slate-500">DKPSSHP</p>
        <p className="mt-0.5 text-[11px] text-slate-400">Hospital management</p>
      </div>
    </aside>
  );
}
