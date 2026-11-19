export function formatPatientAge(age: string | number, language: 'bn' | 'en' = 'bn'): string {
  const value = String(age).trim();
  if (!value) return language === 'bn' ? 'উল্লেখ নেই' : 'Not specified';

  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return language === 'bn' ? `${value} বছর` : `${value} years`;
  }

  return value;
}
