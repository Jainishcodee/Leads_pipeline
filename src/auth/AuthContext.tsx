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
import type { User as AppUser } from "@/types";

type AuthContextValue = {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserDocument = async (authUser: User) => {
    const userRef = doc(db, "users", authUser.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      await setDoc(userRef, {
        id: authUser.uid,
        email: authUser.email,
        name: authUser.displayName || authUser.email?.split("@")[0] || "User",
        avatar: null,
        role: "member",
        organizationId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        id: authUser.uid,
        email: authUser.email || "",
        name: authUser.displayName || authUser.email?.split("@")[0] || "User",
        avatar: null,
        role: "member" as const,
        organizationId: null,
        createdAt: new Date(),
      } satisfies AppUser;
    }
    const data = snapshot.data();
    return { id: snapshot.id, ...data } as AppUser;
  };

  const loadProfile = async (authUser: User | null) => {
    if (!authUser) {
      setProfile(null);
      return;
    }
    try {
      const userDoc = await ensureUserDocument(authUser);
      setProfile(userDoc);
    } catch (error) {
      console.error("Failed to load user profile:", error);
      setProfile(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!isMounted) return;

      setLoading(true);
      setUser(nextUser);
      await loadProfile(nextUser);
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
      profile,
      loading,
      signIn: async (email, password) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await loadProfile(credential.user);
        return credential.user;
      },
      signUp: async (email, password) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await loadProfile(credential.user);
        return credential.user;
      },
      refreshProfile: async () => {
        if (user) {
          await loadProfile(user);
        }
      },
      signOut: async () => {
        setProfile(null);
        setUser(null);
        await firebaseSignOut(auth);
      },
    }),
    [user, profile, loading],
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
