# 📘 Guía Completa de Usuarios - Smart Leads B2B

## 🎯 ¿Qué es Smart Leads B2B?

Smart Leads B2B es un sistema de captación de clientes empresariales que permite:
- Buscar empresas por rubro y ubicación geográfica
- Obtener datos de contacto (emails, teléfonos, redes sociales)
- Enviar emails masivos a empresas objetivo
- Exportar datos para análisis posterior
- Gestionar usuarios y suscripciones (para administradores)

---

## 📋 Tipos de Usuario

El sistema tiene **3 tipos de usuarios** con diferentes niveles de acceso:

### 1. **Usuario FREE (Gratuito)**
**¿Quién es?** Usuario que se registra sin pagar, para probar el sistema.

**Características:**
- ✅ **Registro**: Completamente gratuito, sin necesidad de tarjeta de crédito
- ✅ **Búsqueda básica**: Puede buscar empresas por rubro y ubicación
- ✅ **Visualización limitada**: Ve datos básicos (nombre, dirección, rubro)
- ❌ **Sin datos de contacto**: No puede ver emails ni teléfonos completos
- ❌ **Sin envío de emails**: No puede enviar emails a las empresas
- ⚠️ **Límites**: Búsquedas y exportaciones limitadas por mes

**Ideal para:** Usuarios que quieren probar el sistema antes de pagar.

---

### 2. **Usuario PRO (Premium)**
**¿Quién es?** Usuario que paga una suscripción mensual para acceso completo.

**Características:**
- ✅ **Registro**: Requiere suscripción de pago (mensual/anual)
- ✅ **Búsquedas ilimitadas**: Sin límites en cantidad de búsquedas
- ✅ **Datos completos**: Acceso a emails, teléfonos y redes sociales
- ✅ **Envío de emails**: Puede enviar emails individuales o masivos
- ✅ **Templates personalizados**: Crea y guarda plantillas de email
- ✅ **Exportación ilimitada**: Descarga todos los datos en CSV sin límites
- ✅ **Historial completo**: Ve todas sus búsquedas y envíos anteriores

**Ideal para:** Profesionales que necesitan contactar empresas regularmente.

---

### 3. **Usuario ADMIN (Administrador)**
**¿Quién es?** Usuario con permisos especiales para gestionar el sistema.

**Características:**
- ✅ **Acceso especial**: Solo se asigna manualmente (no disponible para registro público)
- ✅ **Panel de administración**: Acceso a dashboard de gestión
- ✅ **Gestión de usuarios**: Ver, editar y cambiar planes de todos los usuarios
- ✅ **Códigos promocionales**: Crear y gestionar descuentos
- ✅ **Estadísticas del sistema**: Ver métricas globales (usuarios, búsquedas, etc.)
- ✅ **Todas las funciones PRO**: Acceso completo a todas las funciones premium

**Ideal para:** Administradores del sistema que necesitan gestionar usuarios y configuraciones.

---

## 🔄 Flujos Completos Paso a Paso

### **1. Registro de Usuario (Primera Vez)**

#### 📝 Paso 1: Acceder al Registro
1. El usuario visita la página principal de Smart Leads
2. Si no tiene cuenta, hace clic en **"Registrarse"** o **"Crear cuenta"**
3. Se abre el formulario de registro

#### ✍️ Paso 2: Completar el Formulario
El usuario debe completar los siguientes campos:

- **Nombre completo** (obligatorio)
  - Ejemplo: "Juan Pérez"
  
- **Email** (obligatorio)
  - Debe ser un email válido
  - Ejemplo: "juan.perez@email.com"
  - Este será el email con el que iniciará sesión
  
- **Teléfono** (opcional)
  - Puede dejarse vacío
  - Formato: cualquier formato válido
  
- **Contraseña** (obligatorio)
  - **Mínimo 8 caracteres**
  - **Máximo 16 caracteres**
  - Debe incluir letras y números
  - Ejemplo válido: "miPassword123"
  - Ejemplo inválido: "123" (muy corta)

#### ✅ Paso 3: Confirmar Registro
1. El usuario acepta términos y condiciones (si aplica)
2. Hace clic en el botón **"Registrarse"** o **"Crear cuenta"**
3. El sistema valida los datos ingresados
4. Si todo está correcto, muestra un mensaje de éxito

