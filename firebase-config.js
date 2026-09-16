// Paste the config object from Firebase console → Project settings → General →
// "Your apps" → Web app → SDK setup and configuration → Config.
// See README.md for the full walkthrough. This file is loaded before the app
// script, so `firebase.initializeApp` below is all that's needed.

var firebaseConfig = {
  apiKey: "AIzaSyDHDRUYLjF7-RkFGh-nUVNdeO3JopnA2UQ",
  authDomain: "iron-log-975eb.firebaseapp.com",
  projectId: "iron-log-975eb",
  storageBucket: "iron-log-975eb.firebasestorage.app",
  messagingSenderId: "766109322960",
  appId: "1:766109322960:web:2f4f0e85f6fbf2774018d5"
};

if (firebaseConfig.apiKey !== "REPLACE_ME" && window.firebase) {
  firebase.initializeApp(firebaseConfig);
}
