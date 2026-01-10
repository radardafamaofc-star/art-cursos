import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'professor' | 'student';
  blocked?: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ user: User; profile: Profile }>;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }

    return data as Profile | null;
  }, []);

  const createProfile = useCallback(async (currentUser: User): Promise<Profile> => {
    const fullName = (currentUser.user_metadata as any)?.full_name ?? null;

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: currentUser.id,
        full_name: fullName,
        role: 'student',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    return data as Profile;
  }, []);

  const fetchOrCreateProfile = useCallback(async (currentUser: User): Promise<Profile | null> => {
    setProfileError(null);
    
    try {
      let profileData = await fetchProfile(currentUser.id);
      
      if (!profileData) {
        profileData = await createProfile(currentUser);
      }
      
      return profileData;
    } catch (error: any) {
      setProfileError(error.message);
      return null;
    }
  }, [fetchProfile, createProfile]);

  const refetchProfile = useCallback(async () => {
    if (user) {
      setLoading(true);
      const fetchedProfile = await fetchOrCreateProfile(user);
      setProfile(fetchedProfile);
      setLoading(false);
    }
  }, [user, fetchOrCreateProfile]);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profileData = await fetchOrCreateProfile(session.user);
        if (mounted) {
          setProfile(profileData);
        }
      }
      
      if (mounted) {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setProfileError(null);
        }
        // Don't refetch profile here for SIGNED_IN since signIn handles it
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchOrCreateProfile]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw error;
    }

    toast.success('Conta criada com sucesso!');
  };

  const signIn = async (email: string, password: string): Promise<{ user: User; profile: Profile }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Login failed - no user returned');
    }

    // Immediately fetch/create profile after login
    const profileData = await fetchOrCreateProfile(data.user);
    
    if (!profileData) {
      throw new Error('Failed to load profile');
    }

    setProfile(profileData);
    toast.success('Login realizado com sucesso!');
    
    return { user: data.user, profile: profileData };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setProfile(null);
    setProfileError(null);
    toast.success('Logout realizado com sucesso!');
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        profileError,
        loading,
        signUp,
        signIn,
        signOut,
        refetchProfile,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
