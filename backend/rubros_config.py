"""
Configuración centralizada de rubros para búsqueda B2B.
Optimizado para Google Places API.
"""

RUBROS_DISPONIBLES = {
    "colegios": {
        "nombre": "Colegios e Instituciones Educativas",
        "keywords": ["Colegio", "Escuela", "Universidad", "Instituto", "Jardin de infantes", "Formación"]
    },
    "metalurgicas": {
        "nombre": "Metalúrgicas e Industria del Metal",
        "keywords": ["Metalúrgica", "Fundición", "Corte Laser", "Hierros", "Inox", "Estructuras Metálicas", "Soldadura"]
    },
    "madereras": {
        "nombre": "Madereras y Carpinterías",
        "keywords": ["Maderera", "Carpintería", "Aserradero", "Herrajes", "Muebles a medida"]
    },
    "fabricas": {
        "nombre": "Fábricas e Industrias Generales",
        "keywords": ["Fábrica", "Planta Industrial", "Manufactura", "Industrial", "Insumos Industriales"]
    },
    "construccion_arquitectura": {
        "nombre": "Construcción y Arquitectura",
        "keywords": [
            "Constructora", "Arquitectura", "Desarrolladora Inmobiliaria", 
            "Estudio de Arquitectura", "Diseño de Interiores", "Reformas"
        ]
    },
    "tecnologia_digital": {
        "nombre": "Tecnología y Servicios Digitales",
        "keywords": [
            "Software Factory", "Agencia Digital", "Marketing Digital", 
            "SEO Specialist", "SaaS", "Desarrollo Web", "Consultoría IT", 
            "Software Development", "App Development", "IT Outsourcing",
            "Ciberseguridad", "Data Analytics", "Programación", "Desarrollo de Software"
        ]
    },
    "salud_bienestar": {
        "nombre": "Salud y Bienestar",
        "keywords": ["Clínica", "Hospital", "Centro Médico", "Sanatorio", "Spa", "Centro de Estética"]
    },
    "gastronomia": {
        "nombre": "Gastronomía",
        "keywords": ["Restaurante", "Cadena de comida", "Catering", "Eventos", "Gastronomía"]
    },
    "hoteles": {
        "nombre": "Hotelería y Alojamiento",
        "keywords": ["Hotel", "Resort", "Apart Hotel", "Hostelería"]
    },
    "mantenimiento_seguridad": {
        "nombre": "Mantenimiento y Seguridad",
        "keywords": ["Empresa de Limpieza", "Seguridad Privada", "Mantenimiento Industrial", "Facility Management"]
    },
    "cotillones_y_reposteria": {
        "nombre": "Cotillón, Disfraces y Repostería",
        "keywords": ["Cotillón", "Repostería", "Disfraz", "Artículos de Fiesta"]
    }
}

def listar_rubros_disponibles():
    """Retorna un diccionario simple con key: nombre"""
    return {k: v["nombre"] for k, v in RUBROS_DISPONIBLES.items()}
