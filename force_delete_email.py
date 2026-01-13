
import os
import sys
import logging
from dotenv import load_dotenv
from supabase import create_client

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv(dotenv_path='backend/.env')

# Obtener credenciales
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    logger.error("❌ Faltan credenciales: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en backend/.env")
    sys.exit(1)

def force_delete_user_by_email(email):
    """
    Busca un usuario por email y lo elimina de auth.users usando Service Role.
    """
    logger.info(f"🔍 Buscando usuario con email: {email}")
    
    try:
        # 1. Crear cliente con privilegios de Admin
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # 2. Listar usuarios (Supabase no tiene get_user_by_email directo en admin API público a veces, así que buscamos)
        # Nota: list_users devuelve una página de usuarios. Si hay muchos, esto podría no encontrarlo, 
        # pero para debugging suele servir.
        response = supabase.auth.admin.list_users()
        
        target_user = None
        
        # Manejar la respuesta que puede ser objeto o lista
        users = []
        if isinstance(response, list):
            users = response
        elif hasattr(response, 'users'):
            users = response.users
        elif isinstance(response, dict) and 'users' in response:
            users = response['users']
            
        logger.info(f"📋 Total usuarios encontrados en primera página: {len(users)}")
            
        for user in users:
            # El objeto user puede ser dict o objeto
            u_email = user.email if hasattr(user, 'email') else user.get('email')
            u_id = user.id if hasattr(user, 'id') else user.get('id')
            
            if u_email == email:
                target_user = user
                logger.info(f"✅ Usuario encontrado: ID={u_id}")
                break
        
        if not target_user:
            logger.error(f"❌ No se encontró ningún usuario con el email {email} en la lista de auth.")
            logger.info("Intenta verificar si el email está escrito correctamente.")
            return False

        user_id = target_user.id if hasattr(target_user, 'id') else target_user.get('id')
        
        # 3. Eliminar usuario
        logger.info(f"🗑️ Eliminando usuario {user_id} de Auth...")
        delete_response = supabase.auth.admin.delete_user(user_id)
        
        logger.info("✅ Usuario eliminado exitosamente de Auth.")
        logger.info("Ahora deberías poder volver a crearlo o registrarlo.")
        return True

    except Exception as e:
        logger.error(f"❌ Error crítico: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("\nUso: python force_delete_email.py <email_a_eliminar>")
        print("Ejemplo: python force_delete_email.py usuario@ejemplo.com\n")
        sys.exit(1)
        
    email_to_delete = sys.argv[1]
    force_delete_user_by_email(email_to_delete)
