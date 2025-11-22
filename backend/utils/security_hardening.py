"""
Comprehensive Security Hardening Module
Implements enterprise-grade security features for StudySync
"""

import os
import time
import hashlib
import hmac
import secrets
import jwt
import re
import json
import sqlite3
import ipaddress
from typing import Dict, List, Any, Optional, Tuple, Set
from datetime import datetime, timedelta
from collections import defaultdict, deque
from functools import wraps
from contextlib import contextmanager
import logging
import bleach
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import bcrypt
from urllib.parse import urlparse
import ssl
import socket

from .error_classes import (
    SecurityError, AuthenticationError, AuthorizationError, 
    RateLimitError, InputValidationError
)
from .validation_schemas import sanitize_html

logger = logging.getLogger(__name__)


class SecurityConfig:
    """Centralized security configuration"""
    
    # JWT Configuration
    JWT_SECRET_MIN_LENGTH = 32
    JWT_ALGORITHM = "HS256"
    JWT_DEFAULT_EXPIRY = 7 * 24 * 3600  # 7 days
    
    # Password Policy
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_LOWERCASE = True
    PASSWORD_REQUIRE_NUMBERS = True
    PASSWORD_REQUIRE_SPECIAL = True
    
    # Rate Limiting Defaults
    DEFAULT_RATE_LIMIT = {
        "requests_per_minute": 60,
        "requests_per_hour": 1000,
        "requests_per_day": 10000
    }
    
    # API Key Configuration
    API_KEY_LENGTH = 64
    API_KEY_PREFIX = "sk_studysync_"
    
    # Session Configuration
    SESSION_TIMEOUT = 3600  # 1 hour
    SESSION_MAX_CONCURRENT = 5
    
    # Security Headers
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
    }


