// ============================================================================
// CREAR USUARIOS FREE
// ============================================================================
// Ejecutar: node crear_usuarios_free.js
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Intentar leer .env o .env.local
let supabaseUrl, supabaseServiceKey;

const envFiles = ['.env', '.env.local'];
for (const envFile of envFiles) {
  try {
    const envPath = join(__dirname, envFile);
    const envContent = readFileSync(envPath, 'utf-8');
    const envLines = envContent.split('\n');
    
    for (let i = 0; i < envLines.length; i++) {
      const line = envLines[i].trim();
      if (line.startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
      }
      if (line.includes('SERVICE_ROLE') || line.includes('service_role')) {
        const parts = line.split('=');
        if (parts.length > 1) {
          supabaseServiceKey = parts[1].trim().replace(/['"]/g, '');
        }
      }
    }
    if (supabaseUrl || supabaseServiceKey) {
      console.log(`✅ Leyendo credenciales de ${envFile}`);
      break;
    }
  } catch (e) {
    continue;
  }
}

if (!supabaseUrl && !supabaseServiceKey) {
  console.log('⚠️  No se encontró .env o .env.local, usando variables de entorno o argumentos');
}

supabaseUrl = supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.argv[2];
supabaseServiceKey = supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.argv[3];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan las credenciales de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function crearUsuario(email, password, name) {
    try {
      // Crear usuario en auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
        email_confirm: true,
        user_metadata: {
        name: name,
          phone: ''
        }
      });

      let userId;

      if (authError) {
        if (authError.message.includes('already registered') || 
            authError.message.includes('already exists') ||
            authError.message.includes('User already registered')) {
        console.log(`⚠️  Usuario ${email} ya existe, obteniendo ID...`);
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          
          if (listError) throw listError;
          
        const user = users.find(u => u.email === email);
          if (!user) {
            throw new Error('Usuario existe pero no se pudo encontrar');
          }
          
          userId = user.id;
        } else {
          throw authError;
        }
      } else {
        userId = authData.user.id;
      }

      // Crear/actualizar en public.users con plan free
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: userId,
        email: email,
        name: name,
          phone: '',
          plan: 'free',
          role: 'user'
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (userError) {
        throw userError;
      }

    return { success: true, user: userData };
    } catch (error) {
    return { success: false, error: error.message };
  }
}

async function crearUsuariosFree() {
  const usuarios = [
    { email: 'user1@test.com', password: 'user1234', name: 'Usuario Test 1' },
    { email: 'user2@test.com', password: 'user1234', name: 'Usuario Test 2' }
  ];

  console.log('🔧 Creando usuarios free...\n');

  for (const usuario of usuarios) {
    console.log(`📝 Creando ${usuario.email}...`);
    const result = await crearUsuario(usuario.email, usuario.password, usuario.name);
    
    if (result.success) {
      console.log(`✅ Usuario creado: ${usuario.email}`);
      console.log(`   Password: ${usuario.password}`);
      console.log(`   Plan: free\n`);
    } else {
      console.error(`❌ Error creando ${usuario.email}: ${result.error}\n`);
    }
  }

  console.log('✅ Proceso completado');
}

crearUsuariosFree();
