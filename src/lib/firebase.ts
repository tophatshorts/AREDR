import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import defaultConfig from '../../firebase-applet-config.json';

const rawConfig = (defaultConfig && typeof defaultConfig === 'object') ? defaultConfig : {} as Record<string, string>;

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawConfig.appId || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || rawConfig.firestoreDatabaseId || '(default)',
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp;
let dbInstance: Firestore;
let authInstance: Auth;

try {
  if (isFirebaseConfigured) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    dbInstance = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
    authInstance = getAuth(app);
  } else {
    // Safe fallback if Firebase config is omitted or erased
    app = getApps().length > 0 ? getApps()[0] : initializeApp({
      apiKey: 'demo-api-key',
      projectId: 'demo-gd-rng',
      appId: 'demo-app-id',
    });
    dbInstance = getFirestore(app);
    authInstance = getAuth(app);
  }
} catch (err) {
  console.warn('Firebase init fallback warning:', err);
  // Ensure non-null exports
  app = getApps().length > 0 ? getApps()[0] : ({} as FirebaseApp);
  try {
    dbInstance = getFirestore(app);
  } catch {
    dbInstance = {} as Firestore;
  }
  try {
    authInstance = getAuth(app);
  } catch {
    authInstance = {} as Auth;
  }
}

export const db = dbInstance;
export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
