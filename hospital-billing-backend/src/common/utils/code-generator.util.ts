/**
 * patient_code: P-000001, bill_no: D-000001 / T-000001 / A-000001
 * এখানে শুধু format তৈরি হয়; পরের number DB থেকে (COUNT বা SEQUENCE) আসবে —
 * এটা bill/patient service-এ (পরের দিনগুলোতে) ব্যবহার হবে।
 */
export function formatSequenceCode(prefix: string, nextNumber: number): string {
  return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
}

export function billPrefixFor(billType: 'DOCTOR_VISIT' | 'DIAGNOSTIC' | 'ADMISSION' | 'PACKAGE'): string {
  switch (billType) {
    case 'DOCTOR_VISIT':
      return 'D';
    case 'DIAGNOSTIC':
      return 'T';
    case 'ADMISSION':
      return 'A';
    case 'PACKAGE':
      return 'P';
  }
}