#### 📧 Paso 4: Confirmación por Email
1. **El sistema envía automáticamente un email** a la dirección proporcionada
2. **El email contiene:**
   - Un enlace de verificación
   - Instrucciones para confirmar la cuenta
   - Información sobre qué hacer si no solicitó el registro
3. **El usuario debe:**
   - Abrir su bandeja de entrada
   - Buscar el email de "Smart Leads" o "Supabase"
   - Hacer clic en el enlace de verificación
4. **Una vez hace clic:**
   - Su cuenta queda confirmada
   - Es redirigido a la página de login
   - Puede iniciar sesión normalmente

#### 🔐 Paso 5: Primer Inicio de Sesión
1. El usuario ingresa a la página de login
2. Ingresa su **email** y **contraseña**
3. Hace clic en **"Iniciar sesión"**
4. **Si la cuenta NO está confirmada:**
   - Aparece un mensaje: "Por favor confirma tu email antes de iniciar sesión"
   - Debe revisar su correo y hacer clic en el enlace de confirmación
5. **Si la cuenta SÍ está confirmada:**
   - Inicia sesión exitosamente
   - Es redirigido al dashboard principal
   - Ve la interfaz de búsqueda de empresas

---

### **2. Recuperación de Contraseña (Olvidé mi contraseña)**

Este flujo es para usuarios que **olvidaron su contraseña** y no pueden iniciar sesión.

#### 🔓 Paso 1: Acceder a Recuperación
1. El usuario está en la pantalla de login
2. **NO recuerda su contraseña**
3. Hace clic en el enlace **"¿Olvidaste tu contraseña?"** (ubicado debajo del campo de contraseña)
4. Se abre un modal de recuperación

#### 📧 Paso 2: Solicitar Código de Verificación
1. **El usuario ingresa su email** (el mismo con el que se registró)
2. Hace clic en el botón **"Enviar código"**
3. **El sistema:**
   - Valida que el email existe en el sistema
   - Genera un código de 6 dígitos aleatorio
   - Envía el código por email al usuario
   - Guarda el código con una expiración de 10 minutos
4. **El usuario recibe un email** con:
   - El código de 6 dígitos
   - Instrucciones de uso
   - Advertencia de que expira en 10 minutos

#### 🔢 Paso 3: Verificar el Código
1. **El usuario vuelve a la aplicación**
2. **Ingresa el código de 6 dígitos** recibido por email
   - El campo solo acepta números
   - Se formatea automáticamente
3. Hace clic en **"Verificar código"**
4. **Si el código es correcto:**
   - Aparece un mensaje de éxito
   - Se habilita el paso siguiente (cambiar contraseña)
5. **Si el código es incorrecto:**
   - Aparece un mensaje de error
   - Debe ingresar el código correcto
6. **Si el código expiró (más de 10 minutos):**
   - Aparece un mensaje: "El código ha expirado"
   - Debe solicitar un nuevo código
7. **Reenvío de código:**
   - Después de **1 minuto** de haber enviado el código
   - Aparece un botón **"Reenviar código"**
   - El usuario puede solicitar un nuevo código si no recibió el anterior

#### 🔑 Paso 4: Cambiar la Contraseña
1. **Una vez verificado el código correctamente:**
   - Se muestra un formulario para nueva contraseña
2. **El usuario ingresa:**
   - **Nueva contraseña** (mínimo 8, máximo 16 caracteres)
   - **Confirmar nueva contraseña** (debe coincidir exactamente)
3. **El sistema valida:**
   - Que la contraseña tenga entre 8 y 16 caracteres
   - Que ambas contraseñas coincidan
   - Que cumpla con los requisitos de seguridad
4. **Si todo es correcto:**
   - La contraseña se actualiza en la base de datos
   - Aparece un mensaje de éxito
   - El modal se cierra
5. **El usuario puede:**
   - Volver a la pantalla de login
   - Iniciar sesión con su nueva contraseña

---

### **3. Cambio de Contraseña (Usuario Ya Autenticado)**

Este flujo es para usuarios que **ya están logueados** y quieren cambiar su contraseña por seguridad o preferencia.

#### 👤 Paso 1: Acceder a Mi Perfil
1. El usuario **ya está logueado** en el sistema
2. En la barra de navegación superior, hace clic en su **nombre** o **avatar**
3. Se abre un menú desplegable
4. Hace clic en **"Mi Perfil"** o **"Perfil"**
5. Es redirigido a la página de perfil

