#  SISTEMA ACTUALIZADO - Selector de Ubicación en Mapa

##  Cambios Implementados

###  ANTES (No funcionaba bien):
- Inputs de "Ciudad" y "País"
- Tenías que escribir el nombre exacto
- OpenStreetMap no siempre encontraba la ciudad
- Sin visualización del área de búsqueda

###  AHORA (Visual e Intuitivo):
- **Mapa interactivo** con selector visual
- **Haz clic en el mapa** para elegir ubicación
- **Selector de radio** (1km, 2km, 5km, 10km, 20km, 50km)
- **Círculo visual** que muestra el área de búsqueda
- **Botón "Usar mi ubicación actual"** para geolocalizarte
- **Búsqueda por bounding box** mucho más precisa

---

##  Cómo Funciona el Nuevo Sistema

### 1. Seleccionar Rubro
```
Rubro Empresarial *: [▼ Desarrolladoras Inmobiliarias]
```

### 2. Selector de Radio
```
 Radio de búsqueda: [▼ 5 km]  [ Usar mi ubicación actual]
```

### 3. Hacer Clic en el Mapa
```
╔═══════════════════════════════════════╗
║   Haz clic en el mapa para         ║
║     seleccionar una ubicación         ║
╚═══════════════════════════════════════╝

┌─────────────────────────────────────┐
│                                     │
│    [MAPA INTERACTIVO]              │
│                                     │
│        ← Clic aquí              │
│      (●) ← Círculo de búsqueda    │
│                                     │
└─────────────────────────────────────┘

 Ubicación seleccionada: 40.4168, -3.7038
  Radio: 5.0 km
```

### 4. Buscar
```
[ Buscar Empresas en el Área]
```

---

##  REINICIA EL SISTEMA AHORA

### 1. Detén el backend actual (si está corriendo)
```bash
# Presiona CTRL+C en la terminal del backend
```

### 2. Inicia el backend actualizado
```bash
cd "/Users/ivanlevy/Desktop/untitled folder 3/backend"
source venv/bin/activate
python main.py
```

### 3. Recarga el frontend en el navegador
```bash
# Presiona F5 o CTRL+R en http://localhost:5173
```

---

##  Ejemplo de Uso

1. **Abre la interfaz** en http://localhost:5173

2. **Selecciona rubro**: "Empresas de Tecnología"

3. **Elige radio**: "5 km"

4. **Opción A - Usar tu ubicación**:
   - Clic en " Usar mi ubicación actual"
   - El navegador te pedirá permiso
   - El mapa se centrará en tu ubicación

5. **Opción B - Hacer clic en el mapa**:
   - Navega el mapa a la zona deseada (ej: Madrid)
   - Haz clic donde quieras buscar
   - Verás un marcador  y un círculo morado

6. **Buscar**:
   - Clic en " Buscar Empresas en el Área"
   - El sistema busca TODAS las empresas del rubro en ese radio
   - Valida emails y teléfonos automáticamente

---

##  Archivos Actualizados

### Frontend:
1.  `LocationPicker.jsx` (NUEVO) - Mapa interactivo con selector
2.  `LocationPicker.css` (NUEVO) - Estilos del selector
3.  `FiltersB2B.jsx` - Usa LocationPicker en lugar de inputs
4.  `App_B2B.jsx` - Pasa bbox al backend

### Backend:
1.  `overpass_client.py` - Nueva función `query_by_bbox()`
2.  `main.py` - Acepta `bbox` en `/buscar`
3.  `BusquedaRubroRequest` - Nuevo campo `bbox`

---

##  Ventajas del Nuevo Sistema

 **Visual e Intuitivo**  
 **No necesitas saber nombres exactos de ciudades**  
 **Búsqueda por área geográfica precisa**  
 **Ves el área de búsqueda en el mapa**  
 **Usa tu ubicación actual**  
 **Control del radio de búsqueda**  
 **Encuentra negocios "alrededor" de una ubicación**  

---

##  Casos de Uso

### Caso 1: Buscar en mi zona
```
1. Clic en " Usar mi ubicación actual"
2. Seleccionar radio: 10 km
3. Buscar
→ Encuentra empresas cerca de ti
```

### Caso 2: Prospección en ciudad específica
```
1. Navegar el mapa a Madrid centro
2. Clic en el mapa
3. Radio: 5 km
4. Buscar
→ Encuentra empresas en ese barrio
```

### Caso 3: Búsqueda amplia
```
1. Hacer zoom out en el mapa
2. Clic en el centro de una región
3. Radio: 50 km
4. Buscar
→ Cubre toda la región
```

---

##  Flujo Técnico

```
Usuario hace clic en mapa
    ↓
JavaScript calcula bounding box
    ↓
Frontend envía: {
  "rubro": "tecnologia",
  "bbox": "40.3,-3.8,40.5,-3.6"
}
    ↓
Backend query_by_bbox()
    ↓
Overpass API busca en ese área
    ↓
Valida datos de contacto
    ↓
Retorna empresas con checkmarks 
```

---

##  AHORA REINICIA Y PRUEBA

```bash
# Terminal backend (si está corriendo, CTRL+C primero)
cd backend
source venv/bin/activate
python main.py

# Navegador
http://localhost:5173
F5 (recargar)
```

**¡El selector de mapa está listo y funcionará perfectamente!** 

