'use client';

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { Role } from '@/types/auth.types';

interface DashboardShellProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

export function DashboardShell({ children, allowedRoles }: DashboardShellProps) {
  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <div className="flex min-h-screen flex-col bg-[#f5f8f7] lg:flex-row">
        <Sidebar />
        <div className="flex-1">
          <Topbar />
          <main className="min-w-0 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}