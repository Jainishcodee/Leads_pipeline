import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserDocument = async (authUser: User) => {
    const userRef = doc(db, "users", authUser.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      const isAdmin = authUser.email === "jainishshah356@gmail.com";
      await setDoc(userRef, {
        id: authUser.uid,
        email: authUser.email,
        name: authUser.displayName || authUser.email?.split("@")[0] || "User",
        avatar: null,
        role: isAdmin ? "admin" : "member",
        organizationId: "org_1",
        createdAt: serverTimestamp(),
      });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!isMounted) return;

      setUser(nextUser);
      if (nextUser) {
        try {
          await ensureUserDocument(nextUser);
        } catch (error) {
          console.error("Failed to ensure user document:", error);
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (email, password) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await ensureUserDocument(credential.user);
        return credential.user;
      },
      signUp: async (email, password) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await ensureUserDocument(credential.user);
        return credential.user;
      },
      signOut: async () => {
        setUser(null);
        await firebaseSignOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
