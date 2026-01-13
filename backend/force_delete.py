import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ Error: Faltan credenciales en .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def force_delete(email):
    print(f"🔍 Buscando usuario {email}...")
    
    # 1. Buscar ID del usuario en Auth
    user_id = None
    try:
        # Paginación para encontrar el usuario
        page = 1
        found = False
        while not found:
            response = supabase.auth.admin.list_users(page=page, per_page=50)
            users = getattr(response, 'users', []) or response.data if hasattr(response, 'data') else []
            if isinstance(users, dict) and 'users' in users: users = users['users']
            
            if not users:
                break
                
            for u in users:
                u_email = getattr(u, 'email', None) or u.get('email')
                if u_email == email:
                    user_id = getattr(u, 'id', None) or u.get('id')
                    found = True
                    break
            page += 1
            
        if user_id:
            print(f"✅ Usuario encontrado en Auth: {user_id}")
        else:
            print("⚠️ Usuario NO encontrado en Auth (ya estaba borrado o nunca existió)")

    except Exception as e:
        print(f"❌ Error buscando en Auth: {e}")

    # 2. Si tenemos ID, borrar de todo
    if user_id:
        print(f"🗑️ Eliminando usuario {user_id} de Auth...")
        try:
            supabase.auth.admin.delete_user(user_id)
            print("✅ Eliminado de Auth exitosamente")
        except Exception as e:
            print(f"❌ Error eliminando de Auth: {e}")

        print("🗑️ Limpiando tablas públicas (redundancia)...")
        tables = ['search_history', 'saved_companies', 'users']
        for t in tables:
            try:
                supabase.table(t).delete().eq('user_id' if t != 'users' else 'id', user_id).execute()
                print(f"   - Limpiado {t}")
            except Exception as e:
                print(f"   - Error en {t}: {e}")
                
    else:
        # Si no encontramos en Auth, buscar en public.users por email por si quedó huérfano
        print("🔍 Buscando en public.users por si quedó huérfano...")
        try:
            res = supabase.table('users').select('id').eq('email', email).execute()
            if res.data:
                orphan_id = res.data[0]['id']
                print(f"⚠️ Usuario huérfano encontrado en public.users: {orphan_id}")
                supabase.table('users').delete().eq('id', orphan_id).execute()
                print("✅ Usuario huérfano eliminado")
            else:
                print("✅ No quedan rastros en public.users")
        except Exception as e:
            print(f"❌ Error buscando huérfanos: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 backend/force_delete.py <email>")
    else:
        force_delete(sys.argv[1])
