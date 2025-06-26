'use server';

/**
 * @fileOverview Este arquivo define um fluxo Genkit para sugerir categorias de despesas com base em uma descrição.
 *
 * - suggestExpenseCategory - Uma função que recebe uma descrição de despesa e retorna sugestões de categoria.
 * - SuggestExpenseCategoryInput - O tipo de entrada para a função suggestExpenseCategory.
 * - SuggestExpenseCategoryOutput - O tipo de saída para a função suggestExpenseCategory.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestExpenseCategoryInputSchema = z.object({
  expenseDescription: z
    .string()
    .describe('A descrição da despesa a ser categorizada.'),
});
export type SuggestExpenseCategoryInput = z.infer<
  typeof SuggestExpenseCategoryInputSchema
>;

const SuggestExpenseCategoryOutputSchema = z.object({
  suggestedCategories: z
    .array(z.string())
    .describe('Um array de categorias de despesas sugeridas.'),
});
export type SuggestExpenseCategoryOutput = z.infer<
  typeof SuggestExpenseCategoryOutputSchema
>;

export async function suggestExpenseCategory(
  input: SuggestExpenseCategoryInput
): Promise<SuggestExpenseCategoryOutput> {
  return suggestExpenseCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestExpenseCategoryPrompt',
  input: {schema: SuggestExpenseCategoryInputSchema},
  output: {schema: SuggestExpenseCategoryOutputSchema},
  prompt: `Você é um consultor financeiro especialista em categorizar despesas para produções audiovisuais.

  Dada a seguinte descrição de despesa, sugira algumas categorias relevantes.

  Descrição da Despesa: {{{expenseDescription}}}

  Forneça as categorias como um array JSON de strings.`,
});

const suggestExpenseCategoryFlow = ai.defineFlow(
  {
    name: 'suggestExpenseCategoryFlow',
    inputSchema: SuggestExpenseCategoryInputSchema,
    outputSchema: SuggestExpenseCategoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
