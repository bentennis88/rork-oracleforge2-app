import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBhx2eHtNdylUKnSekDNhTcvL_WQnJ_sfU',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'oracleforge.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'oracleforge',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'oracleforge.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || 'https://oracleforge-default-rtdb.firebaseio.com',
};

// Initialize Firebase app (avoid duplicate initialization)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firestore instance
export const db = getFirestore(app);

// Realtime Database instance
export const database = getDatabase(app);

// Export the app instance
export { app };

export default firebaseConfig;
