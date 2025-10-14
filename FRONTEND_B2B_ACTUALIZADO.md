# ✅ Frontend B2B Actualizado

## 🎨 Cambios en el Frontend

El frontend ha sido **completamente actualizado** para trabajar con el sistema B2B de captación de clientes por rubro.

---

## 📁 Archivos Creados/Modificados

### Nuevos Componentes B2B:
1. ✅ `frontend/src/App_B2B.jsx` - App principal B2B
2. ✅ `frontend/src/components/FiltersB2B.jsx` - Filtros por rubro
3. ✅ `frontend/src/components/TableViewB2B.jsx` - Tabla con validación

### Modificados:
4. ✅ `frontend/src/main.jsx` - Usa App_B2B
5. ✅ `frontend/src/components/Navbar.jsx` - Título actualizado

---

## 🆕 Características del Frontend B2B

### 1. Selector de Rubro Empresarial
- ✅ Dropdown con 10 rubros disponibles
- ✅ Búsqueda por ciudad/país opcional
- ✅ Checkbox para activar web scraping
- ✅ Checkbox para solo empresas validadas

### 2. Validación Visual
- ✅ Checkmark verde (✓) en emails válidos
- ✅ Checkmark verde (✓) en teléfonos válidos
- ✅ Badge "✓ Válida" o "⚠️ Pendiente"
- ✅ Muestra LinkedIn si está disponible

### 3. Filtros Avanzados
- ✅ Filtrar por rubro
- ✅ Filtrar por ciudad
- ✅ Solo con email válido
- ✅ Solo con teléfono válido

### 4. Tabla Mejorada
- ✅ Columna de rubro empresarial
- ✅ Indicadores de validación
- ✅ Enlaces a email, teléfono, website, LinkedIn
- ✅ Muestra ciudad y país

---

## 🚀 Cómo Usar el Frontend Actualizado

### 1. Instalar Dependencias (si aún no lo hiciste)

```bash
cd frontend
npm install
```

### 2. Iniciar Frontend

```bash
npm run dev
```

### 3. Iniciar Backend B2B (en otra terminal)

```bash
cd backend
source venv/bin/activate
python main_b2b.py
```

### 4. Acceder

Abre el navegador en: **http://localhost:5173**

---

## 📊 Interfaz Actualizada

### Sección de Búsqueda

```
🔍 Buscar Empresas por Rubro B2B
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rubro Empresarial *: [Dropdown: Desarrolladoras, Tecnología, etc.]
Ciudad (opcional):   [Input: Madrid, Barcelona...]
País (opcional):     [Input: España, México...]

☑️ Scrapear sitios web para obtener más contactos
☑️ Solo guardar empresas con email O teléfono válido

[🚀 Buscar Empresas B2B]
```

### Sección de Filtros

```
🎯 Filtrar Resultados
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rubro:  [Dropdown: Todos los rubros]
Ciudad: [Input: Filtrar por ciudad...]

☐ 📧 Solo con email válido
☐ 📞 Solo con teléfono válido

[Aplicar Filtros] [Limpiar]
```

### Tabla de Resultados

```
| ID | Empresa              | Rubro        | Email           | Teléfono      | Website     | Ciudad/País | Validada  |
|----|----------------------|--------------|-----------------|---------------|-------------|-------------|-----------|
| 1  | TechSolutions S.A.  | Tecnología   | info@tech.com ✓ | +34 91... ✓  | 🔗 Ver      | Madrid      | ✓ Válida  |
|    | 📍 Calle Tech 10     |              |                 |               | 💼 LinkedIn | España      |           |
```

---

## 🎯 Flujo de Usuario

1. **Seleccionar Rubro** → Dropdown con 10 opciones
2. **Opcionales**: Ciudad, País, Scraping
3. **Buscar** → Sistema busca en OSM y valida
4. **Ver Resultados** → Tabla con indicadores de validación
5. **Filtrar** → Por rubro, ciudad, email, teléfono
6. **Exportar** → CSV con datos validados

---

## 💡 Diferencias vs Frontend Anterior

| Antes ❌ | Ahora ✅ |
|---------|---------|
| Búsqueda por zona/bounding box | Búsqueda por rubro empresarial |
| Campo libre de ciudad | Selector de rubro + ciudad opcional |
| Sin indicadores de validación | Checkmarks verdes en datos válidos |
| Tabla básica | Tabla con validación y LinkedIn |
| Filtros simples | Filtros por validación de contacto |
| Título "Real Estate" | Título "B2B Client Acquisition" |

---

## 🔄 Integración con Backend B2B

El frontend ahora usa estos endpoints:

```javascript
// Obtener rubros disponibles
GET /rubros

// Buscar empresas por rubro
POST /buscar
{
  "rubro": "tecnologia",
  "ciudad": "Madrid",
  "scrapear_websites": true,
  "solo_validadas": true
}

// Listar empresas
GET /empresas

// Filtrar
POST /filtrar
{
  "rubro": "tecnologia",
  "con_email": true,
  "con_telefono": true
}

// Estadísticas
GET /estadisticas

// Exportar
POST /exportar
{
  "formato": "csv",
  "solo_validas": true
}
```

---

## ✅ Checklist de Actualización

- [x] App_B2B.jsx creado
- [x] FiltersB2B.jsx con selector de rubro
- [x] TableViewB2B.jsx con indicadores de validación
- [x] main.jsx actualizado para usar App_B2B
- [x] Navbar actualizado con título B2B
- [x] Integración con endpoints B2B
- [x] Indicadores visuales de validación
- [x] Muestra LinkedIn si disponible
- [x] Filtros por email/teléfono válido
- [x] Exportación CSV actualizada

---

## 🚦 Iniciar Sistema Completo

### Terminal 1: Backend B2B
```bash
cd backend
source venv/bin/activate
python main_b2b.py
```

### Terminal 2: Frontend B2B
```bash
cd frontend
npm run dev
```

### Navegador
```
http://localhost:5173
```

---

## 🎨 Características Visuales

### Indicadores de Validación
- ✅ **Verde con ✓** → Dato validado
- ⚠️ **Naranja con ⚠️** → Sin validar
- 🔗 **Link azul** → Website/LinkedIn

### Badges de Rubro
- Fondo morado con texto blanco
- Muestra el nombre completo del rubro

### Estados de Empresa
- **"✓ Válida"** → Verde, tiene contacto validado
- **"⚠️ Pendiente"** → Naranja, sin validar

---

## 📝 Notas Importantes

1. **Backend debe estar corriendo** en puerto 8000
2. **Frontend** corre en puerto 5173 (Vite)
3. **CORS habilitado** en el backend
4. **Validación automática** al buscar
5. **Exportación** genera CSV local

---

## 🎉 Frontend B2B Listo

El frontend ahora está **100% integrado** con el sistema B2B:
- ✅ Búsqueda por rubro empresarial
- ✅ Validación visual de contactos
- ✅ Filtros avanzados
- ✅ Indicadores de calidad de datos
- ✅ Exportación actualizada

**Ejecuta ambos servidores y comienza a buscar empresas B2B!**

