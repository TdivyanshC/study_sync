"""
Health Check and Monitoring Routes

Provides comprehensive health check endpoints for monitoring
system status, performance, and dependencies.
"""

from fastapi import APIRouter, Response, status
from typing import Dict, Any
import time
from datetime import datetime
import psutil
import os

from utils.resilience import health_checker
from utils.performance_monitor import performance_monitor, cache_manager, connection_pool
from services.supabase_db import supabase_db

router = APIRouter(prefix="/health", tags=["health"])


# Register health checks
async def check_database():
    """Check database connectivity"""
    try:
        result = supabase_db.fetch_data("users", {"limit": 1})
        if result.get("success"):
            return "Database connection healthy"
        else:
            raise Exception("Database query failed")
    except Exception as e:
        raise Exception(f"Database unhealthy: {str(e)}")


async def check_memory():
    """Check memory usage"""
    memory = psutil.virtual_memory()
    if memory.percent > 90:
        raise Exception(f"High memory usage: {memory.percent}%")
    return f"Memory usage: {memory.percent}%"


async def check_disk():
    """Check disk usage"""
    disk = psutil.disk_usage('/')
    if disk.percent > 90:
        raise Exception(f"High disk usage: {disk.percent}%")
    return f"Disk usage: {disk.percent}%"


async def check_cpu():
    """Check CPU usage"""
    cpu_percent = psutil.cpu_percent(interval=1)
    if cpu_percent > 90:
        raise Exception(f"High CPU usage: {cpu_percent}%")
    return f"CPU usage: {cpu_percent}%"


# Register all health checks
health_checker.register_check("database", check_database)
health_checker.register_check("memory", check_memory)
health_checker.register_check("disk", check_disk)
health_checker.register_check("cpu", check_cpu)


@router.get("/")
async def health_check():
    """
    Basic health check endpoint
    
    Returns:
        Simple health status
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "StudySync Backend"
    }


@router.get("/detailed")
async def detailed_health_check():
    """
    Detailed health check with all system checks
    
    Returns:
        Comprehensive health status including all checks
    """
    health_results = await health_checker.run_all_checks()
    
    # Add system information
    health_results["system"] = {
        "uptime": time.time() - psutil.boot_time(),
        "process_id": os.getpid(),
        "python_version": os.sys.version
    }
    
    # Determine HTTP status code based on health
    status_code = status.HTTP_200_OK
    if health_results["status"] == "degraded":
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    
    return Response(
        content=str(health_results),
        status_code=status_code,
        media_type="application/json"
    )


@router.get("/metrics")
async def get_metrics():
    """
    Get performance metrics
    
    Returns:
        Performance metrics including request stats, cache stats, etc.
    """
    return {
        "timestamp": datetime.now().isoformat(),
        "performance": performance_monitor.get_metrics(),
        "cache": cache_manager.get_stats(),
        "connection_pool": connection_pool.get_stats(),
        "system": {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent
        }
    }


@router.get("/slow-requests")
async def get_slow_requests(threshold: float = 1.0):
    """
    Get requests that exceeded time threshold
    
    Args:
        threshold: Time threshold in seconds (default: 1.0)
        
    Returns:
        List of slow requests
    """
    slow_requests = performance_monitor.get_slow_requests(threshold)
    
    return {
        "threshold": threshold,
        "count": len(slow_requests),
        "requests": slow_requests
    }


@router.get("/readiness")
async def readiness_check():
    """
    Readiness check for load balancers
    
    Returns:
        200 if ready to accept traffic, 503 otherwise
    """
    # Check critical dependencies
    try:
        db_check = await check_database()
        
        return {
            "status": "ready",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return Response(
            content=str({"status": "not_ready", "reason": str(e)}),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json"
        )


@router.get("/liveness")
async def liveness_check():
    """
    Liveness check for orchestrators
    
    Returns:
        200 if service is alive
    """
    return {
        "status": "alive",
        "timestamp": datetime.now().isoformat()
    }


@router.post("/reset-metrics")
async def reset_metrics():
    """
    Reset performance metrics
    
    Returns:
        Confirmation of reset
    """
    performance_monitor.reset_metrics()
    
    return {
        "status": "success",
        "message": "Performance metrics reset",
        "timestamp": datetime.now().isoformat()
    }


@router.post("/clear-cache")
async def clear_cache():
    """
    Clear application cache
    
    Returns:
        Confirmation of cache clear
    """
    cache_manager.clear()
    
    return {
        "status": "success",
        "message": "Cache cleared",
        "timestamp": datetime.now().isoformat()
    }


@router.get("/dependencies")
async def check_dependencies():
    """
    Check status of external dependencies
    
    Returns:
        Status of all external dependencies
    """
    dependencies = {}
    
    # Check database
    try:
        await check_database()
        dependencies["database"] = {
            "status": "healthy",
            "message": "Connected"
        }
    except Exception as e:
        dependencies["database"] = {
            "status": "unhealthy",
            "message": str(e)
        }
    
    # Check environment variables
    required_env_vars = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        dependencies["environment"] = {
            "status": "unhealthy",
            "message": f"Missing environment variables: {', '.join(missing_vars)}"
        }
    else:
        dependencies["environment"] = {
            "status": "healthy",
            "message": "All required environment variables present"
        }
    
    # Overall status
    all_healthy = all(
        dep["status"] == "healthy"
        for dep in dependencies.values()
    )
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "dependencies": dependencies,
        "timestamp": datetime.now().isoformat()
    }
