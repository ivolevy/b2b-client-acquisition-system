# 🚨 Solución: Email de Confirmación No Llega

## ⚡ Verificación Rápida (5 minutos)

Sigue estos pasos en orden para resolver el problema:

---

## ✅ Paso 1: Verificar Configuración Básica en Supabase

1. **Ve a tu proyecto en Supabase Dashboard**: [https://app.supabase.com](https://app.supabase.com)

2. **Settings → Auth → Email Auth**
   - ✅ **"Enable email signup"** debe estar **ACTIVADO** (toggle verde)
   - ✅ **"Enable email confirmations"** debe estar **ACTIVADO** (toggle verde)
   
   **⚠️ IMPORTANTE**: Si "Enable email confirmations" está desactivado, los usuarios se crean pero NO se envía el email de confirmación.

---

## ✅ Paso 2: Verificar URLs de Redirección

1. **Settings → Auth → URL Configuration**
2. En **Redirect URLs**, asegúrate de tener:
   - `http://localhost:5173` (para desarrollo local)
   - `http://localhost:5173/**` (con wildcard)
   - Tu URL de producción si la tienes (ej: `https://tu-dominio.com`)

   **⚠️ Si falta la URL, el email puede no funcionar correctamente.**

---

## ✅ Paso 3: Revisar Logs de Supabase

1. **Dashboard → Logs → Auth Logs**
2. Busca el registro de cuando creaste el usuario
3. Verifica si hay algún error relacionado con el envío de email

**Errores comunes:**
- `Email rate limit exceeded` → Has enviado demasiados emails, espera unos minutos
- `SMTP configuration error` → El SMTP no está configurado correctamente
- `Email template not found` → El template de confirmación no existe

---

## ✅ Paso 4: Configurar SMTP (Recomendado)

Si no tienes SMTP configurado, Supabase usa su servicio por defecto que puede tener limitaciones.

### Opción A: Configurar Gmail SMTP (Gratis)

1. **Settings → Auth → SMTP Settings**
2. Activa **"Enable Custom SMTP"**
3. Configura:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username**: Tu email de Gmail completo (ej: `tuemail@gmail.com`)
   - **Password**: **App Password** de Gmail (ver cómo obtenerla abajo)
   - **Sender email**: Tu email de Gmail
   - **Sender name**: Nombre que aparecerá como remitente (ej: "B2B Acquisition System")

### Cómo Obtener App Password de Gmail:

1. Ve a [Google Account Security](https://myaccount.google.com/security)
2. Activa **Verificación en 2 pasos** (si no la tienes)
3. Ve a **Contraseñas de aplicaciones**: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Selecciona **"Correo"** y **"Otro (nombre personalizado)"**
5. Escribe "Supabase" y genera la contraseña
6. **Copia la contraseña de 16 caracteres** (sin espacios)
7. Pégalo en el campo **Password** de Supabase SMTP Settings

### Opción B: Usar Otro Servicio SMTP

- **SendGrid**: [https://sendgrid.com](https://sendgrid.com) (gratis hasta 100 emails/día)
- **Mailgun**: [https://mailgun.com](https://mailgun.com) (gratis hasta 5,000 emails/mes)
- **Resend**: [https://resend.com](https://resend.com) (gratis hasta 3,000 emails/mes)

---

## ✅ Paso 5: Verificar Template de Email

1. **Settings → Auth → Email Templates**
2. Busca el template **"Confirm signup"**
3. Verifica que esté **habilitado**
4. Puedes personalizar el mensaje si quieres

---

## ✅ Paso 6: Probar de Nuevo

1. **Usa el botón "Reenviar email de confirmación"** en la pantalla de login
2. O intenta crear un nuevo usuario con otro email
3. Revisa:
   - ✅ Bandeja de entrada
   - ✅ Carpeta de spam
   - ✅ Promociones (si usas Gmail)

---

## 🔍 Diagnóstico Avanzado

### Verificar en la Consola del Navegador

1. Abre las **DevTools** (F12)
2. Ve a la pestaña **Console**
3. Busca mensajes que empiecen con `[Auth]`
4. Si ves errores, cópialos y busca la solución

### Verificar Variables de Entorno

Asegúrate de que en tu archivo `.env.local` o `.env` tengas:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**⚠️ Sin estas variables, Supabase no funcionará.**

---

## 🆘 Soluciones por Problema Específico

### Problema: "Enable email confirmations" está desactivado

**Solución:**
1. Ve a **Settings → Auth → Email Auth**
2. Activa el toggle **"Enable email confirmations"**
3. Guarda los cambios
4. Intenta crear un usuario nuevamente

### Problema: Rate Limit (Demasiados emails)

**Solución:**
- Espera 5-10 minutos antes de intentar de nuevo
- O configura SMTP personalizado para evitar límites

### Problema: Email va a Spam

**Solución:**
- Configura SMTP personalizado con un dominio verificado
- O marca el email como "No es spam" en tu cliente de email

### Problema: SMTP no funciona

**Verifica:**
- ✅ La contraseña es correcta (App Password, no contraseña normal)
- ✅ El puerto es correcto (587 para Gmail)
- ✅ El host es correcto (`smtp.gmail.com` para Gmail)
- ✅ La verificación en 2 pasos está activada en Gmail

---

## 📋 Checklist Completo

Marca cada item cuando lo verifiques:

- [ ] "Enable email signup" está activado en Supabase
- [ ] "Enable email confirmations" está activado en Supabase
- [ ] La URL de redirección está configurada (`http://localhost:5173`)
- [ ] SMTP está configurado (personalizado o usando servicio de Supabase)
- [ ] El template "Confirm signup" está habilitado
- [ ] Revisé los logs de Auth en Supabase Dashboard
- [ ] Revisé la carpeta de spam
- [ ] Probé con otro email
- [ ] No he alcanzado el límite de rate limiting
- [ ] Las variables de entorno están configuradas correctamente

---

## 🎯 Solución Rápida (Si tienes prisa)

1. **Ve a Supabase Dashboard → Settings → Auth → Email Auth**
2. **Activa "Enable email confirmations"** (si está desactivado)
3. **Configura SMTP de Gmail** (sigue el Paso 4 arriba)
4. **Agrega la URL de redirección**: `http://localhost:5173`
5. **Usa el botón "Reenviar email"** en la pantalla de login

---

## 📞 Si Nada Funciona

1. **Revisa los logs**: Dashboard → Logs → Auth Logs
2. **Verifica el email en Supabase**: Dashboard → Authentication → Users
3. **Prueba crear un usuario manualmente** desde Supabase Dashboard
4. **Contacta soporte de Supabase** si el problema persiste

---

## 💡 Consejos Adicionales

- **En desarrollo local**: Los emails de Supabase pueden tener delays de 1-2 minutos
- **En producción**: Configura siempre SMTP personalizado para mejor confiabilidad
- **Para testing**: Puedes desactivar temporalmente "Enable email confirmations" para desarrollo rápido
- **Seguridad**: Nunca compartas tus credenciales SMTP públicamente

---

*Última actualización: Diciembre 2024*

