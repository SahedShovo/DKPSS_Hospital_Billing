'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { patientApi } from '@/lib/patient';
import { ApiError } from '@/lib/api';
import { Gender } from '@/types/patient.types';

export default function NewPatientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'MALE' as Gender,
    phone: '',
    address: '',
    refer: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const patient = await patientApi.create({
        name: form.name,
        age: parseInt(form.age, 10),
        gender: form.gender,
        phone: form.phone,
        address: form.address,
        refer: form.refer || undefined,
      });
      router.push(`/patients/${patient.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'রোগী তৈরি করা যায়নি');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardShell>
      <h1 className="mb-5 text-xl font-semibold text-gray-900">নতুন রোগী ভর্তি</h1>

      <Card className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="নাম"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="বয়স"
              type="number"
              min="0"
              max="150"
              required
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
            <Select
              label="লিঙ্গ"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>

          <Input
            label="ফোন নম্বর"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <Input
            label="ঠিকানা"
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />

          <Input
            label="রেফার (ঐচ্ছিক)"
            value={form.refer}
            onChange={(e) => setForm({ ...form, refer: e.target.value })}
          />

          {error && <Alert message={error} />}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              বাতিল
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}