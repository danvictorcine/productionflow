"use server";

import { suggestExpenseCategory } from "@/ai/flows/suggest-expense-category";
import { EXPENSE_CATEGORIES } from "@/lib/types";

export async function getCategorySuggestions(
  description: string
): Promise<string[]> {
  if (!description) {
    return [];
  }
  try {
    const result = await suggestExpenseCategory({
      expenseDescription: description,
    });
    
    // Filter to only include known categories
    const validCategories = result.suggestedCategories.filter((cat) =>
      (EXPENSE_CATEGORIES as readonly string[]).includes(cat)
    );
    
    return Array.from(new Set(validCategories)); // Return unique categories
  } catch (error) {
    console.error("Error getting category suggestions:", error);
    return [];
  }
}
