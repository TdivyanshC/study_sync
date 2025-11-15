import os
import requests
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables based on NODE_ENV
ROOT_DIR = Path(__file__).parent.parent
is_production = os.environ.get('NODE_ENV') == 'production' or os.environ.get('ENV') == 'production'

env_file = '.env.production' if is_production else '.env'
load_dotenv(ROOT_DIR / env_file)

print(f"Loading {env_file} for {'PRODUCTION' if is_production else 'DEVELOPMENT'} environment")

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_SERVICE_KEY = os.environ['SUPABASE_SERVICE_KEY']

class SupabaseDB:
    def __init__(self):
        self.base_url = SUPABASE_URL.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json'
        }

    def insert_data(self, table: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Insert data into a Supabase table"""
        try:
            url = f"{self.base_url}/rest/v1/{table}"
            response = requests.post(url, json=payload, headers=self.headers)

            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "message": f"Successfully inserted into {table}",
                    "data": response.json()
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to insert into {table}: {response.text}",
                    "data": None
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error inserting into {table}: {str(e)}",
                "data": None
            }

    def fetch_data(self, table: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Fetch data from a Supabase table with optional filters"""
        try:
            url = f"{self.base_url}/rest/v1/{table}"

            # Build query parameters
            params = {}
            if filters:
                for key, value in filters.items():
                    if key == 'select':
                        params['select'] = value
                    elif key == 'limit':
                        params['limit'] = value
                    elif key == 'order':
                        params['order'] = value
                    elif key.startswith('eq_'):
                        column = key[3:]  # Remove 'eq_' prefix
                        params[column] = f"eq.{value}"
                    elif key.startswith('gt_'):
                        column = key[3:]  # Remove 'gt_' prefix
                        params[column] = f"gt.{value}"
                    elif key.startswith('lt_'):
                        column = key[3:]  # Remove 'lt_' prefix
                        params[column] = f"lt.{value}"

            response = requests.get(url, headers=self.headers, params=params)

            if response.status_code == 200:
                return {
                    "success": True,
                    "message": f"Successfully fetched from {table}",
                    "data": response.json()
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to fetch from {table}: {response.text}",
                    "data": None
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error fetching from {table}: {str(e)}",
                "data": None
            }

    def update_data(self, table: str, filters: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
        """Update data in a Supabase table"""
        try:
            url = f"{self.base_url}/rest/v1/{table}"

            # Build query parameters for filtering
            params = {}
            if filters:
                for key, value in filters.items():
                    if key.startswith('eq_'):
                        column = key[3:]  # Remove 'eq_' prefix
                        params[column] = f"eq.{value}"

            response = requests.patch(url, json=payload, headers=self.headers, params=params)

            if response.status_code in [200, 204]:
                return {
                    "success": True,
                    "message": f"Successfully updated {table}",
                    "data": response.json() if response.content else None
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to update {table}: {response.text}",
                    "data": None
                }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error updating {table}: {str(e)}",
                "data": None
            }

# Create singleton instance
supabase_db = SupabaseDB()