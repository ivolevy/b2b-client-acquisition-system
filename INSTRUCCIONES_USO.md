# 🚀 INSTRUCCIONES DE USO - Sistema B2B

## ⚡ Inicio Rápido (30 segundos)

```bash
cd "/Users/ivanlevy/Desktop/untitled folder 3"
python3 ejemplo_rapido.py
```

Este comando:
1. ✅ Busca empresas de un rubro
2. ✅ Valida emails y teléfonos
3. ✅ Guarda en base de datos
4. ✅ Exporta a CSV y JSON

---

## 📋 3 Formas de Usar el Sistema

### 1️⃣ Script Interactivo (Más Fácil)

```bash
python3 buscar_clientes_b2b.py
```

**Ventajas:**
- Menú interactivo
- No necesitas programar
- Guía paso a paso
- Exportación incluida

**Funciones:**
1. Ver rubros disponibles
2. Buscar empresas por rubro
3. Buscar con scraping web
4. Exportar a CSV
5. Exportar a JSON

---

### 2️⃣ Ejemplo Rápido (Recomendado para Empezar)

```bash
python3 ejemplo_rapido.py
```

**Qué hace:**
- Muestra rubros disponibles
- Busca empresas (ejemplo: desarrolladoras en Madrid)
- Valida datos de contacto automáticamente
- Muestra estadísticas
- Exporta resultados
- Incluye ejemplos

**Personalizar:**
Edita `ejemplo_rapido.py` líneas 20-21:
```python
RUBRO = "tecnologia"      # Cambiar rubro
CIUDAD = "Barcelona"      # Cambiar ciudad
```

---

### 3️⃣ API REST (Para Integración)

```bash
cd backend
source venv/bin/activate
python main_b2b.py
```

**Acceso:**
- API: http://localhost:8000
- Documentación: http://localhost:8000/docs

**Endpoints principales:**
```bash
# Ver rubros
GET http://localhost:8000/rubros

# Buscar empresas
POST http://localhost:8000/buscar
{
  "rubro": "tecnologia",
  "ciudad": "Madrid",
  "solo_validadas": true
}

# Exportar
POST http://localhost:8000/exportar
{
  "rubro": "tecnologia",
  "formato": "csv"
}
```

---

## 🎯 Rubros Disponibles

Puedes buscar empresas en estos rubros:

```
1. desarrolladoras_inmobiliarias  → Desarrolladoras Inmobiliarias
2. constructoras                  → Empresas Constructoras
3. arquitectura                   → Estudios de Arquitectura
4. ingenieria                     → Empresas de Ingeniería
5. consultoria                    → Consultorías
6. tecnologia                     → Empresas de Tecnología
7. legal                          → Despachos Legales
8. marketing                      → Agencias de Marketing
9. financiero                     → Servicios Financieros
10. salud                         → Servicios de Salud
```

---

## 💡 Ejemplos de Búsqueda

### Ejemplo 1: Desarrolladoras en Madrid

```bash
python3 ejemplo_rapido.py
# Edita: RUBRO = "desarrolladoras_inmobiliarias", CIUDAD = "Madrid"
```

### Ejemplo 2: Empresas de Tecnología en Barcelona

```python
from backend.b2b_client import buscar_empresas_por_rubro
from backend.validators import filtrar_empresas_validas

empresas = buscar_empresas_por_rubro("tecnologia", ciudad="Barcelona")
validas, stats = filtrar_empresas_validas(empresas)
print(f"Encontradas {len(validas)} empresas válidas")
```

### Ejemplo 3: Consultorías con Email y Teléfono

```python
from backend.db_b2b import buscar_empresas

empresas = buscar_empresas(
    rubro="consultoria",
    con_email=True,
    con_telefono=True
)
```

---

## ✅ Sistema de Validación

### ¿Qué se Valida?

**Email:**
- ✅ Formato válido (RFC 5322)
- ✅ No falsos (example.com, test.com)
- ✅ No spam (noreply@, no-reply@)

**Teléfono:**
- ✅ Entre 7-15 dígitos
- ✅ Formatos internacionales
- ✅ No falsos (000000, 111111)

