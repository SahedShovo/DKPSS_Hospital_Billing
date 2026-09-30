/**
 * Bed charge: প্রতি ১২ ঘণ্টা বা তার অংশ = ১ বার
 * ৩৬ ঘণ্টা = ৩, ৩৬ ঘণ্টা ১ মিনিট = ৪, ১ মিনিট = ১
 * এটা admission module-এ (পরের দিন) ব্যবহার হবে।
 */
export function calculateBedBlocks(admitTime: Date, referenceTime: Date): number {
  const diffMs = referenceTime.getTime() - admitTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const blocks = Math.ceil(diffHours / 12);
  return Math.max(1, blocks);
}