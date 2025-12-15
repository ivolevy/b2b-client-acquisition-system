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
  async signUp(email, password, name) {
    try {
      // Obtener la URL base de la aplicación para la redirección después de confirmar email
      // Supabase redirigirá aquí después de que el usuario confirme su email
      const redirectTo = `${window.location.origin}`;
      
      console.log('[Auth] Iniciando registro de usuario:', { email, redirectTo });
      
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            name: name,
            plan: 'free'
          }
        }
      });

      if (authError) {
        console.error('[Auth] Error al crear usuario:', {
          message: authError.message,
          status: authError.status,
          code: authError.code
        });
        
        // Mejorar mensajes de error específicos
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          throw new Error('Este email ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.');
        }
        throw authError;
      }

      console.log('[Auth] Usuario creado exitosamente:', {
        userId: authData.user?.id,
        email: authData.user?.email,
        emailConfirmed: !!authData.user?.email_confirmed_at,
        hasSession: !!authData.session
      });

      // 2. El perfil se crea automáticamente mediante el trigger handle_new_user()
      // No necesitamos crearlo manualmente aquí para evitar duplicados

      // 3. Verificar si el email de confirmación fue enviado
      // Si el usuario no tiene email_confirmed_at, significa que necesita confirmar
      const needsConfirmation = authData.user && !authData.user.email_confirmed_at;
      
      // Diagnóstico: Verificar si Supabase tiene configurado el servicio de email
      if (needsConfirmation) {
        if (!authData.session) {
          // Esto es normal cuando se requiere confirmación de email
          console.log('[Auth] ✅ Usuario creado. Email de confirmación debería haberse enviado.');
          console.log('[Auth] ⚠️ Si no recibes el email, verifica:');
          console.log('[Auth]   1. Configuración SMTP en Supabase Dashboard');
          console.log('[Auth]   2. "Enable email confirmations" está activado');
          console.log('[Auth]   3. La URL de redirección está configurada:', redirectTo);
          console.log('[Auth]   4. Revisa spam/correo no deseado');
        } else {
          console.warn('[Auth] ⚠️ Usuario tiene sesión pero email no confirmado. Esto puede indicar que la confirmación de email está deshabilitada en Supabase.');
        }
      } else {
        console.log('[Auth] ✅ Email ya confirmado o confirmación no requerida.');
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

  // Eliminar cuenta del usuario
  async deleteAccount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      const userId = user.id;
      console.log('[DeleteAccount] Eliminando datos del usuario:', userId);

      // PASO 1: Intentar eliminar el usuario de auth.users usando función edge PRIMERO
      // Esto es crítico para evitar que el usuario pueda iniciar sesión después
      let authUserDeleted = false;
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('delete-user', {
          body: { userId: userId }
        });

        if (edgeError) {
          console.warn('[DeleteAccount] Función edge no disponible o falló:', edgeError.message);
          // Si la función edge falla, intentamos eliminar manualmente de auth.users
          // usando el método admin (requiere service role key en función edge)
          throw new Error('Función edge no disponible');
        } else if (edgeData?.success) {
          authUserDeleted = true;
          console.log('[DeleteAccount] Usuario eliminado completamente de auth.users mediante función edge');
        }
      } catch (edgeErr) {
        console.warn('[DeleteAccount] No se pudo eliminar de auth.users. El usuario seguirá existiendo pero no podrá iniciar sesión sin perfil.');
      }

      // PASO 2: Eliminar datos del usuario de las tablas relacionadas
      const tables = ['search_history', 'saved_companies', 'email_templates', 'email_history'];
      
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('user_id', userId);
        if (error) {
          console.warn(`[DeleteAccount] Error eliminando ${table}:`, error.message);
        } else {
          console.log(`[DeleteAccount] ${table} eliminado`);
        }
      }

      // PASO 3: Eliminar perfil de usuario (CRÍTICO - esto previene que el usuario inicie sesión)
      // Incluso si el usuario existe en auth.users, sin perfil en users no podrá iniciar sesión
      const { error: userError } = await supabase.from('users').delete().eq('id', userId);
      if (userError) {
        console.error('[DeleteAccount] Error eliminando perfil:', userError);
        throw new Error(`Error eliminando perfil: ${userError.message}`);
      }
      console.log('[DeleteAccount] Perfil eliminado exitosamente');

      // PASO 4: Cerrar sesión inmediatamente
      await supabase.auth.signOut();
      
      // PASO 5: Limpiar todas las sesiones y tokens locales
      localStorage.removeItem('b2b_auth');
      localStorage.removeItem('b2b_token');
      sessionStorage.clear();
      
      // Limpiar cookies de Supabase
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      console.log('[DeleteAccount] Cuenta eliminada exitosamente');
      return { success: true, error: null, authUserDeleted };
    } catch (error) {
      console.error('[DeleteAccount] Error:', error);
      // Aún así, intentar cerrar sesión y limpiar datos locales
      try {
        await supabase.auth.signOut();
        localStorage.removeItem('b2b_auth');
        localStorage.removeItem('b2b_token');
        sessionStorage.clear();
      } catch (cleanupError) {
        console.error('[DeleteAccount] Error en limpieza:', cleanupError);
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

export default supabase;

