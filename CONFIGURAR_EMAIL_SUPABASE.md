# Configuración de Email de Confirmación en Supabase

## Problema
Al crear un usuario, no se envía el email de confirmación.

## Solución

### 1. Configurar SMTP en Supabase Dashboard

Supabase necesita tener configurado un servicio SMTP para enviar emails de confirmación. Sigue estos pasos:

1. **Accede al Dashboard de Supabase**
   - Ve a [https://app.supabase.com](https://app.supabase.com)
   - Selecciona tu proyecto

2. **Configura el servicio de Email**
   - Ve a **Settings** → **Auth** → **Email Templates**
   - O ve a **Settings** → **Auth** → **SMTP Settings**

3. **Configura SMTP (Opcional pero recomendado)**
   
   Si quieres usar tu propio servidor SMTP (Gmail, SendGrid, etc.):
   
   - Ve a **Settings** → **Auth** → **SMTP Settings**
   - Activa "Enable Custom SMTP"
   - Configura:
     - **Host**: `smtp.gmail.com` (para Gmail)
     - **Port**: `587`
     - **Username**: Tu email de Gmail
     - **Password**: Tu App Password de Gmail (no tu contraseña normal)
     - **Sender email**: Tu email
     - **Sender name**: Nombre que aparecerá como remitente

   **Para Gmail:**
   - Necesitas crear una "App Password" en tu cuenta de Google
   - Ve a [Google Account Security](https://myaccount.google.com/security)
   - Activa la verificación en 2 pasos
   - Genera una App Password para "Mail"
   - Usa esa contraseña en Supabase

4. **Configurar URL de Redirección**
   - Ve a **Settings** → **Auth** → **URL Configuration**
   - Agrega tu URL de producción en **Redirect URLs**
   - Ejemplo: `https://tu-dominio.com`
   - Para desarrollo local: `http://localhost:5173`

5. **Verificar Configuración de Email**
   - Ve a **Settings** → **Auth** → **Email Templates**
   - Verifica que el template de "Confirm signup" esté habilitado
   - Puedes personalizar el template si lo deseas

### 2. Verificar que el Email esté Habilitado

1. Ve a **Settings** → **Auth** → **Email Auth**
2. Asegúrate de que:
   - ✅ "Enable email confirmations" esté activado
   - ✅ "Enable email signup" esté activado

### 3. Probar el Sistema

1. Intenta crear un nuevo usuario desde la aplicación
2. Revisa tu bandeja de entrada (y spam)
3. Si no recibes el email:
   - Verifica la configuración SMTP
   - Revisa los logs en Supabase Dashboard → **Logs** → **Auth Logs**
   - Usa el botón "Reenviar email de confirmación" en la pantalla de login

### 4. Solución Alternativa: Usar el Servicio de Email de Supabase

Si no configuras SMTP personalizado, Supabase usa su servicio de email por defecto, pero puede tener limitaciones:

- **Límite de emails**: Puede haber límites en el plan gratuito
- **Delays**: Puede haber delays en el envío
- **Spam**: Los emails pueden ir a spam

### 5. Troubleshooting

**Problema: El email no llega**
- ✅ Verifica que el email no esté en spam
- ✅ Verifica la configuración SMTP en Supabase
- ✅ Revisa los logs de Auth en Supabase Dashboard
- ✅ Usa el botón "Reenviar email de confirmación"

**Problema: Error al crear usuario**
- ✅ Verifica que las variables de entorno estén configuradas:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- ✅ Verifica que la URL de redirección esté configurada en Supabase

**Problema: El usuario se crea pero no puede iniciar sesión**
- ✅ El usuario debe confirmar su email primero
- ✅ Usa el botón "Reenviar email de confirmación" si no recibió el email

## Notas Importantes

1. **En desarrollo local**: Los emails de Supabase funcionan normalmente, pero asegúrate de que `http://localhost:5173` esté en las URLs de redirección permitidas.

2. **En producción**: Asegúrate de agregar tu dominio de producción a las URLs de redirección permitidas.

3. **Rate Limiting**: Supabase puede limitar el número de emails enviados. Si alcanzas el límite, espera unos minutos o configura SMTP personalizado.

4. **Seguridad**: Nunca compartas tus credenciales SMTP. Úsalas solo en variables de entorno o en la configuración segura de Supabase.

## Referencias

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
