"""
Enhanced Logging and Error Tracking System

Provides structured logging, error tracking, and audit trail capabilities
for comprehensive system monitoring and debugging.
"""

import logging
import json
import traceback
from datetime import datetime
from typing import Any, Dict, Optional
from pathlib import Path
import sys
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from enum import Enum


class LogLevel(Enum):
    """Log levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class StructuredLogger:
    """Structured logging with JSON output"""
    
    def __init__(self, name: str, log_dir: str = "logs"):
        self.name = name
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Create logger
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        
        # Prevent duplicate handlers
        if not self.logger.handlers:
            self._setup_handlers()
    
    def _setup_handlers(self):
        """Setup logging handlers"""
        # Console handler with colored output
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        
        # File handler for all logs (rotating)
        all_logs_file = self.log_dir / f"{self.name}_all.log"
        file_handler = RotatingFileHandler(
            all_logs_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        
        # Error log file (rotating)
        error_logs_file = self.log_dir / f"{self.name}_errors.log"
        error_handler = RotatingFileHandler(
            error_logs_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(file_formatter)
        
        # JSON log file for structured logging
        json_logs_file = self.log_dir / f"{self.name}_structured.json"
        json_handler = RotatingFileHandler(
            json_logs_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        json_handler.setLevel(logging.INFO)
        json_handler.setFormatter(JSONFormatter())
        
        # Add handlers
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(error_handler)
        self.logger.addHandler(json_handler)
    
    def _create_log_entry(
        self,
        level: str,
        message: str,
        extra: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create structured log entry"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "logger": self.name,
            "message": message
        }
        
        if extra:
            entry["extra"] = extra
        
        return entry
    
    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self.logger.debug(message, extra=kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message"""
        self.logger.info(message, extra=kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self.logger.warning(message, extra=kwargs)
    
    def error(self, message: str, exc_info: bool = False, **kwargs):
        """Log error message"""
        if exc_info:
            kwargs["traceback"] = traceback.format_exc()
        self.logger.error(message, extra=kwargs)
    
    def critical(self, message: str, exc_info: bool = False, **kwargs):
        """Log critical message"""
        if exc_info:
            kwargs["traceback"] = traceback.format_exc()
        self.logger.critical(message, extra=kwargs)
    
    def log_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration: float,
        user_id: Optional[str] = None,
        **kwargs
    ):
        """Log HTTP request"""
        log_data = {
            "type": "http_request",
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration": duration,
            "user_id": user_id,
            **kwargs
        }
        
        if status_code >= 500:
            self.error(f"HTTP {status_code}: {method} {path}", **log_data)
        elif status_code >= 400:
            self.warning(f"HTTP {status_code}: {method} {path}", **log_data)
        else:
            self.info(f"HTTP {status_code}: {method} {path}", **log_data)
    
    def log_database_operation(
        self,
        operation: str,
        table: str,
        duration: float,
        success: bool,
        error: Optional[str] = None,
        **kwargs
    ):
        """Log database operation"""
        log_data = {
            "type": "database_operation",
            "operation": operation,
            "table": table,
            "duration": duration,
            "success": success,
            **kwargs
        }
        
        if error:
            log_data["error"] = error
        
        if success:
            self.info(f"DB {operation} on {table}", **log_data)
        else:
            self.error(f"DB {operation} failed on {table}", **log_data)
    
    def log_business_event(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        **kwargs
    ):
        """Log business event"""
        log_data = {
            "type": "business_event",
            "event_type": event_type,
            "user_id": user_id,
            **kwargs
        }
        
        self.info(f"Business event: {event_type}", **log_data)
    
    def log_security_event(
        self,
        event_type: str,
        severity: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        **kwargs
    ):
        """Log security event"""
        log_data = {
            "type": "security_event",
            "event_type": event_type,
            "severity": severity,
            "user_id": user_id,
            "ip_address": ip_address,
            **kwargs
        }
        
        if severity in ["high", "critical"]:
            self.error(f"Security event: {event_type}", **log_data)
        else:
            self.warning(f"Security event: {event_type}", **log_data)


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add extra fields
        if hasattr(record, "extra"):
            log_data.update(record.extra)
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info)
            }
        
        return json.dumps(log_data)


