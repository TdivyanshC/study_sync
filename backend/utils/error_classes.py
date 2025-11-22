"""
Custom Error Classes for Comprehensive Error Handling
"""

from typing import Any, Dict, Optional, List
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)


class BaseStudySyncException(Exception):
    """Base exception class for StudySync applications"""
    
    def __init__(
        self, 
        message: str, 
        error_code: str = None, 
        details: Dict[str, Any] = None,
        status_code: int = 500
    ):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        self.status_code = status_code
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses"""
        return {
            "error": True,
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
            "status_code": self.status_code
        }
    
    def to_http_exception(self) -> HTTPException:
        """Convert to FastAPI HTTPException"""
        return HTTPException(
            status_code=self.status_code,
            detail=self.to_dict()
        )


class ValidationError(BaseStudySyncException):
    """Raised when data validation fails"""
    
    def __init__(
        self, 
        message: str, 
        field: str = None, 
        value: Any = None,
        validation_rules: List[str] = None
    ):
        details = {}
        if field:
            details["field"] = field
        if value is not None:
            details["value"] = str(value)
        if validation_rules:
            details["validation_rules"] = validation_rules
        
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            details=details,
            status_code=400
        )


class DatabaseError(BaseStudySyncException):
    """Raised when database operations fail"""
    
    def __init__(
        self, 
        message: str, 
        operation: str = None,
        table: str = None,
        query: str = None
    ):
        details = {}
        if operation:
            details["operation"] = operation
        if table:
            details["table"] = table
        if query:
            details["query"] = query[:200]  # Truncate long queries
        
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            details=details,
            status_code=500
        )


class AuthenticationError(BaseStudySyncException):
    """Raised when authentication fails"""
    
    def __init__(
        self, 
        message: str = "Authentication failed",
        reason: str = None
    ):
        details = {}
        if reason:
            details["reason"] = reason
        
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            details=details,
            status_code=401
        )


class AuthorizationError(BaseStudySyncException):
    """Raised when user lacks permission for an operation"""
    
    def __init__(
        self, 
        message: str = "Insufficient permissions",
        resource: str = None,
        action: str = None
    ):
        details = {}
        if resource:
            details["resource"] = resource
        if action:
            details["action"] = action
        
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            details=details,
            status_code=403
        )


class NotFoundError(BaseStudySyncException):
    """Raised when a requested resource is not found"""
    
    def __init__(
        self, 
        resource_type: str,
        resource_id: str = None
    ):
        message = f"{resource_type} not found"
        if resource_id:
            message += f" (ID: {resource_id})"
        
        details = {"resource_type": resource_type}
        if resource_id:
            details["resource_id"] = resource_id
        
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            details=details,
            status_code=404
        )


class ConflictError(BaseStudySyncException):
    """Raised when there's a conflict with current state"""
    
    def __init__(
        self, 
        message: str,
        conflict_type: str = None,
        conflicting_data: Dict[str, Any] = None
    ):
        details = {}
        if conflict_type:
            details["conflict_type"] = conflict_type
        if conflicting_data:
            details["conflicting_data"] = conflicting_data
        
        super().__init__(
            message=message,
            error_code="CONFLICT",
            details=details,
            status_code=409
        )


class RateLimitError(BaseStudySyncException):
    """Raised when rate limit is exceeded"""
    
    def __init__(
        self, 
        message: str = "Rate limit exceeded",
        limit: int = None,
        window: int = None,
        retry_after: int = None
    ):
        details = {}
        if limit:
            details["limit"] = limit
        if window:
            details["window"] = window
        if retry_after:
            details["retry_after"] = retry_after
        
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            details=details,
            status_code=429
        )


class ServiceUnavailableError(BaseStudySyncException):
    """Raised when a service is temporarily unavailable"""
    
    def __init__(
        self, 
        service_name: str,
        message: str = None
    ):
        if not message:
            message = f"Service '{service_name}' is temporarily unavailable"
        
        super().__init__(
            message=message,
            error_code="SERVICE_UNAVAILABLE",
            details={"service": service_name},
            status_code=503
        )


class AuditValidationError(BaseStudySyncException):
    """Raised when session audit validation fails"""
    
    def __init__(
        self, 
        message: str,
        session_id: str = None,
        suspicion_score: int = None,
        validation_details: Dict[str, Any] = None
    ):
        details = {}
        if session_id:
            details["session_id"] = session_id
        if suspicion_score is not None:
            details["suspicion_score"] = suspicion_score
        if validation_details:
            details["validation_details"] = validation_details
        
        super().__init__(
            message=message,
            error_code="AUDIT_VALIDATION_FAILED",
            details=details,
            status_code=422
        )


class GamificationError(BaseStudySyncException):
    """Raised when gamification operations fail"""
    
    def __init__(
        self, 
        message: str,
        operation: str = None,
        user_id: str = None,
        xp_amount: int = None
    ):
        details = {}
        if operation:
            details["operation"] = operation
        if user_id:
            details["user_id"] = user_id
        if xp_amount is not None:
            details["xp_amount"] = xp_amount
        
        super().__init__(
            message=message,
            error_code="GAMIFICATION_ERROR",
            details=details,
            status_code=400
        )


# Error Handler Registry
class ErrorHandlerRegistry:
    """Registry for handling different types of errors"""
    
    _handlers = {}
    
    @classmethod
    def register_handler(cls, error_class: type, handler_func):
        """Register a handler for a specific error class"""
        cls._handlers[error_class] = handler_func
    
    @classmethod
    def handle_error(cls, error: Exception) -> Dict[str, Any]:
        """Handle an error using registered handlers"""
        error_class = type(error)
        
        # Find the most specific handler
        for registered_class in cls._handlers.keys():
            if isinstance(error, registered_class):
                return cls._handlers[registered_class](error)
        
        # Fallback to default handling
        return cls._handle_unknown_error(error)
    
    @classmethod
    def _handle_unknown_error(cls, error: Exception) -> Dict[str, Any]:
        """Handle unknown error types"""
        logger.error(f"Unexpected error type: {type(error).__name__}: {str(error)}")
        
        return {
            "error": True,
            "error_code": "UNKNOWN_ERROR",
            "message": "An unexpected error occurred",
            "details": {
                "error_type": type(error).__name__,
                "error_message": str(error)
            },
            "status_code": 500
        }


# Register default handlers
ErrorHandlerRegistry.register_handler(BaseStudySyncException, lambda e: e.to_dict())
ErrorHandlerRegistry.register_handler(ValueError, lambda e: ValidationError(str(e)).to_dict())
ErrorHandlerRegistry.register_handler(KeyError, lambda e: NotFoundError("Resource", str(e)).to_dict())
ErrorHandlerRegistry.register_handler(ConnectionError, lambda e: ServiceUnavailableError("Database").to_dict())