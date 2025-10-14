# 🏢 B2B Client Acquisition System

Sistema profesional de adquisición de clientes B2B con integración de OpenStreetMap para búsqueda geolocalizada de empresas, validación automática de contactos y gestión de leads.

## 🌟 Características Principales

### 🔍 Búsqueda Inteligente
- **Búsqueda Geolocalizada**: Encuentra empresas por ubicación en mapa interactivo
- **Filtros Avanzados**: Por rubro, ciudad, estado de validación
- **Radio Personalizable**: Define el área de búsqueda
- **OpenStreetMap Integration**: Datos en tiempo real de negocios locales

### ✅ Validación Automática
- **Validación de Emails**: Verificación de formato automática
- **Validación de Teléfonos**: Comprobación de números válidos
- **Scoring de Leads**: Puntuación automática según completitud de datos
- **Estados de Contacto**: Sistema de seguimiento de interacciones

### 📊 Visualización
- **Vista de Tabla**: Lista completa con filtros y ordenamiento
- **Vista de Mapa**: Visualización geográfica con Leaflet
- **Dashboard**: Estadísticas y métricas clave
- **Modo Oscuro**: Tema claro/oscuro

### 📥 Exportación
- **CSV Excel-Compatible**: Exportación con UTF-8 BOM
- **Campos Personalizables**: Selecciona qué datos exportar
- **Templates Email Marketing**: Listo para Mailchimp/Sendinblue
- **Exportación a WhatsApp**: Compartir contactos directo

## 🚀 Inicio Rápido

### Requisitos Previos
- Python 3.8+
- Node.js 16+
- pip
- npm

### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/ivolevy/b2b-client-acquisition-system.git
cd b2b-client-acquisition-system
```

2. **Configurar Backend (Python)**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configurar Frontend (React)**
```bash
cd frontend
npm install
```

### Ejecución

**Opción 1: Scripts automáticos**
```bash
# Terminal 1 - Backend
./start_backend.sh  # En Windows: start_backend.bat

# Terminal 2 - Frontend
./start_frontend.sh  # En Windows: start_frontend.bat
```

**Opción 2: Manual**
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Abre tu navegador en `http://localhost:5173`

## 📁 Estructura del Proyecto

```
b2b-client-acquisition-system/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── db.py                # Database operations
│   ├── overpass_client.py   # OpenStreetMap client
│   ├── scraper.py           # Web scraping utilities
│   ├── validators.py        # Email/phone validation
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── FiltersB2B.jsx
│   │   │   ├── TableViewB2B.jsx
│   │   │   ├── MapView.jsx
│   │   │   ├── DatabaseViewer.jsx
│   │   │   └── LocationPicker.jsx
│   │   ├── App_B2B.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── data/
│   └── empresas_b2b.db      # SQLite database
├── logs/
└── README.md
```

## 🛠️ Tecnologías

### Backend
- **FastAPI**: Framework web moderno y rápido
- **SQLite**: Base de datos ligera
- **BeautifulSoup4**: Web scraping
- **Requests**: HTTP client
- **Pydantic**: Validación de datos

### Frontend
- **React 18**: UI library
- **Vite**: Build tool
- **Leaflet**: Mapas interactivos
- **CSS Variables**: Theming system

## 📋 Uso

### 1. Buscar Empresas
1. Selecciona un rubro del dropdown
2. Elige una ubicación en el mapa
3. Click en "Buscar Empresas en el Área"
4. El sistema buscará y validará automáticamente

### 2. Filtrar Resultados
- **Por Rubro**: Filtra por tipo de negocio
- **Por Ciudad**: Busca en ciudades específicas
- **Por Estado**: Solo válidas o todas
- **Por Contacto**: Con email, teléfono o ambos

### 3. Exportar Datos
- Click en "📥 Exportar CSV"
- Los datos se descargan con formato Excel-compatible
- Headers en español, valores legibles

### 4. Ver en Mapa
- Toggle "🗺️ Mapa" para vista geográfica
- Markers clickeables con info completa
- Zoom y navegación interactiva

## 🔧 Configuración

### Rubros Disponibles
El sistema soporta múltiples rubros de negocio:
- Restaurantes
- Cafeterías
- Hoteles
- Gimnasios
- Oficinas
- Tiendas
- Y más...

Ver `backend/overpass_client.py` para la lista completa.

### Base de Datos
La base de datos SQLite almacena:
- Información de empresas
- Datos de validación
- Estados de contacto
- Coordenadas geográficas
- Redes sociales

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Roadmap

### Próximas Funcionalidades
- [ ] Extracción automática de redes sociales
- [ ] Sistema de scoring de leads avanzado
- [ ] Vista Kanban para gestión de pipeline
- [ ] Detección de duplicados inteligente
- [ ] Importación de CSV
- [ ] Dashboard de analytics
- [ ] Integración con Google Sheets
- [ ] Búsqueda por polígono personalizado
- [ ] Templates de email marketing
- [ ] Modo oscuro completo

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👨‍💻 Autor

**Ivan Levy**
- GitHub: [@ivolevy](https://github.com/ivolevy)
- Repo: [b2b-client-acquisition-system](https://github.com/ivolevy/b2b-client-acquisition-system)

## 🙏 Agradecimientos

- [OpenStreetMap](https://www.openstreetmap.org/) por los datos geográficos
- [Overpass API](https://overpass-api.de/) por la consulta de datos
- [Leaflet](https://leafletjs.com/) por los mapas interactivos
- [FastAPI](https://fastapi.tiangolo.com/) por el excelente framework
- [React](https://react.dev/) por la UI library

---

⭐ Si este proyecto te resulta útil, considera darle una estrella en GitHub!

