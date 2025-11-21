#!/usr/bin/env python3
"""
Tunnel URL Discovery Routes
Provides endpoints to return the automatically discovered ngrok tunnel URL
"""
import os
import logging
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

# Configure logging
logger = logging.getLogger(__name__)

# Create router with /api prefix
tunnel_router = APIRouter(prefix="/tunnel", tags=["tunnel"])

def get_public_base_url() -> str:
    """
    Get the public base URL (ngrok URL if available, otherwise localhost)
    Returns the URL that should be used for frontend connections
    """
    # Try to get from environment variable set by main.py
    public_url = os.environ.get('PUBLIC_BASE_URL')
    if public_url:
        return public_url
    
    # Fallback: check if ngrok is running
    try:
        import requests
        response = requests.get("http://127.0.0.1:4040/api/tunnels", timeout=1)
        if response.status_code == 200:
            data = response.json()
            tunnels = data.get('tunnels', [])
            if tunnels:
                # Return first HTTP tunnel or first available tunnel
                for tunnel in tunnels:
                    if tunnel.get('proto') == 'http':
                        return tunnel.get('public_url', f"http://127.0.0.1:8000")
                return tunnels[0].get('public_url', f"http://127.0.0.1:8000")
    except:
        pass
    
    # Final fallback
    return "http://127.0.0.1:8000"

@tunnel_router.get("/url", response_model=Dict[str, Any])
async def get_tunnel_url():
    """
    Get the current ngrok tunnel URL
    
    Returns:
        - {"ngrok": "http://127.0.0.1:8000"} if no ngrok
        - {"ngrok": "https://xxxx.ngrok-free.app"} if ngrok tunnel found
    """
    try:
        ngrok_url = get_public_base_url()
        is_ngrok = ngrok_url.startswith('https://') and 'ngrok' in ngrok_url
        
        if is_ngrok:
            logger.info(f"✅ NGROK tunnel detected: {ngrok_url}")
            return {
                "ngrok": ngrok_url,
                "status": "active",
                "message": "ngrok tunnel detected successfully"
            }
        else:
            logger.info(f"ℹ️ Using localhost: {ngrok_url}")
            return {
                "ngrok": None,
                "status": "inactive", 
                "message": "No ngrok tunnel detected, using localhost"
            }
            
    except Exception as e:
        logger.error(f"Error in get_tunnel_url endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Tunnel detection error: {str(e)}")

@tunnel_router.get("/status", response_model=Dict[str, Any])
async def get_tunnel_status():
    """
    Get detailed tunnel status information
    """
    try:
        ngrok_url = get_public_base_url()
        is_ngrok = ngrok_url.startswith('https://') and 'ngrok' in ngrok_url
        
        status_info = {
            "tunnel_active": is_ngrok,
            "ngrok_url": ngrok_url,
            "is_using_ngrok": is_ngrok,
            "source": "automatic_detection",
            "public_base_url": ngrok_url
        }
            
        return status_info
        
    except Exception as e:
        logger.error(f"Error in get_tunnel_status endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Tunnel status error: {str(e)}")