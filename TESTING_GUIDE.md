# Guía de Testing y Performance

Esta guía explica cómo testear la aplicación B2B Client Acquisition System en cuanto a performance, carga y funcionalidad correcta.

## 1. Validar Backend (Unit Tests)

Usamos `pytest` para verificar que la API funciona correctamente a nivel lógico.

### Requisitos
Asegúrate de tener las dependencias instaladas:
```bash
cd backend
pip install -r requirements.txt
```

### Ejecutar Tests
Para correr todos los tests automáticos:
```bash
# Desde la carpeta /backend
pytest
```
Deberías ver una salida en verde indicando que los tests `test_main.py` pasaron.

---

## 2. Test de Carga (Load Testing)

Usamos `locust` para simular múltiples usuarios concurrentes golpeando la API. Esto sirve para ver cómo se comporta el servidor bajo presión.

### Ejecutar Locust
1. Asegúrate de que tu backend esté corriendo en una terminal:
   ```bash
   ./start_backend.sh
   # O python -m uvicorn backend.main:app --reload
   ```

2. En **otra terminal**, inicia Locust:
   ```bash
   cd backend
   locust
   ```

3. Abre tu navegador en `http://localhost:8089`.
4. Configura la prueba:
   - **Number of users**: e.g., 50
   - **Spawn rate**: e.g., 5
   - **Host**: `http://localhost:8000` (o donde esté tu API)
5. Haz clic en **Start Swarming**.

Podrás ver en tiempo real los RPS (Reanciest per Second) y si hay fallos.

---

## 3. Frontend Performance (Lighthouse)

Para validar la performance del cliente (React), la herramienta estándar es **Lighthouse**.

### Pasos Manuales
1. Abre la aplicación en Chrome (`http://localhost:5173` o la URL de prod).
2. Abre las Developer Tools (`F12` o `Click derecho > Inspeccionar`).
3. Ve a la pestaña **Lighthouse**.
4. Selecciona:
   - Mode: Navigation
   - Device: Mobile (o Desktop según lo que quieras probar)
   - Categories: Performance, Best Practices, SEO.
5. Haz clic en **Analyze page load**.

> [!TIP]
> **Recomendación:** Es mejor correr Lighthouse en la versión **desplegada** (producción) en lugar de localhost. La versión de desarrollo es más lenta porque no está optimizada (minificada, comprimida, etc.).
>
> **Nota para usuarios de Safari/Firefox:** Si no tienes Chrome instalado, puedes usar [PageSpeed Insights](https://pagespeed.web.dev/) que corre Lighthouse en la nube sobre tu sitio público.


### Qué buscar
- **First Contentful Paint (FCP)**: Debería ser < 1.8s.
- **Largest Contentful Paint (LCP)**: Elemento más grande visible. Ideal < 2.5s.
- **Cumulative Layout Shift (CLS)**: Estabilidad visual. Ideal < 0.1.

---

## 4. Estructura de Tests
- `backend/tests/`: Carpeta contenedora de tests unitarios.
- `backend/locustfile.py`: Definición de los escenarios de carga.
