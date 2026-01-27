import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKgcw8PnQpd_MJebEgqG9FBUiqD5nUG-s",
  authDomain: "auth.ghostnote.site",
  projectId: "ghostnoteai",
  storageBucket: "ghostnoteai.firebasestorage.app",
  messagingSenderId: "518483511572",
  appId: "1:518483511572:web:4ec7290fd26b89a2efda01",
  measurementId: "G-58ST828LG8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
