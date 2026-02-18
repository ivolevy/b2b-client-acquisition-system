import os
import logging
import json
import time
from typing import Dict, List, Optional, Any
from google import genai
from datetime import datetime
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Cargar variables de entorno
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Subir un nivel para encontrar el .env en frontend/.env o root
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), "frontend", ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env")) 

# Configurar API Key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("VITE_GOOGLE_MAPS_API_KEY") # Fallback to any available key if needed, though Maps key is different from Gemini usually.
# Actually, the user uses GOOGLE_API_KEY for Gemini. Checking main.py...
# main.py expects GOOGLE_API_KEY.
# Let's hope it's in the .env that db_supabase loads.
# db_supabase loads .env from BASE_DIR/.env
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

def draft_message_from_instruction(instruction: str, type: str = "email") -> Dict[str, str]:
    """
    Usa Gemini para redactar un mensaje de outreach basado en una instrucción del usuario.
    """
    try:
        context = "email" if type == "email" else "WhatsApp"
        placeholders = "{{ai_icebreaker}}, {{nombre}}, {{empresa}}, {{rubro}}, {{ciudad}}" if type == "email" else "{ai_icebreaker}, {nombre}, {empresa}, {rubro}, {ciudad}"
        
        prompt = f"""
        Sos un experto en Copywriting para Ventas B2B. Tu objetivo es redactar un mensaje para {context} basado en la siguiente instrucción del usuario:
        
        INSTRUCCIÓN: "{instruction}"
        
        REGLAS DE ORO:
        1. ESTRUCTURA: El mensaje debe ser profesional, conciso y orientado a la conversión.
        2. VARIABLES: Debes usar los siguientes tags donde queden naturales: {placeholders}.
        3. APERTURA: SIEMPRE comienza el mensaje con el tag de apertura IA ({{{{ai_icebreaker}}}} o {{ai_icebreaker}}) para que el sistema inyecte la personalización ahí.
        4. TONO: Humano y directo. Evita sonar como un bot o un spammer.
        5. ASUNTO (Solo si es email): Provee un asunto magnético que aumente el open rate.
        
        FORMATO DE RESPUESTA (Estrictamente JSON):
        {{
            "subject": "Asunto de alto impacto",
            "body": "Cuerpo del mensaje con los {{tags}} correspondientes..."
        }}
        """

        response_text = call_gemini_with_retry(prompt)
        
        # Intentar parsear JSON de la respuesta de Gemini
        try:
            import json
            import re
            # Limpiar posibles bloques de código markdown
            clean_json = re.sub(r'```json\n|\n```|```', '', response_text).strip()
            return json.loads(clean_json)
        except:
            # Fallback si no devuelve JSON puro
            return {
                "subject": "Propuesta de valor",
                "body": response_text
            }
            
            
    except Exception as e:
        logger.error(f"Error drafting template: {e}")
        return {"subject": "", "body": f"Error redactando borrador: {str(e)}"}

