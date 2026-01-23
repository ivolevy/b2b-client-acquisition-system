"""
Módulo de base de datos conectado a Supabase
Reemplaza la implementación local de SQLite
"""

import os
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

logger.info(f"Supabase Init - URL present: {bool(SUPABASE_URL)}, Key present: {bool(SUPABASE_KEY)}")

supabase: Optional[Client] = None
# Variable privada para el módulo, inicializada aquí
_supabase_client: Optional[Client] = None

try:
    if SUPABASE_URL and SUPABASE_KEY:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        supabase = _supabase_client
        logger.info("✅ Cliente Supabase inicializado correctamente")
    else:
        logger.warning("⚠️ Faltan credenciales de Supabase (SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)")
except Exception as e:
    logger.error(f"❌ Error FATAL inicializando cliente Supabase: {e}")
    # Asegurar que quedan como None en caso de error
    _supabase_client = None
    supabase = None

def get_supabase() -> Optional[Client]:
    """Obtiene o inicializa el cliente de Supabase"""
    global _supabase_client, supabase
    # Retornar el cliente ya inicializado a nivel de módulo
    if _supabase_client:
        return _supabase_client
        
    # Si no está inicializado, intentar verificar credenciales
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Faltan credenciales de Supabase (SUPABASE_URL o SUPABASE_KEY). No se puede inicializar el cliente.")
        return None
        
    # Si las credenciales están presentes pero el cliente no está inicializado (ej. falló la primera vez)
    try:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        supabase = _supabase_client
        logger.info("✅ Cliente Supabase re-inicializado correctamente en get_supabase()")
        return _supabase_client
    except Exception as e:
        logger.error(f"Error re-inicializando Supabase en get_supabase(): {e}")
        _supabase_client = None
        supabase = None
        return None

# Intentar obtener Service Role Key para operaciones administrativas
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Caching para el cliente admin
_supabase_admin_client: Optional[Client] = None

def get_supabase_admin() -> Optional[Client]:
    """Obtiene cliente con privilegios de admin (Service Role) - Singleton"""
    global _supabase_admin_client
    
    if _supabase_admin_client:
        return _supabase_admin_client

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Falta SUPABASE_SERVICE_ROLE_KEY. Operaciones administrativas limitadas.")
        return None
        
    try:
        _supabase_admin_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        return _supabase_admin_client
    except Exception as e:
        logger.error(f"Error creando cliente admin: {e}")
        return None

def crear_usuario_admin(email: str, password: str, user_metadata: Dict) -> Dict:
    """Crea un usuario usando la API de administración de Supabase"""
    admin_client = get_supabase_admin()
    
    if not admin_client:
        return {"error": "Servidor no configurado para creación de usuarios (falta SERVICE_ROLE_KEY)"}

    try:
        # Usa auth.admin.create_user
        response = admin_client.auth.admin.create_user({
            "email": email,
            "password": password,
            "user_metadata": user_metadata,
            "email_confirm": True
        })
        
        logger.info(f"✅ Usuario Auth creado exitosamente: {email}")
        
        # En supabase-py v2, response es un UserResponse que tiene .user
        # Lo convertimos a dict para la respuesta de la API si es necesario, 
        # o devolvemos el objeto si es serializable (fastapi lo maneja)
        return {"data": response.user if hasattr(response, "user") else response, "error": None}
        
    except Exception as e:
        logger.error(f"❌ Error creando usuario admin ({email}): {e}")
        return {"error": str(e)}

def admin_update_user(user_id: str, updates: Dict) -> Dict:
    """Actualiza un usuario usando privilegios de admin (bypassing RLS)"""
    admin_client = get_supabase_admin()
    if not admin_client:
        return {"error": "Servidor no configurado para admin (falta SERVICE_ROLE_KEY)"}
        
    try:
        # 1. Separar actualizaciones de Auth vs Public
        auth_updates = {}
        public_updates = {}
        subscription_updates = {}
        
        # Mapear campos
        if 'email' in updates: auth_updates['email'] = updates['email']
        if 'password' in updates: auth_updates['password'] = updates['password']
        
        # Campos para public.users
        if 'role' in updates: public_updates['role'] = updates['role']
        if 'name' in updates: public_updates['name'] = updates['name']
        if 'phone' in updates: public_updates['phone'] = updates['phone']
        
        # 2. Actualizar Auth si es necesario
        if auth_updates:
            admin_client.auth.admin.update_user_by_id(user_id, auth_updates)
            
        # 3. Actualizar Public Profile
        if public_updates:
            public_updates['updated_at'] = datetime.now().isoformat()
            admin_client.table('users').update(public_updates).eq('id', user_id).execute()
            

        return {"success": True, "message": "Usuario actualizado correctamente"}
        
    except Exception as e:
        logger.error(f"Error actualizando usuario admin {user_id}: {e}")
        return {"error": str(e)}

