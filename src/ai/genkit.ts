'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';

export const ai = genkit({
  plugins: [
    firebase(), // Firebase plugin for auth context
    googleAI(), // Google AI plugin for Gemini
  ],
  logSinks: [], // Disable server-side logging for this context
  enableTracing: false, // Disable tracing for this context
});
