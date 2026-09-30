export interface Expense {
  id: number;
  enteredBy: number;
  expenseDate: string;
  expenseType: string;
  amount: string;
  description: string | null;
  createdAt: string;
}

export interface CreateExpenseInput {
  expenseDate: string;
  expenseType: string;
  amount: string;
  description?: string;
}