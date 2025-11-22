"""
Performance Monitoring and Optimization Utilities

This module provides comprehensive performance monitoring, caching,
and optimization utilities for the StudySync backend.
"""

import time
import functools
import logging
import asyncio
from typing import Any, Callable, Dict, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, deque
import hashlib
import json

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Monitor and track performance metrics"""
    
    def __init__(self):
        self.metrics = defaultdict(lambda: {
            "count": 0,
            "total_time": 0.0,
            "min_time": float('inf'),
            "max_time": 0.0,
            "errors": 0
        })
        self.recent_requests = deque(maxlen=1000)
    
    def record_request(
        self, 
        endpoint: str, 
        duration: float, 
        status_code: int,
        error: Optional[str] = None
    ):
        """Record a request's performance metrics"""
        metric = self.metrics[endpoint]
        metric["count"] += 1
        metric["total_time"] += duration
        metric["min_time"] = min(metric["min_time"], duration)
        metric["max_time"] = max(metric["max_time"], duration)
        
        if status_code >= 400 or error:
            metric["errors"] += 1
        
        # Store recent request
        self.recent_requests.append({
            "endpoint": endpoint,
            "duration": duration,
            "status_code": status_code,
            "timestamp": datetime.now().isoformat(),
            "error": error
        })
    
    def get_metrics(self, endpoint: Optional[str] = None) -> Dict[str, Any]:
        """Get performance metrics"""
        if endpoint:
            metric = self.metrics.get(endpoint)
            if not metric:
                return {}
            
            return {
                "endpoint": endpoint,
                "total_requests": metric["count"],
                "average_time": metric["total_time"] / metric["count"] if metric["count"] > 0 else 0,
                "min_time": metric["min_time"] if metric["min_time"] != float('inf') else 0,
                "max_time": metric["max_time"],
                "error_rate": metric["errors"] / metric["count"] if metric["count"] > 0 else 0,
                "total_errors": metric["errors"]
            }
        
        # Return all metrics
        return {
            endpoint: {
                "total_requests": metric["count"],
                "average_time": metric["total_time"] / metric["count"] if metric["count"] > 0 else 0,
                "min_time": metric["min_time"] if metric["min_time"] != float('inf') else 0,
                "max_time": metric["max_time"],
                "error_rate": metric["errors"] / metric["count"] if metric["count"] > 0 else 0,
                "total_errors": metric["errors"]
            }
            for endpoint, metric in self.metrics.items()
        }
    
    def get_slow_requests(self, threshold: float = 1.0) -> list:
        """Get requests that exceeded the time threshold"""
        return [
            req for req in self.recent_requests
            if req["duration"] > threshold
        ]
    
    def reset_metrics(self):
        """Reset all metrics"""
        self.metrics.clear()
        self.recent_requests.clear()


