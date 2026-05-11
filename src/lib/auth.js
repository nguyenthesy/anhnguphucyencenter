import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";
import { createUser, getUserByUid } from "./firestore";

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const userData = await getUserByUid(cred.user.uid);
  return { user: cred.user, userData };
}

export async function register(email, password, displayName, role = "teacher") {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await createUser(cred.user.uid, {
    email,
    displayName,
    role,
    status: "active",
  });
  return cred.user;
}

export async function logout() {
  return signOut(auth);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
