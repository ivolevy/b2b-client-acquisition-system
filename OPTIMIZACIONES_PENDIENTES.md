# Optimizaciones Pendientes - Sistema B2B

## ✅ COMPLETADO

### 1. Scraping Paralelo
- ✅ Implementado `scraper_parallel.py` con ThreadPoolExecutor
- ✅ Rate limiting para evitar bloqueos (0.5s entre requests)
- ✅ Manejo robusto de errores (timeouts, excepciones)
- ✅ Procesamiento paralelo de hasta 5 empresas simultáneamente
- ✅ Logging detallado de progreso
- ✅ Mantiene orden original de empresas
- ✅ Filtra empresas que ya tienen datos completos

---

## 🔴 PRIORIDAD ALTA

### 2. Paginación en Backend
**Problema actual:**
- `GET /empresas` carga TODAS las empresas en memoria
- Frontend recibe miles de registros de una vez
- Lento y consume mucha memoria

**Solución:**
```python
# En db.py
def obtener_empresas_paginadas(page: int = 1, per_page: int = 50, ...):
    offset = (page - 1) * per_page
    cursor.execute(
        'SELECT * FROM empresas ... LIMIT ? OFFSET ?',
        (per_page, offset)
    )
```

**Archivos a modificar:**
- `backend/db.py`: Agregar función `obtener_empresas_paginadas()`
- `backend/main.py`: Modificar endpoint `/empresas` para aceptar `page` y `per_page`
- `frontend/src/App_B2B.jsx`: Implementar paginación en frontend
- `frontend/src/components/TableViewB2B.jsx`: Usar paginación del backend

**Impacto:** ⚡⚡⚡ Muy alto - Mejora dramática en tiempos de carga

---

### 3. Connection Pooling para SQLite
**Problema actual:**
- 17 conexiones `sqlite3.connect()` diferentes en el código
- Cada request abre/cierra conexión nueva
- Ineficiente y puede causar locks

**Solución:**
```python
# Crear db_pool.py
import sqlite3
from contextlib import contextmanager

class DatabasePool:
    def __init__(self, db_path):
        self.db_path = db_path
    
    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except:
            conn.rollback()
            raise
        finally:
            conn.close()
```

**Archivos a modificar:**
- `backend/db_pool.py`: Crear nuevo módulo
- `backend/db.py`: Reemplazar todas las conexiones con pool
- `backend/main.py`: Actualizar endpoints que usan conexiones directas

**Impacto:** ⚡⚡ Alto - Mejora rendimiento y reduce locks

---

### 4. Filtros en Backend
**Problema actual:**
- Filtros se hacen en frontend (`App_B2B.jsx` líneas 96-134)
- Todas las empresas se cargan y filtran en JavaScript
- Ineficiente para grandes volúmenes

**Solución:**
- Usar endpoint `/filtrar` que ya existe pero no se usa
- Modificar `handleFiltrar` en `App_B2B.jsx` para llamar al backend
- Eliminar lógica de filtrado del frontend

**Archivos a modificar:**
- `frontend/src/App_B2B.jsx`: Cambiar `handleFiltrar` para usar API
- `backend/main.py`: Verificar que `/filtrar` esté optimizado

**Impacto:** ⚡⚡ Alto - Reduce carga del frontend

---

## 🟡 PRIORIDAD MEDIA

### 5. Optimización de Estadísticas
**Problema actual:**
- `obtener_estadisticas()` hace 4 queries separadas
- Podría ser una sola query con GROUP BY

**Solución:**
```python
# En db.py
def obtener_estadisticas() -> Dict:
    cursor.execute('''
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN email != '' THEN 1 ELSE 0 END) as con_email,
            SUM(CASE WHEN telefono != '' THEN 1 ELSE 0 END) as con_telefono,
            SUM(CASE WHEN website != '' THEN 1 ELSE 0 END) as con_website
        FROM empresas
    ''')
```

**Archivos a modificar:**
- `backend/db.py`: Optimizar `obtener_estadisticas()`

**Impacto:** ⚡ Medio - Mejora tiempos de respuesta

---

### 6. Envío de Emails Asíncrono
**Problema actual:**
- `enviar_emails_masivo()` usa `time.sleep()` que bloquea
- Conexión SMTP se abre/cierra por cada email
- Secuencial, muy lento para muchos emails

**Solución:**
```python
# Usar asyncio y aiosmtplib
import asyncio
import aiosmtplib

async def enviar_email_async(...):
    async with aiosmtplib.SMTP(...) as smtp:
        await smtp.send_message(msg)
```

**Archivos a modificar:**
- `backend/email_service.py`: Convertir a async
- `backend/main.py`: Endpoints de email deben ser async

**Impacto:** ⚡⚡ Medio-Alto - Mejora velocidad de envío masivo

---

### 7. Debouncing en Búsquedas Frontend
**Problema actual:**
- Cada tecla en inputs de búsqueda dispara filtros
- Puede causar lag en listas grandes

**Solución:**
```javascript
// Usar useDebounce hook
import { useDebounce } from 'use-debounce';

const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
```

