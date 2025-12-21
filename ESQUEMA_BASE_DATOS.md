# Esquema Completo de Base de Datos - Sistema B2B Client Acquisition

Este documento describe todas las tablas, columnas y relaciones de las bases de datos del sistema.

## 📊 Resumen de Bases de Datos

El sistema utiliza **dos bases de datos**:

1. **Supabase (PostgreSQL)** - Base de datos principal para usuarios, autenticación y datos de la aplicación
2. **SQLite** - Base de datos local para empresas encontradas, templates de email y cache de scraping

---

## 🗄️ SUPABASE (PostgreSQL)

### 1. Tabla: `public.users`

**Descripción**: Perfiles de usuarios del sistema. Se relaciona con `auth.users` de Supabase Auth.

**Columnas**:
| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | UUID | PRIMARY KEY, FK → `auth.users(id)` ON DELETE CASCADE | ID del usuario (mismo que auth.users) |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Email del usuario |
| `name` | VARCHAR(255) | NOT NULL | Nombre del usuario |
| `plan` | VARCHAR(20) | DEFAULT 'free', CHECK IN ('free', 'pro') | Plan del usuario (free/pro) |
| `plan_expires_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | Fecha de expiración del plan pro |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Fecha de creación |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Fecha de última actualización |
| `last_login_at` | TIMESTAMP WITH TIME ZONE | NULLABLE | Último inicio de sesión |
| `searches_today` | INT | DEFAULT 0 | Contador de búsquedas del día |
| `searches_reset_at` | DATE | DEFAULT CURRENT_DATE | Fecha de reset del contador |

**Índices**:
- PRIMARY KEY en `id`
- UNIQUE en `email`

**Políticas RLS (Row Level Security)**:
- ✅ SELECT: Usuarios solo pueden ver su propio perfil
- ✅ INSERT: Usuarios solo pueden insertar su propio perfil
- ✅ UPDATE: Usuarios solo pueden actualizar su propio perfil
- ✅ DELETE: Usuarios solo pueden eliminar su propio perfil

**Relaciones**:
- `id` → `auth.users(id)` (CASCADE DELETE)
- `id` ← `search_history(user_id)` (CASCADE DELETE)
- `id` ← `saved_companies(user_id)` (CASCADE DELETE)

**Triggers**:
- `on_auth_user_created`: Crea automáticamente un registro en `public.users` cuando se crea un usuario en `auth.users`

---

### 2. Tabla: `public.search_history`

**Descripción**: Historial de búsquedas realizadas por usuarios (solo usuarios PRO).

**Columnas**:
| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ID único de la búsqueda |
| `user_id` | UUID | NOT NULL, FK → `users(id)` ON DELETE CASCADE | Usuario que realizó la búsqueda |
| `rubro` | VARCHAR(255) | NOT NULL | Rubro/industria buscado |
| `ubicacion_nombre` | VARCHAR(500) | NULLABLE | Nombre de la ubicación buscada |
| `centro_lat` | DECIMAL(10, 8) | NULLABLE | Latitud del centro de búsqueda |
| `centro_lng` | DECIMAL(11, 8) | NULLABLE | Longitud del centro de búsqueda |
| `radio_km` | DECIMAL(10, 2) | NULLABLE | Radio de búsqueda en kilómetros |
| `bbox` | VARCHAR(255) | NULLABLE | Bounding box de la búsqueda |
| `empresas_encontradas` | INT | DEFAULT 0 | Total de empresas encontradas |
| `empresas_validas` | INT | DEFAULT 0 | Empresas válidas (con email/contacto) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Fecha de la búsqueda |

**Índices**:
- PRIMARY KEY en `id`
- INDEX `idx_search_history_user` en `(user_id, created_at DESC)`

**Políticas RLS**:
- ✅ SELECT: Usuarios solo pueden ver su propio historial
- ✅ INSERT: Usuarios solo pueden insertar su propio historial
- ✅ DELETE: Usuarios solo pueden eliminar su propio historial

**Relaciones**:
- `user_id` → `users(id)` (CASCADE DELETE)

---

### 3. Tabla: `public.saved_companies`

**Descripción**: Empresas guardadas por usuarios (solo usuarios PRO). Almacena datos completos de empresas en formato JSONB.

**Columnas**:
| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ID único de la empresa guardada |
| `user_id` | UUID | NOT NULL, FK → `users(id)` ON DELETE CASCADE | Usuario que guardó la empresa |
| `empresa_data` | JSONB | NOT NULL | Datos completos de la empresa (nombre, email, teléfono, ubicación, etc.) |
| `notas` | TEXT | NULLABLE | Notas del usuario sobre la empresa |
| `estado` | VARCHAR(50) | DEFAULT 'por_contactar' | Estado del seguimiento (por_contactar, contactado, etc.) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Fecha de guardado |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Fecha de última actualización |

**Índices**:
- PRIMARY KEY en `id`
- INDEX `idx_saved_companies_user` en `user_id`

**Políticas RLS**:
- ✅ SELECT: Usuarios solo pueden ver sus propias empresas guardadas
- ✅ INSERT: Usuarios solo pueden insertar sus propias empresas guardadas
- ✅ UPDATE: Usuarios solo pueden actualizar sus propias empresas guardadas
- ✅ DELETE: Usuarios solo pueden eliminar sus propias empresas guardadas

**Relaciones**:
- `user_id` → `users(id)` (CASCADE DELETE)

**Estructura de `empresa_data` (JSONB)**:
```json
{
  "nombre": "Nombre de la empresa",
  "rubro": "Rubro/Industria",
  "email": "email@empresa.com",
  "telefono": "+54 11 1234-5678",
  "website": "https://www.empresa.com",
  "direccion": "Dirección completa",
  "ciudad": "Ciudad",
  "pais": "País",
  "latitud": -34.6037,
  "longitud": -58.3816,
  "linkedin": "https://linkedin.com/company/...",
  "facebook": "https://facebook.com/...",
  "instagram": "https://instagram.com/...",
  "descripcion": "Descripción de la empresa",
  "horario": "Horario de atención"
}
```

---

### 4. Tabla: `public.plan_features`

**Descripción**: Configuración de características para cada plan (free/pro).

**Columnas**:
| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ID único de la característica |
| `plan` | VARCHAR(20) | NOT NULL | Plan (free/pro) |
| `feature_key` | VARCHAR(100) | NOT NULL | Clave de la característica |
| `feature_value` | VARCHAR(255) | NOT NULL | Valor de la característica |
| UNIQUE | (plan, feature_key) | | Combinación única de plan y clave |

**Índices**:
- PRIMARY KEY en `id`
- UNIQUE en `(plan, feature_key)`

**Políticas RLS**:
- ✅ SELECT: Cualquiera puede ver las características de los planes

**Datos por defecto**:

**Plan FREE**:
- `max_searches_per_day`: `5`
- `max_results_per_search`: `50`
- `save_search_history`: `false`
- `save_companies`: `false`
- `export_csv`: `true`
- `emails_per_day`: `10`
- `pro_background`: `false`

**Plan PRO**:
- `max_searches_per_day`: `unlimited`
- `max_results_per_search`: `unlimited`
- `save_search_history`: `true`
- `save_companies`: `true`
- `export_csv`: `true`
- `emails_per_day`: `unlimited`
- `pro_background`: `true`

---

## 💾 SQLITE (Base de Datos Local)

### 1. Tabla: `empresas`

**Descripción**: Empresas encontradas mediante scraping de OpenStreetMap y otras fuentes.

**Columnas**:
| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID único de la empresa |
| `nombre` | TEXT | NOT NULL | Nombre de la empresa |
| `rubro` | TEXT | NOT NULL | Rubro/industria |
| `rubro_key` | TEXT | NULLABLE | Clave normalizada del rubro |
| `email` | TEXT | NULLABLE | Email de contacto |
| `telefono` | TEXT | NULLABLE | Teléfono de contacto |
| `website` | TEXT | NULLABLE | Sitio web |
| `direccion` | TEXT | NULLABLE | Dirección completa |
| `ciudad` | TEXT | NULLABLE | Ciudad |
| `pais` | TEXT | NULLABLE | País |
| `codigo_postal` | TEXT | NULLABLE | Código postal |
| `latitud` | REAL | NULLABLE | Latitud geográfica |
| `longitud` | REAL | NULLABLE | Longitud geográfica |
| `busqueda_ubicacion_nombre` | TEXT | NULLABLE | Ubicación donde se encontró |
| `busqueda_centro_lat` | REAL | NULLABLE | Latitud del centro de búsqueda |
| `busqueda_centro_lng` | REAL | NULLABLE | Longitud del centro de búsqueda |
| `busqueda_radio_km` | REAL | NULLABLE | Radio de búsqueda usado |
| `distancia_km` | REAL | NULLABLE | Distancia desde el centro de búsqueda |
| `linkedin` | TEXT | NULLABLE | URL de LinkedIn |
| `facebook` | TEXT | NULLABLE | URL de Facebook |
| `twitter` | TEXT | NULLABLE | URL de Twitter/X |
| `instagram` | TEXT | NULLABLE | URL de Instagram |
| `youtube` | TEXT | NULLABLE | URL de YouTube |
| `tiktok` | TEXT | NULLABLE | URL de TikTok |
| `descripcion` | TEXT | NULLABLE | Descripción de la empresa |
| `horario` | TEXT | NULLABLE | Horario de atención |
| `osm_id` | TEXT | NULLABLE | ID de OpenStreetMap |
| `osm_type` | TEXT | NULLABLE | Tipo de entidad OSM (node/way/relation) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Fecha de última actualización |
| UNIQUE | (osm_id, osm_type) | | Evita duplicados por OSM ID |

**Índices**:
- PRIMARY KEY en `id`
- INDEX `idx_rubro` en `rubro_key`
- INDEX `idx_ciudad` en `ciudad`
- INDEX `idx_email` en `email`
- UNIQUE en `(osm_id, osm_type)`

**Relaciones**:
- `id` ← `email_history(empresa_id)` (FOREIGN KEY)

---

### 2. Tabla: `email_templates`

**Descripción**: Plantillas de email para envío masivo a empresas.

**Columnas**:
| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID único del template |
| `nombre` | TEXT | NOT NULL, UNIQUE | Nombre del template |
| `subject` | TEXT | NOT NULL | Asunto del email |
| `body_html` | TEXT | NOT NULL | Cuerpo del email en HTML |
| `body_text` | TEXT | NULLABLE | Cuerpo del email en texto plano |
| `es_default` | INTEGER | DEFAULT 0 | Si es template por defecto (0/1) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Fecha de última actualización |

**Índices**:
- PRIMARY KEY en `id`
- UNIQUE en `nombre`

**Relaciones**:
- `id` ← `email_history(template_id)` (FOREIGN KEY)

**Template por defecto**:
- Nombre: "Presentación Dota Solutions"
- Subject: "Hola equipo de {nombre_empresa} - Oportunidad de colaboración"
- Variables disponibles: `{nombre_empresa}`, `{rubro}`

---

### 3. Tabla: `email_history`

**Descripción**: Historial de emails enviados a empresas.

**Columnas**:
| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID único del registro |
| `empresa_id` | INTEGER | NULLABLE, FK → `empresas(id)` | ID de la empresa destinataria |
| `empresa_nombre` | TEXT | NULLABLE | Nombre de la empresa (denormalizado) |
| `empresa_email` | TEXT | NULLABLE | Email de la empresa (denormalizado) |
| `template_id` | INTEGER | NULLABLE, FK → `email_templates(id)` | Template usado |
| `template_nombre` | TEXT | NULLABLE | Nombre del template (denormalizado) |
| `subject` | TEXT | NULLABLE | Asunto enviado |
| `status` | TEXT | NULLABLE | Estado del envío (success/error) |
| `error_message` | TEXT | NULLABLE | Mensaje de error si falló |
| `sent_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Fecha y hora de envío |

