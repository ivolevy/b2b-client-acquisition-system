// ============================================================================
// CREAR USUARIO ADMIN DESDE CÓDIGO
// ============================================================================
// Ejecutar con: node crear_admin_desde_codigo.js
// Asegúrate de tener las variables de entorno configuradas
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, 'frontend', '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan las credenciales de Supabase');
  console.error('Necesitas configurar:');
  console.error('  - VITE_SUPABASE_URL o SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY o VITE_SUPABASE_SERVICE_KEY');
  console.error('\nLas keys están en Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

// Crear cliente con service_role key (permite crear usuarios)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function crearAdmin() {
  const email = 'admin@admin.com';
  const password = 'admin';
  const name = 'Administrador';

  console.log('🔧 Creando usuario admin...');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role: admin`);

  try {
    // PASO 1: Crear usuario en auth.users
    console.log('\n📝 Paso 1: Creando usuario en auth.users...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        name: name,
        phone: ''
      }
    });

    if (authError) {
      // Si el usuario ya existe, obtener su ID
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log('⚠️  Usuario ya existe en auth.users, obteniendo ID...');
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const user = existingUser.users.find(u => u.email === email);
        
        if (!user) {
          throw new Error('Usuario existe pero no se pudo encontrar');
        }
        
        authData = { user };
        console.log(`✅ Usuario encontrado: ${user.id}`);
      } else {
        throw authError;
      }
    } else {
      console.log(`✅ Usuario creado en auth.users: ${authData.user.id}`);
    }

    const userId = authData.user.id;

    // PASO 2: Crear/actualizar en public.users con role admin
    console.log('\n📝 Paso 2: Creando/actualizando en public.users...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        name: name,
        phone: '',
        plan: 'pro',
        role: 'admin'
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (userError) {
      throw userError;
    }

    console.log(`✅ Usuario creado/actualizado en public.users`);
    console.log('\n📊 Datos del usuario:');
    console.log(`   ID: ${userData.id}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Nombre: ${userData.name}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Plan: ${userData.plan}`);

    console.log('\n✅ ¡Usuario admin creado exitosamente!');
    console.log('\n🔑 Credenciales:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n💡 Ahora puedes iniciar sesión con estas credenciales.');

  } catch (error) {
    console.error('\n❌ Error creando usuario admin:');
    console.error(error.message);
    if (error.details) {
      console.error('Detalles:', error.details);
    }
    process.exit(1);
  }
}

// Ejecutar
crearAdmin();

