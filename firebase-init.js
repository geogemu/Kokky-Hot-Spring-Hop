import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRYJTS1QLa9JZgZ-hl9XAtY06-reXoZTQ",
  authDomain: "kokky-hot-spring-hop.firebaseapp.com",
  projectId: "kokky-hot-spring-hop",
  storageBucket: "kokky-hot-spring-hop.firebasestorage.app",
  messagingSenderId: "526923945723",
  appId: "1:526923945723:web:d4aa57c2628cf6a7ad425e"
};

// initialize Firebase
const app = initializeApp(firebaseConfig);

// export database + auth so other files can use them
export const db = getFirestore(app);
export const auth = getAuth(app);

// sign in anonymously (auto, no popup)
export const authReady = signInAnonymously(auth).catch(console.error);
