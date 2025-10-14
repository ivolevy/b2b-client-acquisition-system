# 🎯 Sistema B2B de Captación de Clientes por Rubro

## ✨ Transformación Completada

Este sistema ha sido **transformado de búsqueda de propiedades por zona a un sistema B2B de captación de clientes por rubro empresarial**.

### 🔄 Cambios Principales

| Antes (Propiedades) | Ahora (B2B Empresas) |
|---------------------|----------------------|
| Búsqueda por zona geográfica | Búsqueda por rubro empresarial |
| Enfoque en propiedades inmobiliarias | Enfoque en empresas de cualquier rubro |
| Datos básicos de ubicación | Datos de contacto validados (email, teléfono) |
| Sin validación | Validación automática de contactos |
| Exportación simple | Exportación CSV y JSON estructurada |

---

## 🚀 Inicio Rápido

### Opción 1: Script Interactivo (Más Fácil)

```bash
cd "/Users/ivanlevy/Desktop/untitled folder 3"
python3 buscar_clientes_b2b.py
```

### Opción 2: API REST

```bash
cd backend
source venv/bin/activate
python main_b2b.py
```

Accede a: **http://localhost:8000/docs** para ver la documentación interactiva

---

## 📋 Rubros Disponibles

El sistema soporta búsqueda en los siguientes rubros:

1. **desarrolladoras_inmobiliarias** - Desarrolladoras Inmobiliarias
2. **constructoras** - Empresas Constructoras
3. **arquitectura** - Estudios de Arquitectura
4. **ingenieria** - Empresas de Ingeniería
5. **consultoria** - Consultorías
6. **tecnologia** - Empresas de Tecnología
7. **legal** - Despachos Legales
8. **marketing** - Agencias de Marketing
9. **financiero** - Servicios Financieros
10. **salud** - Servicios de Salud

---

## 💡 Ejemplo de Uso Rápido

```python
from backend.b2b_client import buscar_empresas_por_rubro
from backend.validators import filtrar_empresas_validas
from backend.db_b2b import init_db_b2b, insertar_empresa, exportar_a_csv

# 1. Inicializar base de datos
init_db_b2b()

# 2. Buscar empresas de un rubro
empresas = buscar_empresas_por_rubro(
    rubro="desarrolladoras_inmobiliarias",
    ciudad="Madrid"
)

print(f"Encontradas: {len(empresas)} empresas")

# 3. Validar datos de contacto (solo con email O teléfono válido)
empresas_validas, stats = filtrar_empresas_validas(empresas)

print(f"Válidas: {len(empresas_validas)} empresas")
print(f"Con email: {stats['con_email']}")
print(f"Con teléfono: {stats['con_telefono']}")

# 4. Guardar en base de datos
for empresa in empresas_validas:
    insertar_empresa(empresa)

# 5. Exportar a CSV
archivo_csv = exportar_a_csv(rubro="desarrolladoras_inmobiliarias", solo_validas=True)
print(f"Exportado a: {archivo_csv}")
```

---

## 🔍 Validación de Datos

El sistema incluye **validación automática** de datos de contacto:

### ✅ Validación de Emails
- Formato RFC 5322
- Filtra emails falsos (example.com, test.com, noreply@)
- Prioriza emails corporativos (contacto@, info@, ventas@)

### ✅ Validación de Teléfonos
- Entre 7 y 15 dígitos
- Formatos internacionales
- Filtra números falsos (000000, 111111, 123456)

