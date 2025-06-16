import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAxL3iOY6RWc0w9XosOW332hT4Zr2IFJjk",
  authDomain: "bookmyturf-d6141.firebaseapp.com",
  projectId: "bookmyturf-d6141",
  storageBucket: "bookmyturf-d6141.firebasestorage.app",
  messagingSenderId: "591525544980",
  appId: "1:591525544980:web:6b1db646a3d50d83935301"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
