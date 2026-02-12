import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { API_URL } from '../config';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase credentials not found. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// ============================================
// AUTH FUNCTIONS
// ============================================

export const authService = {
  // Registro de usuario
  // IMPORTANTE: Las contraseñas se hashean automáticamente por Supabase Auth usando bcrypt
  // Nunca se almacenan en texto plano. Se guardan en auth.users (tabla interna de Supabase)
  // y nunca se exponen ni se guardan en public.users
  async signUp(email, password, name, phone) {
    try {
      // Obtener la URL base de la aplicación para la redirección después de confirmar email
      // Supabase redirigirá aquí después de que el usuario confirme su email
      const redirectTo = `${window.location.origin}`;

      // 1. Crear usuario en Supabase Auth
      // La contraseña se hashea automáticamente antes de guardarse en auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            name: name,
            phone: phone
          }
        }
      });

      if (authError) {
        // Mejorar mensajes de error específicos
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          throw new Error('Este email ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.');
        }
        throw authError;
      }

      // 2. El perfil se crea automáticamente mediante el trigger handle_new_user()
      // No necesitamos crearlo manualmente aquí para evitar duplicados

      // 3. Verificar si el email de confirmación fue enviado
      // Si el usuario no tiene email_confirmed_at, significa que necesita confirmar
      const needsConfirmation = authData.user && !authData.user.email_confirmed_at;

      // Verificar si Supabase tiene configurado el servicio de email
      // Si session es null después del signUp, puede indicar que el email no se envió
      if (needsConfirmation && !authData.session) {
        // El email debería haberse enviado, pero verificamos
        console.log('[Auth] Usuario creado, email de confirmación debería haberse enviado');
      }

      return {
        data: authData,
        error: null,
        needsConfirmation: needsConfirmation
      };
    } catch (error) {
      console.error('[Auth] Error en signUp:', error);
      return { data: null, error };
    }
  },

  // Reenviar email de confirmación
  async resendConfirmationEmail(email) {
    try {
      const redirectTo = `${window.location.origin}`;
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectTo
        }
      });

      if (error) {
        // Mejorar mensajes de error específicos
        if (error.message.includes('already confirmed') || error.message.includes('already verified')) {
          throw new Error('Este email ya está confirmado. Puedes iniciar sesión.');
        }
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          throw new Error('Demasiados intentos. Espera unos minutos antes de intentar de nuevo.');
        }
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('[Auth] Error reenviando email:', error);
      return { data: null, error };
    }
  },

  // Login
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Obtener datos del perfil
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // Si no existe el perfil, la cuenta fue eliminada
        if (!profile || profileError) {
          console.log('[Auth] Usuario sin perfil - cuenta eliminada');
          // Cerrar sesión inmediatamente
          await supabase.auth.signOut();
          throw new Error('Esta cuenta ha sido eliminada. Por favor, regístrate nuevamente.');
        }

        // Actualizar último login
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);

        return {
          data: {
            ...data,
            profile
          },
          error: null
        };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Logout
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Obtener sesión actual
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  // Obtener usuario actual con perfil
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      return { user: { ...user, profile }, error };
    }

    return { user: null, error };
  },

  // Listener para cambios de autenticación
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Helper: Construir objeto userData de forma consistente
  // Siempre usa role del perfil, nunca deriva del plan
  buildUserData(user, profile) {
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: profile?.name || user.email?.split('@')[0] || 'Usuario',
      phone: profile?.phone || '',
      role: profile?.role || 'user', // Siempre usar role del perfil
      loginTime: new Date().toISOString(),
      ...profile // Incluir todos los campos adicionales del perfil
    };
  },

  // Eliminar cuenta del usuario
  async deleteAccount() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('No hay sesión activa');
      }

      const token = session.access_token;

      // Llamar al endpoint del backend
      const response = await fetch(`${API_URL}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Error al eliminar la cuenta');
      }

      console.log('[DeleteAccount] Cuenta eliminada exitosamente en backend');

      // Limpiar sesión local
      await supabase.auth.signOut();

      return { success: true, error: null };
    } catch (error) {
      console.error('[DeleteAccount] Error:', error);
      return { success: false, error };
    }
  }
};

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

export const userService = {
  // Obtener perfil
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return { data, error };
  },

  // Actualizar perfil
  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  },

  // Verificar límite de búsquedas
  async checkSearchLimit(userId) {
    const { data: user, error } = await supabase
      .from('users')
      .select('searches_today, searches_reset_at')
      .eq('id', userId)
      .single();

    if (error) return { canSearch: false, error };

    // Resetear si es un nuevo día
    const today = new Date().toISOString().split('T')[0];
    if (user.searches_reset_at !== today) {
      await supabase
        .from('users')
        .update({ searches_today: 0, searches_reset_at: today })
        .eq('id', userId);
      user.searches_today = 0;
    }

    return { canSearch: true, remaining: 'unlimited' };
  },

  // Incrementar contador de búsquedas
  async incrementSearchCount(userId) {
    const { data, error } = await supabase.rpc('increment_searches', { user_id: userId });
    return { data, error };
  }
};

// ============================================
// SEARCH HISTORY FUNCTIONS (PRO ONLY)
// ============================================

export const searchHistoryService = {
  // Guardar búsqueda
  async saveSearch(userId, searchData) {
    try {
      const response = await fetch(`${API_URL}/api/users/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          rubro: searchData.rubro,
          ubicacion_nombre: searchData.ubicacion_nombre || null,
          centro_lat: searchData.centro_lat || null,
          centro_lng: searchData.centro_lng || null,
          radio_km: searchData.radio_km || null,
          bbox: searchData.bbox || null,
          empresas_encontradas: searchData.empresas_encontradas || 0,
          empresas_validas: searchData.empresas_validas || 0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return { data: null, error: { message: data.detail || 'Error al guardar historial' } };
      }

      return { data: data.data, error: null };
    } catch (error) {
      console.error('[SearchHistory] Error catch:', error);
      return { data: null, error };
    }
  },

  // Obtener historial
  async getHistory(userId, limit = 20) {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/history?limit=${limit}`);
      const data = await response.json();

      if (!response.ok) {
        return { data: null, error: { message: data.detail || 'Error al obtener historial' } };
      }

      return { data: data.history, error: null };
    } catch (error) {
      console.error('[SearchHistory] Error catch:', error);
      return { data: null, error };
    }
  },

  // Eliminar búsqueda del historial
  async deleteSearch(userId, searchId) {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/history/${searchId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.detail || 'Error al eliminar historial' } };
      }

      return { error: null };
    } catch (error) {
      console.error('[SearchHistory] Error catch:', error);
      return { error };
    }
  }
};

// ============================================
// SAVED COMPANIES FUNCTIONS (PRO ONLY)
// ============================================

export const savedCompaniesService = {
  // Guardar empresa
  async saveCompany(userId, empresa, notas = '') {
    const { data, error } = await supabase
      .from('saved_companies')
      .insert({
        user_id: userId,
        empresa_data: empresa,
        notas: notas,
        estado: 'por_contactar'
      })
      .select()
      .single();

    return { data, error };
  },

  // Obtener empresas guardadas
  async getSavedCompanies(userId) {
    const { data, error } = await supabase
      .from('saved_companies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // Actualizar empresa guardada
  async updateSavedCompany(companyId, updates) {
    const { data, error } = await supabase
      .from('saved_companies')
      .update(updates)
      .eq('id', companyId)
      .select()
      .single();

    return { data, error };
  },

  // Eliminar empresa guardada
  async deleteSavedCompany(companyId) {
    const { error } = await supabase
      .from('saved_companies')
      .delete()
      .eq('id', companyId);

    return { error };
  },

  // Verificar si empresa ya está guardada
  async isCompanySaved(userId, empresaEmail) {
    const { data, error } = await supabase
      .from('saved_companies')
      .select('id')
      .eq('user_id', userId)
      .eq('empresa_data->>email', empresaEmail)
      .single();

    return { isSaved: !!data, data, error };
  }
};

// ============================================
// ADMIN FUNCTIONS
// ============================================

export const adminService = {
  // Verificar si el usuario actual es admin
  async isAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Admin] No user found');
        return false;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[Admin] Error fetching profile:', profileError);
        return false;
      }

      if (!profile) {
        console.log('[Admin] No profile found for user:', user.id);
        return false;
      }

      const isAdminUser = profile.role === 'admin';
      console.log('[Admin] User role check:', { email: profile.email, role: profile.role, isAdmin: isAdminUser });

      return isAdminUser;
    } catch (error) {
      console.error('[Admin] Error checking admin status:', error);
      return false;
    }
  },

  // ============================================
  // MÉTRICAS Y DASHBOARD
  // ============================================

  async getMetrics() {
    try {
      const { data, error } = await supabase.rpc('get_admin_metrics');
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error getting metrics:', error);
      return { data: null, error };
    }
  },

  async getUsersByMonth(monthsBack = 12) {
    try {
      const { data, error } = await supabase.rpc('get_users_by_month', { months_back: monthsBack });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error getting users by month:', error);
      return { data: null, error };
    }
  },

  async getSearchesByDay(daysBack = 30) {
    try {
      const { data, error } = await supabase.rpc('get_searches_by_day', { days_back: daysBack });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error getting searches by day:', error);
      return { data: null, error };
    }
  },

  // ============================================
  // GESTIÓN DE USUARIOS (CRUD)
  // ============================================

  async getAllUsers(filters = {}) {
    try {
      console.log('[Admin] Fetching users via backend...');
      const { data: { session } } = await supabase.auth.getSession();

      const response = await axios.get(`${API_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        },
        params: filters
      });

      if (response.data.success) {
        console.log('[Admin] Fetched users:', response.data.users.length);
        return { data: response.data.users, error: null };
      } else {
        throw new Error(response.data.error || 'Error fetching users');
      }
    } catch (error) {
      console.error('[Admin] Error getting users from backend:', error);
      if (error.response && error.response.data) {
        console.error('[Admin] Backend Error Details:', error.response.data);
      }
      return { data: null, error };
    }
  },

  async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error getting user:', error);
      return { data: null, error };
    }
  },

  async getUserActivity(userId) {
    try {
      // Obtener historial de búsquedas
      const { data: searches, error: searchesError } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Obtener empresas guardadas
      const { data: companies, error: companiesError } = await supabase
        .from('saved_companies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);




      if (searchesError || companiesError) {
        throw searchesError || companiesError;
      }

      return {
        data: {
          searches: searches || [],
          companies: companies || [],

        },
        error: null
      };
    } catch (error) {
      console.error('[Admin] Error getting user activity:', error);
      return { data: null, error };
    }
  },

  async createUser(userData) {
    try {
      console.log('[Admin] Creating user via backend:', userData);



      const response = await fetch(`${API_URL}/api/admin/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Error al crear usuario');
      }

      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error creating user:', error);
      return { data: null, error };
    }
  },

  async updateUser(userId, updates) {
    try {
      console.log('[Admin] Updating user via backend:', userId, updates);



      const response = await fetch(`${API_URL}/api/admin/update-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          updates: updates
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Error al actualizar usuario');
      }

      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error updating user:', error);
      return { data: null, error };
    }
  },


  async deleteUser(userId) {
    try {
      console.log('[Admin] Deleting user fully via backend:', userId);



      const response = await fetch(`${API_URL}/api/admin/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Error al eliminar usuario');
      }

      return { data: { success: true }, error: null };
    } catch (error) {
      console.error('[Admin] Error deleting user:', error);
      return { data: null, error };
    }
  },

  async exportUserData(userId) {
    try {
      const { data: user } = await this.getUserById(userId);
      const { data: activity } = await this.getUserActivity(userId);

      const exportData = {
        user: user.data,
        activity: activity.data,
        exported_at: new Date().toISOString()
      };

      return { data: exportData, error: null };
    } catch (error) {
      console.error('[Admin] Error exporting user data:', error);
      return { data: null, error };
    }
  },




  // ============================================
  // ENVÍO DE EMAILS (requiere configuración SMTP)
  // ============================================

  async sendEmailToUser(userId, subject, body, isHtml = false) {
    try {
      const { data: user } = await this.getUserById(userId);
      if (!user.data) {
        throw new Error('Usuario no encontrado');
      }

      // Aquí integrarías con servicio de email (SendGrid, Resend, etc.)
      // Por ahora retornamos estructura para implementar después
      return {
        data: {
          success: true,
          message: 'Email enviado (requiere configuración de servicio de email)',
          to: user.data.email
        },
        error: null
      };
    } catch (error) {
      console.error('[Admin] Error sending email:', error);
      return { data: null, error };
    }
  }
};

export default supabase;

