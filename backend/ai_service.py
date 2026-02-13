import os
import logging
import json
import time
from typing import Dict, List, Optional, Any
from google import genai
from datetime import datetime

logger = logging.getLogger(__name__)

# Configurar API Key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
# Modelo unificado para evitar confusiones de cuota
DEFAULT_MODEL = 'gemini-2.0-flash'

def get_ai_client():
    if not GOOGLE_API_KEY:
        return None
    try:
        return genai.Client(api_key=GOOGLE_API_KEY)
    except Exception as e:
        logger.error(f"Error initializing Gemini client: {e}")
        return None

def call_gemini_with_retry(prompt: str, model: str = DEFAULT_MODEL, max_retries: int = 2) -> Optional[str]:
    """Llamada a Gemini con reintentos para manejar 429 RESOURCE_EXHAUSTED"""
    client = get_ai_client()
    if not client: return None
    
    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt
            )
            return response.text
        except Exception as e:
            error_str = str(e).upper()
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                if attempt < max_retries:
                    wait_time = (attempt + 1) * 2
                    logger.warning(f"Gemini Rate Limit (429). Reintentando en {wait_time}s... (Intento {attempt + 1})")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error("Gemini Quota Exhausted after retries.")
                    raise e
            raise e
    return None

def analyze_conversation_intent(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analiza un hilo de mensajes y determina la intención del lead.
    """
    try:
        # Preparar el historial para el prompt
        history_text = ""
        for msg in messages[-10:]: # Ultimos 10 mensajes
            sender = "Lead" if msg.get('direction') == 'inbound' else "Agente (Yo)"
            history_text += f"{sender}: {msg.get('body_text', '')}\n"

        prompt = f"""
        Sos un experto en ventas B2B. Tu tarea es analizar el siguiente hilo de conversación 
        entre un Agente de Ventas y un Lead (prospecto).
        
        Debes clasificar el estado del Lead en una de estas categorías:
        - interested: El lead muestra interés real, pide precios, quiere una reunión o hace preguntas específicas.
        - not_interested: El lead dice explícitamente que no le interesa, pide ser removido o es hostil.
        - waiting_reply: El agente hizo una pregunta y el lead aún no respondió.
        - replied: El lead respondió algo neutral o genérico.
        - open: Conversación inicial.

        Historial de conversación:
        {history_text}

        Responde ÚNICAMENTE en formato JSON plano:
        {{
            "status": "categoría_elegida",
            "reason": "breve explicación en español",
            "sentiment": "positivo/negativo/neutral"
        }}
        """

        text_response = call_gemini_with_retry(prompt)
        if not text_response:
            return {"status": "replied", "reason": "AI response empty"}

        # Limpiar posible formato markdown
        clean_response = text_response.strip().replace("```json", "").replace("```", "")
        return json.loads(clean_response)
        
    except Exception as e:
        logger.error(f"Error in Gemini AI analysis: {e}")
        return {"status": "replied", "reason": "Quota limited or AI error"}

def get_ai_assistant_response(query: str, context_data: str) -> str:
    """
    Responde a consultas del usuario sobre sus leads usando RAG light.
    """
    try:
        prompt = f"""
        1. Sos una IA de soporte para Smart Leads. Tus respuestas deben ser elegantes, útiles y profesionales.
        Smart Leads tiene 3 planes:
        • Essential: $49 USD / mes (1.500 créditos)
        • Growth: $89 USD / mes (3.000 créditos)
        • Agency: $199 USD / mes (15.000 créditos)
        
        Si el usuario pregunta por precios en ARS (Pesos Argentinos), mentioná que el precio se calcula dinámicamente al valor del Dólar Blue del día.
        
        Si el usuario necesita más ayuda, quiere contactar a un administrador o tiene problemas técnicos, debés proporcionarle los datos de contacto de Ivan Levy de forma clara:
        
        CONTACTO DE SOPORTE:
        Email: ivo.levy03@gmail.com / solutionsdota@gmail.com
        WhatsApp: +54 9 11 3824-0929
        
        2. Conocimiento: Sos experto en búsqueda de leads en Google Maps, exportación a Excel, y el sistema de envío de emails/WhatsApp integrado.
        Tu objetivo es ayudar al usuario con temas relacionados al sistema Smart Leads, sus leads, planes de suscripción y funcionalidades.

        REGLAS DE FORMATO (¡MUY IMPORTANTE!):
        - NO uses asteriscos (*) ni guiones (-) para listas. Usa el símbolo "•".
        - NO uses negritas de markdown (**texto**).
        - Deja un espacio (doble salto de línea) entre párrafos o secciones.
        - Usa MAYÚSCULAS para encabezados de sección.
        - Sé extremadamente limpio y organizado en tu respuesta.

        REGLAS DE COMPORTAMIENTO:
        1. ÁMBITO PERMITIDO: Puedes responder sobre cualquier dato de los LEADS proporcionados, el estado de las CONVERSACIONES (Gmail/WhatsApp), los PLANES de precios (Essential/Growth/Agency) y funciones técnicas de la PLATAFORMA.
        2. ANÁLISIS DE DATOS: Si el usuario pregunta cosas como "¿Cuántos leads tengo?" o "¿De qué hablamos con X?", utiliza los datos de contexto para responder.
        3. GUARDRAILS: RECHAZA ÚNICAMENTE consultas de cultura general, matemática pura, recetas, o temas que no tengan NINGUNA relación con el negocio B2B o el uso de Smart Leads.
        4. Si es una consulta prohibida, responde EXACTAMENTE: "Lo siento, solo puedo ayudarte con temas relacionados al sistema Smart Leads."
        5. Sé conciso y profesional en español.

        DATOS DE CONTEXTO (Leads/Conversaciones):
        {context_data}

        CONSULTA DEL USUARIO:
        {query}
        """
        
        return call_gemini_with_retry(prompt)
    except Exception as e:
        error_str = str(e).upper()
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            return "Lo siento, el sistema está recibiendo muchas consultas en este momento (Límite de cuota Gemni alcanzado). Por favor, intentá de nuevo en un minuto."
        
        logger.error(f"Error in AI Assistant: {e}")
        return f"Error al procesar la consulta: {str(e)}"
