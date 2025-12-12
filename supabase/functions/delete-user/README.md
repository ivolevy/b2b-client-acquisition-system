# Función Edge: delete-user

Esta función edge de Supabase elimina completamente un usuario de la base de datos, incluyendo su cuenta de autenticación.

## Deploy

Para deployar esta función, necesitas tener instalado el CLI de Supabase y estar autenticado:

```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Login en Supabase
supabase login

# Link tu proyecto
supabase link --project-ref tu-project-ref

# Deploy la función
supabase functions deploy delete-user
```

## Variables de Entorno

Asegúrate de tener configuradas estas variables en tu proyecto de Supabase:
- `SUPABASE_URL`: URL de tu proyecto
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (con permisos de admin)

Estas variables se configuran automáticamente cuando haces deploy desde el CLI.

## Uso

La función se llama automáticamente desde el frontend cuando un usuario intenta eliminar su cuenta.

## Permisos

Esta función requiere permisos de administrador para eliminar usuarios de `auth.users`. Por eso usa el `SUPABASE_SERVICE_ROLE_KEY` en lugar de la clave anónima.
