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
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

# Cliente global
_supabase_client: Optional[Client] = None

def get_supabase() -> Optional[Client]:
    """Obtiene o inicializa el cliente de Supabase"""
    global _supabase_client
    
    if _supabase_client:
        return _supabase_client
        
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Faltan credenciales de Supabase (SUPABASE_URL o SUPABASE_KEY)")
        return None
        
    try:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return _supabase_client
    except Exception as e:
        logger.error(f"Error conectando a Supabase: {e}")
        return None

# Intentar obtener Service Role Key para operaciones administrativas
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_supabase_admin() -> Optional[Client]:
    """Obtiene cliente con privilegios de admin (Service Role)"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Falta SUPABASE_SERVICE_ROLE_KEY. Operaciones administrativas limitadas.")
        return None
        
    try:
        return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
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
        
        # response suele ser un objeto User o similar en la librería python
        # Dependiendo de la versión, puede devolver un objeto con .user o ser el user directamente
        # Probaremos asumiendo la estructura estándar de gotrue-py
        
        return {"data": response, "error": None}
        
    except Exception as e:
        logger.error(f"Error creando usuario admin: {e}")
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
        if 'plan' in updates: public_updates['plan'] = updates['plan']
        if 'role' in updates: public_updates['role'] = updates['role']
        if 'name' in updates: public_updates['name'] = updates['name']
        if 'phone' in updates: public_updates['phone'] = updates['phone']
        if 'plan_expires_at' in updates: public_updates['plan_expires_at'] = updates['plan_expires_at']
        
        # 2. Actualizar Auth si es necesario
        if auth_updates:
            admin_client.auth.admin.update_user_by_id(user_id, auth_updates)
            
        # 3. Actualizar Public Profile
        if public_updates:
            public_updates['updated_at'] = datetime.now().isoformat()
            admin_client.table('users').update(public_updates).eq('id', user_id).execute()
            
        # 4. Manejar Suscripciones si cambió el plan
        # Si cambiamos a PRO, asegurarnos de que exista una suscripción activa
        if updates.get('plan') == 'pro':
             # Verificar si ya tiene suscripción
             current_sub = admin_client.table('subscriptions').select('*').eq('user_id', user_id).eq('status', 'active').execute()
             
             expires_at = updates.get('plan_expires_at') or (datetime.now() + 365*24*3600).isoformat() # Default 1 año si no se especifica
             
             if not current_sub.data:
                 # Crear nueva suscripción
                 admin_client.table('subscriptions').insert({
                     'user_id': user_id,
                     'plan': 'pro',
                     'status': 'active',
                     'payment_method': 'manual',
                     'expires_at': expires_at
                 }).execute()
             else:
                 # Actualizar existente
                 sub_id = current_sub.data[0]['id']
                 admin_client.table('subscriptions').update({
                     'plan': 'pro',
                     'status': 'active',
                     'expires_at': expires_at
                 }).eq('id', sub_id).execute()
                 
            
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
            writer = csv.DictWriter(csvfile, fieldnames=campos, extrasaction='ignore')
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

def activar_suscripcion_con_codigo(user_id: str, codigo: str) -> dict:
    """
    Activa una suscripción PRO usando un código promocional.
    Valida el código en la tabla 'promo_codes' y actualiza el usuario.
    """
    from datetime import timedelta  # Fix: Import timedelta explicitly

    if not SUPABASE_SERVICE_ROLE_KEY:
        return {"success": False, "error": "Error de configuración del servidor (falta service key)"}
    
    admin_client = get_supabase_admin()
    if not admin_client:
        return {"success": False, "error": "Error conectando a Supabase Admin"}

    try:
        valid_code = False
        duration_days = 30
        
        # 1. Intentar buscar en tabla promo_codes
        try:
            # Consultar tabla promo_codes
            response_code = admin_client.table("promo_codes")\
                .select("*")\
                .eq("code", codigo)\
                .eq("is_active", True)\
                .execute()
                
            if response_code.data and len(response_code.data) > 0:
                code_data = response_code.data[0]
                valid_code = True
                duration_days = code_data.get('duration_days', 30)
                
                # Incrementar uso
                try:
                    admin_client.table("promo_codes")\
                        .update({"used_count": code_data.get('used_count', 0) + 1})\
                        .eq("id", code_data['id'])\
                        .execute()
                except Exception as e_update:
                    print(f"Advertencia: No se pudo actualizar contador de uso: {e_update}")

        except Exception as e_db:
            # Si falla la consulta a la DB (ej: tabla no existe), no romper todo,
            # intentar con códigos hardcoded
            print(f"Advertencia: Error consultando promo_codes (posiblemente tabla no existe): {e_db}")

        # 2. Fallback: Códigos hardcoded
        if not valid_code:
            # Códigos de emergencia/demo
            if codigo in ["PRO2024", "DEMO2024", "AAA111"]:
                valid_code = True
                duration_days = 365 # 1 año para estos códigos
            
        if not valid_code:
            return {"success": False, "error": "Código promocional inválido o expirado"}
            
        # 3. Calcular expiración
        expires_at = (datetime.now() + timedelta(days=duration_days)).isoformat()
        
        # 4. Actualizar usuario
        try:
            update_response = admin_client.table("users")\
                .update({
                    "plan": "pro",
                    "plan_expires_at": expires_at,
                    "updated_at": datetime.now().isoformat()
                })\
                .eq("id", user_id)\
                .execute()
        except Exception as e_user:
             return {"success": False, "error": f"Error actualizando usuario: {str(e_user)}"}
            
        # 5. Crear registro en subscriptions (opcional)
        try:
            admin_client.table("subscriptions").insert({
                "user_id": user_id,
                "plan": "pro",
                "status": "active",
                "payment_method": "token",
                "payment_reference": codigo,
                "expires_at": expires_at
            }).execute()
        except Exception as e:
            print(f"Advertencia: No se pudo crear registro en subscriptions: {e}")
            
        return {
            "success": True, 
            "expires_at": expires_at,
            "message": "Plan PRO activado exitosamente"
        }
        
    except Exception as e:
        print(f"Error activando suscripción: {e}")
        return {"success": False, "error": f"Error al procesar activación: {str(e)}"}

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
            'subscriptions',
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

def get_user_rubros(user_id: str) -> List[str]:
    """Obtiene las claves de rubros activos para un usuario"""
    client = get_supabase()
    if not client or not user_id:
        return []
        
    try:
        response = client.table('user_rubros')\
            .select('rubro_key')\
            .eq('user_id', user_id)\
            .eq('is_active', True)\
            .execute()
            
        return [row['rubro_key'] for row in response.data]
    except Exception as e:
        logger.error(f"Error obteniendo rubros de usuario {user_id}: {e}")
        return []

def save_user_rubros(user_id: str, rubro_keys: List[str]) -> bool:
    """Guarda la selección de rubros de un usuario"""
    admin_client = get_supabase_admin()
    if not admin_client or not user_id:
        return False
        
    try:
        # 1. Marcar todos como inactivos primero (enfoque simple)
        # O borrar y reinsertar. Upsert es mejor si queremos mantener timestamps.
        
        # Primero borramos los anteriores del usuario (limpieza total)
        admin_client.table('user_rubros').delete().eq('user_id', user_id).execute()
        
        if not rubro_keys:
            return True
            
        # 2. Insertar los nuevos
        data_to_insert = [
            {'user_id': user_id, 'rubro_key': key, 'is_active': True}
            for key in rubro_keys
        ]
        
        admin_client.table('user_rubros').insert(data_to_insert).execute()
        return True
    except Exception as e:
        logger.error(f"Error guardando rubros para usuario {user_id}: {e}")
        return False
