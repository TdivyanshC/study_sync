#!/usr/bin/env python3
"""
Main entry point for StudySync Backend Server with Automatic NGROK Support
"""
import uvicorn
import os
import logging
import asyncio
import subprocess
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Global variable for public base URL
PUBLIC_BASE_URL = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def start_ngrok(port=8000):
    """
    Automatically start ngrok tunnel and update PUBLIC_BASE_URL
    
    Args:
        port (int): Port to tunnel (default: 8000)
    
    Returns:
        str: The public ngrok URL or fallback localhost URL
    """
    global PUBLIC_BASE_URL
    
    try:
        print(f"[NGROK] Starting ngrok tunnel on port {port}...")
        
        # Add Ngrok Auth Token if exists
        auth_token = os.getenv("NGROK_AUTH_TOKEN")
        if auth_token:
            print(f"[NGROK] Authenticating with provided token...")
            auth_result = os.system(f"ngrok config add-authtoken {auth_token}")
            if auth_result == 0:
                print("[NGROK] Authentication successful")
            else:
                print("[NGROK] Authentication failed, continuing without auth")
        
        # Check if ngrok is already running
        try:
            existing_tunnels = requests.get("http://127.0.0.1:4040/api/tunnels", timeout=2)
            if existing_tunnels.status_code == 200:
                tunnels_data = existing_tunnels.json()
                active_tunnels = tunnels_data.get('tunnels', [])
                
                # Look for HTTP tunnel on our port
                for tunnel in active_tunnels:
                    if tunnel.get('config') and tunnel['config'].get('addr') == f'localhost:{port}':
                        PUBLIC_BASE_URL = tunnel['public_url']
                        print(f"[NGROK] Using existing tunnel -> {PUBLIC_BASE_URL}")
                        return PUBLIC_BASE_URL
        except:
            pass  # ngrok not running, continue to start it
        
        # Start Ngrok tunnel
        print("[NGROK] Starting new ngrok process...")
        ngrok_process = subprocess.Popen(
            ["ngrok", "http", str(port)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL
        )
        
        # Wait for ngrok to start up
        print("[NGROK] Waiting for tunnel to establish...")
        time.sleep(3)
        
        # Get public URL from ngrok API
        max_attempts = 10
        for attempt in range(max_attempts):
            try:
                tunnel_info = requests.get("http://127.0.0.1:4040/api/tunnels", timeout=2)
                if tunnel_info.status_code == 200:
                    tunnels_data = tunnel_info.json()
                    tunnels = tunnels_data.get('tunnels', [])
                    
                    if tunnels:
                        # Get the first HTTP tunnel
                        for tunnel in tunnels:
                            if tunnel.get('proto') == 'http':
                                PUBLIC_BASE_URL = tunnel["public_url"]
                                print(f"[NGROK] Tunnel Active -> {PUBLIC_BASE_URL}")
                                return PUBLIC_BASE_URL
                        
                        # If no HTTP tunnel found, use first available tunnel
                        if tunnels:
                            PUBLIC_BASE_URL = tunnels[0]["public_url"]
                            print(f"[NGROK] Tunnel Active -> {PUBLIC_BASE_URL}")
                            return PUBLIC_BASE_URL
                            
            except requests.RequestException:
                pass  # Try again
            
            if attempt < max_attempts - 1:
                time.sleep(1)
        
        # If we get here, ngrok didn't start properly
        raise Exception("Failed to get tunnel URL from ngrok")
        
    except Exception as e:
        print(f"[NGROK] Error starting tunnel: {e}")
        print("[NGROK] Falling back to localhost")
        PUBLIC_BASE_URL = f"http://127.0.0.1:{port}"
        return PUBLIC_BASE_URL

async def main():
    """Main entry point with automatic ngrok tunnel support"""
    global PUBLIC_BASE_URL
    
    # Start ngrok tunnel automatically
    print("Starting StudySync Backend with Automatic NGROK Support...")
    PUBLIC_BASE_URL = start_ngrok(8000)
    
    # Get host and port from environment variables or use defaults
    host = os.environ.get("HOST", "0.0.0.0")  # Listen on all interfaces for tunnel access
    port = int(os.environ.get("PORT", 8000))
    
    print("Starting StudySync Backend Server...")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print("CORS enabled for all origins")
    print("API endpoints available at: /api/")
    
    # Export PUBLIC_BASE_URL for use in other modules
    os.environ['PUBLIC_BASE_URL'] = PUBLIC_BASE_URL
    print(f"Base URL: {PUBLIC_BASE_URL}")
    
    # Run the server
    config = uvicorn.Config(
        "server:app",  # Import path to the app
        host=host,
        port=port,
        reload=True,  # Enable auto-reload for development
        log_level="info",
        access_log=True
    )
    
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    asyncio.run(main())