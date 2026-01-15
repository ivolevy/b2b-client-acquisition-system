
import os
import json
import logging
from datetime import datetime
from typing import Dict, Optional

# Configuración de costos PRECISOS (según Google Places New Pricing)
# Text Search (New): Se usa el SKU "Text Search (ID Only)" + "Basic Data" + "Contact Data"
# - Text Search (ID Only): Gratis (o muy barato).
# - Basic Data: Gratis/Barato ($0.00).
# - Contact Data (Website, Phone): ~$0.012 - $0.030 dependiendo del volumen.
# - Advanced Data (Rating, Opening Hours): ~$0.020.
#
# Para simplificar y asegurar no pasarnos, usaremos el costo "Worst Case" de una query rica:
# search + details = ~$0.032 - $0.040 por EMPRESA (si pedimos todo).
#
# PERO: La llamada "Text Search" inicial devuelve una LISTA. 
# Google cobra POR FIELD MASK y POR RESULTADO devuelto si usas la API v1 places:searchText.
# Si la API devuelve 20 resultados con campos de contacto, cobra 20 x Costo.
# OJO: Text Search (New) cobra diferente.
# Pro Pricing: $32.00 / 1000 requests -> $0.032 por cada llamada a la API (independiente de resultados? NO, es por request si usas field mask alta).
#
# Ajuste fino: $0.032 por cada llamada a "search_places" (Text Search Pro SKU), ya que pedimos website/phone para los 20 resultados.

COST_TEXT_SEARCH = 0.032  # USD por petición a la API (devuelve hasta 20 empresas)
COST_PLACE_DETAILS = 0.017 # USD por petición de detalles adicionales (si se usa)
MONTHLY_BUDGET_LIMIT = 190.0 # USD

# ... (resto de la clase igual)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QuotaManager:
    _instance = None
    _usage_file = "api_usage.json"
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(QuotaManager, cls).__new__(cls)
            cls._instance._load_usage()
        return cls._instance

    def _load_usage(self):
        """Carga el uso desde archivo local (persistencia simple)"""
        try:
            if os.path.exists(self._usage_file):
                with open(self._usage_file, 'r') as f:
                    self.usage_data = json.load(f)
            else:
                self.usage_data = self._init_usage_structure()
        except Exception as e:
            logger.error(f"Error cargando quota usage: {e}")
            self.usage_data = self._init_usage_structure()
            
        # Verificar reset mensual
        self._check_monthly_reset()

    def _init_usage_structure(self):
        return {
            "month": datetime.now().strftime("%Y-%m"),
            "total_cost": 0.0,
            "requests_count": 0,
            "force_osm": False, # Interruptor manual
            "history": [] # Lista de eventos {timestamp, type, cost, details}
        }

    def _check_monthly_reset(self):
        current_month = datetime.now().strftime("%Y-%m")
        if self.usage_data["month"] != current_month:
            logger.info(f"Nuevo mes detectado ({current_month}). Reseteando cuota.")
            self.usage_data = {
                "month": current_month,
                "total_cost": 0.0,
                "requests_count": 0,
                "force_osm": False,
                "history": []
            }
            self._save_usage()

    def _save_usage(self):
        try:
            with open(self._usage_file, 'w') as f:
                json.dump(self.usage_data, f, indent=2)
        except Exception as e:
            logger.error(f"Error guardando quota usage: {e}")

    def _log_event(self, type_name: str, cost: float, details: str = ""):
        """Registra un evento en el historial"""
        event = {
            "timestamp": datetime.now().isoformat(),
            "type": type_name,
            "cost": cost,
            "details": details
        }
        # Mantener historial manejable (ej. ultimos 1000 eventos)
        if "history" not in self.usage_data:
            self.usage_data["history"] = []
            
        self.usage_data["history"].insert(0, event) # Cargar al principio (más reciente)
        self.usage_data["history"] = self.usage_data["history"][:500] 
        self._save_usage()

    def track_search(self, query: str = "", num_results: int = 0):
        """Registra el costo de una búsqueda (Text Search)"""
        self.usage_data["total_cost"] += COST_TEXT_SEARCH
        self.usage_data["requests_count"] += 1
        self._log_event("Text Search", COST_TEXT_SEARCH, f"Query: {query} ({num_results} results)")

    def track_details(self, count: int = 1, context: str = ""):
        """Registra el costo de obtener detalles (Place Details)"""
        cost = count * COST_PLACE_DETAILS
        self.usage_data["total_cost"] += cost
        self._log_event("Place Details", cost, f"Fetched details for {count} places. {context}")
        self.usage_data["requests_count"] += count
        self._save_usage()

    def can_use_google(self) -> bool:
        """Determina si se puede usar Google API"""
        if self.usage_data.get("force_osm", False):
            return False
            
        if self.usage_data["total_cost"] >= MONTHLY_BUDGET_LIMIT:
            logger.warning(f"Presupuesto excedido (${self.usage_data['total_cost']:.2f} / ${MONTHLY_BUDGET_LIMIT}). Usando Failover (OSM).")
            return False
            
        return True

    def get_status(self) -> Dict:
        return {
            "used": round(self.usage_data["total_cost"], 4),
            "limit": MONTHLY_BUDGET_LIMIT,
            "requests": self.usage_data["requests_count"],
            "mode": "OpenStreetMap" if not self.can_use_google() else "Google Places",
            "forced_osm": self.usage_data.get("force_osm", False),
            "history": self.usage_data.get("history", [])
        }

    def set_force_osm(self, enabled: bool):
        self.usage_data["force_osm"] = enabled
        self._save_usage()

# Instancia global
quota_manager = QuotaManager()