#### 🔐 Paso 2: Abrir Modal de Cambio de Contraseña
1. En la página de perfil, encuentra la sección **"Seguridad"** o **"Contraseña"**
2. Hace clic en el botón **"Cambiar contraseña"**
3. Se abre un modal con el proceso de cambio

#### 📧 Paso 3: Solicitar Código de Verificación
1. **El sistema muestra un formulario** pidiendo confirmar la acción
2. El usuario hace clic en **"Enviar código"**
3. **El sistema:**
   - Envía un código de 6 dígitos al **email del usuario** (el mismo con el que está logueado)
   - El código expira en 10 minutos
   - Guarda el código para verificación
4. **El usuario recibe el email** con el código

#### 🔢 Paso 4: Verificar el Código
1. **El usuario ingresa el código de 6 dígitos** recibido por email
2. Hace clic en **"Verificar código"**
3. **Si es correcto:**
   - Aparece un mensaje de éxito
   - Se habilita el formulario de nueva contraseña
4. **Si es incorrecto o expiró:**
   - Aparece un mensaje de error
   - Debe solicitar un nuevo código
5. **Reenvío disponible:**
   - Después de 1 minuto aparece el botón **"Reenviar código"**

#### 🔑 Paso 5: Establecer Nueva Contraseña
1. **Una vez verificado el código:**
   - Se muestra el formulario de nueva contraseña
2. **El usuario ingresa:**
   - **Nueva contraseña** (8-16 caracteres)
   - **Confirmar nueva contraseña** (debe coincidir)
3. **El sistema valida en tiempo real:**
   - Muestra si la contraseña tiene la longitud correcta
   - Indica si ambas contraseñas coinciden
4. **Al hacer clic en "Guardar contraseña":**
   - La contraseña se actualiza en Supabase
   - Aparece un mensaje: "Tu contraseña ha sido actualizada correctamente"
   - El modal se cierra
5. **El usuario puede:**
   - Continuar usando el sistema normalmente
   - La próxima vez que cierre sesión, usará la nueva contraseña

---

## 🎯 Funcionalidades Detalladas por Tipo de Usuario

### **Usuario FREE - Funciones Disponibles**

#### 🔍 Búsqueda de Empresas (Paso a Paso):

**Paso 1: Seleccionar Rubro**
- El usuario ve una lista desplegable con rubros disponibles
- Ejemplos: "Restaurantes", "Farmacias", "Gimnasios", etc.
- Selecciona el rubro que le interesa

**Paso 2: Definir Ubicación**
- **Opción A - Mapa interactivo:**
  - Ve un mapa de Google Maps
  - Puede hacer clic en el mapa para seleccionar un punto
  - O usar el botón "Usar mi ubicación actual"
  
- **Opción B - Buscar por dirección:**
  - Escribe una dirección (ej: "Plaza de Mayo, Buenos Aires")
  - El sistema autocompleta con sugerencias
  - Selecciona la dirección correcta

**Paso 3: Configurar Radio de Búsqueda**
- Selecciona cuántos kilómetros alrededor de la ubicación buscar
- Ejemplo: 5 km, 10 km, 20 km
- A mayor radio, más empresas encontrará

**Paso 4: Ejecutar Búsqueda**
- Hace clic en el botón **"Buscar empresas"**
- El sistema busca empresas del rubro seleccionado en el área definida
- Muestra un indicador de carga mientras busca

**Paso 5: Ver Resultados**
- **Vista de Tabla:**
  - Lista todas las empresas encontradas
  - Columnas: Nombre, Dirección, Rubro, Ciudad
  - Puede ordenar por cualquier columna
  
- **Vista de Mapa:**
  - Muestra las empresas como marcadores en el mapa
  - Al hacer clic en un marcador, ve información básica
  - Puede hacer zoom y navegar por el mapa

**⚠️ Limitaciones en los Resultados:**
- **Emails:** Ve "***@***" (oculto) en lugar del email completo
- **Teléfonos:** Ve "***-***-****" (oculto) en lugar del teléfono completo
- **Datos visibles:** Solo nombre, dirección, rubro, ciudad

