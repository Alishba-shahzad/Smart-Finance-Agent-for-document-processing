import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client.js';

export const ADMIN_PERMISSIONS = [
  'MANAGE_DOCUMENTS',
  'DELETE_DOCUMENTS',
  'INGEST_PIPELINE',
  'SYSTEM_AUDIT_LOGS',
  'VECTOR_CONFIG',
  'CHAT_ANALYST',
  'EXPORT_DATA',
];

export const STAFF_PERMISSIONS = [
  'CHAT_ANALYST',
  'VIEW_DOCUMENTS',
  'GENUI_VISUALIZATIONS',
  'INSPECT_CITATIONS',
  'READ_ONLY_DASHBOARD',
];

export const DEFAULT_ADMIN = {
  id: 'usr-admin-default',
  name: 'Alishba Naz (Admin)',
  email: 'admin@finagent.ai',
  role: 'Admin',
  title: 'Chief Financial Systems Administrator',
  initials: 'AN',
  avatarColor: '#1a56db',
  permissions: ADMIN_PERMISSIONS,
};

export const DEFAULT_STAFF = {
  id: 'usr-staff-default',
  name: 'Staff Analyst',
  email: 'analyst@finagent.ai',
  role: 'Staff',
  title: 'Financial Operations Analyst',
  initials: 'SA',
  avatarColor: '#059669',
  permissions: STAFF_PERMISSIONS,
};

const AuthContext = createContext(undefined);

const AUTH_STORAGE_KEY = 'finagent_user_role';

