# ProductionFlow - by Firebase Studio

This is a Next.js starter project built with Firebase Studio, designed for managing audiovisual productions. It uses Next.js, React, ShadCN UI, Tailwind CSS, and Genkit for AI features.

## Getting Started

To get the application running locally, first install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

In the project directory, you can run:

- `npm run dev`: Starts the application in development mode.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts a production server.
- `npm run lint`: Runs the linter to check for code quality issues.
- `npm run typecheck`: Runs the TypeScript compiler to check for type errors.

## Folder Structure

Here is a brief overview of the key directories:

- **`/src/app`**: Contains all the pages of the application, following the Next.js App Router structure. This includes public pages, authenticated routes, and the admin panel.
- **`/src/components`**: Houses all the reusable React components, including UI components from ShadCN (`/ui`) and custom application components.
- **`/src/lib`**: Core logic, type definitions, and utility functions.
  - **`/firebase`**: Configuration and API functions for interacting with Firebase services (Firestore, Auth, Storage).
  - **`/types.ts`**: Centralized TypeScript type definitions for the entire application.
- **`/src/context`**: React context providers, such as the `AuthContext` for managing user authentication state.
- **`/src/ai`**: Contains all AI-related logic, including Genkit flows.
- **`/public`**: Static assets that are publicly accessible.
# productionflow
# productionflow
