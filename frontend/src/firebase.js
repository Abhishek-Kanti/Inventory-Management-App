// src/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-L2pj_4XVH9y7VBYOSAsTsT8p4cveHZY",
  authDomain: "foodai-7ebf0.firebaseapp.com",
  databaseURL: "https://foodai-7ebf0-default-rtdb.firebaseio.com",
  projectId: "foodai-7ebf0",
  storageBucket: "foodai-7ebf0.firebasestorage.app",
  messagingSenderId: "1802738846",
  appId: "1:1802738846:web:f6985b95b8487ce3c7ef8f",
  measurementId: "G-QJWXCZ7Y56",
};

// Initialize Firebase app (only if not already initialized)
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Export the database instance
const database = getDatabase(app);
export { app, database };
