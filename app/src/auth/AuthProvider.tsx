import { useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { AuthContext, type AuthState } from "./useAuth";

const provider = new GoogleAuthProvider();

async function ensureUserDoc(user: User) {
  const ref = doc(db, "users", user.uid);
  if (!(await getDoc(ref)).exists()) {
    await setDoc(ref, {
      displayName: user.displayName || "Player",
      photoURL: user.photoURL || null,
      email: user.email || null,
      createdAt: serverTimestamp(),
    });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) await ensureUserDoc(u);
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value: AuthState = {
    user,
    loading,
    signInGoogle: async () => {
      await signInWithPopup(auth, provider);
    },
    signInEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signUpEmail: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    signOutUser: async () => {
      await signOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
