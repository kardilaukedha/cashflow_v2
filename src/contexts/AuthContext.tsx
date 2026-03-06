import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AppUser {
  id: string;
  email: string;
}

interface AppSession {
  user: AppUser;
  access_token: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  employee_id: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  session: AppSession | null;
  loading: boolean;
  userProfile: UserProfile | null;
  isSuperAdmin: boolean;
  userRole: string;
  signUp: (email: string, password: string) => Promise<{ error: any | null }>;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>('karyawan');

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, full_name, email, role, employee_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return;
    }

    if (data) {
      setUserProfile(data);
      setIsSuperAdmin(data.role === 'superadmin');
      setUserRole(data.role || 'karyawan');
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session as AppSession);
        setUser(session.user as AppUser);
        fetchUserProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          setSession(session as AppSession);
          setUser(session.user as AppUser);
          await fetchUserProfile(session.user.id);
        } else {
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setIsSuperAdmin(false);
          setUserRole('karyawan');
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    setUserProfile(null);
    setIsSuperAdmin(false);
    setUserRole('karyawan');
    setUser(null);
    setSession(null);
    localStorage.clear();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    userProfile,
    isSuperAdmin,
    userRole,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
