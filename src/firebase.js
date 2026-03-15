import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB5ADQ3FcX7XAvIwTOHeos1yBdy9KZ1H4Q',
  authDomain: 'coachos2.firebaseapp.com',
  projectId: 'coachos2',
  storageBucket: 'coachos2.firebasestorage.app',
  messagingSenderId: '1071969610884',
  appId: '1:1071969610884:web:b03058771978d1160c26d1',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
