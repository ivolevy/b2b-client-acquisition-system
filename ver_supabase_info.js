// ============================================================================
// VER INFORMACIÓN DE SUPABASE
// ============================================================================
// Ejecutar: node ver_supabase_info.js
// ============================================================================

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🔍 Buscando información de Supabase...\n');

// Intentar leer .env.local del frontend
let supabaseUrl = null;
let supabaseAnonKey = null;
let supabaseServiceKey = null;

const envFiles = [
  join(__dirname, 'frontend', '.env.local'),
  join(__dirname, 'frontend', '.env'),
  join(__dirname, '.env.local'),
  join(__dirname, '.env')
];

for (const envPath of envFiles) {
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = trimmed.split('=')[1].trim().replace(/['"]/g, '');
      }
      if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseAnonKey = trimmed.split('=')[1].trim().replace(/['"]/g, '');
      }
      if (trimmed.includes('SERVICE_ROLE') || trimmed.includes('service_role')) {
        const parts = trimmed.split('=');
        if (parts.length > 1) {
          supabaseServiceKey = parts[1].trim().replace(/['"]/g, '');
        }
      }
    }
    
    if (supabaseUrl || supabaseAnonKey || supabaseServiceKey) {
      console.log(`✅ Encontrado en: ${envPath}\n`);
      break;
    }
  } catch (e) {
    // Continuar con el siguiente archivo
    continue;
  }
}

// También buscar en variables de entorno del sistema
if (!supabaseUrl) {
  supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
}
if (!supabaseAnonKey) {
  supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
}
if (!supabaseServiceKey) {
  supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
}

// Mostrar información
console.log('═══════════════════════════════════════════════════════════');
console.log('📋 INFORMACIÓN DE SUPABASE');
console.log('═══════════════════════════════════════════════════════════\n');

if (supabaseUrl) {
  console.log('🔗 URL de Supabase:');
  console.log(`   ${supabaseUrl}\n`);
  
  // Extraer el ID del proyecto de la URL
  const projectIdMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (projectIdMatch) {
    console.log('📦 ID del Proyecto:');
    console.log(`   ${projectIdMatch[1]}\n`);
    console.log('🌐 Link del Dashboard:');
    console.log(`   https://app.supabase.com/project/${projectIdMatch[1]}\n`);
  }
} else {
  console.log('❌ No se encontró VITE_SUPABASE_URL\n');
}

if (supabaseAnonKey) {
  console.log('🔑 Anon Key (primeros 20 caracteres):');
  console.log(`   ${supabaseAnonKey.substring(0, 20)}...\n`);
} else {
  console.log('❌ No se encontró VITE_SUPABASE_ANON_KEY\n');
}

if (supabaseServiceKey) {
  console.log('🔐 Service Role Key (primeros 20 caracteres):');
  console.log(`   ${supabaseServiceKey.substring(0, 20)}...\n`);
} else {
  console.log('⚠️  No se encontró SERVICE_ROLE_KEY (solo necesario para operaciones admin)\n');
}

console.log('═══════════════════════════════════════════════════════════\n');

if (!supabaseUrl) {
  console.log('💡 Para encontrar tu información de Supabase:');
  console.log('   1. Ve a https://app.supabase.com');
  console.log('   2. Inicia sesión con tu cuenta');
  console.log('   3. Selecciona tu proyecto');
  console.log('   4. Ve a Settings > API');
  console.log('   5. Ahí encontrarás:');
  console.log('      - Project URL (tu VITE_SUPABASE_URL)');
  console.log('      - anon/public key (tu VITE_SUPABASE_ANON_KEY)');
  console.log('      - service_role key (tu SERVICE_ROLE_KEY)\n');
  
  console.log('📧 Para encontrar el email de tu cuenta:');
  console.log('   1. Ve a https://app.supabase.com');
  console.log('   2. Haz clic en tu perfil (esquina superior derecha)');
  console.log('   3. Ahí verás el email con el que iniciaste sesión\n');
}

