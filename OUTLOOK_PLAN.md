# Plan de Implementación: Integración de Outlook & Microsoft 365

Este documento detalla el proceso paso a paso para integrar el envío de correos electrónicos a través de la API de Microsoft Graph, permitiendo el uso de cuentas de Outlook/Hotmail/Microsoft 365 para campañas de email marketing masivo.

---

## 1. Configuración del Portal de Azure (Obtención de Keys)

Para que la aplicación pueda autenticar usuarios de Microsoft y enviar correos en su nombre, es necesario registrarla en el portal de Azure.

### Paso 1: Registro de la Aplicación
1. Inicia sesión en [Azure Portal - App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2. Haz clic en **"Nuevo registro"**.
3. Completa los datos:
   - **Nombre**: `Smart Leads B2B`.
   - **Tipos de cuenta compatibles**: Selecciona *"Cuentas en cualquier directorio organizativo (cualquier directorio de Microsoft Entra ID: multiinquilino) y cuentas personales de Microsoft (como Skype, Xbox)"*. Esto garantiza que funcione con correos corporativos y personales (@outlook.com, @hotmail.com).
   - **URI de redirección (opcional)**: Selecciona **Web** y coloca tu URL de callback, por ejemplo: `https://tu-dominio.com/auth/outlook/callback` (o `http://localhost:8000/auth/outlook/callback` para desarrollo local).
4. Haz clic en **Registrar**.

### Paso 2: Obtención del Client ID y Client Secret
1. En la página de **Overview** (Información general), copia el **Application (client) ID**. Este será tu `OUTLOOK_CLIENT_ID`.
2. Ve a **"Certificates & secrets"** (Certificados y secretos) en el menú lateral.
3. Haz clic en **"New client secret"** (Nuevo secreto de cliente).
4. Añade una descripción (ej. `SmartLeadsSecret`) y selecciona la expiración (se recomienda el máximo permitido).
5. Haz clic en **Add** (Agregar).
6. **IMPORTANTE**: Copia el valor que aparece en la columna **Value**. No podrás volver a verlo después. Este será tu `OUTLOOK_CLIENT_SECRET`.

### Paso 3: Configuración de Permisos (API Permissions)
1. Ve a **"API permissions"** (Permisos de API).
2. Haz clic en **"Add a permission"** -> **"Microsoft Graph"**.
3. Selecciona **"Delegated permissions"** (Permisos delegados).
4. Busca y marca los siguientes permisos:
   - `Mail.Send`: Permite enviar correos en nombre del usuario.
   - `User.Read`: Permite ver el perfil básico del usuario (nombre/email).
   - `offline_access`: Permite obtener un *Refresh Token* para que el sistema envíe correos aunque el usuario no esté en línea.
5. Haz clic en **"Add permissions"**.

---

## 2. Configuración en el Proyecto

### Variables de Entorno (.env)
Añade las siguientes líneas a tu archivo `.env` del backend:

```env
OUTLOOK_CLIENT_ID=tu_client_id_aqui
OUTLOOK_CLIENT_SECRET=tu_client_secret_aqui
OUTLOOK_REDIRECT_URI=http://localhost:8000/auth/outlook/callback
```

### Cambios Técnicos Necesarios

1. **Backend (Python)**:
   - Implementar `auth_outlook.py` usando la librería `msal`.
   - Actualizar `email_service.py` para detectar si el usuario está enviando vía Google o Microsoft.
   - Manejo automático de refresco de tokens para evitar interrupciones en envíos masivos.

2. **Database (Supabase)**:
   - Ya contamos con la tabla `user_oauth_tokens`. Solo necesitamos asegurarnos de que la columna `provider` distinga entre 'google' y 'outlook'.

3. **Frontend (React)**:
   - Añadir el botón "Conectar Outlook" en la página de Perfil.
   - Mostrar qué cuenta está conectada para envíos.
   - Permitir elegir el emisor en la herramienta de envío masivo.

---

## 3. Límites y Mejores Prácticas

- **Frecuencia de Envío**: Para evitar bloqueos, implementaremos un delay de entre 3 y 5 segundos entre correos.
- **Entregabilidad**: Las cuentas Business de Microsoft 365 tienen los límites más altos y la mejor reputación para campañas masivas.
- **Tokens**: Los tokens de Microsoft tienen una duración mayor que los de Google, lo que hace el sistema muy estable para procesos de fondo.
