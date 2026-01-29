"""
Patient 360 Backend - Copilot Route

RAG-based clinical Copilot with grounded answers and source citations.
Supports both standard and streaming responses via SSE.
"""

import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.db import execute_one
from app.schemas import CopilotRequest, CopilotResponse, CopilotSource
from app.services.retrieval import retrieve_context
from app.services.llm import generate_answer, generate_answer_stream

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/{patient_id}/copilot:ask", response_model=CopilotResponse)
async def ask_copilot(patient_id: str, request: CopilotRequest) -> CopilotResponse:
    """
    Ask the Copilot a clinical question about the patient.
    
    The Copilot:
    1. Retrieves relevant context using vector + keyword search
    2. Generates a grounded answer using Azure OpenAI (or template fallback)
    3. Returns answer with citations to source records
    """
    # Verify patient exists
    patient = await execute_one(
        "SELECT patient_id, display_name FROM patients WHERE patient_id = $1",
        patient_id
    )
    
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    try:
        # Step 1: Retrieve relevant context
        context_results, retrieval_method = await retrieve_context(
            patient_id=patient_id,
            query=request.question,
            max_results=request.max_sources
        )
        
        # Convert to CopilotSource objects
        sources = [
            CopilotSource(
                source_type=r.get("source_type", "unknown"),
                source_id=r.get("source_id", 0),
                label=r.get("label", "Unknown source"),
                snippet=r.get("snippet", ""),
                score=r.get("score", 0.0),
                metadata=r.get("metadata")
            )
            for r in context_results
        ]
        
        # Step 2: Generate answer
        answer, next_actions, model_used = await generate_answer(
            question=request.question,
            patient_name=patient.get("display_name", "the patient"),
            sources=sources
        )
        
        logger.info(
            f"Copilot answered question for patient {patient_id}: "
            f"'{request.question[:50]}...' using {retrieval_method} retrieval"
        )
        
        return CopilotResponse(
            answer=answer,
            next_actions=next_actions,
            sources=sources,
            model_used=model_used,
            retrieval_method=retrieval_method
        )
        
    except Exception as e:
        logger.error(f"Error processing Copilot question: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process question: {str(e)}"
        )


@router.post("/{patient_id}/copilot:stream")
async def stream_copilot(patient_id: str, request: CopilotRequest):
    """
    Ask the Copilot a clinical question with streaming response.
    
    Returns a Server-Sent Events (SSE) stream with the following event types:
    - source: Source citation objects (sent first)
    - delta: Text chunks as they're generated  
    - actions: Next action recommendations (sent at end)
    - done: Stream complete with model info
    - error: Error occurred during streaming
    
    This endpoint uses Azure OpenAI Responses API with stream=True.
    """
    # Verify patient exists
    patient = await execute_one(
        "SELECT patient_id, display_name FROM patients WHERE patient_id = $1",
        patient_id
    )
    
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    
    async def generate_stream():
        try:
            # Step 1: Retrieve relevant context
            context_results, retrieval_method = await retrieve_context(
                patient_id=patient_id,
                query=request.question,
                max_results=request.max_sources
            )
            
            # Convert to CopilotSource objects
            sources = [
                CopilotSource(
                    source_type=r.get("source_type", "unknown"),
                    source_id=r.get("source_id", 0),
                    label=r.get("label", "Unknown source"),
                    snippet=r.get("snippet", ""),
                    score=r.get("score", 0.0),
                    metadata=r.get("metadata")
                )
                for r in context_results
            ]
            
            # Send retrieval method info
            yield f"event: metadata\ndata: {json.dumps({'retrieval_method': retrieval_method})}\n\n"
            
            # Step 2: Stream the answer
            async for event_chunk in generate_answer_stream(
                question=request.question,
                patient_name=patient.get("display_name", "the patient"),
                sources=sources
            ):
                yield event_chunk
                
            logger.info(
                f"Copilot streamed answer for patient {patient_id}: "
                f"'{request.question[:50]}...' using {retrieval_method} retrieval"
            )
            
        except Exception as e:
            logger.error(f"Error in streaming Copilot response: {str(e)}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )
