// ============================================================================
// ACTUALIZAR CONTRASEÑA DEL USUARIO ADMIN
// ============================================================================
// Ejecutar: node actualizar_password_admin.js
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

async function actualizarPassword() {
  const email = 'admin@admin.com';
  const nuevaPassword = 'admin123'; // 8 caracteres, válida para login (mínimo 6)

  console.log('🔧 Actualizando contraseña del usuario admin...');
  console.log(`   Email: ${email}`);
  console.log(`   Nueva Password: ${nuevaPassword}\n`);

  try {
    // Buscar el usuario por email
    console.log('📝 Buscando usuario...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    console.log(`✅ Usuario encontrado: ${user.id}`);

    // Actualizar contraseña
    console.log('\n📝 Actualizando contraseña...');
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: nuevaPassword }
    );

    if (error) {
      throw error;
    }

    console.log(`✅ Contraseña actualizada exitosamente`);
    console.log('\n🔑 Nuevas credenciales:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${nuevaPassword}`);
    console.log('\n💡 Ahora puedes iniciar sesión con estas credenciales.');

  } catch (error) {
    console.error('\n❌ Error actualizando contraseña:');
    console.error(error.message);
    if (error.details) {
      console.error('Detalles:', error.details);
    }
    process.exit(1);
  }
}

actualizarPassword();