#### 📥 Exportación de Datos:
- Puede exportar los resultados a un archivo CSV
- **Limitación:** Solo puede exportar un número limitado de empresas por mes
- **Datos exportados:** Solo los datos básicos (sin emails ni teléfonos completos)

#### ❌ Funciones NO Disponibles para FREE:
- ❌ Ver emails completos de empresas
- ❌ Ver teléfonos completos de empresas
- ❌ Enviar emails a empresas
- ❌ Envío masivo de emails
- ❌ Crear templates de email personalizados
- ❌ Búsquedas ilimitadas (tiene un límite mensual)
- ❌ Exportación ilimitada (tiene un límite mensual)

---

### **Usuario PRO - Funciones Completas**

#### 🔍 Búsqueda Avanzada (Todas las Funciones de FREE + Más):

**Todas las funciones de FREE, más:**
- ✅ **Búsquedas ilimitadas:** Sin límite de cantidad por mes
- ✅ **Filtros adicionales:**
  - Filtrar por ciudad específica
  - Filtrar por distancia exacta
  - Filtrar empresas con email
  - Filtrar empresas con teléfono

#### 📊 Resultados Completos (Datos Sin Restricciones):

**Datos Visibles:**
- ✅ **Email completo:** Ve el email real de la empresa (ej: "contacto@empresa.com")
- ✅ **Teléfono completo:** Ve el teléfono real (ej: "+54 11 1234-5678")
- ✅ **Redes sociales:** Ve links a Facebook, Instagram, LinkedIn (si están disponibles)
- ✅ **Website:** Ve la página web de la empresa
- ✅ **Dirección completa:** Con coordenadas geográficas
- ✅ **Todos los datos:** Sin ningún dato oculto

#### 📧 Envío de Emails (Funcionalidad Principal de PRO):

**Modo Individual (Email a una empresa):**
1. El usuario selecciona una empresa de los resultados
2. Hace clic en el botón **"Enviar email"** o **"Contactar"**
3. Se abre un editor de email con:
   - Campo "Para:" pre-llenado con el email de la empresa
   - Campo "Asunto:" editable
   - Editor de texto enriquecido para el cuerpo del email
   - Variables disponibles: {nombre_empresa}, {direccion}, etc.
4. Escribe el mensaje personalizado
5. Hace clic en **"Enviar"**
6. El email se envía y se guarda en el historial

**Modo Masivo (Emails a múltiples empresas):**
1. El usuario selecciona **múltiples empresas** de los resultados (checkboxes)
2. Hace clic en **"Enviar emails masivos"**
3. Se abre un modal con:
   - Lista de empresas seleccionadas
   - Selector de template (o crear uno nuevo)
   - Opción de personalizar cada email
   - Configuración de delay entre envíos (para evitar spam)
4. Selecciona o crea un template
5. Personaliza si es necesario
6. Hace clic en **"Enviar todos"**
7. El sistema envía los emails uno por uno con el delay configurado
8. Muestra progreso en tiempo real
9. Al finalizar, muestra un resumen de envíos exitosos y fallidos

**Templates Personalizables:**
- Puede crear plantillas de email reutilizables
- Guarda asunto y cuerpo del mensaje
- Usa variables dinámicas: {nombre_empresa}, {direccion}, {rubro}, etc.
- Puede editar, duplicar o eliminar templates
- Los templates se guardan para uso futuro

**Historial de Emails:**
- Ve todos los emails enviados
- Filtra por fecha, empresa, template usado
- Ve el estado de cada envío (enviado, fallido, pendiente)
- Puede reenviar emails si es necesario

#### 📥 Exportación Completa:
- ✅ **Sin límites:** Puede exportar todas las empresas que quiera
- ✅ **Datos completos:** Incluye emails, teléfonos, redes sociales
- ✅ **Formato CSV:** Compatible con Excel, Google Sheets, etc.
- ✅ **Múltiples exportaciones:** Sin restricción de cantidad

#### 📚 Historial de Búsquedas:
- Ve todas sus búsquedas anteriores
- Puede volver a ver resultados de búsquedas pasadas
- Filtra por fecha, rubro, ubicación
- Reutiliza búsquedas anteriores

---

### **Usuario ADMIN - Panel de Administración**

#### 🔐 Acceso al Panel de Administración:

**Paso 1: Iniciar Sesión**
1. El admin inicia sesión normalmente como cualquier usuario
2. Usa su email y contraseña de administrador

**Paso 2: Acceder al Panel**
1. En la barra de navegación superior, hace clic en su nombre/avatar
2. En el menú desplegable, ve la opción **"Panel de Administración"** o **"Admin"**
3. Hace clic y es redirigido al panel
4. **Nota:** Solo usuarios con rol "admin" ven esta opción

**Paso 3: Dashboard Principal**
- Ve un dashboard con estadísticas generales del sistema
- Diseño similar al resto de la aplicación pero con funciones administrativas

#### 👥 Gestión de Usuarios (Funcionalidad Principal):

**Ver Lista de Usuarios:**
1. En el panel, hace clic en la pestaña **"Usuarios"**
2. Ve una tabla con todos los usuarios registrados
3. **Columnas visibles:**
   - Nombre completo
   - Email
   - Plan actual (FREE o PRO)
   - Fecha de registro
   - Estado (activo/inactivo)
   - Acciones (editar, ver detalles)

**Filtrar Usuarios:**
- Puede filtrar por:
  - Plan (solo FREE, solo PRO, todos)
  - Estado (activos, inactivos)
  - Buscar por nombre o email

**Ver Detalles de un Usuario:**
1. Hace clic en un usuario de la lista
2. Se abre una página de detalles con:
   - **Información personal:**
     - Nombre completo
     - Email
     - Teléfono
     - Fecha de registro
     - Último acceso
   - **Información de suscripción:**
     - Plan actual (FREE/PRO)
     - Fecha de inicio de suscripción PRO (si aplica)
     - Estado de la suscripción
   - **Estadísticas del usuario:**
     - Cantidad de búsquedas realizadas
     - Emails enviados
     - Última actividad

**Editar Usuario:**
1. En la página de detalles, hace clic en **"Editar"**
2. Puede modificar:
   - **Cambiar plan:**
     - Convertir usuario FREE a PRO (sin pago)
     - Convertir usuario PRO a FREE (cancelar suscripción)
     - Los cambios se reflejan inmediatamente
   - **Modificar datos personales:**
     - Cambiar nombre
     - Cambiar teléfono
     - **Nota:** El email no se puede cambiar (es el identificador)
   - **Activar/Desactivar cuenta:**
     - Desactivar: El usuario no puede iniciar sesión
     - Activar: Restaura el acceso del usuario
3. Guarda los cambios

#### 🎟️ Gestión de Códigos Promocionales:

**Ver Códigos Existentes:**
1. Hace clic en la pestaña **"Códigos Promocionales"**
2. Ve una lista de todos los códigos creados
3. **Información mostrada:**
   - Código (ej: "DESCUENTO50")
   - Tipo de descuento (porcentaje, monto fijo)
   - Valor del descuento
   - Estado (activo/inactivo)
   - Fecha de creación
   - Fecha de expiración
   - Usos disponibles
   - Usos realizados

**Crear Nuevo Código:**
1. Hace clic en el botón **"Crear código"**
2. Completa el formulario:
   - **Código:** Texto único (ej: "BIENVENIDA2024")
   - **Tipo:** Porcentaje o monto fijo
   - **Valor:** Cantidad del descuento
   - **Fecha de expiración:** Hasta cuándo es válido
   - **Usos máximos:** Cuántas veces se puede usar (opcional)
3. Guarda el código
4. El código queda disponible para que los usuarios lo usen

**Editar o Eliminar Códigos:**
- Puede editar códigos existentes (cambiar valores, fechas, etc.)
- Puede desactivar códigos sin eliminarlos
- Puede eliminar códigos permanentemente

#### 📊 Estadísticas del Sistema:

El dashboard muestra métricas en tiempo real:

- **Usuarios:**
  - Total de usuarios registrados
  - Usuarios FREE vs PRO
  - Usuarios activos (últimos 30 días)
  - Nuevos usuarios este mes

- **Actividad:**
  - Total de búsquedas realizadas
  - Emails enviados (individuales y masivos)
  - Empresas en la base de datos

- **Suscripciones:**
  - Usuarios PRO activos
  - Conversiones FREE a PRO
  - Cancelaciones de suscripciones