**Índices**:
- PRIMARY KEY en `id`
- INDEX `idx_email_history_empresa` en `empresa_id`
- INDEX `idx_email_history_template` en `template_id`
- INDEX `idx_email_history_sent` en `sent_at`

**Relaciones**:
- `empresa_id` → `empresas(id)` (FOREIGN KEY)
- `template_id` → `email_templates(id)` (FOREIGN KEY)

---

### 4. Tabla: `scraping_cache`

**Descripción**: Cache de datos de scraping de sitios web para evitar requests repetidos.

**Columnas**:
| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `website` | TEXT | PRIMARY KEY | URL del sitio web |
| `data_json` | TEXT | NULLABLE | Datos scrapeados en formato JSON |
| `status` | TEXT | NULLABLE | Estado del scraping (success/error) |
| `http_status` | INTEGER | NULLABLE | Código HTTP de la respuesta |
| `last_scraped_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Última vez que se scrapeó |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Fecha de creación del cache |

**Índices**:
- PRIMARY KEY en `website`
- INDEX `idx_scraping_cache_last` en `last_scraped_at`

**Uso**: Evita hacer scraping repetido del mismo sitio web dentro de un período de tiempo.

---

## 🔗 Diagrama de Relaciones

### Supabase (PostgreSQL)

```
auth.users (Supabase Auth)
    │
    │ ON DELETE CASCADE
    ▼
