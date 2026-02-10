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

// Admin credentials bypass
const ADMIN_EMAIL = 'jainishshah356@gmail.com';
const ADMIN_PASSWORD = 'admin';

// Mock user object for admin bypass
const createMockUser = (email: string): Partial<User> => ({
  email,
  uid: 'admin_bypass_' + Date.now(),
  displayName: 'Admin User',
  emailVerified: true,
});

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (email, password) => {
        // Admin bypass check
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          const mockUser = createMockUser(email) as User;
          setUser(mockUser);
          return mockUser;
        }
        
        // Regular Firebase authentication
        const credential = await signInWithEmailAndPassword(auth, email, password);
        return credential.user;
      },
      signUp: async (email, password) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
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