#### 🎨 Navegación del Panel:
- **Tabs integrados:** "Usuarios" y "Códigos Promocionales" en la parte superior
- **Botón "Volver":** En el header, para volver al sistema principal
- **Diseño consistente:** Mismo estilo visual que el resto de la aplicación

---

## 💳 Cambio de Plan: FREE a PRO (Upgrade)

### 📈 Proceso de Actualización a PRO:

#### Paso 1: Acceder a la Opción de Upgrade
1. El usuario FREE está logueado en el sistema
2. Va a **"Mi Perfil"** desde el menú de usuario
3. En la sección de **"Plan"** o **"Suscripción"**, ve:
   - Su plan actual: **"Plan FREE"**
   - Un botón **"Actualizar a PRO"** o **"Upgrade a PRO"**
4. Hace clic en el botón

#### Paso 2: Ver Información del Plan PRO
1. Se abre un modal o página con información del plan PRO
2. **Información mostrada:**
   - Precio mensual/anual
   - Lista de beneficios (todas las funciones PRO)
   - Comparación FREE vs PRO
   - Términos y condiciones
3. El usuario revisa la información

#### Paso 3: Proceso de Pago
1. Si está de acuerdo, hace clic en **"Continuar"** o **"Suscribirse"**
2. **Se integra con sistema de pagos** (Stripe, PayPal, etc.)
3. El usuario ingresa:
   - Datos de tarjeta de crédito
   - Información de facturación
   - Acepta términos de suscripción
4. Confirma el pago
5. El sistema procesa el pago

#### Paso 4: Activación del Plan PRO
1. **Una vez procesado el pago exitosamente:**
   - El sistema actualiza automáticamente el plan de FREE a PRO
   - Se actualiza en la base de datos de Supabase
   - El usuario recibe acceso inmediato
2. **El usuario ve:**
   - Mensaje de confirmación: "¡Bienvenido al Plan PRO!"
   - Su plan cambia a "Plan PRO" en su perfil
   - Todas las funciones PRO se desbloquean inmediatamente
3. **Se envía email de confirmación** con:
   - Detalles de la suscripción
   - Fecha de renovación
   - Información de facturación

#### Paso 5: Disfrutar Funciones PRO
- Puede ver emails y teléfonos completos
- Puede enviar emails masivos
- Búsquedas ilimitadas
- Exportación ilimitada
- Todas las funciones premium

---

## ❌ Cancelación de Plan PRO (Downgrade a FREE)

### 📉 Proceso de Cancelación:

#### Paso 1: Acceder a Cancelación
1. El usuario PRO está logueado
2. Va a **"Mi Perfil"**
3. En la sección de **"Plan"**, ve:
   - Su plan actual: **"Plan PRO"**
   - Un botón **"Cancelar plan"** o **"Cancelar suscripción"**
4. Hace clic en el botón

#### Paso 2: Confirmar Cancelación
1. Se abre un modal de confirmación
2. **El sistema muestra:**
   - Advertencia sobre perder acceso a funciones PRO
   - Fecha en que perderá el acceso (fin del período pagado)
   - Información sobre qué funciones perderá
3. **Para confirmar, el usuario debe:**
   - Escribir **"CANCELAR"** en un campo de texto (medida de seguridad)
   - Hacer clic en **"Confirmar cancelación"**

#### Paso 3: Procesamiento de Cancelación
1. **El sistema:**
   - Cancela la suscripción en el sistema de pagos
   - Programa el cambio de plan para el final del período pagado
   - Actualiza el estado en la base de datos
2. **El usuario mantiene acceso PRO** hasta:
   - El final del mes/período que ya pagó
   - No se renueva automáticamente

#### Paso 4: Cambio a Plan FREE
1. **Al finalizar el período pagado:**
   - El plan cambia automáticamente de PRO a FREE
   - Se actualiza en Supabase
   - El usuario pierde acceso a funciones PRO
2. **El usuario ve:**
   - Su plan cambia a "Plan FREE" en su perfil
   - Las funciones PRO se bloquean
   - Puede volver a actualizar a PRO cuando quiera
3. **Se envía email de confirmación** de la cancelación

---

## 🔐 Seguridad y Autenticación

### Medidas de Seguridad:
- ✅ Contraseñas con validación (8-16 caracteres)
- ✅ Confirmación por email al registrarse
- ✅ Códigos de verificación para cambio de contraseña
- ✅ Códigos expiran en 10 minutos
- ✅ Reenvío de código disponible después de 1 minuto
- ✅ Validación de email en todos los procesos

