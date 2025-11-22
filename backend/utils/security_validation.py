"""
Security Validation and Rate Limiting Utilities
"""

import time
import hashlib
import hmac
import re
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, deque
from functools import wraps
import logging
import secrets
import jwt
from .error_classes import RateLimitError, ValidationError, AuthenticationError
from .validation_schemas import sanitize_html

logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiting implementation with multiple strategies"""
    
    def __init__(self):
        self.requests = defaultdict(deque)
        self.blocked_ips = {}
    
    def is_rate_limited(
        self, 
        identifier: str, 
        limit: int, 
        window_seconds: int,
        block_duration: int = 300
    ) -> Tuple[bool, Optional[int]]:
        """
        Check if identifier is rate limited
        
        Args:
            identifier: Client identifier (IP, user_id, etc.)
            limit: Maximum requests allowed
            window_seconds: Time window in seconds
            block_duration: Block duration in seconds if exceeded
            
        Returns:
            Tuple of (is_limited, retry_after_seconds)
        """
        current_time = time.time()
        window_start = current_time - window_seconds
        
        # Clean old entries
        while self.requests[identifier] and self.requests[identifier][0] < window_start:
            self.requests[identifier].popleft()
        
        # Check if blocked
        if identifier in self.blocked_ips:
            block_until = self.blocked_ips[identifier]
            if current_time < block_until:
                retry_after = int(block_until - current_time)
                return True, retry_after
            else:
                # Unblock
                del self.blocked_ips[identifier]
        
        # Check current request count
        if len(self.requests[identifier]) >= limit:
            # Block the identifier
            self.blocked_ips[identifier] = current_time + block_duration
            logger.warning(f"Rate limit exceeded for {identifier}, blocking for {block_duration}s")
            return True, block_duration
        
        # Record this request
        self.requests[identifier].append(current_time)
        
        return False, None
    
    def get_usage_info(self, identifier: str, window_seconds: int) -> Dict[str, Any]:
        """Get usage information for an identifier"""
        current_time = time.time()
        window_start = current_time - window_seconds
        
        # Count requests in window
        recent_requests = [
            req_time for req_time in self.requests[identifier]
            if req_time >= window_start
        ]
        
        return {
            "identifier": identifier,
            "requests_in_window": len(recent_requests),
            "oldest_request": min(recent_requests) if recent_requests else None,
            "newest_request": max(recent_requests) if recent_requests else None,
            "is_blocked": identifier in self.blocked_ips,
            "block_until": self.blocked_ips.get(identifier)
        }


# Global rate limiter instance
global_rate_limiter = RateLimiter()


class SecurityValidator:
    """Security validation and sanitization utilities"""
    
    # Common attack patterns
    SQL_INJECTION_PATTERNS = [
        r"(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)",
        r"('|(\\x27)|(\\x22))",
        r"(\b(or|and)\b\s*['\"\\x27\\x22]?\s*\d+\s*=\s*\d+)",
        r"(\b(or|and)\b\s*['\"\\x27\\x22]?\s*['\"\\x27\\x22]\s*=\s*['\"\\x27\\x22])",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"<iframe[^>]*>.*?</iframe>",
        r"javascript:",
        r"on\w+\s*=",
        r"<[^>]*on\w+\s*=",
        r"<object[^>]*data\s*=",
        r"<embed[^>]*src\s*=",
    ]
    
    COMMAND_INJECTION_PATTERNS = [
        r"[;&|`$(){}\\[\\]]",
        r"\\s*(?:sh|bash|cmd|powershell)\\s*",
        r"curl\s+",
        r"wget\s+",
        r"nc\s+",
        r"netcat\s+",
    ]
    
    @classmethod
    def detect_sql_injection(cls, input_string: str) -> bool:
        """Detect potential SQL injection attempts"""
        if not isinstance(input_string, str):
            return False
        
        input_lower = input_string.lower()
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, input_lower, re.IGNORECASE | re.DOTALL):
                return True
        
        return False
    
    @classmethod
    def detect_xss(cls, input_string: str) -> bool:
        """Detect potential XSS attempts"""
        if not isinstance(input_string, str):
            return False
        
        input_lower = input_string.lower()
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, input_lower, re.IGNORECASE):
                return True
        
        return False
    
    @classmethod
    def detect_command_injection(cls, input_string: str) -> bool:
        """Detect potential command injection attempts"""
        if not isinstance(input_string, str):
            return False
        
        input_lower = input_string.lower()
        for pattern in cls.COMMAND_INJECTION_PATTERNS:
            if re.search(pattern, input_lower):
                return True
        
        return False
    
    @classmethod
    def validate_input_safety(cls, input_string: str, field_name: str = "input") -> str:
        """
        Validate and sanitize input for security
        
        Args:
            input_string: Input to validate
            field_name: Name of the field for error reporting
            
        Returns:
            Sanitized string
            
        Raises:
            ValidationError: If malicious content detected
        """
        if not isinstance(input_string, str):
            input_string = str(input_string)
        
        # Check for SQL injection
        if cls.detect_sql_injection(input_string):
            raise ValidationError(
                f"Potential SQL injection detected in {field_name}",
                field=field_name,
                value=input_string[:50],  # Truncate for logging
                details={"threat_type": "sql_injection"}
            )
        
        # Check for XSS
        if cls.detect_xss(input_string):
            raise ValidationError(
                f"Potential XSS attack detected in {field_name}",
                field=field_name,
                value=input_string[:50],
                details={"threat_type": "xss"}
            )
        
        # Check for command injection
        if cls.detect_command_injection(input_string):
            raise ValidationError(
                f"Potential command injection detected in {field_name}",
                field=field_name,
                value=input_string[:50],
                details={"threat_type": "command_injection"}
            )
        
        # Sanitize HTML
        sanitized = sanitize_html(input_string)
        
        return sanitized
    
    @classmethod
    def validate_jwt_token(cls, token: str, secret: str) -> Dict[str, Any]:
        """
        Validate JWT token and return payload
        
        Args:
            token: JWT token to validate
            secret: Secret key for validation
            
        Returns:
            Token payload
            
        Raises:
            AuthenticationError: If token is invalid
        """
        try:
            payload = jwt.decode(token, secret, algorithms=["HS256"])
            
            # Check expiration
            if "exp" in payload:
                exp_timestamp = payload["exp"]
                if isinstance(exp_timestamp, (int, float)):
                    if datetime.fromtimestamp(exp_timestamp) < datetime.utcnow():
                        raise AuthenticationError("Token has expired", reason="expired")
                else:
                    raise AuthenticationError("Invalid token expiration format", reason="malformed")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired", reason="expired")
        except jwt.InvalidTokenError as e:
            raise AuthenticationError(f"Invalid token: {str(e)}", reason="invalid")
        except Exception as e:
            raise AuthenticationError(f"Token validation error: {str(e)}", reason="error")
    
    @classmethod
    def generate_secure_token(cls, length: int = 32) -> str:
        """Generate a cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    @classmethod
    def verify_webhook_signature(
        cls, 
        payload: bytes, 
        signature: str, 
        secret: str
    ) -> bool:
        """
        Verify webhook signature using HMAC
        
        Args:
            payload: Request payload
            signature: Provided signature
            secret: Secret key
            
        Returns:
            True if signature is valid
        """
        try:
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(f"sha256={expected_signature}", signature)
        except Exception:
            return False