export function AuthProvider({ children }) {
  const [supabase] = useState(() => createClient());
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('Admin');
  const [user, setUser] = useState(DEFAULT_ADMIN);
  const [isLoading, setIsLoading] = useState(true);

  const supabaseUrl =
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL)) ||
    'https://nedjnudzmphfxolcnxcm.supabase.co';

  const isConfigured = Boolean(
    supabaseUrl && !supabaseUrl.includes('placeholder')
  );

  const buildProfile = (sbUser, overrideRole) => {
    const rawRole = overrideRole || sbUser.user_metadata?.role || 'Admin';
    const normalizedRole = rawRole.toLowerCase() === 'staff' ? 'Staff' : 'Admin';

    const fullName =
      sbUser.user_metadata?.full_name ||
      sbUser.email?.split('@')[0] ||
      (normalizedRole === 'Admin' ? 'Alishba Naz (Admin)' : 'Staff Analyst');

    const words = fullName.trim().split(/\s+/);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[1][0]}`.toUpperCase()
        : fullName.substring(0, 2).toUpperCase();

    return {
      id: sbUser.id,
      name: fullName,
      email: sbUser.email || '',
      role: normalizedRole,
      title:
        normalizedRole === 'Admin'
          ? 'Chief Financial Systems Administrator'
          : 'Financial Operations Analyst',
      initials,
      avatarColor: normalizedRole === 'Admin' ? '#1a56db' : '#059669',
      permissions: normalizedRole === 'Admin' ? ADMIN_PERMISSIONS : STAFF_PERMISSIONS,
    };
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        if (!isConfigured) {
          const savedRole = localStorage.getItem(AUTH_STORAGE_KEY);
          if (savedRole === 'Staff') {
            setRole('Staff');
            setUser(DEFAULT_STAFF);
          } else {
            setRole('Admin');
            setUser(DEFAULT_ADMIN);
          }
          setIsLoading(false);
          return;
        }

        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (mounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setSupabaseUser(initialSession.user);
            const profile = buildProfile(initialSession.user);
            setRole(profile.role);
            setUser(profile);
            try {
              localStorage.setItem(AUTH_STORAGE_KEY, profile.role);
            } catch {}
          } else {
            setSession(null);
            setSupabaseUser(null);
            const savedRole = localStorage.getItem(AUTH_STORAGE_KEY);
            const fallbackRole = savedRole === 'Staff' ? 'Staff' : 'Admin';
            setRole(fallbackRole);
            setUser(fallbackRole === 'Admin' ? DEFAULT_ADMIN : DEFAULT_STAFF);
          }
        }
      } catch (err) {
        console.warn('Supabase auth initialization warning:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;

      if (currentSession?.user) {
        setSession(currentSession);
        setSupabaseUser(currentSession.user);
        const profile = buildProfile(currentSession.user);
        setRole(profile.role);
        setUser(profile);
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, profile.role);
        } catch {}
      } else {
        setSession(null);
        setSupabaseUser(null);
        const savedRole = localStorage.getItem(AUTH_STORAGE_KEY);
        const fallbackRole = savedRole === 'Staff' ? 'Staff' : 'Admin';
        setRole(fallbackRole);
        setUser(fallbackRole === 'Admin' ? DEFAULT_ADMIN : DEFAULT_STAFF);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, isConfigured]);

  const signIn = async (email, password) => {
    if (!isConfigured) {
      const roleFromEmail = email.toLowerCase().includes('admin') ? 'Admin' : 'Staff';
      setRole(roleFromEmail);
      setUser(roleFromEmail === 'Admin' ? DEFAULT_ADMIN : DEFAULT_STAFF);
      if (typeof document !== 'undefined') {
        document.cookie = `sb-auth-token=${roleFromEmail}; path=/; max-age=604800; SameSite=Lax`;
      }
      return { error: null, role: roleFromEmail };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { error: error.message, role: 'Staff' };
    }

    if (data.user) {
      const profile = buildProfile(data.user);
      setRole(profile.role);
      setUser(profile);
      setSupabaseUser(data.user);
      setSession(data.session);
      if (typeof document !== 'undefined') {
        document.cookie = `sb-auth-token=${profile.role}; path=/; max-age=604800; SameSite=Lax`;
      }
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, profile.role);
      } catch {}
      return { error: null, role: profile.role };
    }

    return { error: 'Unknown authentication error', role: 'Staff' };
  };

  const signUp = async (email, password, selectedRole, fullName) => {
    const assignedRole = selectedRole || (email.toLowerCase().includes('admin') ? 'Admin' : 'Staff');
    const name = fullName || (assignedRole === 'Admin' ? 'System Administrator' : 'Staff Analyst');

    if (!isConfigured) {
      setRole(assignedRole);
      setUser(assignedRole === 'Admin' ? DEFAULT_ADMIN : DEFAULT_STAFF);
      if (typeof document !== 'undefined') {
        document.cookie = `sb-auth-token=${assignedRole}; path=/; max-age=604800; SameSite=Lax`;
      }
      return { error: null, needsEmailVerification: false };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          role: assignedRole,
          full_name: name,
        },
      },
    });

    if (error) {
      return { error: error.message, needsEmailVerification: false };
    }

    const needsEmailVerification = Boolean(data.user && !data.session);

    if (data.user && data.session) {
      const profile = buildProfile(data.user, assignedRole);
      setRole(profile.role);
      setUser(profile);
      setSupabaseUser(data.user);
      setSession(data.session);
      if (typeof document !== 'undefined') {
        document.cookie = `sb-auth-token=${assignedRole}; path=/; max-age=604800; SameSite=Lax`;
      }
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, profile.role);
      } catch {}
    }

    return { error: null, needsEmailVerification };
  };

  const signOut = async () => {
    try {
      if (isConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setSession(null);
      setSupabaseUser(null);
      setRole('Staff');
      setUser(DEFAULT_STAFF);
      if (typeof document !== 'undefined') {
        document.cookie = 'sb-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        document.cookie = 'finagent_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      }
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {}
    }
  };

  const switchRole = async (_newRole) => {
    console.warn('Role switching is disabled. User roles are immutable once authenticated.');
  };

  const login = (assignedRole) => {
    setRole(assignedRole);
    if (supabaseUser) {
      setUser(buildProfile(supabaseUser, assignedRole));
    } else {
      setUser(assignedRole === 'Admin' ? DEFAULT_ADMIN : DEFAULT_STAFF);
    }
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, assignedRole);
    } catch {}
  };

  const logout = () => {
    signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        supabaseUser,
        session,
        user,
        role,
        isAuthenticated: Boolean(supabaseUser) || !isConfigured,
        isAdmin: role === 'Admin',
        isStaff: role === 'Staff',
        isLoading,
        isConfigured,
        signIn,
        signUp,
        signOut,
        switchRole,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

