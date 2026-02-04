// firebase-init.js (FINAL)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRYJTS1QLa9JZgZ-hl9XAtY06-reXoZTQ",
  authDomain: "kokky-hot-spring-hop.firebaseapp.com",
  projectId: "kokky-hot-spring-hop",
  storageBucket: "kokky-hot-spring-hop.firebasestorage.app",
  messagingSenderId: "526923945723",
  appId: "1:526923945723:web:d4aa57c2628cf6a7ad425e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
