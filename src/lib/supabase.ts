const API_BASE = '/api';

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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

class QueryChain {
  private _table: string;
  private _method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';
  private _select: string = '*';
  private _filters: { col: string; val: any }[] = [];
  private _order: { col: string; dir: string } | null = null;
  private _limit: number | null = null;
  private _single: boolean = false;
  private _body: any = null;

  constructor(table: string) {
    this._table = table;
  }

  select(cols: string = '*') {
    if (this._method === 'GET') this._select = cols;
    return this;
  }

  insert(data: any | any[]) {
    this._method = 'POST';
    this._body = Array.isArray(data) ? data[0] : data;
    return this;
  }

  update(data: any) {
    this._method = 'PUT';
    this._body = data;
    return this;
  }

  delete() {
    this._method = 'DELETE';
    return this;
  }

  eq(col: string, val: any) {
    this._filters.push({ col, val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this._order = { col, dir: opts?.ascending === false ? 'desc' : 'asc' };
    return this;
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  single() {
    this._single = true;
    return this as any;
  }

  async maybeSingle(): Promise<any> {
    this._single = true;
    return this._execute();
  }

  then(resolve: (value: any) => any, reject: (reason?: any) => any) {
    return this._execute().then(resolve, reject);
  }

  private async _execute(): Promise<any> {
    try {
      const params = new URLSearchParams();

      if (this._method === 'GET') {
        params.set('select', this._select);
        for (const f of this._filters) {
          params.append('filter', `${f.col}:${f.val}`);
        }
        if (this._order) params.set('order', `${this._order.col}:${this._order.dir}`);
        if (this._limit) params.set('limit', String(this._limit));
        if (this._single) params.set('single', '1');
      } else {
        for (const f of this._filters) {
          params.append('filter', `${f.col}:${f.val}`);
        }
      }

      const url = `${API_BASE}/${this._table}?${params.toString()}`;
      const opts: RequestInit = {
        method: this._method,
        headers: authHeaders(),
      };
      if (this._body && (this._method === 'POST' || this._method === 'PUT')) {
        opts.body = JSON.stringify(this._body);
      }

      const res = await fetch(url, opts);
      const result = await res.json();
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }
}

let authStateCallbacks: ((event: string, session: any) => void)[] = [];

export const supabase = {
  from: (table: string) => new QueryChain(table),

  auth: {
    getSession: async () => {
      const token = getToken();
      if (!token) return { data: { session: null }, error: null };
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
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
        fetch(`${API_BASE}/auth/me`, { headers: authHeaders() })
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
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        const res = await fetch(`${API_BASE}/auth/update-password`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ password }),
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
