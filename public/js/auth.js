import { auth, db } from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();
export const signIn = () => signInWithPopup(auth, provider);
export const signInEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logOut = () => signOut(auth);
export const currentUid = () => auth.currentUser?.uid || null;
export const currentUser = () => auth.currentUser;
export function onAuth(cb) { return onAuthStateChanged(auth, cb); }

export async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  if (!(await getDoc(ref)).exists()) {
    await setDoc(ref, {
      displayName: user.displayName || "Player",
      photoURL: user.photoURL || null,
      email: user.email || null,
      createdAt: serverTimestamp()
    });
  }
}
