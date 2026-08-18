import os
import sys

# Add the current directory to python path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db_supabase import get_supabase_admin

def give_access_to_user(email: str):
    admin = get_supabase_admin()
    if not admin:
        print("Error: No se pudo conectar a Supabase. Asegúrate de tener configurado SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en backend/.env")
        return

    print(f"Buscando al usuario con email: {email}...")
    
    try:
        # Buscar el usuario por email
        res = admin.table('users').select('*').eq('email', email).execute()
        
        if not res.data or len(res.data) == 0:
            print(f"Error: No se encontró al usuario con email {email} en la tabla 'users'.")
            print("El usuario debe registrarse primero en la plataforma antes de poder darle acceso.")
            return
            
        user = res.data[0]
        user_id = user['id']
        print(f"Usuario encontrado! ID: {user_id}")
        
        # Actualizar el usuario con plan scale, muchos créditos y estado activo
        updates = {
            'plan': 'scale',
            'subscription_status': 'active',
            'credits': 1000000,
            'extra_credits': 1000000
        }
        
        print("Otorgando acceso total y créditos infinitos...")
        
        # Usamos update normal de supabase ya que tenemos cliente admin (bypass RLS)
        admin.table('users').update(updates).eq('id', user_id).execute()
        
        print("¡Éxito! El usuario ahora tiene acceso a todo y puede mandar mensajes libremente.")
        
    except Exception as e:
        print(f"Error al actualizar el usuario: {e}")

if __name__ == "__main__":
    give_access_to_user("ilan@neuah.com")