### Flujos de Autenticación:
1. **Registro**: Email de confirmación requerido
2. **Login**: Email + contraseña
3. **Cambio de contraseña**: Código por email
4. **Recuperación**: Código por email (sin autenticación previa)

---

## 📊 Resumen de Funcionalidades por Plan

| Funcionalidad | FREE | PRO | ADMIN |
|--------------|------|-----|-------|
| Búsqueda de empresas | ✅ Limitada | ✅ Ilimitada | ✅ Ilimitada |
| Ver emails | ❌ | ✅ | ✅ |
| Ver teléfonos | ❌ | ✅ | ✅ |
| Envío de emails | ❌ | ✅ | ✅ |
| Envío masivo | ❌ | ✅ | ✅ |
| Exportación CSV | ✅ Limitada | ✅ Ilimitada | ✅ Ilimitada |
| Templates personalizados | ❌ | ✅ | ✅ |
| Historial de búsquedas | ✅ | ✅ | ✅ |
| Panel de administración | ❌ | ❌ | ✅ |
| Gestión de usuarios | ❌ | ❌ | ✅ |
| Códigos promocionales | ❌ | ❌ | ✅ |

---

## 🚀 Flujo Típico de Uso

### Usuario FREE:
1. Se registra y confirma email
2. Inicia sesión
3. Busca empresas por rubro y ubicación
4. Ve resultados básicos
5. Exporta datos básicos (si está dentro del límite)
6. Decide actualizar a PRO para más funciones

### Usuario PRO:
1. Inicia sesión (o se actualiza desde FREE)
2. Busca empresas con filtros avanzados
3. Ve todos los datos de contacto
4. Selecciona empresas objetivo
5. Crea o selecciona template de email
6. Envía emails individuales o masivos
7. Exporta resultados completos a CSV
8. Revisa historial de búsquedas y envíos

### Usuario ADMIN:
1. Inicia sesión
2. Accede al panel de administración
3. Revisa estadísticas del sistema
4. Gestiona usuarios (ver, editar, cambiar planes)
5. Crea o gestiona códigos promocionales
6. También puede usar todas las funciones PRO

---

## 📝 Notas Importantes

- **Confirmación de Email**: Es obligatoria para activar la cuenta
- **Códigos de Verificación**: Expiran en 10 minutos, se pueden reenviar después de 1 minuto
- **Contraseñas**: Mínimo 8 caracteres, máximo 16 caracteres
- **Cancelación PRO**: El plan se cancela pero el usuario mantiene acceso hasta el final del período pagado
- **Datos de Empresas**: Se obtienen de fuentes públicas y se enriquecen automáticamente

---

## 🎓 Para el Profesor - Guía de Prueba Rápida

### Prueba 1: Registro y Confirmación
1. Crear cuenta nueva con email válido
2. Revisar email y confirmar cuenta
3. Iniciar sesión

### Prueba 2: Recuperación de Contraseña
1. Cerrar sesión
2. Hacer clic en "¿Olvidaste tu contraseña?"
3. Ingresar email
4. Revisar código en email
5. Verificar código y cambiar contraseña

### Prueba 3: Usuario FREE
1. Buscar empresas por rubro
2. Ver resultados (notar que no se ven emails/teléfonos completos)
3. Intentar exportar (funciona pero limitado)

### Prueba 4: Upgrade a PRO
1. Ir a "Mi Perfil"
2. Hacer clic en "Actualizar a PRO"
3. Completar proceso (o simular)

### Prueba 5: Funciones PRO
1. Buscar empresas
2. Ver emails y teléfonos completos
3. Enviar email individual
4. Enviar emails masivos
5. Exportar a CSV

### Prueba 6: Panel Admin
1. Iniciar sesión como admin
2. Acceder al panel de administración
3. Ver usuarios
4. Editar un usuario
5. Cambiar plan de un usuario
6. Ver códigos promocionales

### Prueba 7: Cambio de Contraseña (Autenticado)
1. Ir a "Mi Perfil"
2. Hacer clic en "Cambiar contraseña"
3. Solicitar código
4. Verificar código
5. Cambiar contraseña

---

**Versión del Documento**: 1.0  
**Última Actualización**: 2024

