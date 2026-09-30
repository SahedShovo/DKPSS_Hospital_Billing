export interface AuditLog {
  id: number;
  userId: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: number | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}