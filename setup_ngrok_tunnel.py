#!/usr/bin/env python3
"""
Setup NGROK tunnel for backend to provide HTTPS connectivity
"""
import ngrok
import time
import os
import requests
from pathlib import Path

def setup_ngrok_tunnel():
    """Create ngrok tunnel for port 8000"""
    try:
        print("[NGROK] Setting up NGROK tunnel for port 8000...")
        
        # Create tunnel - this will block until tunnel is established
        tunnel = ngrok.forward(8000)
        public_url = tunnel.url()
        
        print(f"[SUCCESS] NGROK Tunnel Active!")
        print(f"[INFO] Public URL: {public_url}")
        print(f"[INFO] API Base URL: {public_url}/api")
        
        # Test the tunnel
        test_url = f"{public_url}/api/"
        print(f"[TEST] Testing tunnel: {test_url}")
        
        try:
            response = requests.get(test_url, timeout=5)
            if response.status_code == 200:
                print("[SUCCESS] Tunnel test successful!")
            else:
                print(f"[WARNING] Tunnel test returned status: {response.status_code}")
        except Exception as e:
            print(f"[WARNING] Tunnel test failed: {e}")
        
        # Update frontend .env file
        frontend_env_path = Path("frontend/.env")
        if frontend_env_path.exists():
            print(f"[INFO] Updating {frontend_env_path}...")
            
            # Read current content
            with open(frontend_env_path, 'r') as f:
                content = f.read()
            
            # Update or add EXPO_PUBLIC_BACKEND_URL
            lines = content.split('\n')
            updated = False
            
            for i, line in enumerate(lines):
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    lines[i] = f'EXPO_PUBLIC_BACKEND_URL={public_url}'
                    updated = True
                    break
            
            if not updated:
                lines.append(f'EXPO_PUBLIC_BACKEND_URL={public_url}')
            
            # Write back
            new_content = '\n'.join(lines)
            with open(frontend_env_path, 'w') as f:
                f.write(new_content)
            
            print(f"[SUCCESS] Updated frontend .env with ngrok URL")
            print(f"[INFO] You need to restart the frontend to use the new URL")
        
        return public_url
        
    except Exception as e:
        print(f"[ERROR] Failed to setup ngrok tunnel: {e}")
        return None

if __name__ == "__main__":
    tunnel_url = setup_ngrok_tunnel()
    if tunnel_url:
        print(f"\n[SUCCESS] Your backend is now accessible via:")
        print(f"[INFO] Frontend URL: {tunnel_url}")
        print(f"[INFO] API URL: {tunnel_url}/api")
        print(f"\n[STEPS] Next steps:")
        print(f"1. Restart frontend: npx expo start -c")
        print(f"2. Reload your React Native app")
        print(f"3. The 'today metrics' should now load without network errors!")
        
        # Keep the script running to maintain tunnel
        print(f"\n[TUNNEL] Tunnel is active - keeping connection open...")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print(f"\n[BYE] Shutting down tunnel...")
            ngrok.kill()
    else:
        print("[ERROR] Failed to setup tunnel. Check if port 8000 is available.")