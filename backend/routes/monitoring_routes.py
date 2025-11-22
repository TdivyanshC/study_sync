"""
Monitoring API Routes

Provides comprehensive monitoring endpoints for real-time system health,
performance metrics, analytics, and alerting.
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import asyncio
import json

from utils.monitoring_service import monitoring_service, get_monitoring_dashboard_data
from middleware.monitoring_middleware import health_check_detailed, monitoring_middleware
from utils.enhanced_logging import app_logger, log_info, log_error


# Create monitoring router
monitoring_router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@monitoring_router.get("/health")
async def get_monitoring_health():
    """Get overall monitoring system health"""
    try:
        system_health = monitoring_service.get_system_health()
        current_metrics = monitoring_service.get_current_metrics()
        active_alerts = monitoring_service.alert_manager.get_active_alerts()
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow(),
            "monitoring_system": {
                "status": "active",
                "metrics_collected": len(current_metrics) > 0,
                "alerts_active": len(active_alerts),
                "uptime": "monitoring service running"
            },
            "system_health": system_health,
            "current_metrics": current_metrics
        }
        
    except Exception as e:
        log_error(f"Error getting monitoring health: {e}")
        raise HTTPException(status_code=500, detail=f"Monitoring health check failed: {str(e)}")


@monitoring_router.get("/metrics/current")
async def get_current_metrics():
    """Get current system metrics"""
    try:
        metrics = monitoring_service.get_current_metrics()
        
        if not metrics:
            # Collect metrics if none available
            await monitoring_service.collect_and_process_metrics()
            metrics = monitoring_service.get_current_metrics()
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow(),
            "metrics": metrics
        }
        
    except Exception as e:
        log_error(f"Error getting current metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@monitoring_router.get("/metrics/history")
async def get_metrics_history(
    hours: int = Query(24, ge=1, le=168, description="Hours of history to retrieve")
):
    """Get metrics history for specified time period"""
    try:
        history = monitoring_service.get_metrics_history(hours)
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow(),
            "period_hours": hours,
            "data_points": len(history),
            "metrics": history
        }
        
    except Exception as e:
        log_error(f"Error getting metrics history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics history: {str(e)}")


@monitoring_router.get("/alerts")
async def get_alerts(
    active_only: bool = Query(False, description="Only return active alerts"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of alerts to return")
):
    """Get monitoring alerts"""
    try:
        if active_only:
            alerts = monitoring_service.alert_manager.get_active_alerts()
        else:
            alerts = monitoring_service.alert_manager.get_all_alerts(limit)
        
        # Convert alerts to serializable format
        alert_data = []
        for alert in alerts:
            alert_data.append({
                "id": alert.id,
                "level": alert.level.value,
                "title": alert.title,
                "message": alert.message,
                "timestamp": alert.timestamp.isoformat(),
                "metric_name": alert.metric_name,
                "current_value": alert.current_value,
                "threshold": alert.threshold,
                "resolved": alert.resolved,
                "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None
            })
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow(),
            "active_only": active_only,
            "total_alerts": len(alert_data),
            "alerts": alert_data
        }
        
    except Exception as e:
        log_error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")


@monitoring_router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    """Manually resolve an alert"""
    try:
        if alert_id in monitoring_service.alert_manager.alerts:
            alert = monitoring_service.alert_manager.alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = datetime.utcnow()
            
            log_info(f"Alert {alert_id} manually resolved")
            
            return {
                "status": "ok",
                "message": f"Alert {alert_id} resolved",
                "alert_id": alert_id,
                "resolved_at": alert.resolved_at.isoformat()
            }
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
            
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error resolving alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve alert: {str(e)}")


@monitoring_router.get("/analytics/api")
async def get_api_analytics():
    """Get API usage analytics"""
    try:
        api_analytics = monitoring_service.analytics.get_api_analytics()
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow(),
            "analytics": api_analytics
        }
        
    except Exception as e:
        log_error(f"Error getting API analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get API analytics: {str(e)}")


@monitoring_router.get("/analytics/gamification")
async def get_gamification_analytics():
    """Get gamification events analytics"""
    try:
        gamification_analytics = monitoring_service.analytics.get_gamification_analytics()
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow(),
            "analytics": gamification_analytics
        }
        
    except Exception as e:
        log_error(f"Error getting gamification analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get gamification analytics: {str(e)}")


@monitoring_router.get("/analytics/users/{user_id}")
async def get_user_analytics(
    user_id: str,
    days: int = Query(7, ge=1, le=30, description="Number of days to analyze")
):
    """Get user-specific analytics"""
    try:
        user_analytics = monitoring_service.analytics.get_user_analytics(user_id, days)
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow(),
            "user_id": user_id,
            "analysis_period_days": days,
            "analytics": user_analytics
        }
        
    except Exception as e:
        log_error(f"Error getting user analytics for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user analytics: {str(e)}")


@monitoring_router.get("/dashboard")
async def get_monitoring_dashboard():
    """Get comprehensive monitoring dashboard data"""
    try:
        dashboard_data = get_monitoring_dashboard_data()
        
        return {
            "status": "ok",
            "timestamp": dashboard_data["timestamp"].isoformat(),
            "dashboard": dashboard_data
        }
        
    except Exception as e:
        log_error(f"Error getting monitoring dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")


@monitoring_router.get("/performance")
async def get_performance_metrics():
    """Get detailed performance metrics"""
    try:
        from utils.performance_monitor import performance_monitor, cache_manager, connection_pool
        
        # Get performance metrics
        perf_metrics = performance_monitor.get_metrics()
        cache_stats = cache_manager.get_stats()
        conn_pool_stats = connection_pool.get_stats()
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow(),
            "performance": {
                "endpoints": perf_metrics,
                "cache": cache_stats,
                "connection_pool": conn_pool_stats
            }
        }
        
    except Exception as e:
        log_error(f"Error getting performance metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance metrics: {str(e)}")


@monitoring_router.get("/system")
async def get_system_info():
    """Get detailed system information"""
    try:
        import platform
        import sys
        
        # Check if psutil is available
        try:
            import psutil
            psutil_available = True
        except ImportError:
            psutil_available = False
        
        # Get system metrics
        system_metrics = monitoring_service.system_metrics
        current_metrics = monitoring_service.get_current_metrics()
        
        system_info = {
            "platform": {
                "system": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
                "machine": platform.machine(),
                "processor": platform.processor(),
                "python_version": sys.version
            },
            "current_metrics": current_metrics,
            "process_info": system_metrics.get_process_info()
        }
        
        # Add resource information if psutil is available
        if psutil_available:
            system_info["resources"] = {
                "cpu_count": psutil.cpu_count(),
                "cpu_count_logical": psutil.cpu_count(logical=True),
                "memory_total": psutil.virtual_memory().total,
                "disk_total": psutil.disk_usage('/').total
            }
        else:
            system_info["resources"] = {
                "cpu_count": 0,
                "cpu_count_logical": 0,
                "memory_total": 0,
                "disk_total": 0,
                "note": "psutil not available - resource metrics limited"
            }
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow(),
            "system_info": system_info
        }
        
    except Exception as e:
        log_error(f"Error getting system info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")


@monitoring_router.post("/events/track")
async def track_custom_event(
    event_type: str,
    user_id: Optional[str] = None,
    event_data: Optional[Dict[str, Any]] = None
):
    """Track a custom business event"""
    try:
        monitoring_service.track_event(event_type, user_id, event_data)
        
        return {
            "status": "ok",
            "message": "Event tracked successfully",
            "event_type": event_type,
            "user_id": user_id,
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        log_error(f"Error tracking event {event_type}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track event: {str(e)}")


@monitoring_router.get("/export")
async def export_monitoring_data(
    format: str = Query("json", regex="^(json|csv)$", description="Export format"),
    hours: int = Query(24, ge=1, le=168, description="Hours of data to export"),
    include_alerts: bool = Query(True, description="Include alerts in export"),
    include_metrics: bool = Query(True, description="Include metrics in export"),
    include_analytics: bool = Query(True, description="Include analytics in export")
):
    """Export monitoring data in specified format"""
    try:
        export_data = {
            "export_info": {
                "timestamp": datetime.utcnow().isoformat(),
                "format": format,
                "period_hours": hours,
                "include_alerts": include_alerts,
                "include_metrics": include_metrics,
                "include_analytics": include_analytics
            }
        }
        
        if include_metrics:
            export_data["metrics"] = monitoring_service.get_metrics_history(hours)
        
        if include_alerts:
            all_alerts = monitoring_service.alert_manager.get_all_alerts(limit=1000)
            export_data["alerts"] = [
                {
                    "id": alert.id,
                    "level": alert.level.value,
                    "title": alert.title,
                    "message": alert.message,
                    "timestamp": alert.timestamp.isoformat(),
                    "metric_name": alert.metric_name,
                    "current_value": alert.current_value,
                    "threshold": alert.threshold,
                    "resolved": alert.resolved,
                    "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None
                }
                for alert in all_alerts
            ]
        
        if include_analytics:
            export_data["analytics"] = {
                "api_usage": monitoring_service.analytics.get_api_analytics(),
                "gamification": monitoring_service.analytics.get_gamification_analytics()
            }
        
        if format == "json":
            return {
                "status": "ok",
                "data": export_data,
                "content_type": "application/json"
            }
        else:  # CSV would need to be implemented
            raise HTTPException(status_code=501, detail="CSV export not yet implemented")
            
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error exporting monitoring data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")


@monitoring_router.post("/maintenance/cleanup")
async def cleanup_monitoring_data(background_tasks: BackgroundTasks):
    """Cleanup old monitoring data"""
    try:
        # Start cleanup in background
        background_tasks.add_task(perform_cleanup)
        
        return {
            "status": "ok",
            "message": "Cleanup task started",
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        log_error(f"Error starting cleanup: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start cleanup: {str(e)}")


async def perform_cleanup():
    """Perform cleanup of old monitoring data"""
    try:
        log_info("Starting monitoring data cleanup")
        
        # Clear old metrics (keep last 24 hours)
        metrics_to_keep = monitoring_service.get_metrics_history(24)
        monitoring_service.metrics_history.clear()
        
        for metric in metrics_to_keep:
            monitoring_service.metrics_history.append(metric)
        
        # Clear old errors from error tracker
        from utils.enhanced_logging import error_tracker
        error_tracker.clear_errors()
        
        # Clear cache
        from utils.performance_monitor import cache_manager
        cache_manager.clear()
        
        log_info("Monitoring data cleanup completed")
        
    except Exception as e:
        log_error(f"Error during cleanup: {e}")


@monitoring_router.get("/status")
async def get_monitoring_status():
    """Get overall monitoring system status"""
    try:
        current_metrics = monitoring_service.get_current_metrics()
        active_alerts = monitoring_service.alert_manager.get_active_alerts()
        
        # Determine overall status
        if not current_metrics:
            status = "starting"
            message = "Monitoring system initializing"
        elif len(active_alerts) == 0:
            status = "healthy"
            message = "All systems operating normally"
        elif any(alert.level.value in ["error", "critical"] for alert in active_alerts):
            status = "critical"
            message = f"{len(active_alerts)} active alerts requiring attention"
        else:
            status = "warning"
            message = f"{len(active_alerts)} active warnings"
        
        return {
            "status": status,
            "message": message,
            "timestamp": datetime.utcnow(),
            "details": {
                "metrics_collected": len(current_metrics) > 0,
                "active_alerts": len(active_alerts),
                "monitoring_active": monitoring_service.is_monitoring,
                "uptime": "monitoring service running"
            }
        }
        
    except Exception as e:
        log_error(f"Error getting monitoring status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


# Include the router in the API router
def create_monitoring_routes():
    """Create and return the monitoring router"""
    return monitoring_router


if __name__ == "__main__":
    # Test the routes
    print("Monitoring routes created")
    print("Available endpoints:")
    print("- GET /monitoring/health")
    print("- GET /monitoring/metrics/current")
    print("- GET /monitoring/alerts")
    print("- GET /monitoring/dashboard")
    print("- GET /monitoring/analytics/api")
    print("- GET /monitoring/analytics/gamification")
    print("- GET /monitoring/performance")
    print("- GET /monitoring/system")
    print("- POST /monitoring/events/track")