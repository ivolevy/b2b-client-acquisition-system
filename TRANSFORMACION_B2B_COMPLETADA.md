#  TRANSFORMACIÓN B2B COMPLETADA

##  Objetivo Alcanzado

El sistema ha sido **completamente transformado** de un buscador de propiedades por zona a un **sistema B2B de captación de clientes por rubro empresarial** con validación automática de datos de contacto.

---

##  Resumen de Cambios

###  Sistema Anterior
- Búsqueda de **propiedades inmobiliarias** por zona geográfica
- Enfoque en ubicaciones y direcciones
- Sin validación de datos de contacto
- Datos incompletos sin verificar
- Exportación básica

###  Sistema Nuevo (B2B)
- Búsqueda de **empresas** por **rubro empresarial**
- Enfoque en datos de contacto verificados
- **Validación automática** de emails y teléfonos
- Solo datos válidos con contacto real
- **10 rubros empresariales** disponibles
- Exportación estructurada (CSV + JSON)
- Web scraping inteligente B2B

---

## 🆕 Archivos Creados

### Módulos Principales

1. **`backend/b2b_client.py`** 
   - Cliente Overpass API para búsqueda por rubro
   - 10 rubros predefinidos
   - Búsqueda por país/ciudad opcional
   - Búsqueda múltiple de rubros

2. **`backend/validators.py`** 
   - Validación de emails (RFC 5322)
   - Validación de teléfonos (7-15 dígitos)
   - Validación de websites
   - Filtrado automático de datos falsos
   - Estadísticas de validación

3. **`backend/scraper_b2b.py`** 
   - Web scraper enfocado en datos B2B
   - Búsqueda en página de contacto
   - Priorización de emails corporativos
   - Extracción de redes sociales
   - Respeta robots.txt con delay

4. **`backend/db_b2b.py`** 
   - Base de datos SQLite optimizada B2B
   - Campos de validación (email_valido, telefono_valido)
   - Índices para búsquedas rápidas
   - Exportación a CSV y JSON
   - Estadísticas avanzadas

5. **`backend/main_b2b.py`** 
   - API REST FastAPI completa
   - 8 endpoints especializados B2B
   - Documentación Swagger automática
   - Filtros avanzados

### Scripts de Uso

6. **`buscar_clientes_b2b.py`** 
   - Script interactivo con menú
   - Búsqueda paso a paso
   - Exportación integrada
   - Fácil de usar sin programar

7. **`ejemplo_rapido.py`** 
   - Ejemplo completo funcional
   - Muestra todo el flujo
   - Código comentado
   - Listo para ejecutar

### Documentación

8. **`README_B2B.md`** 
   - Documentación completa
   - Ejemplos de código
   - Guía de API
   - Casos de uso

9. **`TRANSFORMACION_B2B_COMPLETADA.md`** 
   - Este documento
   - Resumen de cambios
   - Guía de uso rápido

---

##  Cómo Usar el Sistema Nuevo

### Opción 1: Script Interactivo (Recomendado)

```bash
cd "/Users/ivanlevy/Desktop/untitled folder 3"
python3 buscar_clientes_b2b.py
```

**Funciones:**
- Ver rubros disponibles
- Buscar empresas por rubro
- Buscar con web scraping
- Exportar a CSV
- Exportar a JSON

### Opción 2: Ejemplo Rápido

```bash
python3 ejemplo_rapido.py
```

Este script ejecuta un ejemplo completo:
1. Lista rubros disponibles
2. Busca empresas (ejemplo: desarrolladoras en Madrid)
3. Valida datos de contacto
4. Guarda en base de datos
5. Exporta a CSV y JSON

### Opción 3: API REST

```bash
cd backend
source venv/bin/activate
python main_b2b.py
```

Accede a:
- **API**: http://localhost:8000
- **Documentación**: http://localhost:8000/docs

### Opción 4: Código Personalizado

