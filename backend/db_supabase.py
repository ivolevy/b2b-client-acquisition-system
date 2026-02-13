"""
Módulo de base de datos conectado a Supabase
Reemplaza la implementación local de SQLite
"""

import os
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import json
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv

# Cargar variables de entorno (asegurando ruta correcta si se inicia desde la raíz)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

logger.info(f"Supabase Init - URL present: {bool(SUPABASE_URL)}, Anon Key: {bool(SUPABASE_ANON_KEY)}, Admin Key: {bool(SUPABASE_SERVICE_ROLE_KEY)}")

_supabase_public_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None

def get_supabase(force_refresh: bool = False) -> Optional[Client]:
    """Obtiene el cliente público de Supabase (respeta RLS) - Singleton con opción de refresh"""
    global _supabase_public_client
    if _supabase_public_client and not force_refresh:
        return _supabase_public_client
        
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        logger.error("Faltan credenciales de Supabase (SUPABASE_URL o SUPABASE_ANON_KEY).")
        return None
        
    try:
        # Usar ClientOptions para mejorar estabilidad y timeouts
        opts = ClientOptions(
            postgrest_client_timeout=20,
            storage_client_timeout=20
        )
        _supabase_public_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY, options=opts)
        logger.info(f"{'🔄 Re-' if force_refresh else '✅ '}Cliente Supabase PÚBLICO inicializado")
        return _supabase_public_client
    except Exception as e:
        logger.error(f"Error inicializando Supabase público: {e}")
        return None

def get_supabase_admin(force_refresh: bool = False) -> Optional[Client]:
    """Obtiene cliente con privilegios de admin (Service Role) - Singleton con opción de refresh"""
    global _supabase_admin_client
    
    if _supabase_admin_client and not force_refresh:
        return _supabase_admin_client

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Falta SUPABASE_SERVICE_ROLE_KEY. Operaciones administrativas limitadas.")
        return None
        
    try:
        # Usar ClientOptions para mejorar estabilidad y timeouts en admin
        opts = ClientOptions(
            postgrest_client_timeout=30,
            storage_client_timeout=30
        )
        if SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SERVICE_ROLE_KEY.startswith("eyJ"):
            # Opcional: Podríamos decodificar el JWT para verificar el role:'service_role'
            pass
            
        _supabase_admin_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, options=opts)
        logger.info(f"{'🔄 Re-' if force_refresh else '🔑 '}Cliente Supabase ADMIN inicializado (Key snippet: {SUPABASE_SERVICE_ROLE_KEY[:10]}...{SUPABASE_SERVICE_ROLE_KEY[-5:]})")
        return _supabase_admin_client
    except Exception as e:
        logger.error(f"Error creando cliente admin: {e}")
        return None

def execute_with_retry(query_factory, is_admin: bool = True, max_retries: int = 3):
    """
    Ejecuta una consulta de Supabase con lógica de reintento para errores de conexión.
    Utiliza un factory para poder regenerar la consulta con un nuevo cliente si es necesario.
    """
    last_exception = None
    for attempt in range(max_retries):
        try:
            # Obtener el cliente actual (admin o público según corresponda)
            client = get_supabase_admin() if is_admin else get_supabase()
            if not client:
                raise Exception("Cliente de Supabase no disponible")
            
            # Construir la query usando el factory y ejecutar
            query = query_factory(client)
            return query.execute()
            
        except Exception as e:
            last_exception = e
            error_str = str(e).lower()
            
            # Lista ampliada de errores de conexión/red detectados
            is_connection_error = any(msg in error_str for msg in [
                "connection", "closed", "disconnected", "broken pipe", "eof", 
                "timeout", "handshake", "remotely closed", "network", "server disconnected",
                "pseudo-header", "trailer"
            ])
            
            if is_connection_error and attempt < max_retries - 1:
                wait_time = (attempt + 1) # 1s, luego 2s... Total wait = 3s. Más seguro para serverless.
                logger.warning(f"⚠️ Error de red/conexión (Intento {attempt + 1}/{max_retries}): {e}. Refrescando cliente y reintentando en {wait_time}s...")
                
                # Forzar refresco del cliente correspondiente
                if is_admin:
                    get_supabase_admin(force_refresh=True)
                else:
                    get_supabase(force_refresh=True)
                    
                import time
                time.sleep(wait_time)
                continue
            
            # Si no es un error de conexión conocido o agotamos reintentos, lanzamos el error
            break
            
    logger.error(f"❌ Error definitivo tras {max_retries} intentos: {last_exception}")
    raise last_exception

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
        if 'plan' in updates: public_updates['plan'] = updates['plan'].lower()
        if 'credits' in updates: 
            try:
                public_updates['credits'] = int(updates['credits'])
            except:
                pass
        
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

