import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Cargar variables de entorno
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ Error: Faltan credenciales SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env")
    sys.exit(1)

# Inicializar cliente admin
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def check_user(email):
    print(f"🔍 Buscando usuario: {email}")
    
    try:
        # Obtener lista de usuarios (filtrar por email si es posible, o iterar)
        # La API de admin list_users no tiene filtro de email directo público en todas las versiones,
        # pero podemos iterar o usar get_user_by_id si tuviéramos el ID.
        # Intentaremos list_users y buscar.
        
        found = False
        page = 1
        while True:
            response = supabase.auth.admin.list_users(page=page, per_page=50)
            
            # Manejar diferentes versiones de la librería
            if hasattr(response, 'users'):
                users = response.users
            elif isinstance(response, list):
                users = response
            else:
                 # Intentar obtener de diccionario si fuera el caso
                 users = getattr(response, 'data', []) or []
            
            if not users:
                break
                
            for user in users:
                if user.email == email:
                    print("\n✅ USUARIO ENCONTRADO EN AUTH:")
                    print(f"   ID: {user.id}")
                    print(f"   Email: {user.email}")
                    print(f"   Email Confirmed At: {user.email_confirmed_at}")
                    print(f"   Created At: {user.created_at}")
                    print(f"   Last Sign In: {user.last_sign_in_at}")
                    print(f"   Role: {user.role}")
                    print(f"   App Metadata: {user.app_metadata}")
                    print(f"   User Metadata: {user.user_metadata}")
                    print(f"   Phone: {user.phone}")
                    print(f"   Banned: {user.banned_until}")
                    found = True
                    return user
            
            page += 1
            
        if not found:
            print("\n❌ Usuario NO encontrado en Auth.")
            return None

    except Exception as e:
        print(f"\n❌ Error buscando usuario: {e}")
        return None

if __name__ == "__main__":
    target_email = "ivo.levy03@gmail.com"
    user = check_user(target_email)
    
    if user:
         # Check if in public.users
        try:
            response = supabase.table("users").select("*").eq("id", user.id).execute()
            if response.data:
                print("\n✅ Usuario encontrado en public.users")
            else:
                print("\n⚠️  Usuario NO encontrado en public.users (Huérfano)")
        except Exception as e:
            print(f"Error checking public table: {e}")
