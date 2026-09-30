import type { Metadata } from 'next';
import { AuthProvider } from '@/context/auth-context';
import { ShiftProvider } from '@/context/shift-context';
import { ToastProvider } from '@/context/toast-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hospital Billing System',
  description: 'DKPSSHP Hospital Billing & Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className="bg-gray-50 antialiased">
        <ToastProvider>
          <AuthProvider>
            <ShiftProvider>{children}</ShiftProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