```python
from backend.b2b_client import buscar_empresas_por_rubro
from backend.validators import filtrar_empresas_validas
from backend.db_b2b import init_db_b2b, insertar_empresa, exportar_a_csv

# Inicializar
init_db_b2b()

# Buscar
empresas = buscar_empresas_por_rubro("tecnologia", ciudad="Barcelona")

# Validar (solo con email O teléfono válido)
validas, stats = filtrar_empresas_validas(empresas)

# Guardar
for empresa in validas:
    insertar_empresa(empresa)

# Exportar
archivo = exportar_a_csv("tecnologia", solo_validas=True)
```

---

##  Rubros Disponibles

El sistema incluye **10 rubros empresariales**:

1. `desarrolladoras_inmobiliarias` - Desarrolladoras Inmobiliarias
2. `constructoras` - Empresas Constructoras
3. `arquitectura` - Estudios de Arquitectura
4. `ingenieria` - Empresas de Ingeniería
5. `consultoria` - Consultorías
6. `tecnologia` - Empresas de Tecnología
7. `legal` - Despachos Legales
8. `marketing` - Agencias de Marketing
9. `financiero` - Servicios Financieros
10. `salud` - Servicios de Salud

**Fácil de expandir**: Agrega nuevos rubros en `RUBROS_DISPONIBLES` en `b2b_client.py`

---

##  Sistema de Validación

### Criterios de Validación

Una empresa es **VÁLIDA** si cumple:

 **Tiene nombre** (no "Sin nombre")  
 **Tiene email válido O teléfono válido** (al menos uno)

### Validación de Email

-  Formato RFC 5322
-  Filtra: example.com, test.com, noreply@, spam@
-  Prioriza: contacto@, info@, ventas@, comercial@

### Validación de Teléfono

-  Entre 7 y 15 dígitos
-  Formatos internacionales (+34, +52, etc.)
-  Filtra: 000000, 111111, 123456, 999999

### Validación de Website

