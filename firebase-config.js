// Paste the config object from Firebase console → Project settings → General →
// "Your apps" → Web app → SDK setup and configuration → Config.
// See README.md for the full walkthrough. This file is loaded before the app
// script, so `firebase.initializeApp` below is all that's needed.

var firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

if (firebaseConfig.apiKey !== "REPLACE_ME" && window.firebase) {
  firebase.initializeApp(firebaseConfig);
}
