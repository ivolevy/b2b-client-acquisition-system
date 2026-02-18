
import logging
from typing import List, Dict, Any
from ai_service import filter_leads_by_description

logger = logging.getLogger(__name__)

async def apply_smart_filter(leads: List[Dict[str, Any]], ideal_client_description: str) -> List[Dict[str, Any]]:
    """
    Applies the AI Smart Filter to a list of leads.
    """
    if not ideal_client_description or not leads:
        return leads

    logger.info(f"🧠 Aplicando Smart Filter a {len(leads)} leads con criterio: '{ideal_client_description}'")
    
    # Check if description is too short to be meaningful
    if len(ideal_client_description.strip()) < 5:
        logger.warning(f"Smart filter skipped: description too short: {ideal_client_description}")
        return leads

    try:
        # We process all leads in one or few batches
        # For cost optimization and context window, we'll send essential fields only
        # The ai_service function will handle the interaction with Gemini
        filtered_results = await filter_leads_by_description(leads, ideal_client_description)
        
        # Merge AI feedback into original leads
        approved_leads = []
        
        # Create a map for quick lookup
        result_map = {res['id']: res for res in filtered_results}
        
        for lead in leads:
            lead_id = lead.get('id') or lead.get('google_id') # Handle both ID types if present
            ai_decision = result_map.get(str(lead_id)) # Ensure string ID match
            
            if ai_decision:
                # Add metadata about the decision
                lead['smart_filter_status'] = ai_decision['status'] # 'approved' or 'rejected'
                lead['smart_filter_reason'] = ai_decision.get('reason', '')
                
                if ai_decision['status'] == 'approved':
                    approved_leads.append(lead)
            else:
                # If AI didn't return a decision (error or skip), we default to keeping it
                # or we could reject it. Let's keep it to be safe but mark as unchecked.
                logger.warning(f"No AI decision for lead {lead.get('nombre')}, keeping it.")
                approved_leads.append(lead)
                
        logger.info(f"📉 Smart Filter: {len(leads)} -> {len(approved_leads)} leads.")
        return approved_leads

    except Exception as e:
        logger.error(f"Error critica en apply_smart_filter: {e}")
        # Fail safe: return original list if AI fails
        return leads