class InputValidationEngine:
    """Advanced input validation and sanitization engine"""
    
    DANGEROUS_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
        '.php', '.asp', '.aspx', '.jsp', '.py', '.pl', '.sh', '.ps1', '.msi'
    }
    
    MALICIOUS_PATTERNS = {
        'sql_injection': [
            r"(?i)(\bunion\b\s+(all\s+)?select\b)",
            r"(?i)(\bdrop\s+(table|database)\b)",
            r"(?i)(\binsert\s+into\b)",
            r"(?i)(\bupdate\s+\w+\s+set\b)",
            r"(?i)(\bdelete\s+from\b)",
            r"(?i)(\bcreate\s+(table|database|user)\b)",
            r"(?i)(\balter\s+(table|database)\b)",
            r"(?i)(\bexec(ute)?\b)",
            r"['\";].*[;\"'].*",
            r"\b(or|and)\b\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+['\"]?"
        ],
        'xss': [
            r"<script[^>]*>.*?</script>",
            r"<iframe[^>]*>.*?</iframe>",
            r"javascript:",
            r"on\w+\s*=",
            r"<[^>]*on\w+\s*=",
            r"<object[^>]*data\s*=",
            r"<embed[^>]*src\s*=",
            r"vbscript:",
            r"data:text/html"
        ],
        'command_injection': [
            r"[;&|`$(){}\\[\\]]",
            r"\b(sh|bash|cmd|powershell|perl|python)\b",
            r"curl\s+",
            r"wget\s+",
            r"nc\s+",
            r"netcat\s+",
            r"telnet\s+",
            r"ftp\s+",
            r"echo\s+",
            r"cat\s+",
            r"ls\s+",
            r"rm\s+",
            r"cp\s+"
        ],
        'path_traversal': [
            r"\.\./",
            r"\.\.\\",
            r"%2e%2e%2f",
            r"%2e%2e%5c",
            r"\.\.%2f",
            r"\.\.%5c"
        ],
        'ldap_injection': [
            r"\(\||\)\(|\&\(|\|\(|\!\(",
            r"\*\)\(\||\(\|\*",
            r"\(\|\|\)",
            r"\(\&\|\)"
        ],
        'xml_injection': [
            r"<\?xml",
            r"<!DOCTYPE",
            r"<!ENTITY",
            r"<!ELEMENT",
            r"CDATA",
            r"<script>"
        ]
    }
    
    @classmethod
    def validate_and_sanitize_input(
        cls, 
        input_value: Any, 
        field_name: str = "input",
        validation_rules: Dict[str, Any] = None
    ) -> str:
        """
        Comprehensive input validation and sanitization
        
        Args:
            input_value: Input to validate and sanitize
            field_name: Name of the field for error reporting
            validation_rules: Custom validation rules
            
        Returns:
            Sanitized input string
            
        Raises:
            InputValidationError: If validation fails
        """
        if not isinstance(input_value, str):
            input_value = str(input_value)
        
        # Length validation
        if validation_rules:
            max_length = validation_rules.get('max_length', 1000)
            min_length = validation_rules.get('min_length', 0)
            
            if len(input_value) > max_length:
                raise InputValidationError(
                    f"Field '{field_name}' exceeds maximum length of {max_length}",
                    field=field_name,
                    value=input_value[:50]
                )
            
            if len(input_value) < min_length:
                raise InputValidationError(
                    f"Field '{field_name}' must be at least {min_length} characters",
                    field=field_name,
                    value=input_value
                )
        
        # Pattern validation
        allowed_patterns = validation_rules.get('patterns', []) if validation_rules else []
        if allowed_patterns:
            if not any(re.match(pattern, input_value) for pattern in allowed_patterns):
                raise InputValidationError(
                    f"Field '{field_name}' does not match required pattern",
                    field=field_name,
                    value=input_value[:50]
                )
        
        # Security threat detection
        threat_detected = cls._detect_security_threats(input_value, field_name)
        if threat_detected:
            raise InputValidationError(
                f"Security threat detected in field '{field_name}': {threat_detected}",
                field=field_name,
                value=input_value[:50]
            )
        
        # Apply sanitization
        sanitized = cls._sanitize_input(input_value)
        
        return sanitized
    
    @classmethod
    def _detect_security_threats(cls, input_value: str, field_name: str) -> Optional[str]:
        """Detect various security threats in input"""
        input_lower = input_value.lower()
        
        for threat_type, patterns in cls.MALICIOUS_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, input_lower, re.IGNORECASE | re.DOTALL):
                    logger.warning(f"Potential {threat_type} detected in {field_name}: {input_value[:50]}")
                    return threat_type
        
        return None
    
    @classmethod
    def _sanitize_input(cls, input_value: str) -> str:
        """Sanitize input using multiple techniques"""
        # Remove null bytes
        sanitized = input_value.replace('\x00', '')
        
        # HTML sanitize
        sanitized = sanitize_html(sanitized)
        
        # Remove control characters except whitespace
        sanitized = ''.join(char for char in sanitized if ord(char) >= 32 or char.isspace())
        
        # Normalize whitespace
        sanitized = ' '.join(sanitized.split())
        
        return sanitized.strip()
    
    @classmethod
    def validate_file_upload(cls, filename: str, content_type: str = None) -> Dict[str, Any]:
        """Validate file upload for security"""
        if not filename:
            raise InputValidationError("Filename is required", field="filename")
        
        # Check for dangerous extensions
        file_ext = os.path.splitext(filename.lower())[1]
        if file_ext in cls.DANGEROUS_EXTENSIONS:
            raise InputValidationError(
                f"Dangerous file type not allowed: {file_ext}",
                field="filename",
                value=filename
            )
        
        # Sanitize filename
        sanitized_filename = cls._sanitize_filename(filename)
        
        return {
            "original_filename": filename,
            "sanitized_filename": sanitized_filename,
            "extension": file_ext,
            "content_type": content_type,
            "is_safe": True
        }
    
    @classmethod
    def _sanitize_filename(cls, filename: str) -> str:
        """Sanitize filename for safe storage"""
        # Remove path separators and dangerous characters
        dangerous_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/', '\x00']
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