def init_db_b2b() -> bool:
    """Verifica conexión a Supabase"""
    client = get_supabase()
    if not client:
        return False
    
    logger.info(" Conexión a Supabase inicializada correctamente")
    return True

def insertar_empresa(empresa: Dict) -> bool:
    """Inserta o actualiza una empresa en Supabase"""
    client = get_supabase()
    if not client:
        return False
        
    try:
        # Preparar datos para Supabase
        # Aseguramos que los campos coincidan con el esquema de la tabla 'empresas'
        data_to_insert = {
            'nombre': empresa.get('nombre'),
            'rubro': empresa.get('rubro'),
            'rubro_key': empresa.get('rubro_key'),
            'email': empresa.get('email', ''),
            'telefono': empresa.get('telefono', ''),
            'website': empresa.get('website', ''),
            'direccion': empresa.get('direccion', ''),
            'ciudad': empresa.get('ciudad', ''),
            'pais': empresa.get('pais', ''),
            'codigo_postal': empresa.get('codigo_postal', ''),
            # Coordenadas
            'latitud': empresa.get('latitud'),
            'longitud': empresa.get('longitud'),
            # Redes sociales
            'linkedin': empresa.get('linkedin', ''),
            'facebook': empresa.get('facebook', ''),
            'twitter': empresa.get('twitter', ''),
            'instagram': empresa.get('instagram', ''),
            # Metadata
            'descripcion': empresa.get('descripcion', ''),
            'osm_id': empresa.get('osm_id'),
            # Validación
            'validada': empresa.get('validada', False),
            'email_valido': empresa.get('email_valido', False),
            'telefono_valido': empresa.get('telefono_valido', False),
            'website_valido': empresa.get('website_valido', False),
            # Búsqueda origen
            'busqueda_ubicacion_nombre': empresa.get('busqueda_ubicacion_nombre'),
            # Timestamps
            'updated_at': datetime.now().isoformat()
        }
        
        # Limpiar claves con valor None para evitar errores si la columna no permite NULL
        # aunque Supabase suele manejarlo, es mejor limpiar
        data_to_insert = {k: v for k, v in data_to_insert.items() if v is not None}

        # Upsert basado en osm_id si existe, o email como fallback
        # Nota: La tabla en Supabase debería tener una constraint UNIQUE o Primary Key
        # Idealmente osm_id es único.
        
        response = client.table('empresas').upsert(data_to_insert, on_conflict='osm_id').execute()
        
        if response.data:
            logger.debug(f" Empresa guardada en Supabase: {empresa.get('nombre')}")
            return True
        return False
        
    except Exception as e:
        logger.error(f"Error insertando empresa en Supabase: {e}")
        return False

def buscar_empresas(
    rubro: Optional[str] = None,
    ciudad: Optional[str] = None,
    solo_validas: bool = False,
    con_email: bool = False,
    con_telefono: bool = False
) -> List[Dict]:
    """Busca empresas en Supabase con filtros"""
    client = get_supabase()
    if not client:
        return []

    try:
        query = client.table('empresas').select('*')
        
        if rubro:
            # Buscar coincidencia parcial o exacta
            # Supabase usa ilike para case-insensitive search
            query = query.ilike('rubro_key', f'%{rubro}%')
        
        if ciudad:
            query = query.ilike('ciudad', f'%{ciudad}%')
            
        if solo_validas:
            query = query.eq('validada', True)
            
        if con_email:
            query = query.eq('email_valido', True)
            
        if con_telefono:
            query = query.eq('telefono_valido', True)
            
        # Ordenar por fecha de creación descendente
        query = query.order('created_at', desc=True)
        
        response = query.execute()
        return response.data
        
    except Exception as e:
        logger.error(f"Error buscando empresas en Supabase: {e}")
        return []

def obtener_todas_empresas() -> List[Dict]:
    """Obtiene todas las empresas almacenadas en Supabase (con límite por defecto)"""
    client = get_supabase()
    if not client:
        return []
        
    try:
        # Por defecto Supabase limita a 1000 rows.
        # Ordenamos por created_at para ver las más recientes.
        response = client.table('empresas').select('*').order('created_at', desc=True).limit(1000).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error obteniendo todas las empresas: {e}")
        return []