def generate_icebreaker(lead_data: Dict[str, Any]) -> str:
    """
    Genera una línea de apertura hiper-personalizada para un lead.
    """
    try:
        # Construir contexto del lead (Soporte snake_case y camelCase)
        nombre = lead_data.get('nombre') or lead_data.get('name') or 'Prospecto'
        rubro = lead_data.get('rubro') or lead_data.get('category') or 'su sector'
        ciudad = lead_data.get('ciudad') or lead_data.get('city') or ''
        web = lead_data.get('website') or lead_data.get('sitio_web') or ''
        desc = lead_data.get('descripcion') or lead_data.get('description') or ''
        
        web_title = lead_data.get('website_title', '')
        web_desc = lead_data.get('website_description', '')
        # Truncate content to avoid token limits (approx 1000 chars is enough context)
        web_content = lead_data.get('website_content', '')[:1000]

        # Redes sociales
        redes = []
        if lead_data.get('instagram'): redes.append(f"Instagram: {lead_data['instagram']}")
        if lead_data.get('linkedin'): redes.append(f"LinkedIn: {lead_data['linkedin']}")
        if lead_data.get('facebook'): redes.append(f"Facebook: {lead_data['facebook']}")
        redes_str = ", ".join(redes)

        prompt = f"""
        Sos un experto en ventas B2B (Top 1% SDR) con una personalidad carismática e ingeniosa. Tu objetivo es escribir UNA frase de apertura ("Icebreaker") que valide el trabajo del prospecto y demuestre admiración genuina de parte de TU EQUIPO.

        DATOS DEL PROSPECTO:
        Empresa: {nombre}
        Rubro: {rubro}
        Ciudad: {ciudad}
        Web: {web}
        
        CONTEXTO ESTRATÉGICO EXTRAÍDO:
        Título Web: {web_title}
        Desc Web: {web_desc}
        Contenido Clave (importante): {web_content[:500]} 
        Redes/Bio: {redes_str}

        INSTRUCCIONES DE SDR ELITE (MODO CREATIVO):
        1. PERSPECTIVA PLURAL OBLIGATORIA: Habla siempre como un EQUIPO ("Vimos", "Nos encantó", "Analizamos", "Quedamos impresionados"). NUNCA uses "Vi" o "Me pareció".
        2. INGENIO Y CURIOSIDAD: No seas aburrido. Usa verbos potentes: "Admiramos", "Celebramos", "Nos intrigó", "Aplaudimos".
        3. CERO LUGARES COMUNES: Prohibido empezar con "Espero que estés bien" o "Vimos su web". Ve directo al grano del halago específico.
        4. HIPER-PERSONALIZACIÓN: Si la web menciona un premio, un caso de éxito raro, o una tecnología específica, úsalo. Si es una empresa familiar, valora la trayectoria. Si es una startup, valora la innovación.
        5. FORMATO: Solo la frase. Corta, impactante, que genere una sonrisa o un "wow". MAX 25 palabras.
        
        EJEMPLOS DE ALTO NIVEL (PLURAL):
        - "Desde acá aplaudimos la iniciativa de {rubro} que lanzaron, realmente se despegaron de la competencia."
        - "Nos quedamos debatiendo en la oficina sobre el case study de [Cliente], increíble cómo resolvieron ese desafío."
        - "Admiramos la claridad con la que explican [Concepto Complejo] en su blog, pocos en el sector lo hacen tan fácil."
        - "Nos voló la cabeza el diseño de su última campaña, se nota que hay un equipo de primera atrás."

        TU GENERACIÓN (Sorpréndenos):
        """

        result = call_gemini_with_retry(prompt)
        if result:
            return result.strip().strip('"').strip("'")
        return "Espero que estés muy bien."
        
    except Exception as e:
        logger.error(f"Error generando icebreaker: {e}")
        return "Espero que estés muy bien."

async def filter_leads_by_description(leads_list: List[Dict[str, Any]], description: str) -> List[Dict[str, Any]]:
    """
    Analyzes a list of leads against a user description (Ideal Client Persona).
    Returns a list of dicts with {id, status: 'approved'|'rejected', reason}.
    """
    if not leads_list:
        return []

    # Prepare batch data for the prompt
    leads_minified = []
    for lead in leads_list:
        leads_minified.append({
            "id": str(lead.get('id') or lead.get('google_id')),
            "name": lead.get("nombre", ""),
            "category": lead.get("rubro", ""),
            "website": lead.get("sitio_web", "") or lead.get("website", ""),
            "address": lead.get("direccion", ""),
            "rating": lead.get("rating", "N/A"),
            "reviews": lead.get("user_ratings_total", 0),
            "scraped_summary": lead.get("resumen_ia", "") or lead.get("descripcion_web", "")
        })

    all_results = []
    batch_size = 20
    
    import asyncio
    import json
    import re
    loop = asyncio.get_event_loop()

    for i in range(0, len(leads_minified), batch_size):
        batch_leads = leads_minified[i:i + batch_size]
        
        prompt = f"""
        You are a B2B Sales Quality Analyst (Smart Filter).
        
        YOUR GOAL: Filter a list of potential leads based on the User's "Ideal Client Requirement".
        
        USER REQUIREMENT: "{description}"
        
        INSTRUCTIONS:
        1. Analyze each lead below.
        2. Determine if it matches the User Requirement.
        3. Be STRICT. If a lead clearly contradicts the requirement, REJECT it. 
        4. If the requirement specifies quality (e.g., "4 stars", "high rated", "5 estrellas"), CHECK THE 'rating' field.
        5. If there is not enough info but it looks promising/relevant, APPROVE it (benefit of doubt).
        6. Be intelligent about "Rubros" vs Description. Example: If user wants "Industrial Factories" and lead is "Small Retails", REJECT.
        7. IGNORE location criteria (address/city). The search engine handles that. Focus on BUSINESS TYPE, SIZE, and QUALITY/RATING.
        
        LEADS TO ANALYZE:
        {json.dumps(batch_leads, ensure_ascii=False, indent=1)}
        """

        try:
            # Use existing helper but we need custom text generation, not chat
            # Re-using call_gemini_with_retry which is synchronous but lightweight wrapper
            response_text = await loop.run_in_executor(None, lambda: call_gemini_with_retry(prompt))
            
            if not response_text:
                 logger.error("Empty response from AI Smart Filter")
                 continue

            # Robust cleanup for markdown json blocks
            text = re.sub(r'```json|```', '', response_text).strip()
            
            results = json.loads(text)
            all_results.extend(results)

        except Exception as e:
            logger.error(f"Error in AI Smart Filter batch: {e}")
            # If error, safe fallback: Approve all to avoid data loss, but log error
            all_results.extend([{"id": str(l['id']), "status": "approved", "reason": "AI Error fallback"} for l in batch_leads])
            
    return all_results


