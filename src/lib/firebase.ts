import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDYPcC5cxORPNMKrbmtAm1_-b0nrukUdFM",
  authDomain: "waid-19eea.firebaseapp.com",
  projectId: "waid-19eea",
  storageBucket: "waid-19eea.firebasestorage.app",
  messagingSenderId: "806430713785",
  appId: "1:806430713785:web:994361e7e58a31d6793868"
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

function ensureInitialized(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(ensureInitialized());
  }
  return authInstance;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(ensureInitialized());
  }
  return firestoreInstance;
}
