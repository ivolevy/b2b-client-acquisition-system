// ============================================================================
// CREAR USUARIO ADMIN DESDE CÓDIGO
// ============================================================================
// Ejecutar desde el directorio frontend:
//   cd frontend && node crear_admin.js
// O con las keys como argumentos:
//   node crear_admin.js <SUPABASE_URL> <SERVICE_ROLE_KEY>
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
    
    // Leer todas las líneas buscando las keys
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
    // Continuar con el siguiente archivo
    continue;
  }
}

if (!supabaseUrl && !supabaseServiceKey) {
  console.log('⚠️  No se encontró .env o .env.local, usando variables de entorno o argumentos');
}

// Obtener credenciales de las variables de entorno o argumentos
supabaseUrl = supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.argv[2];
supabaseServiceKey = supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.argv[3];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan las credenciales de Supabase');
  console.error('\nOpciones:');
  console.error('1. Pasar como argumentos:');
  console.error('   node crear_admin.js <SUPABASE_URL> <SERVICE_ROLE_KEY>');
  console.error('\n2. Configurar variables de entorno:');
  console.error('   export VITE_SUPABASE_URL=tu_url');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY=tu_service_key');
  console.error('\n3. Crear archivo frontend/.env.local con:');
  console.error('   VITE_SUPABASE_URL=tu_url');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=tu_service_key');
  console.error('\n💡 La SERVICE_ROLE_KEY está en:');
  console.error('   Supabase Dashboard > Settings > API > service_role key');
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
  console.log(`   Role: admin\n`);

  try {
    // PASO 1: Crear usuario en auth.users usando Admin API
    console.log('📝 Paso 1: Creando usuario en auth.users...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        name: name,
        phone: ''
      }
    });

    let userId;

    if (authError) {
      // Si el usuario ya existe, obtener su ID
      if (authError.message.includes('already registered') || 
          authError.message.includes('already exists') ||
          authError.message.includes('User already registered')) {
        console.log('⚠️  Usuario ya existe en auth.users, obteniendo ID...');
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) throw listError;
        
        const user = users.find(u => u.email === email);
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
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  }
}

// Ejecutar
crearAdmin();

