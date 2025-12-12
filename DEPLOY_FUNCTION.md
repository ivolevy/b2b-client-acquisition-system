# Deploy de la función Edge delete-user

## Paso 1: Obtener el Project Ref

1. Ve a tu dashboard de Supabase: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a Settings → General
4. Copia el "Reference ID" (tiene formato: `abcdefghijklmnop`)

## Paso 2: Linkear el proyecto

Ejecuta este comando reemplazando `TU_PROJECT_REF` con tu Reference ID:

```bash
cd /Users/ivanlevy/Desktop/b2b-client-acquisition-system
supabase link --project-ref TU_PROJECT_REF
```

Te pedirá un password. Usa el password de tu cuenta de Supabase.

## Paso 3: Deployar la función

Una vez linkeado, deploya la función:

```bash
supabase functions deploy delete-user --no-verify-jwt
```

## Alternativa: Sin función edge

Si prefieres no deployar la función edge, el sistema funcionará igualmente. El usuario no podrá iniciar sesión después de eliminar su cuenta (porque no tendrá perfil), aunque técnicamente seguirá existiendo en `auth.users`.

Para que funcione la eliminación básica, solo necesitas ejecutar este SQL en el SQL Editor de Supabase:

```sql
CREATE POLICY "Users can delete own profile" ON public.users FOR DELETE USING (auth.uid() = id);
```

Esto permitirá que los usuarios eliminen su propio perfil.
