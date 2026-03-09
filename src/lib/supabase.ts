import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AUTH_FN_URL = `${SUPABASE_URL}/functions/v1/auth`;
const API_FN_URL = `${SUPABASE_URL}/functions/v1/api`;

function getToken(): string | null {
  return localStorage.getItem('sb_token');
}
function setToken(t: string): void {
  localStorage.setItem('sb_token', t);
}
function clearToken(): void {
  localStorage.removeItem('sb_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Apikey': SUPABASE_ANON_KEY,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

export function getApiHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Apikey': SUPABASE_ANON_KEY,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

export function getApiUrl(path: string): string {
  return `${API_FN_URL}${path}`;
}

let authStateCallbacks: ((event: string, session: any) => void)[] = [];

export const supabase = {
  from: (table: string) => supabaseClient.from(table),

  auth: {
    getSession: async () => {
      const token = getToken();
      if (!token) return { data: { session: null }, error: null };
      try {
        const res = await fetch(`${AUTH_FN_URL}/me`, { headers: authHeaders() });
        if (!res.ok) {
          clearToken();
          return { data: { session: null }, error: null };
        }
        const { data } = await res.json();
        if (data?.user) {
          return { data: { session: { access_token: token, user: data.user } }, error: null };
        }
        clearToken();
        return { data: { session: null }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      authStateCallbacks.push(callback);
      const token = getToken();
      if (token) {
        fetch(`${AUTH_FN_URL}/me`, { headers: authHeaders() })
          .then(r => r.json())
          .then(({ data }) => {
            if (data?.user) {
              callback('SIGNED_IN', { access_token: token, user: data.user });
            } else {
              clearToken();
              callback('SIGNED_OUT', null);
            }
          })
          .catch(() => {
            clearToken();
            callback('SIGNED_OUT', null);
          });
      } else {
        setTimeout(() => callback('SIGNED_OUT', null), 0);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authStateCallbacks = authStateCallbacks.filter(cb => cb !== callback);
            },
          },
        },
      };
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const res = await fetch(`${AUTH_FN_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email, password }),
        });
        const text = await res.text();
        if (!text) {
          return { data: null, error: { message: 'Server tidak merespons. Coba lagi beberapa saat.' } };
        }
        let result: any;
        try {
          result = JSON.parse(text);
        } catch {
          return { data: null, error: { message: 'Server sedang tidak tersedia. Coba lagi beberapa saat.' } };
        }
        if (result.error) return { data: null, error: result.error };
        if (!result.data?.session?.access_token) {
          return { data: null, error: { message: 'Respons login tidak valid. Coba lagi.' } };
        }
        setToken(result.data.session.access_token);
        authStateCallbacks.forEach(cb => cb('SIGNED_IN', result.data.session));
        return { data: result.data, error: null };
      } catch (err: any) {
        if (err.message?.includes('fetch')) {
          return { data: null, error: { message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' } };
        }
        return { data: null, error: { message: err.message } };
      }
    },

    signOut: async () => {
      clearToken();
      authStateCallbacks.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },

    signUp: async ({ email, password }: { email: string; password: string }) => {
      try {
        const res = await fetch(`${AUTH_FN_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email, password }),
        });
        const result = await res.json();
        if (!result.error && result.data?.session) {
          setToken(result.data.session.access_token);
        }
        return result;
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    },

    resetPasswordForEmail: async (_email: string) => {
      return { error: null };
    },

    updateUser: async ({ password }: { password: string }) => {
      try {
        const res = await fetch(`${AUTH_FN_URL}/update-password`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ password }),
        });
        return await res.json();
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    },

    createUser: async (userData: any) => {
      try {
        const res = await fetch(`${AUTH_FN_URL}/create-user`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(userData),
        });
        return await res.json();
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    },

    deleteUser: async (userId: string) => {
      try {
        const res = await fetch(`${AUTH_FN_URL}/delete-user/${userId}`, {
          method: 'DELETE',
          headers: authHeaders(),
        });
        return await res.json();
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    },
  },
};

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          color: string;
          icon: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          date: string;
          description: string;
          amount: number;
          type: 'income' | 'expense';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
    };
  };
};

export type Category = Database['public']['Tables']['categories']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionWithCategory = Transaction & { category: Category };
