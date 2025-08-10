
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, type Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, type FirebaseStorage, connectStorageEmulator } from "firebase/storage";

// A configuração agora usa uma variável dedicada para o projectId dos dados,
// para resolver o problema de serviços divididos entre projetos Firebase.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  // Use a nova variável para o ID do projeto de dados, ou use o padrão se não estiver definida.
  projectId: process.env.NEXT_PUBLIC_FIREBASE_DATA_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let firebaseError: Error | null = null;

try {
  // We explicitly check for the API key to provide a more helpful error message.
  if (!firebaseConfig.apiKey) {
    throw new Error("A chave de API do Firebase (NEXT_PUBLIC_FIREBASE_API_KEY) não foi encontrada. Por favor, verifique se o seu arquivo .env está configurado corretamente.");
  }
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Conectar aos emuladores em ambiente de desenvolvimento
  if (process.env.NODE_ENV === 'development' && auth && db && storage) {
    console.log("Executando em ambiente de desenvolvimento, conectando aos emuladores do Firebase...");
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
  }

} catch (error: any) {
  // Catch the error and store it, so we can display a friendly message in the UI.
  firebaseError = error;
  console.error("Falha na inicialização do Firebase:", error);
}

// The Firebase services are exported as potentially undefined.
// The AuthProvider will handle the case where they are not available.
export { app, auth, db, storage, firebaseError };

