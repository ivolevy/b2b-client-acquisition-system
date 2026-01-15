
import os
import json
import logging
from datetime import datetime
from typing import Dict, Optional

# Configuración de costos aproximados (en USD)
COST_TEXT_SEARCH = 0.032  # Por Request (Text Search ID Only) - Aprox
COST_PLACE_DETAILS = 0.017 # Por Request (Contact Data + Basic) - Aprox
MONTHLY_BUDGET_LIMIT = 190.0 # USD (Buffer de seguridad para los $200 gratuitos)

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
            "force_osm": False # Interruptor manual
        }

    def _check_monthly_reset(self):
        current_month = datetime.now().strftime("%Y-%m")
        if self.usage_data["month"] != current_month:
            logger.info(f"Nuevo mes detectado ({current_month}). Reseteando cuota.")
            self.usage_data = {
                "month": current_month,
                "total_cost": 0.0,
                "requests_count": 0,
                "force_osm": False
            }
            self._save_usage()

    def _save_usage(self):
        try:
            with open(self._usage_file, 'w') as f:
                json.dump(self.usage_data, f, indent=2)
        except Exception as e:
            logger.error(f"Error guardando quota usage: {e}")

    def track_search(self, num_results: int = 20):
        """Registra el costo de una búsqueda (Text Search)"""
        # Google cobra por request de search (que devuelve hasta 20 results)
        # Asumimos 1 request de search.
        # Si luego pedimos detalles para CADA resultado, eso es aparte.
        
        self.usage_data["total_cost"] += COST_TEXT_SEARCH
        self.usage_data["requests_count"] += 1
        self._save_usage()

    def track_details(self, count: int = 1):
        """Registra el costo de obtener detalles (Place Details)"""
        cost = count * COST_PLACE_DETAILS
        self.usage_data["total_cost"] += cost
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
            "forced_osm": self.usage_data.get("force_osm", False)
        }

    def set_force_osm(self, enabled: bool):
        self.usage_data["force_osm"] = enabled
        self._save_usage()

# Instancia global
quota_manager = QuotaManager()