### ✅ Validación de Websites
- Formato URL válido
- Normalización automática (agrega https://)

### 📊 Criterios de Validación
Una empresa es considerada **válida** si cumple:
- ✅ Tiene nombre
- ✅ Tiene email válido **O** teléfono válido (al menos uno)

---

## 🌐 API REST Endpoints

### `GET /rubros`
Lista todos los rubros disponibles

**Respuesta:**
```json
{
  "success": true,
  "total": 10,
  "rubros": {
    "desarrolladoras_inmobiliarias": "Desarrolladoras Inmobiliarias",
    "tecnologia": "Empresas de Tecnología",
    ...
  }
}
```

### `POST /buscar`
Busca empresas por rubro con validación

**Body:**
```json
{
  "rubro": "desarrolladoras_inmobiliarias",
  "ciudad": "Madrid",
  "pais": "España",
  "scrapear_websites": true,
  "solo_validadas": true
}
```

**Respuesta:**
```json
{
  "success": true,
  "total_encontradas": 45,
  "validas": 32,
  "guardadas": 32,
  "estadisticas_validacion": {
    "total": 45,
    "validas": 32,
    "con_email": 28,
    "con_telefono": 30,
    "tasa_exito": 71.11
  },
  "data": [...]
}
```

### `POST /filtrar`
Filtra empresas con criterios específicos

**Body:**
```json
{
  "rubro": "tecnologia",
  "ciudad": "Barcelona",
  "solo_validas": true,
  "con_email": true,
  "con_telefono": false
}
```

### `GET /estadisticas`
Obtiene estadísticas del sistema

### `POST /exportar`
Exporta a CSV o JSON

**Body:**
```json
{
  "rubro": "desarrolladoras_inmobiliarias",
  "formato": "csv",
  "solo_validas": true
}
```

---

## 📁 Estructura de Datos

### Empresa B2B

```json
{
  "nombre": "Constructora ABC S.A.",
  "rubro": "Empresas Constructoras",
  "rubro_key": "constructoras",
  
  "email": "contacto@constructoraabc.com",
  "email_valido": true,
  "telefono": "+34 91 123 4567",
  "telefono_valido": true,
  "website": "https://www.constructoraabc.com",
  "website_valido": true,
  
  "direccion": "Calle Principal 123",
  "ciudad": "Madrid",
  "pais": "España",
  "codigo_postal": "28001",
  
  "linkedin": "https://linkedin.com/company/constructoraabc",
  "facebook": "",
  "twitter": "",
  
  "latitud": 40.4168,
  "longitud": -3.7038,
  
  "validada": true,
  "scrapeada": true
}
```

---

## 📊 Formato de Exportación

### CSV
```csv
id,nombre,rubro,email,telefono,website,direccion,ciudad,pais,linkedin,descripcion
1,Constructora ABC,Empresas Constructoras,contacto@abc.com,+34911234567,...
```

### JSON
```json
[
  {
    "id": 1,
    "nombre": "Constructora ABC",
    "rubro": "Empresas Constructoras",
    "email": "contacto@abc.com",
    ...
  }
]
```

---

## 🛠️ Características Técnicas

### Módulos Principales

1. **b2b_client.py** - Cliente Overpass API para búsqueda por rubro
2. **validators.py** - Validación de emails, teléfonos y websites
3. **scraper_b2b.py** - Web scraper B2B con enfoque corporativo
4. **db_b2b.py** - Base de datos SQLite para empresas
5. **main_b2b.py** - API REST FastAPI

### Base de Datos

- **SQLite** con esquema optimizado para B2B
- Índices en rubro, ciudad, validación
- Prevención de duplicados por OSM ID
- Campos de validación (email_valido, telefono_valido)
- Timestamps de creación y actualización

### Web Scraping Ético

- ✅ Respeta robots.txt
- ✅ Delay de 1.5 segundos entre requests
- ✅ User-Agent identificable
- ✅ Busca en página de contacto si es necesario
- ✅ Prioriza emails corporativos

---

## 🎯 Casos de Uso

### 1. Generar Base de Clientes Potenciales
```python
# Buscar desarrolladoras en Madrid
empresas = buscar_empresas_por_rubro("desarrolladoras_inmobiliarias", ciudad="Madrid")
empresas_validas, _ = filtrar_empresas_validas(empresas)

# Exportar para CRM
exportar_a_csv(rubro="desarrolladoras_inmobiliarias", solo_validas=True)
```

### 2. Prospección Multirrubro
```python
from backend.b2b_client import buscar_empresas_multiples_rubros

resultados = buscar_empresas_multiples_rubros(
    rubros=["constructoras", "arquitectura", "ingenieria"],
    ciudad="Barcelona"
)
```

### 3. Filtrado Avanzado
```python
from backend.db_b2b import buscar_empresas

# Solo empresas con email Y teléfono
empresas_completas = buscar_empresas(
    rubro="tecnologia",
    con_email=True,
    con_telefono=True,
    solo_validas=True
)
```

---

## 📈 Ejemplo Completo

### Búsqueda y Exportación

```python
#!/usr/bin/env python3
import sys
sys.path.insert(0, 'backend')

from b2b_client import buscar_empresas_por_rubro
from scraper_b2b import enriquecer_empresa_b2b
from validators import filtrar_empresas_validas
from db_b2b import init_db_b2b, insertar_empresa, exportar_a_csv

# Configuración
RUBRO = "desarrolladoras_inmobiliarias"
CIUDAD = "Madrid"
SCRAPEAR = True

# 1. Inicializar
init_db_b2b()

# 2. Buscar
print(f"🔍 Buscando {RUBRO} en {CIUDAD}...")
empresas = buscar_empresas_por_rubro(RUBRO, ciudad=CIUDAD)
print(f"✓ Encontradas: {len(empresas)}")

# 3. Enriquecer con scraping (opcional)
if SCRAPEAR:
    print("🔄 Enriqueciendo con web scraping...")
    empresas_enriquecidas = []
    for empresa in empresas:
        if empresa.get('website'):
            empresa = enriquecer_empresa_b2b(empresa)
        empresas_enriquecidas.append(empresa)
    empresas = empresas_enriquecidas

# 4. Validar
print("✅ Validando contactos...")
empresas_validas, stats = filtrar_empresas_validas(empresas)

print(f"""
📊 RESULTADOS:
   Total: {stats['total']}
   Válidas: {stats['validas']} ({stats['tasa_exito']}%)
   Con email: {stats['con_email']}
   Con teléfono: {stats['con_telefono']}
""")

# 5. Guardar
for empresa in empresas_validas:
    insertar_empresa(empresa)

# 6. Exportar
archivo = exportar_a_csv(RUBRO, solo_validas=True)
print(f"📥 Exportado a: {archivo}")
```

---

## 🚦 Ejecución

### 1. Script Interactivo
```bash
python3 buscar_clientes_b2b.py
```

### 2. API REST
```bash
cd backend
source venv/bin/activate
python main_b2b.py
```

### 3. Código Personalizado
```bash
python3 tu_script.py
```

---

## 📚 Documentación API

Accede a la documentación interactiva Swagger:

```
http://localhost:8000/docs
```

---

## ✅ Checklist de Validación

El sistema garantiza que todas las empresas guardadas cumplan:

- [x] Tienen nombre válido
- [x] Tienen email válido **O** teléfono válido
- [x] Emails con formato RFC 5322
- [x] Teléfonos entre 7-15 dígitos
- [x] Sin datos falsos (example.com, 000000, etc.)
- [x] Rubro identificado
- [x] Datos estructurados en JSON/CSV

---

## 🎯 Diferencias Clave vs Sistema Anterior

### ❌ Sistema Anterior (Propiedades)
- Buscaba propiedades por zona
- Sin validación de contactos
- Enfoque geográfico
- Datos incompletos

### ✅ Sistema Nuevo (B2B)
- Busca empresas por rubro
- Validación automática de contactos
- Enfoque empresarial
- Solo datos válidos con contacto verificado
- Exportación estructurada
- Múltiples rubros
- Scraping inteligente

---

## 📞 Soporte

Para más información, consulta:
- `buscar_clientes_b2b.py` - Script interactivo
- `backend/main_b2b.py` - API REST
- `http://localhost:8000/docs` - Documentación Swagger

---

**🎉 Sistema B2B listo para captar clientes empresariales con datos validados!**