class InputSanitizer:
    """Advanced input sanitization utilities"""
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage"""
        if not filename:
            return "unnamed_file"
        
        # Remove path separators and dangerous characters
        dangerous_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/']
        sanitized = filename
        
        for char in dangerous_chars:
            sanitized = sanitized.replace(char, '_')
        
        # Remove null bytes
        sanitized = sanitized.replace('\x00', '')
        
        # Limit length
        if len(sanitized) > 255:
            name, ext = sanitized.rsplit('.', 1) if '.' in sanitized else (sanitized, '')
            max_name_length = 255 - len(ext) - 1 if ext else 255
            sanitized = name[:max_name_length] + ('.' + ext if ext else '')
        
        return sanitized.strip()
    
    @staticmethod
    def sanitize_url(url: str) -> str:
        """Sanitize URL to prevent SSRF attacks"""
        if not isinstance(url, str):
            raise ValidationError("URL must be a string", field="url")
        
        # Basic URL validation
        if not re.match(r'^https?://', url):
            raise ValidationError("Only HTTP/HTTPS URLs are allowed", field="url")
        
        # Check for localhost/internal IPs
        url_lower = url.lower()
        dangerous_hosts = [
            'localhost', '127.0.0.1', '0.0.0.0', '::1',
            '169.254.169.254',  # AWS metadata
            'localhost.localdomain'
        ]
        
        for dangerous_host in dangerous_hosts:
            if dangerous_host in url_lower:
                raise ValidationError(
                    f"URL contains disallowed host: {dangerous_host}",
                    field="url",
                    details={"threat_type": "ssrf"}
                )
        
        return url
    
    @staticmethod
    def sanitize_email_headers(headers: Dict[str, str]) -> Dict[str, str]:
        """Sanitize email headers to prevent header injection"""
        sanitized = {}
        
        for key, value in headers.items():
            # Check for line break injection
            if '\r' in value or '\n' in value:
                raise ValidationError(
                    "Line breaks not allowed in email headers",
                    field=key,
                    details={"threat_type": "header_injection"}
                )
            
            sanitized[key] = value.strip()
        
        return sanitized


class IPAddressValidator:
    """IP address validation utilities"""
    
    @staticmethod
    def is_private_ip(ip: str) -> bool:
        """Check if IP address is in private range"""
        try:
            import ipaddress
            ip_obj = ipaddress.ip_address(ip)
            
            # Check private IP ranges
            private_ranges = [
                ipaddress.ip_network('10.0.0.0/8'),
                ipaddress.ip_network('172.16.0.0/12'),
                ipaddress.ip_network('192.168.0.0/16'),
                ipaddress.ip_network('127.0.0.0/8'),  # Loopback
                ipaddress.ip_network('169.254.0.0/16'),  # Link-local
            ]
            
            for private_range in private_ranges:
                if ip_obj in private_range:
                    return True
            
            return False
            
        except Exception:
            return False
    
    @staticmethod
    def get_client_ip(request_headers: Dict[str, str]) -> str:
        """Extract real client IP from request headers"""
        # Check for forwarded headers (in order of preference)
        forwarded_headers = [
            'x-forwarded-for',
            'x-real-ip', 
            'cf-connecting-ip',  # Cloudflare
            'x-client-ip',
            'x-forwarded',
            'forwarded-for',
            'forwarded'
        ]
        
        for header in forwarded_headers:
            if header in request_headers:
                # X-Forwarded-For can contain multiple IPs
                ip_list = request_headers[header].split(',')
                return ip_list[0].strip()
        
        return 'unknown'


# Decorator for rate limiting
def rate_limit(limit: int, window_seconds: int, identifier_func=None):
    """
    Decorator to apply rate limiting to endpoints
    
    Args:
        limit: Maximum requests allowed
        window_seconds: Time window in seconds
        identifier_func: Function to extract identifier from request
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract identifier (default to client IP)
            if identifier_func:
                identifier = identifier_func(*args, **kwargs)
            else:
                # Try to get from request object
                identifier = 'anonymous'
                for arg in args:
                    if hasattr(arg, 'client') and hasattr(arg.client, 'host'):
                        identifier = arg.client.host
                        break
            
            # Check rate limit
            is_limited, retry_after = global_rate_limiter.is_rate_limited(
                identifier, limit, window_seconds
            )
            
            if is_limited:
                raise RateLimitError(
                    f"Rate limit exceeded for {identifier}",
                    limit=limit,
                    window=window_seconds,
                    retry_after=retry_after
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# Decorator for security validation
def validate_security(input_fields: List[str] = None):
    """
    Decorator to apply security validation to endpoints
    
    Args:
        input_fields: List of field names to validate (validates request data if not specified)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object in arguments
            request_obj = None
            for arg in args:
                if hasattr(arg, '__dict__') and not isinstance(arg, str):
                    request_obj = arg
                    break
            
            if request_obj and hasattr(request_obj, '__dict__'):
                data = request_obj.__dict__
                
                if input_fields:
                    # Validate specific fields
                    for field in input_fields:
                        if field in data and data[field]:
                            data[field] = SecurityValidator.validate_input_safety(
                                data[field], field
                            )
                else:
                    # Validate all string fields
                    for key, value in data.items():
                        if isinstance(value, str):
                            data[key] = SecurityValidator.validate_input_safety(value, key)
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator