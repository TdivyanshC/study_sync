"""
Comprehensive Monitoring and Analytics Service

Provides real-time monitoring, analytics, alerting, and health checks
for the StudySync backend application.
"""

import asyncio
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
from enum import Enum
import json
import os
from pathlib import Path

# Try to import psutil, make it optional
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("Warning: psutil not available. System metrics will be limited.")

from .performance_monitor import performance_monitor, cache_manager, connection_pool
from .enhanced_logging import app_logger, audit_logger, error_tracker, log_info, log_error, log_warning


class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class MetricData:
    """Metric data structure"""
    name: str
    value: float
    timestamp: datetime
    labels: Dict[str, Any] = None
    unit: str = ""


@dataclass
class Alert:
    """Alert data structure"""
    id: str
    level: AlertLevel
    title: str
    message: str
    timestamp: datetime
    metric_name: str
    current_value: float
    threshold: float
    resolved: bool = False
    resolved_at: Optional[datetime] = None


class SystemMetricsCollector:
    """Collect system-level metrics"""
    
    def __init__(self):
        if PSUTIL_AVAILABLE:
            self.process = psutil.Process()
            self.last_cpu_times = None
            self.last_cpu_time = None
        else:
            self.process = None
    
    def get_cpu_usage(self) -> float:
        """Get current CPU usage percentage"""
        if not PSUTIL_AVAILABLE:
            return 0.0
        return psutil.cpu_percent(interval=1)
    
    def get_memory_usage(self) -> Dict[str, float]:
        """Get memory usage statistics"""
        if not PSUTIL_AVAILABLE:
            return {
                "total": 0,
                "available": 0,
                "used": 0,
                "percentage": 0,
                "process_rss": 0,
                "process_vms": 0
            }
        
        memory = psutil.virtual_memory()
        process_memory = self.process.memory_info()
        
        return {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "percentage": memory.percent,
            "process_rss": process_memory.rss,
            "process_vms": process_memory.vms
        }
    
    def get_disk_usage(self) -> Dict[str, float]:
        """Get disk usage statistics"""
        if not PSUTIL_AVAILABLE:
            return {
                "total": 0,
                "used": 0,
                "free": 0,
                "percentage": 0
            }
        
        disk = psutil.disk_usage('/')
        return {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percentage": (disk.used / disk.total) * 100
        }
    
    def get_network_stats(self) -> Dict[str, int]:
        """Get network statistics"""
        if not PSUTIL_AVAILABLE:
            return {
                "bytes_sent": 0,
                "bytes_recv": 0,
                "packets_sent": 0,
                "packets_recv": 0
            }
        
        net_io = psutil.net_io_counters()
        return {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv
        }
    
    def get_process_info(self) -> Dict[str, Any]:
        """Get process information"""
        if not PSUTIL_AVAILABLE:
            return {
                "pid": 0,
                "name": "unknown",
                "status": "unknown",
                "cpu_percent": 0,
                "memory_percent": 0,
                "num_threads": 0,
                "create_time": datetime.now()
            }
        
        return {
            "pid": self.process.pid,
            "name": self.process.name(),
            "status": self.process.status(),
            "cpu_percent": self.process.cpu_percent(),
            "memory_percent": self.process.memory_percent(),
            "num_threads": self.process.num_threads(),
            "create_time": datetime.fromtimestamp(self.process.create_time())
        }


class AnalyticsCollector:
    """Collect business analytics data"""
    
    def __init__(self):
        self.user_sessions = defaultdict(list)  # user_id -> [session_data]
        self.api_usage = defaultdict(lambda: {"count": 0, "response_times": []})
        self.active_connections = 0
        self.gamification_events = deque(maxlen=10000)  # Last 10k events
    
    def track_user_session(self, user_id: str, session_data: Dict[str, Any]):
        """Track user study session"""
        session_data["timestamp"] = datetime.now()
        self.user_sessions[user_id].append(session_data)
        
        # Keep only last 100 sessions per user
        if len(self.user_sessions[user_id]) > 100:
            self.user_sessions[user_id] = self.user_sessions[user_id][-100:]
    
    def track_api_usage(self, endpoint: str, response_time: float, status_code: int):
        """Track API usage statistics"""
        endpoint_data = self.api_usage[endpoint]
        endpoint_data["count"] += 1
        endpoint_data["response_times"].append(response_time)
        
        # Keep only last 1000 response times per endpoint
        if len(endpoint_data["response_times"]) > 1000:
            endpoint_data["response_times"] = endpoint_data["response_times"][-1000:]
    
    def track_gamification_event(self, event_type: str, user_id: str, data: Dict[str, Any]):
        """Track gamification events"""
        event = {
            "timestamp": datetime.now(),
            "event_type": event_type,
            "user_id": user_id,
            "data": data
        }
        self.gamification_events.append(event)
    
    def track_active_connections(self, count: int):
        """Track active connections count"""
        self.active_connections = count
    
    def get_user_analytics(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """Get user-specific analytics"""
        cutoff_date = datetime.now() - timedelta(days=days)
        user_sessions = [
            s for s in self.user_sessions[user_id] 
            if s["timestamp"] > cutoff_date
        ]
        
        if not user_sessions:
            return {
                "total_sessions": 0,
                "total_study_time": 0,
                "average_efficiency": 0,
                "streak_days": 0,
                "xp_earned": 0
            }
        
        total_study_time = sum(s.get("duration_minutes", 0) for s in user_sessions)
        efficiencies = [s.get("efficiency", 0) for s in user_sessions if s.get("efficiency")]
        average_efficiency = sum(efficiencies) / len(efficiencies) if efficiencies else 0
        xp_earned = sum(s.get("xp_gained", 0) for s in user_sessions)
        
        # Calculate streak (simplified)
        unique_days = set(
            s["timestamp"].date() for s in user_sessions
        )
        streak_days = len(unique_days)
        
        return {
            "total_sessions": len(user_sessions),
            "total_study_time": total_study_time,
            "average_efficiency": round(average_efficiency, 2),
            "streak_days": streak_days,
            "xp_earned": xp_earned,
            "study_days": sorted([d.isoformat() for d in unique_days])
        }
    
    def get_api_analytics(self) -> Dict[str, Any]:
        """Get API usage analytics"""
        analytics = {}
        
        for endpoint, data in self.api_usage.items():
            response_times = data["response_times"]
            analytics[endpoint] = {
                "total_requests": data["count"],
                "average_response_time": sum(response_times) / len(response_times) if response_times else 0,
                "min_response_time": min(response_times) if response_times else 0,
                "max_response_time": max(response_times) if response_times else 0,
                "p95_response_time": self._calculate_percentile(response_times, 95) if response_times else 0,
                "p99_response_time": self._calculate_percentile(response_times, 99) if response_times else 0
            }
        
        return analytics
    
    def get_gamification_analytics(self) -> Dict[str, Any]:
        """Get gamification events analytics"""
        # Group events by type
        events_by_type = defaultdict(int)
        events_by_user = defaultdict(int)
        
        for event in self.gamification_events:
            events_by_type[event["event_type"]] += 1
            events_by_user[event["user_id"]] += 1
        
        return {
            "total_events": len(self.gamification_events),
            "events_by_type": dict(events_by_type),
            "events_by_user": dict(events_by_user),
            "most_active_users": sorted(
                events_by_user.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:10],
            "recent_events": list(self.gamification_events)[-20:]  # Last 20 events
        }
    
    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile from values"""
        if not values:
            return 0
        
        sorted_values = sorted(values)
        index = (percentile / 100) * (len(sorted_values) - 1)
        
        if index == int(index):
            return sorted_values[int(index)]
        else:
            lower_index = int(index)
            upper_index = lower_index + 1
            weight = index - lower_index
            return sorted_values[lower_index] * (1 - weight) + sorted_values[upper_index] * weight


class AlertManager:
    """Manage monitoring alerts"""
    
    def __init__(self):
        self.alerts: Dict[str, Alert] = {}
        self.alert_rules: Dict[str, Dict[str, Any]] = {
            "cpu_usage": {
                "threshold": 80.0,
                "level": AlertLevel.WARNING,
                "duration": 300  # 5 minutes
            },
            "memory_usage": {
                "threshold": 85.0,
                "level": AlertLevel.ERROR,
                "duration": 300
            },
            "disk_usage": {
                "threshold": 90.0,
                "level": AlertLevel.CRITICAL,
                "duration": 60
            },
            "response_time": {
                "threshold": 2.0,
                "level": AlertLevel.WARNING,
                "duration": 180
            },
            "error_rate": {
                "threshold": 5.0,  # 5%
                "level": AlertLevel.ERROR,
                "duration": 120
            }
        }
        self.alert_callbacks: List[Callable] = []
        self.violation_times: Dict[str, datetime] = {}
    
    def add_alert_callback(self, callback: Callable):
        """Add alert callback function"""
        self.alert_callbacks.append(callback)
    
    def check_alerts(self, metrics: Dict[str, Any]):
        """Check metrics against alert rules"""
        current_time = datetime.now()
        
        for metric_name, value in metrics.items():
            if metric_name in self.alert_rules:
                rule = self.alert_rules[metric_name]
                threshold = rule["threshold"]
                level = rule["level"]
                duration = rule["duration"]
                
                # Check if threshold is violated
                violated = False
                if metric_name == "cpu_usage" and value > threshold:
                    violated = True
                elif metric_name == "memory_usage" and value > threshold:
                    violated = True
                elif metric_name == "disk_usage" and value > threshold:
                    violated = True
                elif metric_name == "avg_response_time" and value > threshold:
                    violated = True
                elif metric_name == "error_rate" and value > threshold:
                    violated = True
                
                if violated:
                    # Check if we already have a violation start time
                    if metric_name not in self.violation_times:
                        self.violation_times[metric_name] = current_time
                    
                    # Check if violation has lasted long enough
                    violation_duration = (current_time - self.violation_times[metric_name]).total_seconds()
                    
                    if violation_duration >= duration:
                        # Create or update alert
                        alert_id = f"{metric_name}_{current_time.strftime('%Y%m%d_%H%M%S')}"
                        
                        if alert_id not in self.alerts:
                            alert = Alert(
                                id=alert_id,
                                level=level,
                                title=f"{metric_name.replace('_', ' ').title()} Alert",
                                message=f"{metric_name} is {value:.2f}, threshold is {threshold}",
                                timestamp=current_time,
                                metric_name=metric_name,
                                current_value=value,
                                threshold=threshold
                            )
                            
                            self.alerts[alert_id] = alert
                            log_warning(f"Alert triggered: {alert.title} - {alert.message}")
                            
                            # Call alert callbacks
                            for callback in self.alert_callbacks:
                                try:
                                    callback(alert)
                                except Exception as e:
                                    log_error(f"Error in alert callback: {e}")
                else:
                    # Metric is normal, resolve any existing alerts
                    self._resolve_alerts(metric_name)
    
    def _resolve_alerts(self, metric_name: str):
        """Resolve alerts for a metric that returned to normal"""
        current_time = datetime.now()
        
        alerts_to_resolve = [
            alert_id for alert_id, alert in self.alerts.items()
            if alert.metric_name == metric_name and not alert.resolved
        ]
        
        for alert_id in alerts_to_resolve:
            alert = self.alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = current_time
            
            log_info(f"Alert resolved: {alert.title}")
            
            # Remove from violation times
            if metric_name in self.violation_times:
                del self.violation_times[metric_name]
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active (unresolved) alerts"""
        return [alert for alert in self.alerts.values() if not alert.resolved]
    
    def get_all_alerts(self, limit: int = 100) -> List[Alert]:
        """Get all alerts (limited to most recent)"""
        sorted_alerts = sorted(
            self.alerts.values(),
            key=lambda x: x.timestamp,
            reverse=True
        )
        return sorted_alerts[:limit]


class MonitoringService:
    """Main monitoring service that orchestrates all monitoring components"""
    
    def __init__(self):
        self.system_metrics = SystemMetricsCollector()
        self.analytics = AnalyticsCollector()
        self.alert_manager = AlertManager()
        self.is_monitoring = False
        self.monitoring_task: Optional[asyncio.Task] = None
        self.monitoring_interval = 30  # seconds
        self.metrics_history = deque(maxlen=1440)  # Keep 24 hours of metrics (1 per minute)
        
        # Add alert callback for logging
        self.alert_manager.add_alert_callback(self._log_alert)
    
    def _log_alert(self, alert: Alert):
        """Log alert to audit log"""
        audit_logger.log_event(
            event_type="monitoring_alert",
            action="alert_triggered",
            result="triggered",
            alert_level=alert.level.value,
            alert_title=alert.title,
            alert_message=alert.message,
            metric_name=alert.metric_name,
            current_value=alert.current_value,
            threshold=alert.threshold
        )
    
    async def start_monitoring(self):
        """Start the monitoring service"""
        if self.is_monitoring:
            log_warning("Monitoring service is already running")
            return
        
        self.is_monitoring = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        log_info("Monitoring service started")
    
    async def stop_monitoring(self):
        """Stop the monitoring service"""
        if not self.is_monitoring:
            log_warning("Monitoring service is not running")
            return
        
        self.is_monitoring = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        log_info("Monitoring service stopped")
    
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        try:
            while self.is_monitoring:
                await self.collect_and_process_metrics()
                await asyncio.sleep(self.monitoring_interval)
        except asyncio.CancelledError:
            log_info("Monitoring loop cancelled")
        except Exception as e:
            log_error(f"Error in monitoring loop: {e}")
    
    async def collect_and_process_metrics(self):
        """Collect and process all metrics"""
        try:
            # Collect system metrics
            system_metrics = {
                "cpu_usage": self.system_metrics.get_cpu_usage(),
                "memory_usage": self.system_metrics.get_memory_usage()["percentage"],
                "disk_usage": self.system_metrics.get_disk_usage()["percentage"],
                "process_memory_mb": self.system_metrics.get_memory_usage()["process_rss"] / (1024 * 1024),
                "active_connections": self.analytics.active_connections
            }
            
            # Get performance metrics
            perf_metrics = performance_monitor.get_metrics()
            if perf_metrics:
                total_requests = sum(m["total_requests"] for m in perf_metrics.values())
                total_errors = sum(m["total_errors"] for m in perf_metrics.values())
                avg_response_time = sum(
                    m["average_time"] * m["total_requests"] for m in perf_metrics.values()
                ) / total_requests if total_requests > 0 else 0
                error_rate = (total_errors / total_requests) * 100 if total_requests > 0 else 0
                
                system_metrics.update({
                    "total_requests": total_requests,
                    "total_errors": total_errors,
                    "avg_response_time": avg_response_time,
                    "error_rate": error_rate
                })
            
            # Get cache metrics
            cache_stats = cache_manager.get_stats()
            system_metrics.update({
                "cache_hit_rate": cache_stats["hit_rate"] * 100,
                "cache_entries": cache_stats["total_entries"]
            })
            
            # Get connection pool metrics
            conn_pool_stats = connection_pool.get_stats()
            system_metrics.update({
                "connection_pool_utilization": conn_pool_stats["utilization"] * 100
            })
            
            # Add timestamp
            system_metrics["timestamp"] = datetime.now()
            
            # Store in history
            self.metrics_history.append(system_metrics)
            
            # Check for alerts
            self.alert_manager.check_alerts(system_metrics)
            
            log_debug(f"Metrics collected: CPU {system_metrics['cpu_usage']:.1f}%, Memory {system_metrics['memory_usage']:.1f}%")
            
        except Exception as e:
            log_error(f"Error collecting metrics: {e}")
    
    def get_current_metrics(self) -> Dict[str, Any]:
        """Get current system metrics"""
        if not self.metrics_history:
            return {}
        
        return self.metrics_history[-1]
    
    def get_metrics_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get metrics history for specified hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [
            m for m in self.metrics_history
            if m.get("timestamp", datetime.now()) > cutoff_time
        ]
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health status"""
        if not self.metrics_history:
            return {"status": "unknown", "score": 0}
        
        latest = self.metrics_history[-1]
        active_alerts = self.alert_manager.get_active_alerts()
        
        # Calculate health score
        score = 100
        if latest.get("cpu_usage", 0) > 80:
            score -= 20
        if latest.get("memory_usage", 0) > 85:
            score -= 20
        if latest.get("disk_usage", 0) > 90:
            score -= 30
        if latest.get("error_rate", 0) > 5:
            score -= 15
        
        # Determine status
        if score >= 90:
            status = "healthy"
        elif score >= 70:
            status = "degraded"
        elif score >= 50:
            status = "unhealthy"
        else:
            status = "critical"
        
        return {
            "status": status,
            "score": score,
            "active_alerts": len(active_alerts),
            "latest_metrics": {
                "cpu_usage": latest.get("cpu_usage", 0),
                "memory_usage": latest.get("memory_usage", 0),
                "disk_usage": latest.get("disk_usage", 0),
                "error_rate": latest.get("error_rate", 0)
            }
        }
    
    def track_event(self, event_type: str, user_id: str = None, data: Dict[str, Any] = None):
        """Track a business event"""
        log_info(f"Event tracked: {event_type}", event_type=event_type, user_id=user_id, data=data)
        
        if event_type.startswith("gamification_"):
            self.analytics.track_gamification_event(event_type, user_id or "unknown", data or {})


# Global monitoring service instance
monitoring_service = MonitoringService()


# Convenience functions for easy integration
def track_user_session(user_id: str, session_data: Dict[str, Any]):
    """Track user study session"""
    monitoring_service.analytics.track_user_session(user_id, session_data)
    monitoring_service.track_event("user_session", user_id, session_data)


def track_api_call(endpoint: str, response_time: float, status_code: int):
    """Track API call"""
    monitoring_service.analytics.track_api_usage(endpoint, response_time, status_code)
    performance_monitor.record_request(endpoint, response_time, status_code)


def track_gamification_event(event_type: str, user_id: str, data: Dict[str, Any] = None):
    """Track gamification event"""
    monitoring_service.analytics.track_gamification_event(event_type, user_id, data or {})


def get_monitoring_dashboard_data() -> Dict[str, Any]:
    """Get comprehensive monitoring dashboard data"""
    current_metrics = monitoring_service.get_current_metrics()
    system_health = monitoring_service.get_system_health()
    active_alerts = monitoring_service.alert_manager.get_active_alerts()
    api_analytics = monitoring_service.analytics.get_api_analytics()
    gamification_analytics = monitoring_service.analytics.get_gamification_analytics()
    
    return {
        "timestamp": datetime.now(),
        "system_health": system_health,
        "current_metrics": current_metrics,
        "active_alerts": [asdict(alert) for alert in active_alerts],
        "api_analytics": api_analytics,
        "gamification_analytics": gamification_analytics,
        "cache_stats": cache_manager.get_stats(),
        "connection_pool_stats": connection_pool.get_stats()
    }


if __name__ == "__main__":
    # Example usage
    print("Monitoring Service initialized")
    print(f"PSUtil available: {PSUTIL_AVAILABLE}")
    
    # Test system metrics
    metrics_collector = SystemMetricsCollector()
    cpu_usage = metrics_collector.get_cpu_usage()
    memory_usage = metrics_collector.get_memory_usage()
    
    print(f"CPU Usage: {cpu_usage:.1f}%")
    print(f"Memory Usage: {memory_usage}")
    
    # Test alert system
    alert_manager = AlertManager()
    alert_manager.check_alerts({"cpu_usage": 85.0, "memory_usage": 90.0})
    print(f"Active alerts: {len(alert_manager.get_active_alerts())}")