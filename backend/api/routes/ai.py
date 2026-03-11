import logging
import json
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

try:
    from backend.ai_service import (
        generate_icebreaker, 
        draft_message_from_instruction, 
        transcribe_audio_file, 
        interpret_search_intent, 
        generate_suggested_reply
    )
    from backend.db_supabase import get_empresa_by_id, update_empresa_icebreaker
except ImportError:
    from ai_service import (
        generate_icebreaker, 
        draft_message_from_instruction, 
        transcribe_audio_file, 
        interpret_search_intent, 
        generate_suggested_reply
    )
    from db_supabase import get_empresa_by_id, update_empresa_icebreaker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["AI"])

class SuggestReplyRequest(BaseModel):
    messages: List[Dict[str, Any]]
    lead_data: Optional[Dict[str, Any]] = None

class DraftTemplateRequest(BaseModel):
    instruction: str
    type: str = 'email'

class GenerateIcebreakerRequest(BaseModel):
    empresas: List[Dict[str, Any]]
    user_id: str

@router.post("/leads/generate-icebreakers")
async def api_generate_icebreakers(req: GenerateIcebreakerRequest):
    """
    Genera icebreakers para una lista de empresas.
    """
    logger.info(f"RECIBIDA PETICIÓN ICEBREAKERS: user_id={req.user_id}, count={len(req.empresas)}")
    
    if req.empresas:
        logger.info(f"Primera empresa recibida: {json.dumps(req.empresas[0])[:200]}...")
    results = []
    for item in req.empresas:
        try:
            empresa = item
            empresa_id = item.get('id') or item.get('google_id')
            
            needs_fetch = len(item.keys()) <= 3 or not item.get('nombre') or not item.get('rubro')
            
            logger.info(f"Procesando item {empresa_id}. Keys: {list(item.keys())}. Needs fetch: {needs_fetch}")

            if needs_fetch and empresa_id:
                empresa_db = get_empresa_by_id(empresa_id)
                if empresa_db:
                    empresa = empresa_db
                    logger.info(f"Recuperado de DB: {empresa.get('nombre')}")
                else:
                    logger.warning(f"No se encontró en DB: {empresa_id}")
            
            if not empresa:
                results.append({"id": empresa_id, "status": "error", "message": "No data for lead"})
                continue
                
            icebreaker = generate_icebreaker(empresa)
            
            success_db = False
            if empresa_id:
                success_db = update_empresa_icebreaker(empresa_id, icebreaker)
            
            results.append({
                "id": empresa_id,
                "icebreaker": icebreaker,
                "status": "success"
            })
            
        except Exception as e:
            logger.error(f"Error generando icebreaker: {e}")
            results.append({"id": item.get('id'), "status": "error", "message": str(e)})
            
    return {"results": results}

@router.post("/ai/draft-template")
async def api_draft_template(req: DraftTemplateRequest):
    """
    Drafts a template message based on user instruction.
    """
    try:
        draft = draft_message_from_instruction(req.instruction, req.type)
        return draft
    except Exception as e:
        logger.error(f"Error in draft endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/transcribe")
async def api_transcribe_audio(file: UploadFile = File(...)):
    """
    Recibe un archivo de audio y devuelve la transcripción.
    """
    try:
        content = await file.read()
        text = await transcribe_audio_file(content)
        return {"text": text}
    except Exception as e:
        logger.error(f"Error transcribing audio endpoint: {e}")
        raise HTTPException(status_code=500, detail="Error transcribing audio")

@router.post("/ai/suggest-reply")
async def api_suggest_reply(req: SuggestReplyRequest):
    """
    Generates a suggested AI reply based on conversation history.
    """
    try:
        reply = generate_suggested_reply(req.messages, req.lead_data)
        return {"reply": reply}
    except Exception as e:
        logger.error(f"Error suggesting reply: {e}")
        raise HTTPException(status_code=500, detail="Error suggesting reply")

@router.post("/ai/interpret")
async def api_interpret_intent(req: DraftTemplateRequest):
    """
    Interprets the user's search intent before executing a search.
    Reuses DraftTemplateRequest (instruction field) for simplicity.
    """
    try:
        result = interpret_search_intent(req.instruction)
        return result
    except Exception as e:
        logger.error(f"Error interpreting intent endpoint: {e}")
        raise HTTPException(status_code=500, detail="Error interpreting intent")