class CacheManager:
    """In-memory cache manager with TTL support"""
    
    def __init__(self, default_ttl: int = 300):
        """
        Initialize cache manager
        
        Args:
            default_ttl: Default time-to-live in seconds (default: 5 minutes)
        """
        self.cache: Dict[str, Tuple[Any, datetime]] = {}
        self.default_ttl = default_ttl
        self.hits = 0
        self.misses = 0
    
    def _generate_key(self, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key in self.cache:
            value, expiry = self.cache[key]
            if datetime.now() < expiry:
                self.hits += 1
                return value
            else:
                # Expired, remove from cache
                del self.cache[key]
        
        self.misses += 1
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache with TTL"""
        ttl = ttl or self.default_ttl
        expiry = datetime.now() + timedelta(seconds=ttl)
        self.cache[key] = (value, expiry)
    
    def delete(self, key: str):
        """Delete value from cache"""
        if key in self.cache:
            del self.cache[key]
    
    def clear(self):
        """Clear all cache entries"""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
    
    def cleanup_expired(self):
        """Remove expired entries from cache"""
        now = datetime.now()
        expired_keys = [
            key for key, (_, expiry) in self.cache.items()
            if now >= expiry
        ]
        for key in expired_keys:
            del self.cache[key]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.hits + self.misses
        hit_rate = self.hits / total_requests if total_requests > 0 else 0
        
        return {
            "total_entries": len(self.cache),
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": hit_rate,
            "total_requests": total_requests
        }


# Global instances
performance_monitor = PerformanceMonitor()
cache_manager = CacheManager()


def monitor_performance(endpoint_name: Optional[str] = None):
    """Decorator to monitor function performance"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            name = endpoint_name or func.__name__
            start_time = time.time()
            error = None
            status_code = 200
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                error = str(e)
                status_code = 500
                raise
            finally:
                duration = time.time() - start_time
                performance_monitor.record_request(name, duration, status_code, error)
                
                # Log slow requests
                if duration > 1.0:
                    logger.warning(
                        f"Slow request detected: {name} took {duration:.2f}s"
                    )
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            name = endpoint_name or func.__name__
            start_time = time.time()
            error = None
            status_code = 200
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                error = str(e)
                status_code = 500
                raise
            finally:
                duration = time.time() - start_time
                performance_monitor.record_request(name, duration, status_code, error)
                
                # Log slow requests
                if duration > 1.0:
                    logger.warning(
                        f"Slow request detected: {name} took {duration:.2f}s"
                    )
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def cached(ttl: Optional[int] = None, key_prefix: str = ""):
    """Decorator to cache function results"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{cache_manager._generate_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            cache_manager.set(cache_key, result, ttl)
            logger.debug(f"Cache miss for {func.__name__}, result cached")
            
            return result
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{cache_manager._generate_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Store in cache
            cache_manager.set(cache_key, result, ttl)
            logger.debug(f"Cache miss for {func.__name__}, result cached")
            
            return result
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class QueryOptimizer:
    """Optimize database queries"""
    
    @staticmethod
    def batch_queries(queries: list, batch_size: int = 100) -> list:
        """Batch multiple queries for efficient execution"""
        batches = []
        for i in range(0, len(queries), batch_size):
            batches.append(queries[i:i + batch_size])
        return batches
    
    @staticmethod
    def optimize_select_fields(fields: list, table: str) -> str:
        """Optimize SELECT fields to only fetch necessary data"""
        if not fields:
            return "*"
        
        # Remove duplicates while preserving order
        seen = set()
        optimized = []
        for field in fields:
            if field not in seen:
                seen.add(field)
                optimized.append(field)
        
        return ",".join(optimized)
    
    @staticmethod
    def should_use_index(table: str, filter_field: str) -> bool:
        """Determine if a query should use an index"""
        # Common indexed fields
        indexed_fields = {
            "users": ["id", "email", "username"],
            "study_sessions": ["id", "user_id", "created_at"],
            "xp_history": ["id", "user_id", "created_at"],
            "badges": ["id", "user_id"],
            "spaces": ["id", "created_by"]
        }
        
        return filter_field in indexed_fields.get(table, [])


class ConnectionPool:
    """Simple connection pool for database connections"""
    
    def __init__(self, max_connections: int = 10):
        self.max_connections = max_connections
        self.active_connections = 0
        self.waiting_queue = asyncio.Queue()
        self.semaphore = asyncio.Semaphore(max_connections)
    
    async def acquire(self):
        """Acquire a connection from the pool"""
        await self.semaphore.acquire()
        self.active_connections += 1
        logger.debug(f"Connection acquired. Active: {self.active_connections}/{self.max_connections}")
    
    async def release(self):
        """Release a connection back to the pool"""
        self.semaphore.release()
        self.active_connections -= 1
        logger.debug(f"Connection released. Active: {self.active_connections}/{self.max_connections}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        return {
            "max_connections": self.max_connections,
            "active_connections": self.active_connections,
            "available_connections": self.max_connections - self.active_connections,
            "utilization": self.active_connections / self.max_connections if self.max_connections > 0 else 0
        }


# Global connection pool
connection_pool = ConnectionPool(max_connections=20)


class PerformanceOptimizer:
    """Collection of performance optimization utilities"""
    
    @staticmethod
    def compress_response(data: Any, threshold: int = 1024) -> Tuple[Any, bool]:
        """
        Compress response data if it exceeds threshold
        
        Args:
            data: Data to potentially compress
            threshold: Size threshold in bytes
            
        Returns:
            Tuple of (data, was_compressed)
        """
        import gzip
        
        # Convert to JSON string
        json_str = json.dumps(data)
        
        # Check if compression is beneficial
        if len(json_str) > threshold:
            compressed = gzip.compress(json_str.encode())
            if len(compressed) < len(json_str):
                return compressed, True
        
        return data, False
    
    @staticmethod
    def paginate_results(
        results: list, 
        page: int = 1, 
        page_size: int = 50
    ) -> Dict[str, Any]:
        """
        Paginate results for better performance
        
        Args:
            results: List of results to paginate
            page: Page number (1-indexed)
            page_size: Number of items per page
            
        Returns:
            Paginated results with metadata
        """
        total_items = len(results)
        total_pages = (total_items + page_size - 1) // page_size
        
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        return {
            "items": results[start_idx:end_idx],
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_items": total_items,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }
    
    @staticmethod
    async def parallel_fetch(fetch_functions: list) -> list:
        """
        Execute multiple fetch operations in parallel
        
        Args:
            fetch_functions: List of async functions to execute
            
        Returns:
            List of results
        """
        results = await asyncio.gather(*fetch_functions, return_exceptions=True)
        return results


# Cleanup task for cache
async def cache_cleanup_task():
    """Background task to cleanup expired cache entries"""
    while True:
        await asyncio.sleep(300)  # Run every 5 minutes
        cache_manager.cleanup_expired()
        logger.info("Cache cleanup completed")


if __name__ == "__main__":
    # Example usage
    print("Performance Monitor initialized")
    print(f"Cache stats: {cache_manager.get_stats()}")
    print(f"Connection pool stats: {connection_pool.get_stats()}")