def obtener_estadisticas() -> Dict:
    """Obtiene estadísticas básicas desde Supabase"""
    client = get_supabase()
    if not client:
        return {}
        
    try:
        # Nota: Supabase API no tiene un endpoint de agregación directo simple sin usar RPC
        # Para mantenerlo simple, haremos queries con count='exact' y head=True
        
        total = client.table('empresas').select('*', count='exact', head=True).execute().count
        
        con_email = client.table('empresas').select('*', count='exact', head=True)\
            .eq('email_valido', True).execute().count
            
        validas = client.table('empresas').select('*', count='exact', head=True)\
            .eq('validada', True).execute().count

        return {
            'total': total,
            'validas': validas,
            'con_email': con_email,
            # Estadísticas más complejas (por rubro/ciudad) requieren RPC o traer más datos
            # Por ahora devolvemos lo básico para no sobrecargar
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de Supabase: {e}")
        return {'total': 0}

def exportar_a_csv(rubro: Optional[str] = None, solo_validas: bool = True) -> Optional[str]:
    """Exporta datos de Supabase a CSV local"""
    import csv
    
    empresas = buscar_empresas(rubro=rubro, solo_validas=solo_validas)
    
    if not empresas:
        return None
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"empresas_b2b_supabase_{rubro or 'todas'}_{timestamp}.csv"
    # Guardar en carpeta data (subir un nivel desde backend)
    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', filename)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    try:
        with open(output_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
            if not empresas:
                return None
            
            # Usar las claves del primer elemento como headers
            campos = list(empresas[0].keys())
            writer = csv.DictWriter(
                csvfile, 
                fieldnames=campos, 
                extrasaction='ignore', 
                delimiter=',',
                quoting=csv.QUOTE_ALL
            )
            writer.writeheader()
            writer.writerows(empresas)
            
        logger.info(f" Exportado a CSV: {output_path}")
        return output_path
    except Exception as e:
        logger.error(f"Error escribiendo CSV: {e}")
        return None

def exportar_a_json(rubro: Optional[str] = None, solo_validas: bool = True) -> Optional[str]:
    """Exporta datos de Supabase a JSON local"""
    empresas = buscar_empresas(rubro=rubro, solo_validas=solo_validas)
    
    if not empresas:
        return None
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"empresas_b2b_supabase_{rubro or 'todas'}_{timestamp}.json"
    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', filename)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(empresas, f, indent=2, ensure_ascii=False, default=str)
            
        logger.info(f" Exportado a JSON: {output_path}")
        return output_path
    except Exception as e:
        logger.error(f"Error escribiendo JSON: {e}")
        return None


# --- GMAIL OAUTH FUNCTIONS ---

def save_user_oauth_token(user_id: str, token_data: Dict, provider: str = 'google') -> bool:
    """Guarda o actualiza tokens OAuth de un usuario"""
    admin_client = get_supabase_admin()
    if not admin_client:
        return False
        
    try:
        data = {
            'user_id': user_id,
            'provider': provider,
            'access_token': token_data.get('access_token'),
            'refresh_token': token_data.get('refresh_token'),
            'token_expiry': token_data.get('expiry'), # ISO string from google-auth
            'scope': token_data.get('scope'),
            'token_type': token_data.get('token_type', 'Bearer'),
            'account_email': token_data.get('account_email'),
            'updated_at': datetime.now().isoformat()
        }
        
        # Eliminar nulos
        data = {k: v for k, v in data.items() if v is not None}
        
        response = admin_client.table('user_oauth_tokens').upsert(data, on_conflict='user_id,provider').execute()
        return bool(response.data)
    except Exception as e:
        logger.error(f"Error guardando token OAuth para {user_id}: {e}")
        return False

def get_user_oauth_token(user_id: str, provider: str = 'google') -> Optional[Dict]:
    """Recupera los tokens OAuth de un usuario"""
    admin_client = get_supabase_admin()
    if not admin_client:
        return None
        
    try:
        response = admin_client.table('user_oauth_tokens')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('provider', provider)\
            .execute()
            
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error obteniendo token OAuth para {user_id}: {e}")
        return None

def delete_user_oauth_token(user_id: str, provider: str = 'google') -> bool:
    """Elimina la conexión OAuth de un usuario"""
    admin_client = get_supabase_admin()
    if not admin_client:
        return False
        
    try:
        response = admin_client.table('user_oauth_tokens')\
            .delete()\
            .eq('user_id', user_id)\
            .eq('provider', provider)\
            .execute()
        return True
    except Exception as e:
        logger.error(f"Error eliminando token OAuth para {user_id}: {e}")
        return False

def obtener_perfil_usuario(user_id: str) -> Optional[Dict]:
    """Obtiene el perfil de usuario (nombre, plan, etc) de Supabase"""
    # Usar admin client para asegurar acceso
    client = get_supabase_admin() or get_supabase()
    if not client or not user_id:
        return None
        
    try:
        # Intentar obtener de la tabla 'users' (perfiles públicos)
        response = client.table('users').select('*').eq('id', user_id).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
            
        return None
    except Exception as e:
        logger.error(f"Error obteniendo perfil de usuario {user_id}: {e}")
        return None
def eliminar_usuario_totalmente(user_id: str) -> Dict:
    """
    Elimina un usuario y todos sus datos relacionados usando privilegios de admin.
    Esto es necesario para bypassar las políticas RLS y asegurar limpieza total.
    """
    admin_client = get_supabase_admin()
    
    if not admin_client:
        return {"success": False, "error": "Servidor no configurado para eliminación (falta SERVICE_ROLE_KEY)"}

    try:
        logger.info(f"Iniciando eliminación total de usuario {user_id}")
        
        # 1. Eliminar datos relacionados manualmente (redundancia por si falta CASCADE)
        tables_to_clean = [
            'search_history', 
            'saved_companies', 
            'email_templates', 
            'email_history',

            'user_oauth_tokens',
            'users' # Perfil público en tabla users
        ]
        
        for table in tables_to_clean:
            try:
                # La tabla 'users' usa 'id' como PK, el resto usa 'user_id' como FK
                column_name = 'id' if table == 'users' else 'user_id'
                
                admin_client.table(table).delete().eq(column_name, user_id).execute()
                logger.info(f"Datos eliminados de {table} para {user_id}")
            except Exception as e_table:
                # Loggear pero continuar, ya que auth.users delete debería hacer cascade si está configurado
                logger.warning(f"Error limpiando tabla {table}: {e_table}")

        # 2. Eliminar usuario de Auth (esto debería disparar CASCADE si la DB está bien configurada)
        # Nota: Usamos delete_user del admin api
        try:
            admin_client.auth.admin.delete_user(user_id)
            return {"success": True, "message": "Usuario eliminado permanentemente"}
        except Exception as e_auth:
            logger.error(f"Error eliminando de Auth: {e_auth}")
            return {"success": False, "error": f"Error al eliminar usuario de Auth: {str(e_auth)}"}
            
    except Exception as e:
        logger.error(f"Error crítico eliminando usuario {user_id}: {e}")
        return {"success": False, "error": str(e)}


def save_search_history(user_id: str, search_data: dict) -> dict:
    """Guarda una búsqueda en el historial del usuario usando el cliente admin para saltar RLS"""
    admin_client = get_supabase_admin()
    if not admin_client or not user_id:
        logger.warning(f"save_search_history: Faltan credenciales admin o user_id ({user_id})")
        return {"success": False, "error": "No hay cliente o user_id"}
        
    try:
        # Asegurar conversión de tipos para PostgreSQL (DECIMAL)
        def to_float(val):
            if val is None or val == '': return None
            try: return float(val)
            except: return None

        insert_data = {
            "user_id": user_id,
            "rubro": search_data.get("rubro"),
            "ubicacion_nombre": search_data.get("ubicacion_nombre"),
            "centro_lat": to_float(search_data.get("centro_lat")),
            "centro_lng": to_float(search_data.get("centro_lng")),
            "radio_km": to_float(search_data.get("radio_km")),
            "bbox": search_data.get("bbox"),
            "empresas_encontradas": int(search_data.get("empresas_encontradas", 0)),
            "empresas_validas": int(search_data.get("empresas_validas", 0))
        }
        
        logger.info(f"💾 Guardando historial para {user_id}: {insert_data.get('rubro')} en {insert_data.get('ubicacion_nombre')}")
        
        response = admin_client.table('search_history').insert(insert_data).execute()
        if response.data:
            logger.info(f"✅ Historial guardado con ID: {response.data[0].get('id')}")
            return {"success": True, "data": response.data[0]}
        
        logger.warning(f"⚠️ No se recibieron datos tras insertar historial para {user_id}")
        return {"success": False, "error": "No se recibieron datos tras la inserción"}
    except Exception as e:
        logger.error(f"❌ Error guardando historial para {user_id}: {e}")
        return {"success": False, "error": str(e)}

def get_search_history(user_id: str, limit: int = 10) -> List[dict]:
    """Obtiene el historial de búsquedas del usuario usando el cliente admin"""
    admin_client = get_supabase_admin()
    if not admin_client or not user_id:
        return []
        
    try:
        response = admin_client.table('search_history')\
            .select('id, rubro, ubicacion_nombre, centro_lat, centro_lng, radio_km, bbox, empresas_encontradas, empresas_validas, created_at')\
            .eq('user_id', user_id)\
            .order('created_at', ascending=False)\
            .limit(limit)\
            .execute()
            
        return response.data or []
    except Exception as e:
        logger.error(f"Error obteniendo historial para {user_id}: {e}")
        return []

def delete_search_history(user_id: str, search_id: str) -> bool:
    """Elimina una entrada del historial validando que pertenezca al usuario"""
    admin_client = get_supabase_admin()
    if not admin_client or not user_id or not search_id:
        return False
        
    try:
        # Usamos admin pero filtramos por user_id para seguridad
        admin_client.table('search_history').delete().eq('id', search_id).eq('user_id', user_id).execute()
        return True
    except Exception as e:
        logger.error(f"Error eliminando historial {search_id} para {user_id}: {e}")
        return False
def increment_api_usage(provider: str, sku: str, cost_usd: float) -> bool:
    """Incrementa las estadísticas de uso de API para el mes actual"""
    client = get_supabase_admin() # Usar admin para saltar RLS si es necesario
    if not client:
        return False
        
    try:
        current_month = datetime.now().replace(day=1).date().isoformat()
        
        # Primero intentamos obtener el registro actual para hacer el incremento manual si upsert no soporta increment
        # Pero Supabase/Postgres permite RPC o simplemente upsert con columnas calculadas
        # Para simplificar, usaremos una función RPC en el futuro o un upsert aquí
        
        # Obtener valor actual
        res = client.table('api_usage_stats').select('calls_count, estimated_cost_usd').eq('month', current_month).eq('provider', provider).eq('sku', sku).execute()
        
        if res.data:
            curr = res.data[0]
            new_calls = curr['calls_count'] + 1
            new_cost = float(curr['estimated_cost_usd']) + cost_usd
            
            client.table('api_usage_stats').update({
                'calls_count': new_calls,
                'estimated_cost_usd': new_cost,
                'last_update': datetime.now().isoformat()
            }).eq('month', current_month).eq('provider', provider).eq('sku', sku).execute()
        else:
            client.table('api_usage_stats').insert({
                'month': current_month,
                'provider': provider,
                'sku': sku,
                'calls_count': 1,
                'estimated_cost_usd': cost_usd,
                'last_update': datetime.now().isoformat()
            }).execute()
            
        return True
    except Exception as e:
        logger.error(f"Error incrementando uso de API: {e}")
        return False

def get_current_month_usage() -> float:
    """Retorna el costo estimado total del mes actual en USD"""
    client = get_supabase()
    if not client:
        return 0.0
        
    try:
        current_month = datetime.now().replace(day=1).date().isoformat()
        # Nota: En Postgres el tipo DATE se compara bien con string ISO 'YYYY-MM-DD'
        res = client.table('api_usage_stats').select('estimated_cost_usd').eq('month', current_month).execute()
        
        total = sum([float(item.get('estimated_cost_usd', 0)) for item in res.data])
        return total
    except Exception as e:
        logger.error(f"Error obteniendo uso mensual: {e}")
        return 0.0

def log_api_call(
    provider: str,
    endpoint: str,
    cost_usd: float,
    metadata: Dict = {},
    status_code: int = 200,
    duration_ms: int = 0,
    sku: Optional[str] = None
) -> bool:
    """Registra una llamada individual a API en el historial detallado"""
    client = get_supabase_admin()
    if not client:
        return False
        
    try:
        # Intentar obtener user_id del contexto si es posible (not implemented yet globally)
        # Por ahora lo dejamos nulo o lo pasamos en metadata
        user_id = metadata.get('user_id')
        
        data = {
            'provider': provider,
            'endpoint': endpoint,
            'cost_usd': cost_usd,
            'metadata': metadata,
            'status_code': status_code,
            'duration_ms': duration_ms,
            'sku': sku,
            'created_at': datetime.now().isoformat()
        }
        
        if user_id:
            data['user_id'] = user_id
            
        client.table('api_call_logs').insert(data).execute()
        return True
    except Exception as e:
        logger.error(f"Error registrando log de API: {e}")
        return False

def get_api_logs(limit: int = 100, offset: int = 0) -> List[Dict]:
    """Obtiene los logs detallados de API"""
    client = get_supabase_admin()
    if not client:
        return []
        
    try:
        response = client.table('api_call_logs')\
            .select('*')\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        return response.data
    except Exception as e:
        logger.error(f"Error obteniendo logs de API: {e}")
        return []