def interpret_search_intent(query: str) -> Dict[str, Any]:
    """
    Analyzes the user's search query to return a structured interpretation.
    This helps the user confirm the AI understood what they want.
    """
    try:
        prompt = f"""
        You are a Smart Assistant for a B2B Lead Search Engine.
        User Query: "{query}"

        Your task:
        1. Interpret what the user is looking for.
        2. Extract key criteria (Industry, Specifics, Exclusions).
        3. Formulate a clear confirmation message in Spanish.

        OUTPUT RAW JSON ONLY. NO MARKDOWN. NO CODE BLOCKS.
        {{
            "is_clear": true/false,
            "interpretation_summary": "Short sentence in Spanish summarizing the goal",
            "suggested_filters": ["filter1", "filter2"]
        }}
        """
        response = call_gemini_with_retry(prompt)
        if not response:
            return {"is_clear": False, "interpretation_summary": "No pude procesar la solicitud."}
        
        logger.info(f"Raw Gemini response for interpretation: {response}")

        # Robust JSON Generation
        import re
        import json
        
        try:
            # First try: clean markdown if present
            clean_text = re.sub(r'```json|```', '', response).strip()
            return json.loads(clean_text)
        except json.JSONDecodeError:
            # Second try: find first { and last }
            start = response.find('{')
            end = response.rfind('}')
            if start != -1 and end != -1:
                try:
                    return json.loads(response[start:end+1])
                except:
                    pass
            
            # Fallback
            logger.error(f"Failed to parse JSON from AI: {response}")
            return {"is_clear": False, "interpretation_summary": "Error interno de IA. Intenta reformular."}

    except Exception as e:
        logger.error(f"Error interpreting intent: {e}")
        return {"is_clear": False, "interpretation_summary": "Ocurrió un error al interpretar (Backend). Intenta de nuevo."}


async def transcribe_audio_file(file_content: bytes) -> str:
    """
    Uses Gemini 1.5 Flash to transcribe audio bytes.
    """
    try:
        # Gemini 1.5 Flash supports audio tokens directly
        client = get_ai_client()
        if not client: return ""
        
        prompt = "Transcribe el siguiente audio exactamente como suena. Si es una instrucción de búsqueda, transcribela tal cual."
        
        # We need to construct a proper request for multimodal content
        # For simplicity and speed in this specific codebase context, we might rely on 
        # a standard speech-to-text API if Gemini client setup is complex for bytes.
        # However, new genai SDK handles it well.
        
        # Creating a temporary part 
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[
                prompt,
                genai.types.Part.from_bytes(data=file_content, mime_type="audio/webm") # Assuming webm from frontend recorder
            ]
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error transcribing with Gemini: {e}")
        return ""