-  Formato URL válido
-  Normalización automática (agrega https://)

---

##  API REST Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Información de la API |
| GET | `/rubros` | Lista rubros disponibles |
| POST | `/buscar` | Buscar empresas por rubro |
| POST | `/buscar-multiple` | Buscar múltiples rubros |
| GET | `/empresas` | Listar todas las empresas |
| POST | `/filtrar` | Filtrar con criterios |
| GET | `/estadisticas` | Estadísticas del sistema |
| POST | `/exportar` | Exportar CSV/JSON |

**Documentación interactiva**: http://localhost:8000/docs

---

##  Estructura de Datos

### Empresa B2B (Ejemplo)

```json
{
  "nombre": "TechSolutions S.A.",
  "rubro": "Empresas de Tecnología",
  "rubro_key": "tecnologia",
  
  "email": "contacto@techsolutions.com",
  "email_valido": true,
  "telefono": "+34 91 234 5678",
  "telefono_valido": true,
  "website": "https://www.techsolutions.com",
  "website_valido": true,
  
  "ciudad": "Madrid",
  "pais": "España",
  "direccion": "Calle Tecnológica 10",
  
  "linkedin": "https://linkedin.com/company/techsolutions",
  "facebook": "",
  
  "validada": true,
  "scrapeada": true
}
```

---

##  Estadísticas de Ejemplo

```
 RESULTADOS DE VALIDACIÓN:
   Total encontradas: 45
   Válidas: 32 (71.11%)
   Con email: 28
   Con teléfono: 30
   Con website: 25
```

---

##  Flujo de Trabajo

```
1. Usuario selecciona RUBRO
          ↓
2. Sistema busca en OpenStreetMap
          ↓
3. Opcionalmente scrapea sitios web
          ↓
4. VALIDA emails y teléfonos
          ↓
5. Filtra solo empresas VÁLIDAS
          ↓
6. Guarda en SQLite
          ↓
7. Exporta a CSV/JSON
          ↓
8. Usuario obtiene DATOS LISTOS PARA CRM
```

---

##  Extras Incluidos

### Web Scraping Ético B2B

-  Respeta robots.txt
-  Delay de 1.5 segundos
-  User-Agent identificable: "B2BDataCollectorBot/1.0"
-  Busca en página de contacto
-  Prioriza emails corporativos
-  Extrae redes sociales (LinkedIn, Facebook, Twitter)

### Base de Datos Optimizada

-  Índices en rubro, ciudad, validación
-  Prevención de duplicados por OSM ID
-  Campos boolean para validación
-  Timestamps automáticos
-  Búsquedas rápidas con filtros

### Exportación Estructurada

-  CSV con columnas estándar
-  JSON con estructura completa
-  Nombres de archivo con timestamp
-  Filtro por rubro
-  Solo datos validados

---

##  Guía de Inicio Rápido

### Paso 1: Ejecutar Ejemplo

```bash
python3 ejemplo_rapido.py
```

### Paso 2: Modificar Parámetros

Edita `ejemplo_rapido.py`:

```python
RUBRO = "tecnologia"  # Cambia el rubro
CIUDAD = "Barcelona"  # Cambia la ciudad
```

### Paso 3: Script Interactivo

```bash
python3 buscar_clientes_b2b.py
```

### Paso 4: API REST (Opcional)

```bash
cd backend
source venv/bin/activate
python main_b2b.py
```

---

##  Archivos de Referencia

### Documentación
- `README_B2B.md` - Documentación completa
- `TRANSFORMACION_B2B_COMPLETADA.md` - Este archivo

### Scripts
- `buscar_clientes_b2b.py` - Script interactivo
- `ejemplo_rapido.py` - Ejemplo funcional
- `backend/main_b2b.py` - API REST

### Módulos
- `backend/b2b_client.py` - Cliente de búsqueda
- `backend/validators.py` - Validación de datos
- `backend/scraper_b2b.py` - Web scraping B2B
- `backend/db_b2b.py` - Base de datos

---

##  Casos de Uso Reales

### 1. Generar Base de Clientes B2B

```python
# Buscar desarrolladoras en Madrid
empresas = buscar_empresas_por_rubro("desarrolladoras_inmobiliarias", ciudad="Madrid")
validas, _ = filtrar_empresas_validas(empresas)

# Exportar para CRM
exportar_a_csv("desarrolladoras_inmobiliarias", solo_validas=True)
```

### 2. Prospección Multirrubro

```python
# Buscar múltiples rubros en Barcelona
resultados = buscar_empresas_multiples_rubros(
    rubros=["tecnologia", "marketing", "consultoria"],
    ciudad="Barcelona"
)
```

### 3. Exportación Personalizada

```python
# Solo empresas con email Y teléfono
empresas = buscar_empresas(
    rubro="tecnologia",
    con_email=True,
    con_telefono=True
)
```

---

##  Checklist de Funcionalidades

- [x] Búsqueda por rubro empresarial
- [x] 10 rubros predefinidos
- [x] Validación automática de emails
- [x] Validación automática de teléfonos
- [x] Validación de websites
- [x] Web scraping ético B2B
- [x] Base de datos SQLite optimizada
- [x] Exportación CSV estructurada
- [x] Exportación JSON estructurada
- [x] API REST completa
- [x] Documentación Swagger
- [x] Script interactivo
- [x] Ejemplo funcional
- [x] Filtros avanzados
- [x] Estadísticas en tiempo real
- [x] Prevención de duplicados
- [x] Solo datos validados

---

##  Transformación Completada

### Antes 
```
Sistema de búsqueda de propiedades por zona geográfica
```

### Ahora 
```
Sistema B2B de captación de clientes por rubro empresarial
con validación automática de datos de contacto
```

---

##  ¡Sistema Listo Para Usar!

```bash
# Ejecuta esto ahora:
python3 ejemplo_rapido.py
```

**El sistema está 100% funcional y listo para captar clientes B2B con datos validados.**

---

 Para más información, consulta `README_B2B.md`

