// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCe3oEaQDmY5NynJ-XJ-c6MxwgPVV5r3BA",
  authDomain: "biz-webapp.firebaseapp.com",
  projectId: "biz-webapp",
  storageBucket: "biz-webapp.appspot.com",
  messagingSenderId: "410143134409",
  appId: "1:410143134409:web:8eefba545a48a9d764f318"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
