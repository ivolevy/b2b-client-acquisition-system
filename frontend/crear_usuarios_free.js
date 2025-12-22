// ============================================================================
// CREAR USUARIOS CON PLAN FREE
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

async function crearUsuariosFree() {
  const usuarios = [
    {
      email: 'usuario1@test.com',
      password: 'usuario123',
      name: 'Usuario Uno'
    },
    {
      email: 'usuario2@test.com',
      password: 'usuario123',
      name: 'Usuario Dos'
    }
  ];

  console.log('🔧 Creando usuarios con plan free...\n');

  for (const usuario of usuarios) {
    try {
      console.log(`📝 Creando usuario: ${usuario.email}`);
      
      // Crear usuario en auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: usuario.email,
        password: usuario.password,
        email_confirm: true,
        user_metadata: {
          name: usuario.name,
          phone: ''
        }
      });

      let userId;

      if (authError) {
        if (authError.message.includes('already registered') || 
            authError.message.includes('already exists') ||
            authError.message.includes('User already registered')) {
          console.log(`⚠️  Usuario ${usuario.email} ya existe, obteniendo ID...`);
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          
          if (listError) throw listError;
          
          const user = users.find(u => u.email === usuario.email);
          if (!user) {
            throw new Error('Usuario existe pero no se pudo encontrar');
          }
          
          userId = user.id;
          console.log(`✅ Usuario encontrado: ${userId}`);
        } else {
          throw authError;
        }
      } else {
        userId = authData.user.id;
        console.log(`✅ Usuario creado en auth.users: ${userId}`);
      }

      // Crear/actualizar en public.users con plan free
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: usuario.email,
          name: usuario.name,
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

      console.log(`✅ Usuario creado/actualizado en public.users`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Plan: ${userData.plan}`);
      console.log(`   Role: ${userData.role}\n`);

    } catch (error) {
      console.error(`\n❌ Error creando usuario ${usuario.email}:`);
      console.error(error.message);
      if (error.details) {
        console.error('Detalles:', error.details);
      }
    }
  }

  console.log('\n✅ Proceso completado!');
  console.log('\n🔑 Credenciales de los usuarios:');
  usuarios.forEach(u => {
    console.log(`   ${u.email} / ${u.password}`);
  });
}

crearUsuariosFree();

