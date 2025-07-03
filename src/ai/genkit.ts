
'use server';

/**
 * @fileOverview A file to initialize and configure Genkit.
 * This file sets up the necessary plugins for Firebase and Google AI
 * and exports the 'ai' object used throughout the application.
 */

import {genkit} from 'genkit';
import {googleAI} from 'genkit/googleai';
import {firebase} from 'genkit/firebase';

// Initialize Genkit and export the 'ai' object.
// This object is used throughout the application to interact with Genkit services.
export const ai = genkit({
  plugins: [
    // The Firebase plugin is used to store traces in Firestore.
    // Make sure to configure Firestore in your Firebase project.
    firebase(),
    // The Google AI plugin is used to generate content with Gemini.
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
});