**Empresa Válida:**
- ✅ Tiene nombre
- ✅ Tiene email válido **O** teléfono válido

---

## 📊 Ejemplo de Resultado

```
📊 RESULTADOS DE VALIDACIÓN:
   Total encontradas:  45
   Válidas:            32 (71.11%)
   Con email válido:   28
   Con teléfono válido: 30
   Con website:        25

[1] 🏢 Constructora ABC S.A.
    Rubro: Empresas Constructoras
    📧 contacto@constructoraabc.com
    📞 +34 91 123 4567
    🌐 https://www.constructoraabc.com
    📍 Madrid, España
```

---

## 📥 Exportación

### CSV (Para Excel/CRM)

```bash
python3 buscar_clientes_b2b.py
# Opción 4: Exportar a CSV
```

**Archivo generado:**
```
data/empresas_b2b_tecnologia_20241014_153045.csv
```

**Campos:**
```
id, nombre, rubro, email, telefono, website, 
direccion, ciudad, pais, linkedin, descripcion
```

### JSON (Para Aplicaciones)

```bash
python3 buscar_clientes_b2b.py
# Opción 5: Exportar a JSON
```

**Archivo generado:**
```
data/empresas_b2b_tecnologia_20241014_153045.json
```

---

## 🔧 Personalización

### Cambiar Rubro y Ciudad

**En `ejemplo_rapido.py`:**
```python
RUBRO = "marketing"        # Tu rubro
CIUDAD = "Valencia"        # Tu ciudad
```

### Búsqueda Sin Ciudad (Todo el País)

```python
empresas = buscar_empresas_por_rubro("tecnologia", pais="España")
```

### Múltiples Rubros

```python
from backend.b2b_client import buscar_empresas_multiples_rubros

resultados = buscar_empresas_multiples_rubros(
    rubros=["tecnologia", "marketing", "consultoria"],
    ciudad="Madrid"
)
```

---

## 🚨 Solución de Problemas

### Error: No se encontraron empresas

**Solución:**
- Prueba con ciudades grandes: Madrid, Barcelona, Valencia
- Algunas ciudades tienen pocos datos en OpenStreetMap
- Intenta sin ciudad (búsqueda por país)

### Error: ModuleNotFoundError

**Solución:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Sin Resultados Válidos

**Causas:**
- Las empresas no tienen datos de contacto en OSM
- Activa scraping: `scrapear_websites=True`
- Algunas empresas solo tienen ubicación

---

## 📚 Documentación Completa

- `README_B2B.md` - Documentación técnica completa
- `TRANSFORMACION_B2B_COMPLETADA.md` - Resumen de cambios
- `INSTRUCCIONES_USO.md` - Este archivo

---

## 🎯 Flujo Recomendado

```
1. Ejecuta ejemplo_rapido.py
      ↓
2. Revisa resultados en data/
      ↓
3. Modifica RUBRO y CIUDAD
      ↓
4. Ejecuta buscar_clientes_b2b.py
      ↓
5. Explora diferentes rubros
      ↓
6. Exporta a CSV para tu CRM
      ↓
7. ¡Contacta a tus clientes potenciales!
```

---

## ✨ Tips Avanzados

### 1. Solo Empresas con Email

```python
from backend.db_b2b import buscar_empresas

empresas = buscar_empresas(
    rubro="tecnologia",
    con_email=True
)
```

### 2. Activar Web Scraping

```python
from backend.scraper_b2b import enriquecer_empresa_b2b

for empresa in empresas:
    if empresa.get('website'):
        empresa = enriquecer_empresa_b2b(empresa)
```

### 3. Estadísticas

```bash
# Vía API
curl http://localhost:8000/estadisticas

# Vía código
from backend.db_b2b import obtener_estadisticas
stats = obtener_estadisticas()
```

---

## 🏁 Comenzar Ahora

```bash
# 1. Ejecuta el ejemplo
python3 ejemplo_rapido.py

# 2. O el script interactivo
python3 buscar_clientes_b2b.py

# 3. O la API REST
cd backend && source venv/bin/activate && python main_b2b.py
```

---

**🎉 ¡Sistema listo para captar clientes B2B con datos validados!**

