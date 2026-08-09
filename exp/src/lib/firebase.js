import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBsrBYzdtgmJAWj4dFkoVCU3AW1usmyvlA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'maya-4a18e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'maya-4a18e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'maya-4a18e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '885321747185',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:885321747185:web:80a303811b38ad796af750',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

let authPromise = null;

export function ensureFirebaseSession() {
  if (!authPromise) {
    authPromise = (async () => {
      if (auth.currentUser) return auth.currentUser;
      try {
        const result = await signInAnonymously(auth);
        return result.user;
      } catch {
        return null;
      }
    })();
  }
  return authPromise;
}
