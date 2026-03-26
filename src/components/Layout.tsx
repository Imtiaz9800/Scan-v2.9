import React, { useEffect, useState } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, ShieldCheck, User as UserIcon, Menu, X, Package, FileText, Users, BarChart3, ChevronRight, Home, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const AuthContext = React.createContext<{
  user: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  signIn: async () => {},
  logout: async () => {},
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          const isAdminEmail = firebaseUser.email === 'imtiazhaque413@gmail.com';

          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            if (isAdminEmail && (userData.role !== 'admin' || userData.status !== 'approved')) {
              const updatedUser = { ...userData, role: 'admin' as const, status: 'approved' as const };
              await updateDoc(userDocRef, { role: 'admin', status: 'approved' });
              setUser(updatedUser);
            } else {
              setUser(userData);
            }
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              role: isAdminEmail ? 'admin' : 'manufacturer',
              status: isAdminEmail ? 'approved' : 'pending',
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newUser);
            setUser(newUser);
          }
        } catch (error: any) {
          console.error('Auth sync error:', error);
          setError(error.message || 'Failed to sync user profile');
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setPendingUserCount(0);
      return;
    }

    const q = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingUserCount(snapshot.size);
    });

    return unsubscribe;
  }, [user]);

  const signIn = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.code === 'auth/popup-blocked') {
        setError('Login popup was blocked by your browser. Please allow popups for this site.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for login. Please add ' + window.location.hostname + ' to your Firebase authorized domains.');
      } else {
        setError(error.message || 'Login failed. Please try again.');
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navItems = [
    { label: 'Home', icon: Home, path: '/', roles: ['admin', 'manufacturer'] },
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'manufacturer'] },
    { label: 'Medicines', icon: Package, path: '/medicines', roles: ['admin', 'manufacturer'] },
    { label: 'Articles', icon: FileText, path: '/articles', roles: ['admin', 'manufacturer'] },
    { label: 'User Management', icon: Users, path: '/users', roles: ['admin'] },
    { label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['admin'] },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Public Layout (Not logged in)
  if (!user) {
    return (
      <AuthContext.Provider value={{ user, loading, signIn, logout }}>
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
          <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <Link to="/" className="flex items-center gap-2 group">
                  <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-violet-200">
                    <ShieldCheck className="text-white w-6 h-6" />
                  </div>
                  <span className="text-2xl font-bold tracking-tight text-slate-900">Scan<span className="text-violet-600">Rx</span></span>
                </Link>
                <div className="flex items-center gap-4">
                  {error && (
                    <div className="hidden md:block text-xs text-red-500 bg-red-50 px-3 py-1 rounded-lg border border-red-100 max-w-xs truncate">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={signIn}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-violet-200 active:scale-95"
                  >
                    Professional Login
                  </button>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 md:hidden">
                <X className="shrink-0" size={20} />
                <p className="text-sm font-medium">{error}</p>
                <button onClick={() => setError(null)} className="ml-auto">
                  <X size={16} />
                </button>
              </div>
            )}
            {children}
          </main>
          <footer className="bg-white border-t border-slate-200 py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="flex justify-center items-center gap-2 mb-4">
                <ShieldCheck className="text-violet-600 w-6 h-6" />
                <span className="text-xl font-bold">ScanRx</span>
              </div>
              <p className="text-slate-500 text-sm">© 2026 ScanRx Medicine Verification. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </AuthContext.Provider>
    );
  }

  // Authenticated Layout (Sidebar)
  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
        {/* Desktop Sidebar */}
        <aside 
          className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}
        >
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <Link to="/" className="flex items-center gap-3 overflow-hidden">
              <div className="min-w-[40px] h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-100">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              {isSidebarOpen && (
                <span className="text-xl font-bold tracking-tight whitespace-nowrap">Scan<span className="text-violet-600">Rx</span></span>
              )}
            </Link>
          </div>

          <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
            {navItems.filter(item => item.roles.includes(user.role)).map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative ${isActive(item.path) ? 'bg-violet-50 text-violet-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <item.icon size={22} className={isActive(item.path) ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'} />
                {isSidebarOpen && <span className="font-semibold">{item.label}</span>}
                {item.label === 'User Management' && pendingUserCount > 0 && (
                  <span className={`absolute ${isSidebarOpen ? 'right-3' : 'right-1 top-1'} flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white`}>
                    {pendingUserCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100">
            <div className={`flex items-center gap-3 p-2 rounded-2xl bg-slate-50 border border-slate-100 ${!isSidebarOpen && 'justify-center'}`}>
              <div className="min-w-[32px] h-8 bg-violet-100 rounded-full flex items-center justify-center">
                <UserIcon size={16} className="text-violet-600" />
              </div>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{user.displayName}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user.role}</p>
                </div>
              )}
              {isSidebarOpen && (
                <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors">
                  <LogOut size={18} />
                </button>
              )}
            </div>
            {!isSidebarOpen && (
               <button onClick={logout} className="mt-2 w-full flex justify-center text-slate-400 hover:text-red-500 transition-colors">
                <LogOut size={18} />
              </button>
            )}
          </div>

          {/* Sidebar Toggle Button */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-violet-600 shadow-sm z-50"
          >
            <ChevronRight size={14} className={`transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </aside>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-40 flex items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Scan<span className="text-violet-600">Rx</span></span>
          </Link>
          <div className="flex items-center gap-2">
            {user.role === 'admin' && pendingUserCount > 0 && (
              <button 
                onClick={() => navigate('/users')}
                className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Bell size={20} />
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-white">
                  {pendingUserCount}
                </span>
              </button>
            )}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
              />
              <motion.div 
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                className="fixed inset-y-0 left-0 w-72 bg-white z-[70] md:hidden flex flex-col shadow-2xl"
              >
                <div className="h-16 flex items-center px-6 border-b border-slate-100">
                  <span className="text-xl font-bold tracking-tight">Scan<span className="text-violet-600">Rx</span></span>
                </div>
                <div className="flex-1 py-6 px-4 space-y-2">
                  {navItems.filter(item => item.roles.includes(user.role)).map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive(item.path) ? 'bg-violet-50 text-violet-600' : 'text-slate-500'}`}
                    >
                      <item.icon size={22} />
                      <span className="font-semibold">{item.label}</span>
                    </Link>
                  ))}
                </div>
                <div className="p-6 border-t border-slate-100">
                  <button onClick={logout} className="flex items-center gap-3 w-full text-red-500 font-bold">
                    <LogOut size={22} />
                    Logout
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className={`flex-1 transition-all duration-300 ${user ? (isSidebarOpen ? 'md:ml-64' : 'md:ml-20') : ''} pt-16 md:pt-0 min-w-0`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </AuthContext.Provider>
  );
}
