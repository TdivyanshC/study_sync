"""
FastAPI Middleware for Comprehensive Error Handling
"""

import logging
import traceback
import time
import json
from typing import Any, Dict, Optional
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import uuid

from utils.error_classes import BaseStudySyncException, ErrorHandlerRegistry
from utils.security_validation import global_rate_limiter

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware for global error handling and logging"""
    
    def __init__(self, app: ASGIApp, include_traceback: bool = False):
        super().__init__(app)
        self.include_traceback = include_traceback
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Log request start
        start_time = time.time()
        
        try:
            # Add security headers
            response = await call_next(request)
            
            # Add security headers to response
            self._add_security_headers(response)
            
            # Log successful request
            process_time = time.time() - start_time
            self._log_request(
                request, response, request_id, process_time, status_code=response.status_code
            )
            
            return response
            
        except Exception as exc:
            # Handle unexpected errors
            process_time = time.time() - start_time
            error_response = self._handle_error(request, exc, request_id)
            
            self._log_error(request, exc, request_id, process_time)
            
            return error_response
    
    def _add_security_headers(self, response: Response):
        """Add security headers to response"""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
    
    def _handle_error(self, request: Request, exc: Exception, request_id: str) -> JSONResponse:
        """Handle different types of errors"""
        
        # Handle known StudySync exceptions
        if isinstance(exc, BaseStudySyncException):
            error_dict = exc.to_dict()
        else:
            # Handle unknown exceptions
            error_dict = ErrorHandlerRegistry.handle_error(exc)
        
        # Add request context
        error_dict["request_id"] = request_id
        error_dict["timestamp"] = time.time()
        error_dict["path"] = str(request.url.path)
        error_dict["method"] = request.method
        
        # Add user agent and IP for debugging
        error_dict["user_agent"] = request.headers.get("user-agent", "unknown")
        error_dict["client_ip"] = self._get_client_ip(request)
        
        # Determine status code
        status_code = error_dict.get("status_code", 500)
        
        # Create response
        return JSONResponse(
            status_code=status_code,
            content=error_dict
        )
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        # Check forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if hasattr(request.client, "host"):
            return request.client.host
        
        return "unknown"
    
    def _log_request(
        self, 
        request: Request, 
        response: Response, 
        request_id: str, 
        process_time: float,
        status_code: int
    ):
        """Log request details"""
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": str(request.url.path),
            "query_params": dict(request.query_params),
            "status_code": status_code,
            "process_time": round(process_time, 4),
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("user-agent", "unknown")
        }
        
        if status_code >= 400:
            logger.warning(f"HTTP Error: {json.dumps(log_data)}")
        else:
            logger.info(f"HTTP Request: {json.dumps(log_data)}")
    
    def _log_error(
        self, 
        request: Request, 
        exc: Exception, 
        request_id: str, 
        process_time: float
    ):
        """Log error details"""
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": str(request.url.path),
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "process_time": round(process_time, 4),
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("user-agent", "unknown")
        }
        
        if self.include_traceback:
            log_data["traceback"] = traceback.format_exc()
        
        logger.error(f"Application Error: {json.dumps(log_data)}")


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Middleware for request validation and sanitization"""
    
    def __init__(self, app: ASGIApp, max_request_size: int = 10 * 1024 * 1024):  # 10MB
        super().__init__(app)
        self.max_request_size = max_request_size
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Check request size
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_request_size:
            return JSONResponse(
                status_code=413,
                content={
                    "error": True,
                    "error_code": "REQUEST_TOO_LARGE",
                    "message": "Request payload too large",
                    "max_size": self.max_request_size,
                    "actual_size": int(content_length)
                }
            )
        
        # Validate content type for POST/PUT requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            
            if content_type.startswith("application/json"):
                # Validate JSON structure
                try:
                    # Read body to validate JSON
                    body = await request.body()
                    if body:
                        json.loads(body.decode('utf-8'))
                except json.JSONDecodeError as e:
                    return JSONResponse(
                        status_code=400,
                        content={
                            "error": True,
                            "error_code": "INVALID_JSON",
                            "message": "Request contains invalid JSON",
                            "details": {"json_error": str(e)}
                        }
                    )
                except UnicodeDecodeError:
                    return JSONResponse(
                        status_code=400,
                        content={
                            "error": True,
                            "error_code": "INVALID_ENCODING",
                            "message": "Request contains invalid encoding"
                        }
                    )
        
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting"""
    
    def __init__(
        self, 
        app: ASGIApp, 
        requests_per_minute: int = 100,
        requests_per_hour: int = 1000
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
    
    async def dispatch(self, request: Request, call_next) -> Response:
        client_ip = self._get_client_ip(request)
        
        # Check per-minute rate limit
        is_limited_minute, retry_after_minute = global_rate_limiter.is_rate_limited(
            f"minute:{client_ip}", 
            self.requests_per_minute, 
            60
        )
        
        if is_limited_minute:
            return JSONResponse(
                status_code=429,
                content={
                    "error": True,
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests per minute",
                    "retry_after": retry_after_minute,
                    "limit": self.requests_per_minute,
                    "window": "1 minute"
                },
                headers={"Retry-After": str(retry_after_minute)}
            )
        
        # Check per-hour rate limit
        is_limited_hour, retry_after_hour = global_rate_limiter.is_rate_limited(
            f"hour:{client_ip}", 
            self.requests_per_hour, 
            3600
        )
        
        if is_limited_hour:
            return JSONResponse(
                status_code=429,
                content={
                    "error": True,
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests per hour",
                    "retry_after": retry_after_hour,
                    "limit": self.requests_per_hour,
                    "window": "1 hour"
                },
                headers={"Retry-After": str(retry_after_hour)}
            )
        
        response = await call_next(request)
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        if hasattr(request.client, "host"):
            return request.client.host
        
        return "unknown"


class ErrorResponseFormatter:
    """Utility class for formatting error responses"""
    
    @staticmethod
    def format_validation_error(
        errors: list, 
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Format validation errors for API response"""
        return {
            "error": True,
            "error_code": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": {
                "validation_errors": errors,
                "field_count": len(errors)
            },
            "request_id": request_id,
            "timestamp": time.time()
        }
    
    @staticmethod
    def format_database_error(
        operation: str,
        table: str,
        original_error: str,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Format database errors for API response"""
        return {
            "error": True,
            "error_code": "DATABASE_ERROR",
            "message": f"Database operation failed: {operation}",
            "details": {
                "operation": operation,
                "table": table,
                "original_error": original_error
            },
            "request_id": request_id,
            "timestamp": time.time()
        }
    
    @staticmethod
    def format_auth_error(
        reason: str,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Format authentication errors for API response"""
        return {
            "error": True,
            "error_code": "AUTHENTICATION_ERROR",
            "message": "Authentication failed",
            "details": {"reason": reason},
            "request_id": request_id,
            "timestamp": time.time()
        }


def setup_error_handlers(app: FastAPI):
    """Setup global error handlers for the FastAPI application"""
    
    @app.exception_handler(BaseStudySyncException)
    async def studysync_exception_handler(request: Request, exc: BaseStudySyncException):
        """Handle StudySync custom exceptions"""
        error_dict = exc.to_dict()
        error_dict["request_id"] = getattr(request.state, "request_id", None)
        error_dict["path"] = str(request.url.path)
        error_dict["method"] = request.method
        
        return JSONResponse(
            status_code=exc.status_code,
            content=error_dict
        )
    
    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request: Request, exc):
        """Handle validation errors"""
        error_dict = ErrorHandlerRegistry.handle_error(exc)
        error_dict["request_id"] = getattr(request.state, "request_id", None)
        error_dict["path"] = str(request.url.path)
        error_dict["method"] = request.method
        
        return JSONResponse(
            status_code=error_dict.get("status_code", 400),
            content=error_dict
        )
    
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        """Handle generic value errors"""
        error_dict = ErrorHandlerRegistry.handle_error(exc)
        error_dict["request_id"] = getattr(request.state, "request_id", None)
        error_dict["path"] = str(request.url.path)
        error_dict["method"] = request.method
        
        return JSONResponse(
            status_code=400,
            content=error_dict
        )
    
    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        """Handle 404 errors"""
        return JSONResponse(
            status_code=404,
            content={
                "error": True,
                "error_code": "NOT_FOUND",
                "message": f"Endpoint not found: {request.url.path}",
                "request_id": getattr(request.state, "request_id", None),
                "path": str(request.url.path),
                "method": request.method,
                "timestamp": time.time()
            }
        )
    
    @app.exception_handler(500)
    async def internal_error_handler(request: Request, exc):
        """Handle 500 internal server errors"""
        request_id = getattr(request.state, "request_id", None)
        logger.error(f"Internal server error: {str(exc)}", extra={
            "request_id": request_id,
            "path": str(request.url.path),
            "method": request.method
        })
        
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "error_code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred",
                "request_id": request_id,
                "path": str(request.url.path),
                "method": request.method,
                "timestamp": time.time(),
                "support_id": request_id  # For support tracking
            }
        )