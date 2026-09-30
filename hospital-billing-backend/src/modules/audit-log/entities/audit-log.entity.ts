export interface AuditLogEntity {
  id: number;
  userId: number;
  action: string;
  tableName: string;
  recordId: number | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date;
}