"""
Configuración centralizada de rubros para búsqueda B2B.
Optimizado para Google Places API.
"""

RUBROS_DISPONIBLES = {
    "colegios": {
        "nombre": "Colegios e Instituciones Educativas",
        "keywords": [
            "Colegio", "Colegio bilingüe", "Escuela Primaria", 
            "Escuela Secundaria", "Jardín de infantes", "Instituto de enseñanza",
            "Jardin maternal", "Universidad", "Facultad", "Instituto Superior", 
            "Centro educativo", "Preescolar", "Liceo", "Colegio parroquial",
            "Bachillerato", "Normal"
        ]
    },
    "metalurgicas": {
        "nombre": "Metalúrgicas e Industria del Metal",
        "keywords": [
            "Metalurgica", "Metalúrgica", "Fundicion", "Soldadura", "Corte Laser", 
            "Mecanizado", "Torno", "Hierros", "Inox", "Metales", "Carpintería metálica"
        ]
    },
    "madereras": {
        "nombre": "Madereras y Carpinterías",
        "keywords": [
            "Maderera", "Carpinteria", "Carpintería", "Aserradero", "Muebles", 
            "Placas", "Melamina", "Herrajes", "Fábrica de muebles"
        ]
    },
    "fabricas": {
        "nombre": "Fábricas e Industrias Generales",
        "keywords": [
            "Fabrica", "Fábrica", "Planta Industrial", "Industrial", "Manufactura", 
            "Producción", "Industria", "Insumos Industriales"
        ]
    },
    "construccion_arquitectura": {
        "nombre": "Construcción y Arquitectura",
        "keywords": [
            "Constructora", "Arquitecto", "Arquitectura", "Inmobiliaria", 
            "Desarrolladora", "Materiales construcción", "Corralón", "Reformas"
        ]
    },
    "tecnologia_digital": {
        "nombre": "Tecnología y Servicios Digitales",
        "keywords": [
            "Software", "Sistemas", "Programacion", "Desarrollo web", 
            "Agencia digital", "Marketing", "Consultoría IT", "IT Outsourcing", "SaaS"
        ]
    },
    "salud_bienestar": {
        "nombre": "Salud y Bienestar",
        "keywords": [
            "Clinica", "Clínica", "Hospital", "Sanatorio", "Centro médico", 
            "Kinesiología", "Odontología", "Estética", "Spa", "Gimnasio"
        ]
    },
    "gastronomia": {
        "nombre": "Gastronomía",
        "keywords": [
            "Restaurante", "Catering", "Comida", "Gastronomia", "Bar", 
            "Cafetería", "Rotisería", "Resto"
        ]
    },
    "hoteles": {
        "nombre": "Hotelería y Alojamiento",
        "keywords": [
            "Hotel", "Hostel", "Alojamiento", "Hospedaje", "Cabañas", "Apart"
        ]
    },
    "mantenimiento_seguridad": {
        "nombre": "Mantenimiento y Seguridad",
        "keywords": [
            "Limpieza", "Seguridad", "Mantenimiento", "Fumigación", 
            "Ascensores", "Refrigeración"
        ]
    },
    "cotillones_y_reposteria": {
        "nombre": "Cotillón, Disfraces y Repostería",
        "keywords": [
            "Cotillon", "Cotillón", "Reposteria", "Repostería", "Disfraz", 
            "Artículos de fiesta", "Insumos repostería"
        ]
    }
}

def listar_rubros_disponibles():
    """Retorna un diccionario simple con key: nombre"""
    return {k: v["nombre"] for k, v in RUBROS_DISPONIBLES.items()}
