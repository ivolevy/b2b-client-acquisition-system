import { createClient } from '@supabase/supabase-js';

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
            phone: phone,
            plan: 'free'
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
      plan: profile?.plan || 'free',
      role: profile?.role || 'user', // Siempre usar role del perfil, nunca derivar del plan
      loginTime: new Date().toISOString(),
      ...profile // Incluir todos los campos adicionales del perfil
    };
  },

  // Eliminar cuenta del usuario
  async deleteAccount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      const userId = user.id;
      console.log('[DeleteAccount] Eliminando datos del usuario:', userId);

      // Crear timeout para evitar que se quede colgado
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: La operación tardó demasiado')), 30000);
      });

      // PASO 1: Eliminar datos del usuario de las tablas relacionadas (con timeout)
      const deleteDataPromise = (async () => {
        const tables = ['search_history', 'saved_companies', 'email_templates', 'email_history'];
        
        for (const table of tables) {
          try {
            const { error } = await supabase.from(table).delete().eq('user_id', userId);
            if (error) {
              console.warn(`[DeleteAccount] Error eliminando ${table}:`, error.message);
            } else {
              console.log(`[DeleteAccount] ${table} eliminado`);
            }
          } catch (err) {
            console.warn(`[DeleteAccount] Error en ${table}:`, err);
          }
        }
      })();

      // PASO 2: Eliminar perfil de usuario (CRÍTICO - esto previene que el usuario inicie sesión)
      const deleteProfilePromise = supabase.from('users').delete().eq('id', userId);

      // Ejecutar ambas operaciones con timeout
      const results = await Promise.race([
        Promise.all([deleteDataPromise, deleteProfilePromise]),
        timeoutPromise
      ]);

      // Verificar resultado del perfil
      if (results && Array.isArray(results) && results[1]) {
        const { error: userError } = results[1];
        if (userError) {
          console.error('[DeleteAccount] Error eliminando perfil:', userError);
          throw new Error(`Error eliminando perfil: ${userError.message}`);
        }
      } else {
        // Si no hay resultado, verificar directamente
        const { error: userError } = await deleteProfilePromise;
        if (userError) {
          console.error('[DeleteAccount] Error eliminando perfil:', userError);
          throw new Error(`Error eliminando perfil: ${userError.message}`);
        }
      }
      console.log('[DeleteAccount] Perfil eliminado exitosamente');

      // PASO 3: Cerrar sesión inmediatamente (con timeout)
      const signOutPromise = supabase.auth.signOut();
      await Promise.race([signOutPromise, timeoutPromise]);
      
      // PASO 4: Limpiar todas las sesiones y tokens locales
      localStorage.removeItem('b2b_auth');
      localStorage.removeItem('b2b_token');
      sessionStorage.clear();
      
      // Limpiar cookies de Supabase
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      console.log('[DeleteAccount] Cuenta eliminada exitosamente');
      return { success: true, error: null };
    } catch (error) {
      console.error('[DeleteAccount] Error:', error);
      
      // Aún así, intentar cerrar sesión y limpiar datos locales
      try {
        const signOutPromise = supabase.auth.signOut();
        await Promise.race([signOutPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))]);
      } catch (signOutErr) {
        console.warn('[DeleteAccount] Error al cerrar sesión:', signOutErr);
      }
      
      try {
        localStorage.removeItem('b2b_auth');
        localStorage.removeItem('b2b_token');
        sessionStorage.clear();
      } catch (cleanupError) {
        console.warn('[DeleteAccount] Error en limpieza:', cleanupError);
      }
      
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

  // Obtener características del plan
  async getPlanFeatures(plan) {
    const { data, error } = await supabase
      .from('plan_features')
      .select('*')
      .eq('plan', plan);
    
    // Convertir a objeto
    const features = {};
    data?.forEach(f => {
      features[f.feature_key] = f.feature_value;
    });
    
    return { data: features, error };
  },

  // Verificar límite de búsquedas
  async checkSearchLimit(userId) {
    const { data: user, error } = await supabase
      .from('users')
      .select('plan, searches_today, searches_reset_at')
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

    // Verificar límite según plan
    if (user.plan === 'pro') {
      return { canSearch: true, remaining: 'unlimited' };
    }

    const limit = 5; // FREE limit
    const canSearch = user.searches_today < limit;
    
    return { 
      canSearch, 
      remaining: limit - user.searches_today,
      limit
    };
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
    console.log('[SearchHistory] Guardando búsqueda:', { userId, searchData });
    
    const insertData = {
      user_id: userId,
      rubro: searchData.rubro,
      ubicacion_nombre: searchData.ubicacion_nombre || null,
      centro_lat: searchData.centro_lat || null,
      centro_lng: searchData.centro_lng || null,
      radio_km: searchData.radio_km || null,
      bbox: searchData.bbox || null,
      empresas_encontradas: searchData.empresas_encontradas || 0,
      empresas_validas: searchData.empresas_validas || 0
    };
    
    console.log('[SearchHistory] Datos a insertar:', insertData);
    
    const { data, error } = await supabase
      .from('search_history')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('[SearchHistory] Error al guardar:', error);
      console.error('[SearchHistory] Código:', error.code);
      console.error('[SearchHistory] Mensaje:', error.message);
      console.error('[SearchHistory] Detalles:', error.details);
    } else {
      console.log('[SearchHistory] Guardado exitosamente:', data);
    }
    
    return { data, error };
  },

  // Obtener historial
  async getHistory(userId, limit = 20) {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  },

  // Eliminar búsqueda del historial
  async deleteSearch(searchId) {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', searchId);
    
    return { error };
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
      let query = supabase
        .from('users')
        .select('*')
        .order('updated_at', { ascending: false });

      // Aplicar filtros
      if (filters.plan) {
        query = query.eq('plan', filters.plan);
      }
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.search && filters.search.trim()) {
        const searchTerm = `%${filters.search.trim()}%`;
        query = query.or(`email.ilike.${searchTerm},name.ilike.${searchTerm}`);
      }

      console.log('[Admin] Fetching users with filters:', filters);
      const { data, error } = await query;
      if (error) {
        console.error('[Admin] Error fetching users:', error);
        throw error;
      }
      console.log('[Admin] Fetched users:', data?.length || 0);
      return { data: data || [], error: null };
    } catch (error) {
      console.error('[Admin] Error getting users:', error);
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

      // Obtener suscripciones
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (searchesError || companiesError || subscriptionsError) {
        throw searchesError || companiesError || subscriptionsError;
      }

      return {
        data: {
          searches: searches || [],
          companies: companies || [],
          subscriptions: subscriptions || []
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
      // Primero crear usuario en auth.users (requiere función edge o admin)
      // Por ahora, retornamos error indicando que se debe crear desde Supabase Dashboard
      // O implementar función edge para crear usuarios
      return {
        data: null,
        error: new Error('Crear usuarios requiere función edge. Usa Supabase Dashboard por ahora.')
      };
    } catch (error) {
      console.error('[Admin] Error creating user:', error);
      return { data: null, error };
    }
  },

  async updateUser(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Si se cambió el plan, actualizar suscripciones
      if (updates.plan) {
        if (updates.plan === 'pro') {
          // Si no hay fecha de expiración, establecer una por defecto (1 año)
          const expiresAt = updates.plan_expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
          
          // Primero buscar si existe una suscripción activa para este usuario
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();
          
          if (existingSub) {
            // Actualizar suscripción existente
            const { error: updateSubError } = await supabase
              .from('subscriptions')
              .update({
                plan: 'pro',
                status: 'active',
                payment_method: 'manual',
                payment_reference: 'Admin update',
                expires_at: expiresAt,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingSub.id);
            
            if (updateSubError) {
              console.error('[Admin] Error updating subscription:', updateSubError);
              throw updateSubError;
            }
          } else {
            // Crear nueva suscripción
            const { error: insertSubError } = await supabase
              .from('subscriptions')
              .insert({
                user_id: userId,
                plan: 'pro',
                status: 'active',
                payment_method: 'manual',
                payment_reference: 'Admin update',
                expires_at: expiresAt,
                starts_at: new Date().toISOString()
              });
            
            if (insertSubError) {
              console.error('[Admin] Error creating subscription:', insertSubError);
              throw insertSubError;
            }
          }
          
          // Asegurar que plan_expires_at esté en updates si no estaba
          if (!updates.plan_expires_at) {
            updates.plan_expires_at = expiresAt;
          }
        } else if (updates.plan === 'free') {
          // Cancelar suscripciones activas
          const { error: cancelSubError } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('status', 'active');
          
          if (cancelSubError) {
            console.error('[Admin] Error cancelling subscriptions:', cancelSubError);
            throw cancelSubError;
          }
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error updating user:', error);
      return { data: null, error };
    }
  },

  async deleteUser(userId) {
    try {
      // Eliminar usuario (el CASCADE eliminará sus datos relacionados)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      // También eliminar de auth.users (requiere función edge)
      // Por ahora solo eliminamos de public.users
      
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
  // GESTIÓN DE CÓDIGOS PROMOCIONALES
  // ============================================

  async getAllPromoCodes() {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select(`
          *,
          promo_code_uses (
            id,
            user_id,
            used_at,
            users (
              email,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error getting promo codes:', error);
      return { data: null, error };
    }
  },

  async createPromoCode(codeData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('promo_codes')
        .insert({
          code: codeData.code.toUpperCase(),
          plan: codeData.plan || 'pro',
          duration_days: codeData.duration_days || 30,
          max_uses: codeData.max_uses || null,
          expires_at: codeData.expires_at || null,
          is_active: codeData.is_active !== false,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error creating promo code:', error);
      return { data: null, error };
    }
  },

  async updatePromoCode(codeId, updates) {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', codeId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error updating promo code:', error);
      return { data: null, error };
    }
  },

  async deletePromoCode(codeId) {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;
      return { data: { success: true }, error: null };
    } catch (error) {
      console.error('[Admin] Error deleting promo code:', error);
      return { data: null, error };
    }
  },

  // ============================================
  // GESTIÓN DE SUSCRIPCIONES
  // ============================================

  async getAllSubscriptions(filters = {}) {
    try {
      let query = supabase
        .from('subscriptions')
        .select(`
          *,
          users (
            email,
            name,
            plan
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.plan) {
        query = query.eq('plan', filters.plan);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error getting subscriptions:', error);
      return { data: null, error };
    }
  },

  async checkAndExpireSubscriptions() {
    try {
      const { data, error } = await supabase.rpc('check_and_expire_subscriptions');
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[Admin] Error checking subscriptions:', error);
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