public.users
    │
    ├──► search_history (user_id)
    │
    └──► saved_companies (user_id)

public.plan_features (sin relaciones)
```

### SQLite

```
empresas
    │
    └──► email_history (empresa_id)

email_templates
    │
    └──► email_history (template_id)

scraping_cache (sin relaciones)
```

---

## 📝 Notas Importantes

### Supabase

1. **Autenticación**: Los usuarios se autentican mediante Supabase Auth (`auth.users`), y el trigger `handle_new_user()` crea automáticamente el perfil en `public.users`.

2. **Row Level Security (RLS)**: Todas las tablas tienen RLS habilitado para garantizar que los usuarios solo accedan a sus propios datos.

3. **Cascade Delete**: Cuando se elimina un usuario de `auth.users`, se eliminan automáticamente:
   - Su perfil en `public.users`
   - Todas sus búsquedas en `search_history`
   - Todas sus empresas guardadas en `saved_companies`

4. **Plan Features**: Las características de los planes se almacenan en `plan_features` y se consultan dinámicamente.

### SQLite

1. **Empresas**: Se almacenan localmente todas las empresas encontradas mediante scraping. No están vinculadas a usuarios específicos.

2. **Email Templates**: Los templates de email se almacenan localmente y pueden ser reutilizados por cualquier usuario.

3. **Email History**: Registra todos los emails enviados, independientemente del usuario que los envió.

4. **Scraping Cache**: Optimiza el rendimiento evitando scraping repetido de los mismos sitios web.

---

## 🔄 Flujo de Datos

1. **Usuario se registra** → Se crea en `auth.users` → Trigger crea perfil en `public.users`
2. **Usuario busca empresas** → Backend scrapea datos → Se guardan en `empresas` (SQLite)
3. **Usuario PRO guarda empresa** → Se guarda en `saved_companies` (Supabase) con datos JSONB
4. **Usuario envía email** → Se usa `email_templates` → Se registra en `email_history`
5. **Usuario PRO consulta historial** → Se consulta `search_history` (Supabase)

---

## 🛠️ Funciones y Triggers

### Supabase

**Función**: `handle_new_user()`
- **Tipo**: TRIGGER FUNCTION
- **Evento**: AFTER INSERT ON `auth.users`
- **Acción**: Crea automáticamente un registro en `public.users` con plan 'free'

**Trigger**: `on_auth_user_created`
- **Tabla**: `auth.users`
- **Evento**: AFTER INSERT
- **Función**: `handle_new_user()`

---

## 📊 Estadísticas y Consultas Útiles

### Contar empresas por rubro (SQLite)
```sql
SELECT rubro, COUNT(*) as count 
FROM empresas 
GROUP BY rubro 
ORDER BY count DESC;
```

### Contar empresas por ciudad (SQLite)
```sql
SELECT ciudad, COUNT(*) as count 
FROM empresas 
WHERE ciudad != ""
GROUP BY ciudad 
ORDER BY count DESC 
LIMIT 10;
```

### Obtener historial de búsquedas de un usuario (Supabase)
```sql
SELECT * FROM search_history 
WHERE user_id = 'USER_UUID' 
ORDER BY created_at DESC;
```

### Obtener empresas guardadas de un usuario (Supabase)
```sql
SELECT * FROM saved_companies 
WHERE user_id = 'USER_UUID' 
ORDER BY created_at DESC;
```

---

## 🔐 Seguridad

- **Supabase**: Row Level Security (RLS) habilitado en todas las tablas públicas
- **SQLite**: Base de datos local, acceso controlado por el backend
- **Autenticación**: Supabase Auth con email/password
- **Autorización**: Políticas RLS basadas en `auth.uid()`

---

*Última actualización: Diciembre 2024*