class AuditLogger:
    """Audit logger for tracking important system events"""
    
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Create audit log file
        audit_file = self.log_dir / "audit.log"
        self.logger = logging.getLogger("audit")
        self.logger.setLevel(logging.INFO)
        
        # Prevent duplicate handlers
        if not self.logger.handlers:
            handler = TimedRotatingFileHandler(
                audit_file,
                when="midnight",
                interval=1,
                backupCount=30  # Keep 30 days of audit logs
            )
            formatter = logging.Formatter(
                '%(asctime)s - AUDIT - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
    
    def log_event(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        action: Optional[str] = None,
        result: str = "success",
        **kwargs
    ):
        """Log audit event"""
        audit_entry = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,
            "result": result,
            **kwargs
        }
        
        self.logger.info(json.dumps(audit_entry))
    
    def log_authentication(
        self,
        user_id: str,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log authentication attempt"""
        self.log_event(
            event_type="authentication",
            user_id=user_id,
            action="login",
            result="success" if success else "failure",
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    def log_authorization(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: str,
        granted: bool
    ):
        """Log authorization check"""
        self.log_event(
            event_type="authorization",
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            result="granted" if granted else "denied"
        )
    
    def log_data_access(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        operation: str
    ):
        """Log data access"""
        self.log_event(
            event_type="data_access",
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=operation
        )
    
    def log_data_modification(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        operation: str,
        changes: Optional[Dict[str, Any]] = None
    ):
        """Log data modification"""
        self.log_event(
            event_type="data_modification",
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=operation,
            changes=changes
        )


class ErrorTracker:
    """Track and aggregate errors for monitoring"""
    
    def __init__(self):
        self.errors: Dict[str, Dict[str, Any]] = {}
    
    def track_error(
        self,
        error_type: str,
        error_message: str,
        context: Optional[Dict[str, Any]] = None
    ):
        """Track an error occurrence"""
        error_key = f"{error_type}:{error_message}"
        
        if error_key not in self.errors:
            self.errors[error_key] = {
                "type": error_type,
                "message": error_message,
                "count": 0,
                "first_seen": datetime.now().isoformat(),
                "last_seen": None,
                "contexts": []
            }
        
        error_entry = self.errors[error_key]
        error_entry["count"] += 1
        error_entry["last_seen"] = datetime.now().isoformat()
        
        if context:
            error_entry["contexts"].append({
                "timestamp": datetime.now().isoformat(),
                **context
            })
            
            # Keep only last 10 contexts
            if len(error_entry["contexts"]) > 10:
                error_entry["contexts"] = error_entry["contexts"][-10:]
    
    def get_error_summary(self) -> Dict[str, Any]:
        """Get summary of tracked errors"""
        return {
            "total_unique_errors": len(self.errors),
            "total_error_count": sum(e["count"] for e in self.errors.values()),
            "errors": list(self.errors.values())
        }
    
    def get_top_errors(self, limit: int = 10) -> list:
        """Get most frequent errors"""
        sorted_errors = sorted(
            self.errors.values(),
            key=lambda x: x["count"],
            reverse=True
        )
        return sorted_errors[:limit]
    
    def clear_errors(self):
        """Clear tracked errors"""
        self.errors.clear()


# Global instances
app_logger = StructuredLogger("studysync")
audit_logger = AuditLogger()
error_tracker = ErrorTracker()


# Convenience functions
def log_info(message: str, **kwargs):
    """Log info message"""
    app_logger.info(message, **kwargs)


def log_error(message: str, exc_info: bool = False, **kwargs):
    """Log error message"""
    app_logger.error(message, exc_info=exc_info, **kwargs)
    
    # Track error
    error_type = kwargs.get("error_type", "UnknownError")
    error_tracker.track_error(error_type, message, kwargs)


def log_warning(message: str, **kwargs):
    """Log warning message"""
    app_logger.warning(message, **kwargs)


def log_debug(message: str, **kwargs):
    """Log debug message"""
    app_logger.debug(message, **kwargs)


if __name__ == "__main__":
    # Example usage
    log_info("Application started")
    log_error("Test error", error_type="TestError", user_id="123")
    print(f"Error summary: {error_tracker.get_error_summary()}")