class AuthenticationManager:
    """Enhanced authentication and session management"""
    
    def __init__(self, jwt_secret: str):
        self.jwt_secret = jwt_secret
        self.active_sessions = {}  # session_id -> user_data
        self.session_blacklist = set()
        self.failed_attempts = defaultdict(int)
        self.locked_accounts = {}
        
    def create_jwt_token(self, user_id: str, additional_claims: Dict[str, Any] = None) -> str:
        """Create JWT token with security claims"""
        if not user_id:
            raise AuthenticationError("User ID is required")
        
        now = datetime.utcnow()
        expiry = now + timedelta(seconds=SecurityConfig.JWT_DEFAULT_EXPIRY)
        
        payload = {
            "sub": user_id,
            "iat": now,
            "exp": expiry,
            "iss": "studysync",
            "aud": "studysync-app",
            "jti": secrets.token_hex(16)  # Unique token ID
        }
        
        if additional_claims:
            payload.update(additional_claims)
        
        return jwt.encode(payload, self.jwt_secret, algorithm=SecurityConfig.JWT_ALGORITHM)
    
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token, 
                self.jwt_secret, 
                algorithms=[SecurityConfig.JWT_ALGORITHM],
                audience="studysync-app",
                issuer="studysync"
            )
            
            # Check if token is blacklisted
            if payload.get("jti") in self.session_blacklist:
                raise AuthenticationError("Token has been revoked")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired", reason="expired")
        except jwt.InvalidTokenError as e:
            raise AuthenticationError(f"Invalid token: {str(e)}", reason="invalid")
    
    def create_user_session(self, user_id: str, session_data: Dict[str, Any] = None) -> str:
        """Create and track user session"""
        session_id = secrets.token_hex(32)
        
        # Check concurrent sessions limit
        user_sessions = [sid for sid, data in self.active_sessions.items() 
                        if data.get('user_id') == user_id]
        
        if len(user_sessions) >= SecurityConfig.SESSION_MAX_CONCURRENT:
            # Remove oldest session
            oldest_session = min(user_sessions, 
                               key=lambda sid: self.active_sessions[sid].get('created_at', datetime.min))
            del self.active_sessions[oldest_session]
        
        self.active_sessions[session_id] = {
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "ip_address": session_data.get('ip_address') if session_data else None,
            "user_agent": session_data.get('user_agent') if session_data else None,
            "additional_data": session_data or {}
        }
        
        return session_id
    
    def validate_password_strength(self, password: str) -> Tuple[bool, List[str]]:
        """Validate password strength against policy"""
        errors = []
        
        if len(password) < SecurityConfig.PASSWORD_MIN_LENGTH:
            errors.append(f"Password must be at least {SecurityConfig.PASSWORD_MIN_LENGTH} characters long")
        
        if SecurityConfig.PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if SecurityConfig.PASSWORD_REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if SecurityConfig.PASSWORD_REQUIRE_NUMBERS and not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        
        if SecurityConfig.PASSWORD_REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        # Check for common patterns
        common_patterns = ['123', 'abc', 'password', 'qwerty', '111']
        if any(pattern in password.lower() for pattern in common_patterns):
            errors.append("Password cannot contain common patterns")
        
        return len(errors) == 0, errors
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt with appropriate cost factor"""
        return bcrypt.hashpw(
            password.encode('utf-8'), 
            bcrypt.gensalt(rounds=12)
        ).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception:
            return False
    
    def track_failed_login(self, identifier: str, max_attempts: int = 5, lock_duration: int = 900):
        """Track failed login attempts and implement account locking"""
        self.failed_attempts[identifier] += 1
        
        if self.failed_attempts[identifier] >= max_attempts:
            self.locked_accounts[identifier] = datetime.utcnow() + timedelta(seconds=lock_duration)
            logger.warning(f"Account locked for {identifier} due to failed login attempts")
    
    def is_account_locked(self, identifier: str) -> bool:
        """Check if account is currently locked"""
        if identifier in self.locked_accounts:
            lock_until = self.locked_accounts[identifier]
            if datetime.utcnow() < lock_until:
                return True
            else:
                # Remove expired lock
                del self.locked_accounts[identifier]
                self.failed_attempts[identifier] = 0
        
        return False
    
    def invalidate_session(self, session_id: str):
        """Invalidate a session (logout)"""
        if session_id in self.active_sessions:
            # Add token to blacklist if it's a JWT session
            session_data = self.active_sessions[session_id]
            if 'token' in session_data:
                try:
                    payload = self.verify_jwt_token(session_data['token'])
                    if 'jti' in payload:
                        self.session_blacklist.add(payload['jti'])
                except:
                    pass
            
            del self.active_sessions[session_id]


class APIKeyManager:
    """API key generation and validation"""
    
    def __init__(self):
        self.api_keys = {}  # key -> key_data
        self.key_derivations = {}  # for encryption
    
    def generate_api_key(self, user_id: str, permissions: List[str] = None) -> str:
        """Generate a new API key for a user"""
        if not user_id:
            raise SecurityError("User ID is required for API key generation")
        
        # Generate base key
        key_base = secrets.token_urlsafe(SecurityConfig.API_KEY_LENGTH)
        api_key = SecurityConfig.API_KEY_PREFIX + key_base
        
        # Store key data
        self.api_keys[api_key] = {
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "last_used": None,
            "permissions": permissions or [],
            "is_active": True,
            "usage_count": 0
        }
        
        logger.info(f"API key generated for user {user_id}")
        return api_key
    
    def validate_api_key(self, api_key: str) -> Dict[str, Any]:
        """Validate an API key and return associated data"""
        if not api_key or not api_key.startswith(SecurityConfig.API_KEY_PREFIX):
            raise AuthenticationError("Invalid API key format")
        
        key_data = self.api_keys.get(api_key)
        if not key_data:
            raise AuthenticationError("API key not found")
        
        if not key_data["is_active"]:
            raise AuthenticationError("API key is inactive")
        
        # Update usage statistics
        key_data["last_used"] = datetime.utcnow()
        key_data["usage_count"] += 1
        
        return key_data
    
    def revoke_api_key(self, api_key: str):
        """Revoke an API key"""
        if api_key in self.api_keys:
            self.api_keys[api_key]["is_active"] = False
            logger.info(f"API key revoked: {api_key}")
    
    def list_user_keys(self, user_id: str) -> List[Dict[str, Any]]:
        """List all API keys for a user"""
        return [
            {**data, "api_key": key} 
            for key, data in self.api_keys.items()
            if data["user_id"] == user_id and data["is_active"]
        ]


class SecurityHeadersManager:
    """Manage security headers for HTTP responses"""
    
    @staticmethod
    def get_security_headers() -> Dict[str, str]:
        """Get security headers configuration"""
        return SecurityConfig.SECURITY_HEADERS.copy()
    
    @staticmethod
    def get_cors_headers(
        allowed_origins: List[str] = None,
        allowed_methods: List[str] = None,
        allowed_headers: List[str] = None,
        allow_credentials: bool = True,
        max_age: int = 86400
    ) -> Dict[str, str]:
        """Generate CORS headers"""
        if allowed_origins is None:
            allowed_origins = ["*"]
        
        if allowed_methods is None:
            allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]
        
        if allowed_headers is None:
            allowed_headers = ["Content-Type", "Authorization", "X-Requested-With"]
        
        headers = {
            "Access-Control-Allow-Origin": ", ".join(allowed_origins),
            "Access-Control-Allow-Methods": ", ".join(allowed_methods),
            "Access-Control-Allow-Headers": ", ".join(allowed_headers),
            "Access-Control-Max-Age": str(max_age)
        }
        
        if allow_credentials:
            headers["Access-Control-Allow-Credentials"] = "true"
        
        return headers


class ThreatDetectionEngine:
    """Real-time threat detection and response"""
    
    def __init__(self):
        self.threat_patterns = {}
        self.blocked_ips = {}
        self.suspicious_activities = defaultdict(list)
    
    def analyze_request_patterns(
        self, 
        ip_address: str, 
        request_data: Dict[str, Any],
        user_agent: str = None
    ) -> Dict[str, Any]:
        """Analyze request patterns for threats"""
        threat_score = 0
        detected_threats = []
        
        # Check for rapid requests from same IP
        recent_requests = self._get_recent_requests(ip_address)
        if len(recent_requests) > 100:  # More than 100 requests in short time
            threat_score += 30
            detected_threats.append("rapid_requests")
        
        # Check user agent
        if user_agent:
            ua_threats = self._analyze_user_agent(user_agent)
            if ua_threats:
                threat_score += ua_threats["score"]
                detected_threats.extend(ua_threats["threats"])
        
        # Check for SQL injection patterns
        if self._contains_sql_injection_patterns(request_data):
            threat_score += 40
            detected_threats.append("sql_injection_attempt")
        
        # Check for XSS patterns
        if self._contains_xss_patterns(request_data):
            threat_score += 30
            detected_threats.append("xss_attempt")
        
        # Determine threat level
        if threat_score >= 70:
            threat_level = "high"
            response = "block"
        elif threat_score >= 40:
            threat_level = "medium"
            response = "monitor"
        elif threat_score >= 20:
            threat_level = "low"
            response = "log"
        else:
            threat_level = "none"
            response = "allow"
        
        return {
            "threat_score": threat_score,
            "threat_level": threat_level,
            "response": response,
            "detected_threats": detected_threats,
            "ip_address": ip_address,
            "timestamp": datetime.utcnow()
        }
    
    def _analyze_user_agent(self, user_agent: str) -> Dict[str, Any]:
        """Analyze user agent for suspicious patterns"""
        score = 0
        threats = []
        
        # Check for bot patterns
        bot_patterns = [
            r'bot', r'crawler', r'spider', r'scraper',
            r'curl', r'wget', r'python-requests'
        ]
        
        ua_lower = user_agent.lower()
        for pattern in bot_patterns:
            if re.search(pattern, ua_lower):
                score += 15
                threats.append("bot_detected")
                break
        
        # Check for suspicious behavior indicators
        if "sqlmap" in ua_lower:
            score += 50
            threats.append("sqlmap_detected")
        
        if len(user_agent) < 20:  # Very short user agent
            score += 10
            threats.append("suspicious_ua_length")
        
        return {"score": score, "threats": threats} if threats else {}
    
    def _contains_sql_injection_patterns(self, data: Dict[str, Any]) -> bool:
        """Check if data contains SQL injection patterns"""
        patterns = [
            r"union\s+select",
            r"drop\s+table",
            r"insert\s+into",
            r"script\s*>",
            r"javascript:",
            r"'or\s+1=1",
            r"admin'--"
        ]
        
        data_str = str(data).lower()
        return any(re.search(pattern, data_str) for pattern in patterns)
    
    def _contains_xss_patterns(self, data: Dict[str, Any]) -> bool:
        """Check if data contains XSS patterns"""
        patterns = [
            r"<script",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe",
            r"<object",
            r"<embed"
        ]
        
        data_str = str(data).lower()
        return any(re.search(pattern, data_str) for pattern in patterns)
    
    def _get_recent_requests(self, ip_address: str) -> List[datetime]:
        """Get recent requests for an IP (simplified implementation)"""
        # This would typically be implemented with a proper time-series store
        return []


# Decorators for security enforcement
def require_authentication(auth_manager: AuthenticationManager):
    """Decorator to require authentication"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract token from request headers
            token = None
            for arg in args:
                if hasattr(arg, 'headers'):
                    auth_header = arg.headers.get('Authorization')
                    if auth_header and auth_header.startswith('Bearer '):
                        token = auth_header[7:]  # Remove 'Bearer ' prefix
                        break
            
            if not token:
                raise AuthenticationError("Authentication token required")
            
            # Verify token
            payload = auth_manager.verify_jwt_token(token)
            
            # Add user info to request context
            kwargs['_current_user'] = payload
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_api_key(api_key_manager: APIKeyManager, required_permissions: List[str] = None):
    """Decorator to require API key authentication"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract API key from headers
            api_key = None
            for arg in args:
                if hasattr(arg, 'headers'):
                    api_key = arg.headers.get('X-API-Key')
                    break
            
            if not api_key:
                raise AuthenticationError("API key required")
            
            # Validate API key
            key_data = api_key_manager.validate_api_key(api_key)
            
            # Check permissions if required
            if required_permissions:
                key_permissions = key_data.get('permissions', [])
                if not all(perm in key_permissions for perm in required_permissions):
                    raise AuthorizationError("Insufficient permissions")
            
            # Add key data to request context
            kwargs['_api_key_data'] = key_data
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def validate_input_security(validation_rules: Dict[str, Any] = None):
    """Decorator to validate input security"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object
            request_obj = None
            for arg in args:
                if hasattr(arg, '__dict__') and not isinstance(arg, str):
                    request_obj = arg
                    break
            
            if request_obj and hasattr(request_obj, '__dict__'):
                data = request_obj.__dict__
                
                # Validate each field
                for key, value in data.items():
                    if isinstance(value, str) and value:
                        data[key] = InputValidationEngine.validate_and_sanitize_input(
                            value, key, validation_rules
                        )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def monitor_threats(threat_engine: ThreatDetectionEngine):
    """Decorator to monitor for threats"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request info
            ip_address = 'unknown'
            user_agent = None
            request_data = {}
            
            for arg in args:
                if hasattr(arg, 'client') and hasattr(arg.client, 'host'):
                    ip_address = arg.client.host
                if hasattr(arg, 'headers'):
                    user_agent = arg.headers.get('User-Agent')
                if hasattr(arg, '__dict__'):
                    request_data.update(arg.__dict__)
            
            # Analyze for threats
            threat_analysis = threat_engine.analyze_request_patterns(
                ip_address, request_data, user_agent
            )
            
            # Handle threat response
            if threat_analysis['response'] == 'block':
                logger.warning(f"Threat detected from {ip_address}: {threat_analysis}")
                raise SecurityError("Request blocked due to security threat")
            elif threat_analysis['response'] == 'monitor':
                logger.info(f"Suspicious activity detected from {ip_address}: {threat_analysis}")
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator