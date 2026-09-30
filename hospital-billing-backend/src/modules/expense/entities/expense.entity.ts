export interface ExpenseEntity {
  id: number;
  enteredBy: number;
  expenseDate: string;
  expenseType: string;
  amount: string;
  description: string | null;
  createdAt: Date;
}