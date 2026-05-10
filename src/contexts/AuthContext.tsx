import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { ethers } from "ethers";
import toast from "react-hot-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: any;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  isAdmin: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connectWallet = async () => {
    // Check if ethereum is available
    const ethereum = window.ethereum;
    
    if (!ethereum) {
      toast.error("MetaMask is not installed. Please install it to continue.");
      return;
    }

    try {
      // In some environments (like iframes), we might need to specifically request permissions.
      // We'll use the standards-compliant request method.
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        if (user) {
          await updateDoc(doc(db, "users", user.uid), {
            walletAddress: accounts[0]
          });
        }
        toast.success("Wallet connected!");
      } else {
        throw new Error("No accounts found.");
      }
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      
      // Handle known error codes
      if (error.code === 4001) {
        toast.error("Connection request was rejected by the user.");
      } else if (error.code === -32002) {
        toast.error("Connection request already pending. Please check MetaMask.");
      } else {
        // Generic error with fallback
        const message = error.message || "Failed to connect to MetaMask.";
        const isIframe = window.self !== window.top;
        toast.error(
          `${message} ${isIframe ? "Iframe detected: please try opening the app in a new tab if problems persist." : "Please ensure MetaMask is unlocked and try again."}`
        );
      }
    } finally {
      // If I had a loading state I'd set it false here
    }
  };

  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          if (user) {
             updateDoc(doc(db, "users", user.uid), { walletAddress: accounts[0] }).catch(console.error);
          }
        } else {
          setWalletAddress(null);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Handle profile with onSnapshot
        const userRef = doc(db, "users", user.uid);
        
        try {
          // Initial fetch/create if needed
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            const newProfile = {
              userId: user.uid,
              email: user.email,
              displayName: user.displayName,
              subscriptionTier: "free",
              isPremium: false,
              isAuthor: false,
              onboarded: false,
              wishlist: [],
              purchasedBooks: [],
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newProfile);
          }

        // Listen for changes
        unsubscribeProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data());
          }
        }, (err) => {
          console.error("Profile sync error:", err);
        });

        // Check admin
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        setIsAdmin(adminDoc.exists() || user.email === "mbotorjoy@gmail.com");
      } catch (err) {
        console.error("Auth init error:", err);
      }
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, profile, signIn, logOut, isAdmin, walletAddress, connectWallet }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
