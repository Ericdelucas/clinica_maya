import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBsrBYzdtgmJAWj4dFkoVCU3AW1usmyvlA',
  authDomain: 'maya-4a18e.firebaseapp.com',
  projectId: 'maya-4a18e',
  storageBucket: 'maya-4a18e.firebasestorage.app',
  messagingSenderId: '885321747185',
  appId: '1:885321747185:web:80a303811b38ad796af750',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
