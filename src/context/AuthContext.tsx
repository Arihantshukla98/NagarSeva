import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User as UserProfile } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loginAsDemo: (role?: 'citizen' | 'authority') => Promise<void>;
  logout: () => Promise<void>;
  syncProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronize Firestore user document with the Express db.json database
  const syncWithServer = async (email: string, name: string, uid: string) => {
    try {
      const response = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      if (response.ok) {
        const serverUser = await response.json();
        // Return the server user to compare or update
        return serverUser;
      }
    } catch (error) {
      console.error('Error syncing user profile with Express server:', error);
    }
    return null;
  };

  const syncProfile = async () => {
    if (!auth.currentUser) return;
    const currentUser = auth.currentUser;
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const firestoreProfile = docSnap.data() as UserProfile;
        const serverProfile = await syncWithServer(
          currentUser.email || '',
          firestoreProfile.name || currentUser.displayName || 'Active Citizen',
          currentUser.uid
        );

        if (serverProfile) {
          const needsUpdate =
            serverProfile.points !== firestoreProfile.points ||
            serverProfile.issuesReported !== firestoreProfile.issuesReported ||
            serverProfile.issuesVerified !== firestoreProfile.issuesVerified ||
            JSON.stringify(serverProfile.badges) !== JSON.stringify(firestoreProfile.badges);

          if (needsUpdate) {
            const updatedData = {
              points: serverProfile.points,
              issuesReported: serverProfile.issuesReported,
              issuesVerified: serverProfile.issuesVerified,
              badges: serverProfile.badges
            };
            await updateDoc(userRef, updatedData);
            setProfile({ ...firestoreProfile, ...updatedData });
            localStorage.setItem('nagar_seva_user', JSON.stringify({ ...firestoreProfile, ...updatedData }));
            window.dispatchEvent(new Event('storage'));
          }
        }
      }
    } catch (err) {
      console.error('Error in manual profile sync:', err);
    }
  };

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const demoMode = localStorage.getItem('nagar_seva_demo_mode');
    if (demoMode) {
      const demoProfileStr = localStorage.getItem('nagar_seva_user');
      if (demoProfileStr) {
        try {
          const demoProfile = JSON.parse(demoProfileStr) as UserProfile;
          const mockUser = {
            uid: demoProfile.id,
            email: demoProfile.email,
            displayName: demoProfile.name,
            emailVerified: true
          } as FirebaseUser;
          setUser(mockUser);
          setProfile(demoProfile);
          setLoading(false);
          return;
        } catch (e) {
          console.error('Error loading demo profile:', e);
        }
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clear any existing Firestore subscription first
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Define robust profile fallback in case of Firestore permissions or connectivity errors
        const setFallbackProfile = () => {
          const defaultProfile: UserProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Active Citizen',
            email: firebaseUser.email || '',
            points: 100, // Sign up bonus
            badges: ['pioneer_citizen'],
            issuesReported: 0,
            issuesVerified: 0,
            createdAt: new Date().toISOString()
          };
          
          setProfile(defaultProfile);
          localStorage.setItem('nagar_seva_user', JSON.stringify(defaultProfile));
          window.dispatchEvent(new Event('storage'));
          setLoading(false);
          
          // Background attempt to sync with local express db.json
          syncWithServer(defaultProfile.email, defaultProfile.name, firebaseUser.uid).catch(e => {
            console.error('Background sync failed:', e);
          });
        };

        try {
          // Setup real-time listener for the user's profile in Firestore with safety error callback
          unsubSnapshot = onSnapshot(userRef, async (docSnap) => {
            try {
              if (docSnap.exists()) {
                const firestoreProfile = docSnap.data() as UserProfile;
                
                // Sync with Express backend to ensure db.json is aware of this user
                const serverProfile = await syncWithServer(
                  firebaseUser.email || '',
                  firestoreProfile.name || firebaseUser.displayName || 'Active Citizen',
                  firebaseUser.uid
                );

                // If the server profile has different points/badges/metrics (e.g. awarded by the server),
                // update Firestore to maintain consistency.
                if (serverProfile) {
                  const needsUpdate =
                    serverProfile.points !== firestoreProfile.points ||
                    serverProfile.issuesReported !== firestoreProfile.issuesReported ||
                    serverProfile.issuesVerified !== firestoreProfile.issuesVerified ||
                    JSON.stringify(serverProfile.badges) !== JSON.stringify(firestoreProfile.badges);

                  if (needsUpdate) {
                    const updatedData = {
                      points: serverProfile.points,
                      issuesReported: serverProfile.issuesReported,
                      issuesVerified: serverProfile.issuesVerified,
                      badges: serverProfile.badges
                    };
                    try {
                      await updateDoc(userRef, updatedData);
                    } catch (e) {
                      console.warn('Could not update profile in Firestore (will persist locally):', e);
                    }
                    setProfile({ ...firestoreProfile, ...updatedData });
                    localStorage.setItem('nagar_seva_user', JSON.stringify({ ...firestoreProfile, ...updatedData }));
                  } else {
                    setProfile(firestoreProfile);
                    localStorage.setItem('nagar_seva_user', JSON.stringify(firestoreProfile));
                  }
                } else {
                  setProfile(firestoreProfile);
                  localStorage.setItem('nagar_seva_user', JSON.stringify(firestoreProfile));
                }
              } else {
                // Document doesn't exist yet, we'll create it
                const defaultProfile: UserProfile = {
                  id: firebaseUser.uid,
                  name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Active Citizen',
                  email: firebaseUser.email || '',
                  points: 100, // Sign up bonus
                  badges: ['pioneer_citizen'],
                  issuesReported: 0,
                  issuesVerified: 0,
                  createdAt: new Date().toISOString()
                };
                
                try {
                  await setDoc(userRef, defaultProfile);
                } catch (e) {
                  console.warn('Could not write new user profile to Firestore (using fallback):', e);
                }
                
                // Sync with server
                await syncWithServer(defaultProfile.email, defaultProfile.name, firebaseUser.uid);
                
                setProfile(defaultProfile);
                localStorage.setItem('nagar_seva_user', JSON.stringify(defaultProfile));
              }
              window.dispatchEvent(new Event('storage'));
              setLoading(false);
            } catch (err) {
              console.error('Error handling onSnapshot callback:', err);
              setFallbackProfile();
            }
          }, (error) => {
            console.warn('Firestore onSnapshot access rejected or offline (using local fallback):', error);
            setFallbackProfile();
            try {
              handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            } catch (e) {
              // Suppress throw to allow fallback profile to function
            }
          });
        } catch (error) {
          console.error('Error initiating Firestore onSnapshot:', error);
          setFallbackProfile();
        }
      } else {
        setProfile(null);
        localStorage.removeItem('nagar_seva_user');
        window.dispatchEvent(new Event('storage'));
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      const defaultProfile: UserProfile = {
        id: userCredential.user.uid,
        name: name,
        email: email,
        points: 100,
        badges: ['pioneer_citizen'],
        issuesReported: 0,
        issuesVerified: 0,
        createdAt: new Date().toISOString()
      };
      
      const userRef = doc(db, 'users', userCredential.user.uid);
      try {
        await setDoc(userRef, defaultProfile);
      } catch (err) {
        console.error('Error writing profile to Firestore:', err);
        try {
          handleFirestoreError(err, OperationType.WRITE, `users/${userCredential.user.uid}`);
        } catch (e) {
          // Allow signUp to complete with fallback profile
        }
      }
      
      // Sync with server
      await syncWithServer(email, name, userCredential.user.uid);
      
      setProfile(defaultProfile);
      localStorage.setItem('nagar_seva_user', JSON.stringify(defaultProfile));
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const loginAsDemo = async (role: 'citizen' | 'authority' = 'citizen') => {
    setLoading(true);
    try {
      localStorage.setItem('nagar_seva_demo_mode', 'true');
      
      const isAuthority = role === 'authority';
      const demoProfile: UserProfile = isAuthority ? {
        id: 'demo-authority-123',
        name: 'Officer Patel (BBMP)',
        email: 'officer.patel@nagarseva.gov.in',
        points: 1200,
        badges: ['super_inspector', 'urban_hero'],
        issuesReported: 0,
        issuesVerified: 124,
        createdAt: new Date().toISOString()
      } : {
        id: 'demo-user-123',
        name: 'Karan Malhotra',
        email: 'demo.citizen@nagarseva.gov.in',
        points: 340,
        badges: ['pioneer_citizen', 'civic_champion'],
        issuesReported: 4,
        issuesVerified: 9,
        createdAt: new Date().toISOString()
      };

      const mockUser = {
        uid: demoProfile.id,
        email: demoProfile.email,
        displayName: demoProfile.name,
        emailVerified: true
      } as FirebaseUser;

      // Sync with Express backend to ensure db.json is aware of this user
      await syncWithServer(demoProfile.email, demoProfile.name, demoProfile.id);

      setUser(mockUser);
      setProfile(demoProfile);
      localStorage.setItem('nagar_seva_user', JSON.stringify(demoProfile));
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Error logging in as demo:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('nagar_seva_demo_mode');
      localStorage.removeItem('nagar_seva_user');
      await signOut(auth);
      setProfile(null);
      setUser(null);
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, login, signInWithGoogle, loginAsDemo, logout, syncProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
