import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-bold text-gray-900">404</h1>
      <p className="text-sm text-gray-500">এই পেজটি খুঁজে পাওয়া যায়নি</p>
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        Dashboard-এ ফিরে যান
      </Link>
    </div>
  );
}