'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('লগইন করা যায়নি, আবার চেষ্টা করুন');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f8f7] px-4 py-8 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.13),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.11),transparent_34%)]" />
      <Card className="relative grid w-full max-w-5xl overflow-hidden shadow-xl shadow-slate-900/10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden min-h-[600px] flex-col justify-between overflow-hidden bg-teal-800 p-10 text-white lg:flex">
          <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full border-[32px] border-teal-700/60" />
          <div className="absolute -bottom-36 -left-24 h-80 w-80 rounded-full border-[42px] border-teal-900/30" />
          <div className="relative">
            <div className="mb-12 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg font-bold">+</div>
              <span className="text-sm font-semibold tracking-[0.16em] text-teal-50">DKPSSHP HOSPITAL</span>
            </div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-teal-200">Care, connected</p>
            <h2 className="max-w-sm text-4xl font-semibold leading-tight tracking-tight">Every visit, accounted for.</h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-teal-100/80">
              Keep billing, payments, admissions, and patient care moving together from one calm workspace.
            </p>
          </div>
          <div className="relative flex items-center gap-3 border-t border-teal-700 pt-6 text-sm text-teal-100/80">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Secure staff access
          </div>
        </div>

        <CardContent className="p-7 sm:p-12 lg:p-16">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3 text-teal-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-lg font-bold">+</div>
              <span className="text-sm font-semibold tracking-[0.16em]">DKPSSHP HOSPITAL</span>
            </div>
          </div>
          <div className="mb-8">
            <p className="mb-3 text-sm font-medium text-teal-700">Staff portal</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Welcome back</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">আপনার অ্যাকাউন্টে লগইন করে কাজ শুরু করুন</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </Button>
          </form>
          <p className="mt-8 text-center text-xs text-slate-400">Authorized hospital staff only</p>
        </CardContent>
      </Card>
    </div>
  );
}