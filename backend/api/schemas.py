from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class BusquedaRubroRequest(BaseModel):
    rubro: str
    bbox: Optional[str] = None  # "south,west,north,east"
    pais: Optional[str] = None
    ciudad: Optional[str] = None
    scrapear_websites: bool = True
    solo_validadas: bool = False  # Solo empresas con email o teléfono válido
    limpiar_anterior: bool = True  # True = nueva búsqueda (limpia), False = agregar a resultados
    # Información de ubicación de búsqueda
    busqueda_ubicacion_nombre: Optional[str] = None
    busqueda_centro_lat: Optional[float] = None
    busqueda_centro_lng: Optional[float] = None
    busqueda_radio_km: Optional[float] = None
    task_id: Optional[str] = None  # ID único de la tarea para tracking de progreso
    user_id: Optional[str] = None # ID del usuario para créditos
    smart_filter_text: Optional[str] = None
    smart_filter_audio_blob: Optional[str] = None # Aunque en realidad enviamos text desde frontend si ya transcribimos

class BusquedaMultipleRequest(BaseModel):
    pais: Optional[str] = None
    ciudad: Optional[str] = None
    user_id: Optional[str] = None

class FiltroRequest(BaseModel):
    rubro: Optional[str] = None
    ciudad: Optional[str] = None
    solo_validas: bool = True
    con_email: bool = False
    con_telefono: bool = False

class ExportRequest(BaseModel):
    rubro: Optional[str] = None
    formato: str = "csv"  # csv o json
    solo_validas: bool = True
    user_id: Optional[str] = None

class ActualizarEstadoRequest(BaseModel):
    id: str
    estado: str
    notas: Optional[str] = None

class ActualizarNotasRequest(BaseModel):
    id: str
    notas: str

class TemplateCreateRequest(BaseModel):
    user_id: str
    nombre: str
    subject: str
    body_html: str
    body_text: Optional[str] = None
    type: str = 'email'  # email | whatsapp

class TemplateModifyRequest(BaseModel):
    user_id: str
    nombre: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    type: Optional[str] = None




class EmailAttachment(BaseModel):
    filename: str
    content_base64: str
    content_type: str

class LogWhatsAppRequest(BaseModel):
    empresa_id: str
    phone: str
    message: str
    direction: str = 'outbound'

class SendEmailReplyRequest(BaseModel):
    conversation_id: str
    recipient_email: str
    subject: str
    message: str
    attachments: Optional[List[EmailAttachment]] = None

class UpdateConversationStatusRequest(BaseModel):
    status: str

class CreateLinkTrackingRequest(BaseModel):
    original_url: str
    lead_id: Optional[str] = None
    conversation_id: Optional[str] = None

class CreateShortLinkRequest(BaseModel):
    destination_url: str
    conversation_id: Optional[str] = None

class MPPreferenceRequest(BaseModel):
    user_id: str
    email: str
    name: str
    phone: str
    plan_id: str
    amount: float
    description: str

# Endpoints de Pagos
class EnviarEmailRequest(BaseModel):
    empresa_id: str
    empresa_data: Optional[Dict[str, Any]] = None
    template_id: str
    asunto_personalizado: Optional[str] = None
    user_id: Optional[str] = None
    provider: Optional[str] = None
    attachments: Optional[List[EmailAttachment]] = None

class EnviarEmailMasivoRequest(BaseModel):
    empresa_ids: List[str]
    empresas_data: Optional[List[Dict[str, Any]]] = None
    template_id: str
    asunto_personalizado: Optional[str] = None
    delay_segundos: float = 3.0
    user_id: Optional[str] = None
    auto_personalize: bool = False
    provider: Optional[str] = None
    attachments: Optional[List[EmailAttachment]] = None

# Modelos Gmail OAuth
class GoogleAuthURLRequest(BaseModel):
    state: str

class GoogleCallbackRequest(BaseModel):
    code: str
    user_id: str

class SearchHistoryRequest(BaseModel):
    user_id: str
    rubro: str
    ubicacion_nombre: Optional[str] = None
    centro_lat: Optional[float] = None
    centro_lng: Optional[float] = None
    radio_km: Optional[float] = None
    bbox: Optional[str] = None
    empresas_encontradas: Optional[int] = 0
    empresas_validas: Optional[int] = 0

class DisconnectRequest(BaseModel):
    user_id: str

class UserRubrosRequest(BaseModel):
    user_id: str
    rubro_keys: List[str]

# Inicializar sistema en memoria
class DisconnectRequest(BaseModel):
    user_id: str

class UserRubrosRequest(BaseModel):
    user_id: str
    rubro_keys: List[str]

class SolicitarCodigoRequest(BaseModel):
    email: str
    user_id: Optional[str] = None

class ValidarCodigoRequest(BaseModel):
    email: str
    codigo: str

class ActualizarPasswordResetRequest(BaseModel):
    email: str
    codigo: str
    new_password: str

class AdminDeleteUserRequest(BaseModel):
    user_id: str

class AdminCreateUserRequest(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None
    role: Optional[str] = 'user'
    plan: Optional[str] = 'starter'
    credits: Optional[int] = 1500

class AdminUpdateUserRequest(BaseModel):
    user_id: str
    updates: Dict[str, Any]

class AIAssistantRequest(BaseModel):
    query: str

class AutomationRuleRequest(BaseModel):
    name: str
    trigger_event: str = "email_received"
    condition_type: str
    condition_value: Dict[str, Any]
    action_type: str
    action_payload: Dict[str, Any]
    is_active: bool = True

