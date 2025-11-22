"""
Monitoring Middleware for FastAPI

Provides automatic request monitoring, performance tracking, and analytics
for all API endpoints in the StudySync backend.
"""

import time
import asyncio
from typing import Callable, Dict, Any
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.applications import Starlette

from utils.monitoring_service import monitoring_service, track_api_call
from utils.enhanced_logging import app_logger


class MonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for automatic request monitoring and performance tracking"""
    
    def __init__(self, app: Starlette, collect_system_metrics: bool = True):
        super().__init__(app)
        self.collect_system_metrics = collect_system_metrics
        self.exclude_paths = {
            "/health",
            "/metrics",
            "/favicon.ico",
            "/static",
            "/docs",
            "/openapi.json",
            "/redoc"
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request and collect monitoring data"""
        # Skip monitoring for excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)
        
        start_time = time.time()
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "")
        method = request.method
        path = request.url.path
        
        # Add request start event
        app_logger.log_request(
            method=method,
            path=path,
            status_code=0,  # Will be updated later
            duration=0,     # Will be calculated later
            client_ip=client_ip,
            user_agent=user_agent
        )
        
        # Process the request
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            status_code = response.status_code
            
            # Track API call
            track_api_call(path, duration, status_code)
            
            # Log request completion
            app_logger.log_request(
                method=method,
                path=path,
                status_code=status_code,
                duration=duration,
                client_ip=client_ip,
                user_agent=user_agent
            )
            
            # Add monitoring headers
            response.headers["X-Response-Time"] = f"{duration:.3f}s"
            response.headers["X-Monitored-Request"] = "true"
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            status_code = 500
            
            # Track error
            track_api_call(path, duration, status_code)
            
            app_logger.log_request(
                method=method,
                path=path,
                status_code=status_code,
                duration=duration,
                client_ip=client_ip,
                user_agent=user_agent,
                error=str(e)
            )
            
            # Re-raise the exception
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        # Check for forwarded headers first (for load balancers/proxies)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if request.client:
            return request.client.host
        
        return "unknown"


class ConnectionMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for monitoring active connections"""
    
    def __init__(self, app: Starlette):
        super().__init__(app)
        self.active_connections = 0
        self.connection_lock = asyncio.Lock()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Track active connections"""
        async with self.connection_lock:
            self.active_connections += 1
        
        try:
            response = await call_next(request)
            return response
        finally:
            async with self.connection_lock:
                self.active_connections = max(0, self.active_connections - 1)
            
            # Update monitoring service with connection count
            monitoring_service.analytics.track_active_connections(self.active_connections)
    
    def get_active_connections(self) -> int:
        """Get current active connections count"""
        return self.active_connections


# Global middleware instances
monitoring_middleware = None
connection_monitoring_middleware = None


def setup_monitoring_middleware(app, collect_system_metrics: bool = True):
    """Setup monitoring middleware for the FastAPI app"""
    global monitoring_middleware, connection_monitoring_middleware
    
    # Add monitoring middleware
    monitoring_middleware = MonitoringMiddleware(app, collect_system_metrics)
    app.add_middleware(MonitoringMiddleware, collect_system_metrics=collect_system_metrics)
    
    # Add connection monitoring middleware
    connection_monitoring_middleware = ConnectionMonitoringMiddleware(app)
    app.add_middleware(ConnectionMonitoringMiddleware)
    
    # Setup periodic metrics collection
    asyncio.create_task(periodic_metrics_collection())
    
    return monitoring_middleware, connection_monitoring_middleware


async def periodic_metrics_collection():
    """Background task for periodic metrics collection"""
    while True:
        try:
            await asyncio.sleep(60)  # Collect metrics every minute
            
            # Force metrics collection
            await monitoring_service.collect_and_process_metrics()
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            app_logger.error(f"Error in periodic metrics collection: {e}")
            await asyncio.sleep(60)  # Continue even on error


# Decorator for manual monitoring
def monitor_performance(operation_name: str = None):
    """Decorator to manually monitor function performance"""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            operation = operation_name or f"{func.__module__}.{func.__name__}"
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                # Track successful operation
                track_api_call(operation, duration, 200)
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                # Track failed operation
                track_api_call(operation, duration, 500)
                
                app_logger.error(
                    f"Error in monitored operation {operation}: {e}",
                    operation=operation,
                    duration=duration,
                    error=str(e)
                )
                
                raise
        
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            operation = operation_name or f"{func.__module__}.{func.__name__}"
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                # Track successful operation
                track_api_call(operation, duration, 200)
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                # Track failed operation
                track_api_call(operation, duration, 500)
                
                app_logger.error(
                    f"Error in monitored operation {operation}: {e}",
                    operation=operation,
                    duration=duration,
                    error=str(e)
                )
                
                raise
        
        # Return appropriate wrapper
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Health check endpoints
async def health_check_detailed():
    """Detailed health check with monitoring data"""
    try:
        # Collect current metrics
        current_metrics = monitoring_service.get_current_metrics()
        system_health = monitoring_service.get_system_health()
        active_alerts = monitoring_service.alert_manager.get_active_alerts()
        
        return {
            "status": "healthy" if system_health["status"] == "healthy" else "degraded",
            "timestamp": current_metrics.get("timestamp", time.time()),
            "system_health": system_health,
            "current_metrics": {
                k: v for k, v in current_metrics.items() 
                if k not in ["timestamp"]  # Remove timestamp for cleaner output
            } if current_metrics else {},
            "active_alerts": len(active_alerts),
            "alert_details": [
                {
                    "id": alert.id,
                    "level": alert.level.value,
                    "title": alert.title,
                    "message": alert.message,
                    "timestamp": alert.timestamp.isoformat()
                }
                for alert in active_alerts
            ],
            "services": {
                "monitoring": "active",
                "logging": "active",
                "performance_tracking": "active",
                "analytics": "active"
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": time.time(),
            "error": str(e),
            "services": {
                "monitoring": "error",
                "logging": "unknown",
                "performance_tracking": "unknown",
                "analytics": "unknown"
            }
        }


if __name__ == "__main__":
    # Test the middleware
    print("Monitoring Middleware initialized")
    
    # Test manual monitoring
    @monitor_performance("test_operation")
    def test_function():
        time.sleep(0.1)
        return "success"
    
    result = test_function()
    print(f"Test result: {result}")