def obtener_perfil_usuario(user_id: str) -> Optional[Dict]:
    """Obtiene el perfil público del usuario (nombre, email, etc) desde la tabla public.users"""
    admin = get_supabase_admin()
    
    try:
        result = admin.table('users').select('*').eq('id', user_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Error obteniendo perfil de usuario {user_id}: {e}")
        return None

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
            'google_id': empresa.get('google_id'),
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
        
        # Limpiar claves con valor None
        data_to_insert = {k: v for k, v in data_to_insert.items() if v is not None}

        # Upsert basado en google_id (nuevo estándar)
        response = execute_with_retry(lambda c: c.table('empresas').upsert(data_to_insert, on_conflict='google_id'), is_admin=False)
        
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
        
        response = execute_with_retry(lambda _: query, is_admin=False)
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
        response = execute_with_retry(lambda c: c.table('empresas').select('*').order('created_at', desc=True).limit(1000), is_admin=False)
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
        
        total = execute_with_retry(lambda c: c.table('empresas').select('*', count='exact', head=True), is_admin=False).count
        
        con_email = execute_with_retry(lambda c: c.table('empresas').select('*', count='exact', head=True).eq('email_valido', True), is_admin=False).count
            
        validas = execute_with_retry(lambda c: c.table('empresas').select('*', count='exact', head=True).eq('validada', True), is_admin=False).count

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


# --- EMAIL TEMPLATE FUNCTIONS (Supabase Persistence) ---

def db_get_templates(user_id: str, tipo: Optional[str] = None) -> List[Dict]:
    """Obtiene templates desde la base de datos Supabase filtrados por usuario y tipo"""
    client = get_supabase_admin() # Usar admin para ver templates de sistema + usuario si es necesario
    if not client: return []
    try:
        query = client.table('email_templates').select('*').or_(f"user_id.eq.{user_id},es_default.eq.true")
        if tipo:
            query = query.eq('type', tipo)
        res = query.execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error db_get_templates: {e}")
        return []

def db_create_template(user_id: str, data: Dict) -> str:
    """Crea un nuevo template en la base de datos (Raise exception on error)"""
    client = get_supabase_admin()
    if not client: raise Exception("Error de conexión con base de datos")
    
    insert_data = {
        "user_id": user_id,
        "nombre": data.get('nombre'),
        "subject": data.get('subject'),
        "body_html": data.get('body_html'),
        "body_text": data.get('body_text'),
        "type": data.get('type', 'email'),
        "es_default": False,
        "updated_at": datetime.now().isoformat()
    }
    res = client.table('email_templates').insert(insert_data).execute()
    if res.data:
        return res.data[0]['id']
    raise Exception("No se recibieron datos de la inserción")

def db_update_template(template_id: str, user_id: str, updates: Dict) -> bool:
    """Actualiza un template existente si pertenece al usuario"""
    client = get_supabase_admin()
    if not client: return False
    # Map fields from API/Frontend to DB schema
    db_updates = {}
    for key, value in updates.items():
        if value is not None: # Only update provided non-null fields
            if key == 'name' or key == 'nombre':
                db_updates['nombre'] = value
            else:
                db_updates[key] = value

    db_updates['updated_at'] = datetime.now().isoformat()
    res = client.table('email_templates').update(db_updates).eq('id', template_id).eq('user_id', user_id).execute()
    return bool(res.data)

def db_delete_template(template_id: str, user_id: str) -> bool:
    """Elimina un template si pertenece al usuario"""
    client = get_supabase_admin()
    if not client: return False
    try:
        res = client.table('email_templates').delete().eq('id', template_id).eq('user_id', user_id).execute()
        return True
    except Exception as e:
        logger.error(f"Error db_delete_template: {e}")
        return False

def db_log_email_history(user_id: str, history_data: Dict) -> bool:
    """Registra un envío de email en el historial persistente"""
    client = get_supabase_admin()
    if not client: return False
    try:
        insert_data = {
            "user_id": user_id,
            "empresa_nombre": history_data.get('empresa_nombre'),
            "empresa_email": history_data.get('empresa_email'),
            "template_id": history_data.get('template_id'),
            "subject": history_data.get('subject'),
            "status": history_data.get('status'),
            "error_message": history_data.get('error_message'),
            "sent_at": datetime.now().isoformat()
        }
        res = client.table('email_history').insert(insert_data).execute()
        
        # Sincronizar con el nuevo sistema de comunicaciones (Inbox/Kanban)
        if res.data and history_data.get('status') == 'success':
            try:
                from backend.email_sync_service import get_or_create_conversation, store_message
                
                lead_email = history_data.get('empresa_email')
                subject = history_data.get('subject', '(Sin Asunto)')
                lead_name = history_data.get('empresa_nombre')
                
                # Buscar o crear conversación con estado inicial open (Nuevos Leads)
                conv_id = get_or_create_conversation(user_id, lead_email, subject, lead_name, initial_status='open')
                
                if conv_id:
                    msg_data = {
                        "external_id": f"hist_{res.data[0]['id']}", # ID sintético para historial
                        "sender": "me", # Enviar desde el usuario
                        "recipient": lead_email,
                        "direction": 'outbound',
                        "snippet": subject,
                        "date": datetime.now().isoformat(),
                        "body_html": f"<p>Email enviado vía campaña: {subject}</p>",
                        "channel": "email"
                    }
                    store_message(user_id, conv_id, msg_data)
            except Exception as sync_err:
                logger.error(f"Error sincronizando historial con comunicaciones: {sync_err}")
                
        return bool(res.data)
    except Exception as e:
        logger.error(f"Error db_log_email_history: {e}")
        return False
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

# --- OAUTH TOKEN FUNCTIONS ---

def save_user_oauth_token(user_id: str, provider: str, token_data: Dict):
    """Guarda o actualiza tokens de OAuth para un usuario"""
    admin = get_supabase_admin()
    
    # Preparar datos
    data = {
        'user_id': user_id,
        'provider': provider,
        'access_token': token_data.get('access_token'),
        'refresh_token': token_data.get('refresh_token'),
        'token_expiry': token_data.get('expiry'),
        'token_type': token_data.get('token_type', 'Bearer'),
        'scope': token_data.get('scopes', []),
        'account_email': token_data.get('account_email'),
        'updated_at': datetime.utcnow().isoformat()
    }
    
    try:
        # Usar upsert basado en user_id y provider
        result = admin.table('user_oauth_tokens').upsert(data, on_conflict='user_id,provider').execute()
        return True
    except Exception as e:
        logger.error(f"Error guardando token OAuth: {e}")
        return False

def get_user_oauth_token(user_id: str, provider: str) -> Optional[Dict]:
    """Obtiene tokens de OAuth para un usuario y proveedor"""
    admin = get_supabase_admin()
    
    try:
        result = admin.table('user_oauth_tokens')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('provider', provider)\
            .execute()
            
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Error obteniendo token OAuth: {e}")
        return None

def get_all_user_oauth_tokens(user_id: str) -> List[Dict]:
    """Obtiene todos los tokens de OAuth para un usuario"""
    admin = get_supabase_admin()
    
    try:
        result = admin.table('user_oauth_tokens')\
            .select('*')\
            .eq('user_id', user_id)\
            .execute()
            
        return result.data or []
    except Exception as e:
        logger.error(f"Error obteniendo todos los tokens OAuth: {e}")
        return []

def delete_user_oauth_token(user_id: str, provider: str):
    """Elimina tokens de OAuth para un usuario y proveedor"""
    admin = get_supabase_admin()
    
    try:
        admin.table('user_oauth_tokens')\
            .delete()\
            .eq('user_id', user_id)\
            .eq('provider', provider)\
            .execute()
        return True
    except Exception as e:
        logger.error(f"Error eliminando token OAuth: {e}")
        return False


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
        res = execute_with_retry(lambda c: c.table('api_usage_stats').select('calls_count, estimated_cost_usd').eq('month', current_month).eq('provider', provider).eq('sku', sku))
        
        if res.data:
            curr = res.data[0]
            new_calls = curr['calls_count'] + 1
            new_cost = float(curr['estimated_cost_usd']) + cost_usd
            
            execute_with_retry(lambda c: c.table('api_usage_stats').update({
                'calls_count': new_calls,
                'estimated_cost_usd': new_cost,
                'last_update': datetime.now().isoformat()
            }).eq('month', current_month).eq('provider', provider).eq('sku', sku))
        else:
            execute_with_retry(lambda c: c.table('api_usage_stats').insert({
                'month': current_month,
                'provider': provider,
                'sku': sku,
                'calls_count': 1,
                'estimated_cost_usd': cost_usd,
                'last_update': datetime.now().isoformat()
            }))
            
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
        # Usar admin para evitar RLS en estadísticas de uso
        current_month = datetime.now().replace(day=1).date().isoformat()
        res = execute_with_retry(lambda c: c.table('api_usage_stats').select('estimated_cost_usd').eq('month', current_month), is_admin=True)
        
        total = sum([float(item.get('estimated_cost_usd', 0)) for item in res.data])
        return total
    except Exception as e:
        logger.error(f"Error obteniendo uso mensual: {e}")
        return 0.0

async def registrar_pago_exitoso(
    user_id: str, 
    plan_id: str, 
    amount: float, 
    external_id: str, 
    email: str = None, 
    name: str = None, 
    phone: str = None,
    payment_method_id: str = None,
    payment_type_id: str = None,
    net_amount: float = None,
    fee_details: Any = None
):
    """
    Registra el pago, acredita puntos y CREA el usuario si no existe.
    """
    try:
        admin_client = get_supabase_admin()
        if not admin_client:
            logger.error("No se pudo obtener el cliente admin")
            return False
            
        final_user_id = user_id
        is_new_user = False
        
        logger.info(f"Procesando pago exitoso (INICIO): user_id={user_id}, email={email}, amount={amount}, method={payment_method_id}, ext_id={external_id}")

        # 0. Deduplicación: Verificar si el pago ya fue procesado
        try:
            existing_payment = admin_client.table("payments").select("id").eq("external_id", str(external_id)).execute()
            if existing_payment.data:
                logger.info(f"Pago ya procesado anteriormente (idempotencia): {external_id}. Ignorando.")
                return True
        except Exception as e:
            logger.error(f"Error verificando duplicados: {e}")
            # Continuamos por seguridad, el constraint de la DB fallará si es duplicado real
            # Buscar por email
            # El list_users de gotrue-python por defecto es paginado
            user_auth_res = admin_client.auth.admin.list_users()
            # list_users returns a list of users directly in some versions, or an object in others.
            # Usually it's a list.
            existing_auth_user = None
            if isinstance(user_auth_res, list):
                existing_auth_user = next((u for u in user_auth_res if u.email == email), None)
            
            if existing_auth_user:
                final_user_id = existing_auth_user.id
                logger.info(f"Usuario existente encontrado en Auth: {final_user_id}")
                if not getattr(existing_auth_user, 'last_sign_in_at', None):
                    logger.info("Usuario existente pero sin login previo. Se considerará como NUEVO.")
                    is_new_user = True
            else:
                # Intentar crear
                import secrets
                import string
                temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
                
                try:
                    logger.info(f"Intentando crear usuario Auth para {email}...")
                    new_user_res = admin_client.auth.admin.create_user({
                        "email": email,
                        "password": temp_password,
                        "email_confirm": True,
                        "user_metadata": {"full_name": name, "phone": phone}
                    })
                    
                    if hasattr(new_user_res, 'user') and new_user_res.user:
                        final_user_id = new_user_res.user.id
                        is_new_user = True
                        logger.info(f"Usuario Auth creado con ID: {final_user_id}")
                    else:
                        # Si falló, intentar buscar una última vez por si se creó entre medio o el error es "email taken"
                        logger.warning(f"Respuesta inesperada al crear usuario: {new_user_res}. Buscando de nuevo...")
                        user_auth_res_retry = admin_client.auth.admin.list_users()
                        existing_retry = next((u for u in user_auth_res_retry if u.email == email), None)
                        if existing_retry:
                            final_user_id = existing_retry.id
                            logger.info(f"Usuario encontrado después de fallo en creación: {final_user_id}")
                        else:
                            logger.error(f"No se pudo crear ni encontrar el usuario para {email}")
                            # NO RETORNAMOS FALSE AQUÍ. Procederemos con final_user_id = user_id (que puede ser anonymous)
                            # para al menos guardar el pago.
                except Exception as auth_err:
                    logger.error(f"Excepción creando usuario Auth: {auth_err}")
                    # Verificar si el error es de usuario ya existente
                    if "already" in str(auth_err).lower():
                        user_auth_res_retry = admin_client.auth.admin.list_users()
                        existing_retry = next((u for u in user_auth_res_retry if u.email == email), None)
                        if existing_retry:
                            final_user_id = existing_retry.id
                            logger.info(f"Usuario recuperado tras conflicto: {final_user_id}")
        
        logger.info(f"PASO 2: Sincronizando usuario {final_user_id} en public.users (is_new_user={is_new_user})")

        # 2. Sincronizar con public.users (UPSERT)
        # Normalizar plan_id (frontend envía 'pro', backend usa 'growth'/'scale')
        # Mapeo: starter->starter, pro->growth, agency->scale, credits_XXX->credits
        normalized_plan = plan_id.lower()
        is_credit_pack = normalized_plan.startswith("credits_")
        
        if normalized_plan == 'pro': normalized_plan = 'growth'
        if normalized_plan == 'agency': normalized_plan = 'scale'

        upsert_data = {
            "id": final_user_id,
            "email": email,
            "name": name or email.split('@')[0],
            "phone": phone,
            "plan": normalized_plan,
            "subscription_status": "active",
            "next_credit_reset": (datetime.now() + timedelta(days=30)).date().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Obtener créditos actuales si existe
        user_res = admin_client.table("users").select("credits, extra_credits").eq("id", final_user_id).execute()
        current_credits = 0
        current_extra = 0
        if user_res.data:
            current_credits = user_res.data[0].get("credits", 0) or 0
            current_extra = user_res.data[0].get("extra_credits", 0) or 0
            
        if is_credit_pack:
            try:
                # Extraer monto de credits_1000 -> 1000
                credits_to_add = int(normalized_plan.split('_')[1])
                logger.info(f"Detectado Pack de Créditos: añadiendo {credits_to_add} créditos a extra_credits")
                
                # Para packs, sumamos a extra_credits, NO tocamos credits (mensuales)
                upsert_data["extra_credits"] = current_extra + credits_to_add
                # Mantenemos los créditos mensuales actuales
                upsert_data["credits"] = current_credits
                
                # Asegurar que el plan se mantenga (ver abajo)
            except:
                logger.error(f"Error parseando pack de créditos: {normalized_plan}")
                upsert_data["credits"] = current_credits
                upsert_data["extra_credits"] = current_extra
        else:
            # Si es un PLAN (subscription), reseteamos los créditos MENSUALES al valor del plan
            # Y mantenemos los extra_credits
            credits_map = {'starter': 1500, 'growth': 3000, 'scale': 10000}
            credits_to_add = credits_map.get(normalized_plan, 0)
            upsert_data["credits"] = credits_to_add
            upsert_data["extra_credits"] = current_extra
        
        # Si es pack de créditos, NO cambiar el plan actual del usuario si ya tiene uno
        # Si no tiene plan (anonymous o nuevo), ponerle 'free' o similar
        if is_credit_pack:
            # Obtener plan actual para no sobreescribirlo
            res_plan = admin_client.table("users").select("plan").eq("id", final_user_id).execute()
            if res_plan.data and res_plan.data[0].get("plan"):
                upsert_data["plan"] = res_plan.data[0]["plan"]
            else:
                upsert_data["plan"] = "free"
        
        try:
            logger.info(f"Sincronizando public.users para {final_user_id} (Plan: {normalized_plan})")
            admin_client.table("users").upsert(upsert_data).execute()
            
            # --- VERIFICACIÓN DE SEGURIDAD (Verify-After-Write) ---
            # Consultar inmediatamente si el cambio se aplicó
            verification = admin_client.table("users").select("plan, credits").eq("id", final_user_id).execute()
            if verification.data:
                saved_plan = verification.data[0].get("plan")
                if saved_plan != normalized_plan and not is_credit_pack: # Si es credit pack, el plan no cambia necesariamente
                    logger.critical(f"⚠️ ALERTA CRÍTICA: El plan no se actualizó correctamente. Esperado: {normalized_plan}, Actual: {saved_plan}. Reintentando...")
                    
                    # Reintento forzado
                    admin_client.table("users").update({"plan": normalized_plan, "updated_at": datetime.now().isoformat()}).eq("id", final_user_id).execute()
                    
                    # Segunda verificación
                    verif_2 = admin_client.table("users").select("plan").eq("id", final_user_id).execute()
                    if verif_2.data and verif_2.data[0].get("plan") == normalized_plan:
                         logger.info("✅ Recuperación exitosa: Plan actualizado en el segundo intento.")
                    else:
                         logger.critical(f"❌ ERROR FATAL: No se pudo actualizar el plan tras dos intentos para usuario {final_user_id}")
            # -----------------------------------------------------

        except Exception as upsert_err:
            logger.error(f"Error sincronizando perfil en public.users: {upsert_err}")
            # Continuamos para al menos guardar el pago

        # 3. Registrar Pago
        payment_record = {
            "user_id": final_user_id,
            "user_email": email, # Nuevo campo para persistencia post-borrado
            "amount": float(amount),
            "platform": "mercadopago",
            "external_id": str(external_id),
            "status": "approved",
            "plan_id": normalized_plan,
            "currency": "ARS",
            "payment_method_id": payment_method_id,
            "payment_type_id": payment_type_id,
            "net_amount": float(net_amount) if net_amount is not None else None,
            "fee_details": fee_details
        }
        
        admin_client.table("payments").insert(payment_record).execute()
        
        # 4. Enviar email de confirmación
        logger.info(f"PASO 4: Preparando email de confirmación. is_new_user={is_new_user}")
        try:
            frontend_url = os.getenv("FRONTEND_URL", "https://b2b-client-acquisition-system.vercel.app")
            recovery_link = None
            
            if is_new_user:
                # Generamos link de recuperación sólo para nuevos usuarios
                recovery_res = admin_client.auth.admin.generate_link({
                    "type": "recovery",
                    "email": email,
                    "options": {
                        "redirect_to": f"{frontend_url}/set-password"
                    }
                })
                recovery_link = recovery_res.properties.action_link
                subject = "¡Bienvenido! Activá tu cuenta"
            else:
                if is_credit_pack:
                    subject = "¡Créditos Acreditados!"
                else:
                    subject = f"Confirmación de Compra: Plan {plan_id.capitalize()}"

            # Construir contenido del mail
            if is_new_user:
                content = f"""
                Hola {name or 'cliente'},
                
                ¡Gracias por tu compra! Tu suscripción al <strong>Plan {plan_id.capitalize()}</strong> ya está activa y hemos acreditado {credits_to_add} créditos en tu cuenta.
                
                Para empezar a usar la plataforma, por favor hacé click en el siguiente botón para establecer tu contraseña:
                
                <div style="margin: 30px 0; text-align: center;">
                    <a href="{recovery_link}" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                        Establecer mi Contraseña
                    </a>
                </div>
                
                Si el botón no funciona, podés copiar y pegar este link en tu navegador:
                <br/>
                {recovery_link}
                """
            else:
                if is_credit_pack:
                    content = f"""
                    Hola {name or 'cliente'},
                    
                    ¡Tu compra ha sido exitosa! Hemos acreditado <strong>{credits_to_add} créditos</strong> extra en tu cuenta.
                    
                    Tu balance de créditos se ha actualizado automáticamente. Ya podés seguir realizando búsquedas y extrayendo leads.
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{frontend_url}/profile" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                            Ver mi Perfil y Créditos
                        </a>
                    </div>
                    """
                else:
                    content = f"""
                    Hola {name or 'cliente'},
                    
                    ¡Gracias por confiar en nosotros! Tu suscripción al <strong>Plan {plan_id.capitalize()}</strong> ha sido procesada exitosamente.
                    
                    Hemos acreditado {credits_to_add} créditos en tu cuenta y habilitado las funciones correspondientes a tu nuevo plan.
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{frontend_url}/profile" style="background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                            Ir a mi Dashboard
                        </a>
                    </div>
                    """

            content += "\n¡Estamos emocionados de tenerte con nosotros!"
            
            try:
                from backend.email_service import enviar_email, wrap_premium_template
            except ImportError:
                from email_service import enviar_email, wrap_premium_template
                
            html_body = wrap_premium_template(content, "Ivan Levy", "solutionsdota@gmail.com")
            
            res_email = enviar_email(
                destinatario=email,
                asunto=subject,
                cuerpo_html=html_body,
                cuerpo_texto=content.replace('<br/>', '\n'),
                user_id=None
            )
            
            # LOG STATUS...
            try:
                admin = get_supabase_admin()
                if admin:
                    admin.table("debug_logs").insert({
                        "event_name": "EMAIL_SENT_STATUS",
                        "payload": {"email": email, "success": res_email.get('success'), "is_new": is_new_user}
                    }).execute()
            except: pass

            if res_email.get('success'):
                logger.info(f"✅ Email de confirmación enviado a {email}")
            else:
                logger.error(f"❌ Falló envío de email a {email}")

        except Exception as e:
            logger.error(f"❌ Error en flujo de email: {e}")
            # LOG TO SUPABASE
            try:
                admin = get_supabase_admin()
                if admin:
                    admin.table("debug_logs").insert({
                        "event_name": "EMAIL_EXCEPTION",
                        "payload": {"error": str(e), "email": email}
                    }).execute()
            except:
                pass

        logger.info(f"✅ Proceso completado exitosamente para {email}")
        return True
    except Exception as e:
        logger.error(f"❌ Error crítico en registrar_pago_exitoso: {e}", exc_info=True)
        # LOG TO SUPABASE
        try:
            admin = get_supabase_admin()
            if admin:
                admin.table("debug_logs").insert({
                    "event_name": "CRITICAL_PAYMENT_ERROR",
                    "payload": {"error": str(e)}
                }).execute()
        except:
            pass
        return False

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
            
        execute_with_retry(lambda c: c.table('api_call_logs').insert(data), is_admin=True)
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
        response = execute_with_retry(lambda c: c.table('api_call_logs')\
            .select('*')\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1), is_admin=False)
        return response.data
    except Exception as e:
        logger.error(f"Error obteniendo logs de API: {e}")
        return []

# --- CREDIT MANAGEMENT FUNCTIONS ---

def get_user_credits(user_id: str) -> Dict:
    """Obtiene créditos actuales y fecha de próximo reset"""
    client = get_supabase_admin()
    if not client or not user_id:
        return {"credits": 0, "next_reset": None}
        
    try:
        res = execute_with_retry(lambda c: c.table('users').select('credits, extra_credits, next_credit_reset, plan, subscription_status').eq('id', user_id), is_admin=True)
        if res.data:
            user_data = res.data[0]
            plan_id = user_data.get('plan', 'starter')
            credits_map = {'starter': 1500, 'growth': 3000, 'scale': 10000}
            total_plan_credits = credits_map.get((plan_id or 'starter').lower(), 1500)
            
            monthly_credits = user_data.get('credits', 0)
            extra_credits = user_data.get('extra_credits', 0) or 0
            
            # Frontend expects "credits" to be the available balance
            # We return total available as "credits" for backward compatibility,
            # but also send broken down values for UI enhancements
            return {
                "credits": monthly_credits + extra_credits, # Total available
                "monthly_credits": monthly_credits,
                "extra_credits": extra_credits,
                "next_reset": user_data.get('next_credit_reset'),
                "total_credits": total_plan_credits, # This is the plan limit
                "plan": plan_id,
                "subscription_status": user_data.get('subscription_status', 'active')
            }
        return {"credits": 0, "next_reset": None, "total_credits": 1500, "plan": "starter", "subscription_status": "inactive"}
    except Exception as e:
        logger.error(f"Error obteniendo créditos para {user_id}: {e}")
        return {"credits": 0, "next_reset": None}

def deduct_credits(user_id: str, amount: int) -> Dict:
    """Deduce créditos del usuario (usando mensuales primero, luego extra)"""
    client = get_supabase_admin()
    if not client or not user_id:
        return {"success": False, "error": "No hay cliente o user_id"}
        
    try:
        # 1. Obtener créditos actuales (Usar admin para asegurar acceso)
        res = execute_with_retry(lambda c: c.table('users').select('credits, extra_credits').eq('id', user_id), is_admin=True)
        if not res.data:
            return {"success": False, "error": "Usuario no encontrado"}
            
        user_data = res.data[0]
        monthly = user_data.get('credits', 0) or 0
        extra = user_data.get('extra_credits', 0) or 0
        
        if (monthly + extra) < amount:
            return {"success": False, "error": "Créditos insuficientes", "current": monthly + extra}
            
        # 2. Descontar con lógica de prioridad (mensuales primero)
        new_monthly = monthly
        new_extra = extra
        
        if monthly >= amount:
            new_monthly = monthly - amount
        else:
            # Consumir todos los mensuales y el resto de extra
            remainder = amount - monthly
            new_monthly = 0
            new_extra = extra - remainder
            
        # 3. Actualizar DB
        execute_with_retry(lambda c: c.table('users').update({
            "credits": new_monthly,
            "extra_credits": new_extra
        }).eq('id', user_id), is_admin=True)
        
        logger.info(f"🪙 Créditos deducidos para {user_id}: -{amount} (M:{monthly}->{new_monthly}, E:{extra}->{new_extra})")
        return {"success": True, "new_balance": new_monthly + new_extra}
    except Exception as e:
        error_str = str(e).lower()
        if "42501" in error_str or "policy" in error_str:
            logger.error(f"⚠️ Error de RLS en deduct_credits para {user_id}: {e}. Permitiendo acceso por falla técnica.")
            return {"success": True, "new_balance": 0, "warning": "RLS_PERMISSION_ERROR"}
        
        logger.error(f"Error deduciendo créditos para {user_id}: {e}")
        return {"success": False, "error": str(e)}

def check_reset_monthly_credits(user_id: str) -> bool:
    """Verifica si corresponde resetear los créditos (billing cycle)"""
    client = get_supabase_admin()
    if not client or not user_id:
        return False
        
    try:
        # Usar execute_with_retry con admin para asegurar acceso
        res = execute_with_retry(lambda c: c.table('users').select('next_credit_reset').eq('id', user_id), is_admin=True)
        if not res.data:
            return False
            
        next_reset_str = res.data[0].get('next_credit_reset')
        if not next_reset_str:
            return False
            
        next_reset = datetime.strptime(next_reset_str, '%Y-%m-%d').date()
        today = datetime.now().date()
        
        if today >= next_reset:
            logger.info(f"🔄 Reseteando créditos para {user_id} (Billing cycle reach: {next_reset})")
            
            # Obtener plan para saber cuánto resetear (Admin para asegurar acceso)
            user_res = execute_with_retry(lambda c: c.table('users').select('plan').eq('id', user_id), is_admin=True)
            plan_id = user_res.data[0].get('plan', 'starter') if user_res.data else 'starter'
            credits_map = {'starter': 1500, 'growth': 3000, 'scale': 10000}
            reset_amount = credits_map.get((plan_id or 'starter').lower(), 1500)
            
            # Reset y nueva fecha (hoy + 30 días)
            new_reset = (today + timedelta(days=30)).isoformat()
            execute_with_retry(lambda c: c.table('users').update({
                "credits": reset_amount,
                "next_credit_reset": new_reset,
                "subscription_status": "active"
            }).eq('id', user_id), is_admin=True)
            
            return True
        return False
    except Exception as e:
        logger.error(f"Error verificando reset de créditos para {user_id}: {e}")
        return False

def cancel_user_plan(user_id: str) -> bool:
    """Cancela el plan del usuario (subscription_status = 'cancelled')"""
    client = get_supabase_admin()
    if not client or not user_id:
        return False

    try:
        logger.info(f"🚫 Cancelando plan para usuario {user_id}")
        
        # Actualizar estado a cancelled
        execute_with_retry(lambda c: c.table('users').update({
            "subscription_status": "cancelled",
            "credits": 0  # Zero out credits upon cancellation
            # Opcional: Podríamos borrar next_credit_reset si queremos que no se renueve más ni siquiera al final del ciclo
            # "next_credit_reset": None 
        }).eq('id', user_id))
        
        return True
    except Exception as e:
        logger.error(f"Error cancelando plan para {user_id}: {e}")
        return False
