// Supabase Edge Function para eliminar usuario
// Deploy: supabase functions deploy delete-user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase con service role key (tiene permisos de admin)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Obtener el token de autorización del header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verificar que el usuario esté autenticado
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Usuario no autenticado')
    }

    // Obtener el userId del body
    const { userId } = await req.json()
    
    // Verificar que el usuario solo pueda eliminar su propia cuenta
    if (user.id !== userId) {
      throw new Error('No tienes permiso para eliminar esta cuenta')
    }

    // Eliminar datos relacionados primero
    const tables = ['search_history', 'saved_companies', 'email_templates', 'email_history']
    
    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', userId)
      
      if (error) {
        console.warn(`Error eliminando ${table}:`, error.message)
      }
    }

    // Eliminar perfil de usuario
    const { error: userError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)
    
    if (userError) {
      throw new Error(`Error eliminando perfil: ${userError.message}`)
    }

    // Eliminar usuario de auth.users usando admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      throw new Error(`Error eliminando usuario de auth: ${deleteError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Usuario eliminado exitosamente' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
