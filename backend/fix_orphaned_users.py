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

def list_all_auth_users():
    """Obtiene todos los usuarios de auth.users usando paginación"""
    users = []
    page = 1
    per_page = 50
    
    while True:
        # Obtener página de usuarios
        result = supabase.auth.admin.list_users(page=page, per_page=per_page)
        if not result or not result.users:
            break
            
        users.extend(result.users)
        page += 1
        
    return users

def main():
    print(f"🔄 Conectando a Supabase ({SUPABASE_URL})...")
    
    # 1. Obtener todos los usuarios de Auth
    print("📥 Obteniendo usuarios de Auth (auth.users)...")
    auth_users = list_all_auth_users()
    print(f"   Total Auth Users: {len(auth_users)}")
    
    # 2. Obtener todos los usuarios de Public (public.users)
    print("📥 Obteniendo usuarios de Public (public.users)...")
    response = supabase.table("users").select("id, email").execute()
    public_users = response.data
    public_user_ids = {u['id'] for u in public_users}
    print(f"   Total Public Users: {len(public_users)}")
    
    # 3. Encontrar huérfanos
    orphans = []
    for user in auth_users:
        if user.id not in public_user_ids:
            orphans.append(user)
            
    print("\n⚠️  USUARIOS HUÉRFANOS ENCONTRADOS (Están en Auth pero NO en Public):")
    if not orphans:
        print("   ✅ Ninguno. Todo sincronizado.")
        return

    for i, u in enumerate(orphans, 1):
        print(f"   {i}. Email: {u.email} | ID: {u.id} | Creado: {u.created_at}")

    # 4. Preguntar si eliminar
    print("\n❓ ¿Quieres ELIMINAR estos usuarios huérfanos para poder volver a crearlos?")
    print("   (Escribe 'DELETE' para confirmar, o cualquier otra cosa para cancelar)")
    confirm = input("   > ")
    
    if confirm.strip().upper() == "DELETE":
        print("\n🗑️  Eliminando usuarios...")
        for u in orphans:
            try:
                supabase.auth.admin.delete_user(u.id)
                print(f"   ✅ Eliminado: {u.email}")
            except Exception as e:
                print(f"   ❌ Error eliminando {u.email}: {e}")
        print("\n✨ Proceso completado.")
    else:
        print("\n❌ Operación cancelada. No se borró nada.")

if __name__ == "__main__":
    main()
