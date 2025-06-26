export const EXPENSE_CATEGORIES = [
  "Talent Fee",
  "Production Costs",
  "Post-production",
  "Marketing & Distribution",
  "Contingency",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Transaction = {
  id: string;
  type: "revenue" | "expense";
  amount: number;
  description: string;
  category?: ExpenseCategory;
  date: Date;
};
