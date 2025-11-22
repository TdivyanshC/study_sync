"""
Optimized Database Service with Connection Pooling and Caching

Enhanced version of the Supabase database service with:
- Connection pooling
- Query caching
- Performance monitoring
- Retry logic
- Circuit breaker protection
"""

import os
import requests
import asyncio
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
from pathlib import Path
import time

from utils.performance_monitor import (
    monitor_performance, cached, connection_pool, performance_monitor
)
from utils.resilience import with_retry, circuit_breaker, CircuitBreakerOpenError
from utils.enhanced_logging import app_logger

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
is_production = os.environ.get('NODE_ENV') == 'production' or os.environ.get('ENV') == 'production'

env_file = '.env.production' if is_production else '.env'
load_dotenv(ROOT_DIR / env_file)

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')


class OptimizedSupabaseDB:
    """Optimized Supabase database client with advanced features"""
    
    def __init__(self):
        self.base_url = SUPABASE_URL.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'  # Return inserted/updated data
        }
        self.request_timeout = 10  # seconds
    
    @monitor_performance("db_insert")
    @with_retry(max_retries=3, base_delay=0.5, retry_on=(requests.RequestException,))
    @circuit_breaker(failure_threshold=5, recovery_timeout=30, name="db_insert")
    async def insert_data_async(
        self, 
        table: str, 
        payload: Dict[str, Any],
        return_data: bool = True
    ) -> Dict[str, Any]:
        """
        Insert data into a Supabase table (async)
        
        Args:
            table: Table name
            payload: Data to insert
            return_data: Whether to return inserted data
            
        Returns:
            Result dictionary with success status and data
        """
        start_time = time.time()
        
        try:
            # Acquire connection from pool
            await connection_pool.acquire()
            
            url = f"{self.base_url}/rest/v1/{table}"
            
            # Make request
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(
                    url, 
                    json=payload, 
                    headers=self.headers,
                    timeout=self.request_timeout
                )
            )
            
            duration = time.time() - start_time
            
            if response.status_code in [200, 201]:
                app_logger.log_database_operation(
                    operation="insert",
                    table=table,
                    duration=duration,
                    success=True
                )
                
                return {
                    "success": True,
                    "message": f"Successfully inserted into {table}",
                    "data": response.json() if return_data else None
                }
            else:
                error_msg = f"Failed to insert into {table}: {response.text}"
                app_logger.log_database_operation(
                    operation="insert",
                    table=table,
                    duration=duration,
                    success=False,
                    error=error_msg
                )
                
                return {
                    "success": False,
                    "message": error_msg,
                    "data": None
                }
                
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Error inserting into {table}: {str(e)}"
            
            app_logger.log_database_operation(
                operation="insert",
                table=table,
                duration=duration,
                success=False,
                error=error_msg
            )
            
            return {
                "success": False,
                "message": error_msg,
                "data": None
            }
        finally:
            # Release connection back to pool
            await connection_pool.release()
    
    @monitor_performance("db_fetch")
    @cached(ttl=60, key_prefix="db_fetch")  # Cache for 60 seconds
    @with_retry(max_retries=3, base_delay=0.5, retry_on=(requests.RequestException,))
    @circuit_breaker(failure_threshold=5, recovery_timeout=30, name="db_fetch")
    async def fetch_data_async(
        self, 
        table: str, 
        filters: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Fetch data from a Supabase table (async, with caching)
        
        Args:
            table: Table name
            filters: Query filters
            use_cache: Whether to use cache (default: True)
            
        Returns:
            Result dictionary with success status and data
        """
        start_time = time.time()
        
        try:
            # Acquire connection from pool
            await connection_pool.acquire()
            
            url = f"{self.base_url}/rest/v1/{table}"
            
            # Build query parameters
            params = self._build_query_params(filters)
            
            # Make request
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.get(
                    url, 
                    headers=self.headers, 
                    params=params,
                    timeout=self.request_timeout
                )
            )
            
            duration = time.time() - start_time
            
            if response.status_code == 200:
                app_logger.log_database_operation(
                    operation="fetch",
                    table=table,
                    duration=duration,
                    success=True,
                    filters=filters
                )
                
                return {
                    "success": True,
                    "message": f"Successfully fetched from {table}",
                    "data": response.json()
                }
            else:
                error_msg = f"Failed to fetch from {table}: {response.text}"
                app_logger.log_database_operation(
                    operation="fetch",
                    table=table,
                    duration=duration,
                    success=False,
                    error=error_msg
                )
                
                return {
                    "success": False,
                    "message": error_msg,
                    "data": None
                }
                
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Error fetching from {table}: {str(e)}"
            
            app_logger.log_database_operation(
                operation="fetch",
                table=table,
                duration=duration,
                success=False,
                error=error_msg
            )
            
            return {
                "success": False,
                "message": error_msg,
                "data": None
            }
        finally:
            # Release connection back to pool
            await connection_pool.release()
    
    @monitor_performance("db_update")
    @with_retry(max_retries=3, base_delay=0.5, retry_on=(requests.RequestException,))
    @circuit_breaker(failure_threshold=5, recovery_timeout=30, name="db_update")
    async def update_data_async(
        self, 
        table: str, 
        filters: Dict[str, Any], 
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update data in a Supabase table (async)
        
        Args:
            table: Table name
            filters: Query filters to identify rows
            payload: Data to update
            
        Returns:
            Result dictionary with success status and data
        """
        start_time = time.time()
        
        try:
            # Acquire connection from pool
            await connection_pool.acquire()
            
            url = f"{self.base_url}/rest/v1/{table}"
            
            # Build query parameters for filtering
            params = {}
            if filters:
                for key, value in filters.items():
                    if key.startswith('eq_'):
                        column = key[3:]
                        params[column] = f"eq.{value}"
            
            # Make request
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.patch(
                    url, 
                    json=payload, 
                    headers=self.headers, 
                    params=params,
                    timeout=self.request_timeout
                )
            )
            
            duration = time.time() - start_time
            
            if response.status_code in [200, 204]:
                app_logger.log_database_operation(
                    operation="update",
                    table=table,
                    duration=duration,
                    success=True,
                    filters=filters
                )
                
                return {
                    "success": True,
                    "message": f"Successfully updated {table}",
                    "data": response.json() if response.content else None
                }
            else:
                error_msg = f"Failed to update {table}: {response.text}"
                app_logger.log_database_operation(
                    operation="update",
                    table=table,
                    duration=duration,
                    success=False,
                    error=error_msg
                )
                
                return {
                    "success": False,
                    "message": error_msg,
                    "data": None
                }
                
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Error updating {table}: {str(e)}"
            
            app_logger.log_database_operation(
                operation="update",
                table=table,
                duration=duration,
                success=False,
                error=error_msg
            )
            
            return {
                "success": False,
                "message": error_msg,
                "data": None
            }
        finally:
            # Release connection back to pool
            await connection_pool.release()
    
    @monitor_performance("db_delete")
    @with_retry(max_retries=3, base_delay=0.5, retry_on=(requests.RequestException,))
    @circuit_breaker(failure_threshold=5, recovery_timeout=30, name="db_delete")
    async def delete_data_async(
        self, 
        table: str, 
        filters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Delete data from a Supabase table (async)
        
        Args:
            table: Table name
            filters: Query filters to identify rows
            
        Returns:
            Result dictionary with success status
        """
        start_time = time.time()
        
        try:
            # Acquire connection from pool
            await connection_pool.acquire()
            
            url = f"{self.base_url}/rest/v1/{table}"
            
            # Build query parameters for filtering
            params = {}
            if filters:
                for key, value in filters.items():
                    if key.startswith('eq_'):
                        column = key[3:]
                        params[column] = f"eq.{value}"
            
            # Make request
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.delete(
                    url, 
                    headers=self.headers, 
                    params=params,
                    timeout=self.request_timeout
                )
            )
            
            duration = time.time() - start_time
            
            if response.status_code in [200, 204]:
                app_logger.log_database_operation(
                    operation="delete",
                    table=table,
                    duration=duration,
                    success=True,
                    filters=filters
                )
                
                return {
                    "success": True,
                    "message": f"Successfully deleted from {table}",
                    "data": None
                }
            else:
                error_msg = f"Failed to delete from {table}: {response.text}"
                app_logger.log_database_operation(
                    operation="delete",
                    table=table,
                    duration=duration,
                    success=False,
                    error=error_msg
                )
                
                return {
                    "success": False,
                    "message": error_msg,
                    "data": None
                }
                
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Error deleting from {table}: {str(e)}"
            
            app_logger.log_database_operation(
                operation="delete",
                table=table,
                duration=duration,
                success=False,
                error=error_msg
            )
            
            return {
                "success": False,
                "message": error_msg,
                "data": None
            }
        finally:
            # Release connection back to pool
            await connection_pool.release()
    
    def _build_query_params(self, filters: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Build query parameters from filters"""
        params = {}
        
        if not filters:
            return params
        
        for key, value in filters.items():
            if key == 'select':
                params['select'] = value
            elif key == 'limit':
                params['limit'] = value
            elif key == 'order':
                params['order'] = value
            elif key == 'offset':
                params['offset'] = value
            elif key.startswith('eq_'):
                column = key[3:]
                params[column] = f"eq.{value}"
            elif key.startswith('gt_'):
                column = key[3:]
                params[column] = f"gt.{value}"
            elif key.startswith('lt_'):
                column = key[3:]
                params[column] = f"lt.{value}"
            elif key.startswith('gte_'):
                column = key[4:]
                params[column] = f"gte.{value}"
            elif key.startswith('lte_'):
                column = key[4:]
                params[column] = f"lte.{value}"
            elif key.startswith('like_'):
                column = key[5:]
                params[column] = f"like.{value}"
            elif key.startswith('in_'):
                column = key[3:]
                params[column] = f"in.({value})"
        
        return params
    
    # Synchronous wrappers for backward compatibility
    def insert_data(self, table: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Synchronous wrapper for insert_data_async"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.insert_data_async(table, payload))
    
    def fetch_data(self, table: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Synchronous wrapper for fetch_data_async"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.fetch_data_async(table, filters))
    
    def update_data(self, table: str, filters: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
        """Synchronous wrapper for update_data_async"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.update_data_async(table, filters, payload))


# Create singleton instance
optimized_supabase_db = OptimizedSupabaseDB()
