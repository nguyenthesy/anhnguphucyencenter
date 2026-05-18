import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const SERVER_APP_NAME = "cron-server-lite";

function getSrvDb() {
  const apps = getApps();
  let serverApp = apps.find(a => a.name === SERVER_APP_NAME);
  
  if (!serverApp) {
    serverApp = initializeApp(firebaseConfig, SERVER_APP_NAME);
  } else {
    serverApp = getApp(SERVER_APP_NAME);
  }
  
  // getFirestore from 'firebase/firestore/lite' uses simple HTTP/REST
  // No gRPC, no connection issues.
  return { serverApp, serverDb: getFirestore(serverApp) };
}

const { serverApp, serverDb } = getSrvDb();
export { serverApp, serverDb };
