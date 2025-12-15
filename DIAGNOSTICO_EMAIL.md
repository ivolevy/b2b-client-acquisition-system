# Diagnóstico: Email de Confirmación No Se Envía

## 🔍 Verificación Rápida

Si al crear un usuario **NO se envía el email de confirmación**, sigue estos pasos en orden:

### ✅ Paso 1: Verificar Configuración Básica en Supabase Dashboard

1. **Ve a tu proyecto en Supabase Dashboard**: [https://app.supabase.com](https://app.supabase.com)

2. **Settings → Auth → Email Auth**
   - ✅ **"Enable email signup"** debe estar **ACTIVADO**
   - ✅ **"Enable email confirmations"** debe estar **ACTIVADO**
   - ⚠️ Si está desactivado, los usuarios se crean sin necesidad de confirmar email

### ✅ Paso 2: Verificar Configuración SMTP

**Opción A: Usar SMTP Personalizado (Recomendado para producción)**

1. **Settings → Auth → SMTP Settings**
   - ✅ Activa **"Enable Custom SMTP"**
   - Configura tu servidor SMTP (Gmail, SendGrid, etc.)
   - **Para Gmail:**
     - Host: `smtp.gmail.com`
     - Port: `587`
     - Username: Tu email de Gmail
     - Password: **App Password** (no tu contraseña normal)
     - Sender email: Tu email
     - Sender name: Nombre del remitente

**Opción B: Usar Servicio de Email de Supabase (Gratis pero limitado)**

- Si NO configuras SMTP personalizado, Supabase usa su servicio por defecto
- ⚠️ **Limitaciones:**
  - Límite de emails en plan gratuito
  - Puede haber delays
  - Emails pueden ir a spam
  - Rate limiting más estricto

### ✅ Paso 3: Verificar URLs de Redirección

1. **Settings → Auth → URL Configuration**
   - ✅ Agrega tu URL de producción en **Redirect URLs**
   - ✅ Para desarrollo local: `http://localhost:5173` (o el puerto que uses)
   - ✅ Para producción: `https://tu-dominio.com`
   - ⚠️ Si la URL no está en la lista, el email puede no funcionar correctamente

### ✅ Paso 4: Verificar Templates de Email

1. **Settings → Auth → Email Templates**
   - ✅ Verifica que el template **"Confirm signup"** esté habilitado
   - ✅ Puedes personalizar el template si lo deseas
   - ✅ Verifica que el template tenga el link de confirmación: `{{ .ConfirmationURL }}`

### ✅ Paso 5: Revisar Logs de Supabase

1. **Dashboard → Logs → Auth Logs**
   - Busca eventos de `signup` recientes
   - Verifica si hay errores relacionados con el envío de email
   - Busca mensajes como:
     - "Email rate limit exceeded"
     - "SMTP configuration error"
     - "Email sending failed"

### ✅ Paso 6: Verificar en la Consola del Navegador

Abre la consola del navegador (F12) y busca mensajes que empiecen con `[Auth]`:

- ✅ Si ves: `"Usuario creado. Email de confirmación debería haberse enviado"` → El código está funcionando, el problema está en Supabase
- ❌ Si ves errores → Revisa el mensaje de error específico

## 🐛 Problemas Comunes y Soluciones

### Problema 1: "Email rate limit exceeded"

**Causa:** Has alcanzado el límite de emails del plan gratuito de Supabase.

**Solución:**
- Espera unos minutos antes de intentar de nuevo
- Configura SMTP personalizado para evitar límites
- Considera actualizar a un plan de pago

### Problema 2: "SMTP configuration error"

**Causa:** La configuración SMTP en Supabase está incorrecta.

**Solución:**
- Verifica las credenciales SMTP
- Para Gmail, asegúrate de usar una **App Password**, no tu contraseña normal
- Verifica que el puerto sea correcto (587 para Gmail)
- Prueba con otro proveedor SMTP (SendGrid, Mailgun, etc.)

### Problema 3: El email va a spam

**Causa:** El servicio de email de Supabase puede ser marcado como spam.

**Solución:**
- Configura SMTP personalizado con un dominio verificado
- Agrega el remitente a la lista de contactos
- Verifica la configuración SPF/DKIM de tu dominio

### Problema 4: "Enable email confirmations" está desactivado

**Causa:** La confirmación de email está deshabilitada en Supabase.

**Solución:**
- Ve a **Settings → Auth → Email Auth**
- Activa **"Enable email confirmations"**
- Los usuarios nuevos ahora requerirán confirmar su email

### Problema 5: URL de redirección no configurada

**Causa:** La URL de redirección no está en la lista de URLs permitidas.

**Solución:**
- Ve a **Settings → Auth → URL Configuration**
- Agrega tu URL (ej: `http://localhost:5173` o `https://tu-dominio.com`)
- Guarda los cambios

### Problema 6: El usuario se crea pero no recibe email

**Causa:** Múltiples posibles causas.

**Solución paso a paso:**
1. ✅ Verifica que el email no esté en spam
2. ✅ Revisa los logs de Auth en Supabase Dashboard
3. ✅ Usa el botón "Reenviar email de confirmación" en la pantalla de login
4. ✅ Verifica que "Enable email confirmations" esté activado
5. ✅ Verifica la configuración SMTP
6. ✅ Prueba crear un usuario con otro email

## 🔧 Verificación del Código

El código en `frontend/src/lib/supabase.js` está configurado correctamente:

```javascript
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: redirectTo, // ✅ Configurado
    data: {
      name: name,
      plan: 'free'
    }
  }
});
```

Si el código está bien, el problema está en la **configuración de Supabase Dashboard**.

## 📋 Checklist de Diagnóstico

Marca cada item cuando lo verifiques:

- [ ] "Enable email signup" está activado en Supabase
- [ ] "Enable email confirmations" está activado en Supabase
- [ ] SMTP está configurado (personalizado o usando el servicio de Supabase)
- [ ] La URL de redirección está en la lista de URLs permitidas
- [ ] El template "Confirm signup" está habilitado
- [ ] No hay errores en los logs de Auth de Supabase
- [ ] Revisaste la carpeta de spam
- [ ] Probaste con otro email
- [ ] No has alcanzado el límite de rate limiting

## 🆘 Si Nada Funciona

1. **Revisa los logs de Supabase Dashboard → Logs → Auth Logs**
   - Busca el evento de creación del usuario
   - Verifica si hay errores específicos

2. **Prueba reenviar el email de confirmación**
   - En la pantalla de login, hay un botón para reenviar el email
   - Esto puede funcionar incluso si el primer envío falló

3. **Contacta el soporte de Supabase**
   - Si todo está configurado correctamente pero aún no funciona
   - Proporciona los logs de Auth y detalles de tu configuración

4. **Considera usar un servicio SMTP externo**
   - SendGrid, Mailgun, AWS SES, etc.
   - Configúralo en Supabase Dashboard → Settings → Auth → SMTP Settings

## 📝 Notas Importantes

- **En desarrollo local:** Los emails funcionan normalmente, pero asegúrate de que `http://localhost:5173` esté en las URLs permitidas
- **En producción:** Agrega tu dominio completo a las URLs permitidas
- **Rate Limiting:** Supabase limita el número de emails. Si alcanzas el límite, espera o configura SMTP personalizado
- **Seguridad:** Nunca compartas credenciales SMTP. Úsalas solo en la configuración segura de Supabase