**Archivos a modificar:**
- `frontend/src/components/FiltersB2B.jsx`: Agregar debounce
- `frontend/package.json`: Agregar `use-debounce`

**Impacto:** ⚡ Medio - Mejora UX

---

### 8. Índices Compuestos en Base de Datos
**Problema actual:**
- Índices individuales pero no compuestos
- Búsquedas por rubro+ciudad son lentas

**Solución:**
```sql
CREATE INDEX IF NOT EXISTS idx_rubro_ciudad ON empresas(rubro_key, ciudad);
CREATE INDEX IF NOT EXISTS idx_email_valido ON empresas(email) WHERE email != '';
```

**Archivos a modificar:**
- `backend/db.py`: Agregar índices compuestos en `init_db_b2b()`

**Impacto:** ⚡ Medio - Mejora búsquedas complejas

---

## 🟢 PRIORIDAD BAJA

### 9. Caché de Respuestas
**Problema actual:**
- Cada request a `/rubros` o `/estadisticas` consulta BD
- Datos que cambian poco se recalculan siempre

**Solución:**
```python
from functools import lru_cache
from datetime import datetime, timedelta

cache_stats = {}
CACHE_TTL = timedelta(minutes=5)

@lru_cache(maxsize=128)
def obtener_rubros_cached():
    return listar_rubros_disponibles()
```

**Archivos a modificar:**
- `backend/main.py`: Agregar caché a endpoints estáticos
- O usar Redis para caché distribuido

**Impacto:** ⚡ Bajo-Medio - Reduce carga en BD

---

### 10. Compresión HTTP
**Problema actual:**
- Respuestas JSON grandes sin comprimir
- Consume más ancho de banda

**Solución:**
```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

**Archivos a modificar:**
- `backend/main.py`: Agregar middleware de compresión

**Impacto:** ⚡ Bajo - Mejora velocidad de transferencia

---

### 11. Virtual Scrolling en Frontend
**Problema actual:**
- Tabla renderiza todas las filas visibles
- Con paginación del backend, esto es menos crítico

**Solución:**
```javascript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={empresas.length}
  itemSize={50}
>
  {Row}
</FixedSizeList>
```

**Archivos a modificar:**
- `frontend/src/components/TableViewB2B.jsx`: Implementar virtual scrolling
- `frontend/package.json`: Agregar `react-window`

**Impacto:** ⚡ Bajo - Solo útil si se muestran muchas filas sin paginación

---

### 12. Optimización de Logs
**Problema actual:**
- Logs excesivos en producción
- Todos los niveles se escriben a archivo

**Solución:**
```python
import os

LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
logging.basicConfig(level=getattr(logging, LOG_LEVEL))
```

**Archivos a modificar:**
- `backend/main.py`: Configurar nivel de log desde env
- `backend/scraper.py`: Reducir logs en producción

**Impacto:** ⚡ Bajo - Reduce I/O de disco

---

## 📊 Resumen de Impacto

| Optimización | Prioridad | Impacto | Complejidad | Tiempo Estimado |
|-------------|-----------|---------|-------------|-----------------|
| Scraping Paralelo | ✅ | ⚡⚡⚡ | Media | ✅ Completado |
| Paginación Backend | 🔴 Alta | ⚡⚡⚡ | Baja | 2-3 horas |
| Connection Pooling | 🔴 Alta | ⚡⚡ | Media | 3-4 horas |
| Filtros en Backend | 🔴 Alta | ⚡⚡ | Baja | 1-2 horas |
| Estadísticas Optimizadas | 🟡 Media | ⚡ | Baja | 1 hora |
| Emails Asíncronos | 🟡 Media | ⚡⚡ | Alta | 4-5 horas |
| Debouncing | 🟡 Media | ⚡ | Baja | 30 min |
| Índices Compuestos | 🟡 Media | ⚡ | Baja | 30 min |
| Caché | 🟢 Baja | ⚡ | Media | 2-3 horas |
| Compresión HTTP | 🟢 Baja | ⚡ | Baja | 15 min |
| Virtual Scrolling | 🟢 Baja | ⚡ | Media | 2 horas |
| Logs Optimizados | 🟢 Baja | ⚡ | Baja | 30 min |

---

## 🎯 Recomendación de Orden de Implementación

1. **Paginación Backend** (más impacto, fácil)
2. **Filtros en Backend** (complementa paginación)
3. **Connection Pooling** (mejora general)
4. **Estadísticas Optimizadas** (rápido de hacer)
5. **Índices Compuestos** (rápido, mejora búsquedas)
6. **Debouncing** (mejora UX)
7. **Emails Asíncronos** (si se envía mucho)
8. **Caché** (si hay mucho tráfico)
9. **Compresión HTTP** (fácil, bajo impacto)
10. **Virtual Scrolling** (solo si necesario)
11. **Logs Optimizados** (último)

---

## 📝 Notas Adicionales

- **Testing**: Agregar tests para cada optimización
- **Monitoreo**: Considerar agregar métricas de rendimiento
- **Documentación**: Actualizar README con nuevas features
- **Backup**: Hacer backup de BD antes de cambios grandes


