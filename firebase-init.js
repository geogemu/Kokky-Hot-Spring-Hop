import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

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
export const auth = getAuth(app);

// resolves ONLY when we truly have a signed-in user
export const authReady = new Promise((resolve, reject) => {
  const unsub = onAuthStateChanged(auth, (user) => {
    if (user) {
      unsub();
      resolve(user);
    }
  });

  signInAnonymously(auth).catch((err) => {
    console.error("Anonymous auth failed:", err);
    reject(err);
  });
});
