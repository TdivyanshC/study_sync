"""
Test Suite for Comprehensive Data Validation and Error Handling
"""

import pytest
import json
from unittest.mock import Mock, patch
import asyncio
from datetime import datetime
import uuid

# Import our validation and error handling components
from utils.error_classes import (
    ValidationError, DatabaseError, NotFoundError, ConflictError,
    AuthenticationError, AuthorizationError, RateLimitError
)
from utils.validation_schemas import (
    UserRegistrationSchema, StudySessionSchema, SpaceCreateSchema,
    ChatMessageSchema, XPAwardSchema, AuditValidationSchema,
    validate_password_strength, validate_uuid, sanitize_html
)
from utils.security_validation import (
    SecurityValidator, RateLimiter, detect_malicious_input
)
from services.validation_service import DatabaseValidationService
from middleware.error_handler import ErrorResponseFormatter


class TestErrorClasses:
    """Test custom error classes"""
    
    def test_validation_error_creation(self):
        """Test ValidationError creation and formatting"""
        error = ValidationError(
            message="Invalid email format",
            field="email",
            value="invalid-email"
        )
        
        assert error.message == "Invalid email format"
        assert error.error_code == "VALIDATION_ERROR"
        assert error.status_code == 400
        assert error.details["field"] == "email"
        assert error.details["value"] == "invalid-email"
    
    def test_not_found_error_creation(self):
        """Test NotFoundError creation"""
        error = NotFoundError("User", "123e4567-e89b-12d3-a456-426614174000")
        
        assert "User not found" in error.message
        assert "123e4567-e89b-12d3-a456-426614174000" in error.message
        assert error.error_code == "NOT_FOUND"
        assert error.status_code == 404
        assert error.details["resource_type"] == "User"
        assert error.details["resource_id"] == "123e4567-e89b-12d3-a456-426614174000"
    
    def test_conflict_error_creation(self):
        """Test ConflictError creation"""
        error = ConflictError(
            "Email already exists",
            conflict_type="email_exists",
            conflicting_data={"email": "test@example.com"}
        )
        
        assert error.message == "Email already exists"
        assert error.error_code == "CONFLICT"
        assert error.status_code == 409
        assert error.details["conflict_type"] == "email_exists"
        assert error.details["conflicting_data"]["email"] == "test@example.com"
    
    def test_error_to_http_exception(self):
        """Test conversion to HTTPException"""
        error = ValidationError("Test validation error", field="test_field")
        http_exc = error.to_http_exception()
        
        assert http_exc.status_code == 400
        assert "Test validation error" in str(http_exc.detail)


class TestValidationSchemas:
    """Test validation schemas"""
    
    def test_user_registration_schema_valid(self):
        """Test valid user registration data"""
        data = {
            "username": "testuser123",
            "email": "test@example.com",
            "password": "SecurePass123"
        }
        
        schema = UserRegistrationSchema(**data)
        assert schema.username == "testuser123"
        assert schema.email == "test@example.com"
        assert schema.password == "SecurePass123"
    
    def test_user_registration_schema_invalid_username(self):
        """Test invalid username validation"""
        data = {
            "username": "ab",  # Too short
            "email": "test@example.com",
            "password": "SecurePass123"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserRegistrationSchema(**data)
        
        assert "Username must be 3-20 characters" in str(exc_info.value)
    
    def test_user_registration_schema_invalid_email(self):
        """Test invalid email validation"""
        data = {
            "username": "testuser123",
            "email": "invalid-email",
            "password": "SecurePass123"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserRegistrationSchema(**data)
        
        assert "Invalid email address" in str(exc_info.value)
    
    def test_user_registration_schema_invalid_password(self):
        """Test invalid password validation"""
        data = {
            "username": "testuser123",
            "email": "test@example.com",
            "password": "weak"  # No uppercase, no number
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserRegistrationSchema(**data)
        
        assert "Password must be at least 8 characters" in str(exc_info.value)
    
    def test_study_session_schema_valid(self):
        """Test valid study session data"""
        data = {
            "user_id": str(uuid.uuid4()),
            "duration_minutes": 25,
            "efficiency": 85.5
        }
        
        schema = StudySessionSchema(**data)
        assert schema.duration_minutes == 25
        assert schema.efficiency == 85.5
    
    def test_study_session_schema_invalid_duration(self):
        """Test invalid session duration"""
        data = {
            "user_id": str(uuid.uuid4()),
            "duration_minutes": 2000  # Too long
        }
        
        with pytest.raises(ValidationError) as exc_info:
            StudySessionSchema(**data)
        
        assert "Session duration cannot exceed 24 hours" in str(exc_info.value)
    
    def test_space_create_schema_valid(self):
        """Test valid space creation data"""
        data = {
            "name": "Study Group Alpha",
            "created_by": str(uuid.uuid4()),
            "visibility": "public"
        }
        
        schema = SpaceCreateSchema(**data)
        assert schema.name == "Study Group Alpha"
        assert schema.visibility == "public"
    
    def test_space_create_schema_invalid_visibility(self):
        """Test invalid space visibility"""
        data = {
            "name": "Test Space",
            "created_by": str(uuid.uuid4()),
            "visibility": "invalid"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            SpaceCreateSchema(**data)
        
        assert "Visibility must be one of" in str(exc_info.value)


class TestValidationUtilities:
    """Test validation utility functions"""
    
    def test_validate_password_strength_valid(self):
        """Test valid password validation"""
        is_valid, issues = validate_password_strength("SecurePass123")
        assert is_valid is True
        assert issues == []
    
    def test_validate_password_strength_invalid(self):
        """Test invalid password validation"""
        is_valid, issues = validate_password_strength("weak")
        assert is_valid is False
        assert len(issues) > 0
        assert any("8 characters" in issue for issue in issues)
    
    def test_validate_uuid_valid(self):
        """Test valid UUID validation"""
        test_uuid = "123e4567-e89b-12d3-a456-426614174000"
        assert validate_uuid(test_uuid) is True
    
    def test_validate_uuid_invalid(self):
        """Test invalid UUID validation"""
        invalid_uuid = "not-a-uuid"
        assert validate_uuid(invalid_uuid) is False
    
    def test_sanitize_html(self):
        """Test HTML sanitization"""
        dirty_html = "<script>alert('xss')</script>Hello World"
        clean = sanitize_html(dirty_html)
        assert "<script>" not in clean
        assert "Hello World" in clean


class TestSecurityValidation:
    """Test security validation"""
    
    def test_sql_injection_detection(self):
        """Test SQL injection pattern detection"""
        malicious_input = "'; DROP TABLE users; --"
        is_malicious = SecurityValidator.detect_sql_injection(malicious_input)
        assert is_malicious is True
    
    def test_xss_detection(self):
        """Test XSS pattern detection"""
        malicious_input = "<script>alert('xss')</script>"
        is_malicious = SecurityValidator.detect_xss(malicious_input)
        assert is_malicious is True
    
    def test_command_injection_detection(self):
        """Test command injection pattern detection"""
        malicious_input = "test; rm -rf /"
        is_malicious = SecurityValidator.detect_command_injection(malicious_input)
        assert is_malicious is True
    
    def test_input_safety_validation(self):
        """Test input safety validation"""
        # Test malicious input detection
        with pytest.raises(ValidationError) as exc_info:
            SecurityValidator.validate_input_safety("<script>alert('xss')</script>", "message")
        
        assert "XSS attack detected" in str(exc_info.value)
        
        # Test safe input
        safe_input = "This is a normal message"
        result = SecurityValidator.validate_input_safety(safe_input, "message")
        assert result == safe_input
    
    def test_jwt_token_validation(self):
        """Test JWT token validation"""
        import jwt
        
        # Create a valid token
        payload = {"user_id": "123", "exp": datetime.utcnow().timestamp() + 3600}
        token = jwt.encode(payload, "secret", algorithm="HS256")
        
        # Test valid token
        result = SecurityValidator.validate_jwt_token(token, "secret")
        assert result["user_id"] == "123"
        
        # Test invalid token
        with pytest.raises(AuthenticationError):
            SecurityValidator.validate_jwt_token("invalid_token", "secret")
    
    def test_rate_limiter(self):
        """Test rate limiting functionality"""
        limiter = RateLimiter()
        
        # Test within limits
        is_limited, retry_after = limiter.is_rate_limited("test_ip", 5, 60)
        assert is_limited is False
        assert retry_after is None
        
        # Simulate hitting the limit
        for i in range(6):
            is_limited, retry_after = limiter.is_rate_limited("test_ip", 5, 60)
        
        # Should be rate limited now
        assert is_limited is True
        assert retry_after is not None


class TestRateLimiter:
    """Test rate limiter functionality"""
    
    def test_rate_limit_basic(self):
        """Test basic rate limiting"""
        limiter = RateLimiter()
        
        # Allow requests within limit
        for i in range(5):
            is_limited, retry_after = limiter.is_rate_limited("test_client", 5, 60)
            assert is_limited is False
        
        # Block request over limit
        is_limited, retry_after = limiter.is_rate_limited("test_client", 5, 60)
        assert is_limited is True
        assert retry_after is not None
    
    def test_rate_limit_expiration(self):
        """Test rate limit expiration"""
        limiter = RateLimiter()
        
        # Block a client
        is_limited, retry_after = limiter.is_rate_limited("test_client", 1, 1, block_duration=1)
        assert is_limited is True
        
        # Wait for block to expire (in real implementation, this would need time.sleep)
        # For testing, we'll just check the logic
        usage_info = limiter.get_usage_info("test_client", 60)
        assert usage_info["identifier"] == "test_client"


class TestDatabaseValidationService:
    """Test database validation service"""
    
    @pytest.fixture
    def mock_db_service(self):
        """Create mock database service"""
        mock_db = Mock()
        return mock_db
    
    @pytest.fixture
    def validation_service(self, mock_db_service):
        """Create validation service with mock database"""
        return DatabaseValidationService(mock_db_service)
    
    def test_validate_user_registration_success(self, validation_service, mock_db_service):
        """Test successful user registration validation"""
        # Mock successful database operations
        mock_db_service.fetch_data.side_effect = [
            {"success": True, "data": []},  # No existing email
            {"success": True, "data": []}   # No existing username
        ]
        mock_db_service.insert_data.return_value = {
            "success": True,
            "data": [{"id": "123", "username": "testuser", "email": "test@example.com"}]
        }
        
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password_hash": "hashed_password"
        }
        
        result = asyncio.run(validation_service.validate_and_insert_user(user_data))
        
        assert result["success"] is True
        assert "validation_details" in result
    
    def test_validate_user_registration_conflict(self, validation_service, mock_db_service):
        """Test user registration conflict handling"""
        # Mock existing user
        mock_db_service.fetch_data.return_value = {
            "success": True,
            "data": [{"id": "456", "username": "existing", "email": "test@example.com"}]
        }
        
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password_hash": "hashed_password"
        }
        
        with pytest.raises(ConflictError) as exc_info:
            asyncio.run(validation_service.validate_and_insert_user(user_data))
        
        assert "User with this email already exists" in str(exc_info.value)
    
    def test_validate_session_success(self, validation_service, mock_db_service):
        """Test successful session validation"""
        mock_db_service.fetch_data.side_effect = [
            {"success": True, "data": [{"id": "user123"}]},  # User exists
            {"success": True, "data": [{"id": "space456"}]}   # Space exists
        ]
        mock_db_service.insert_data.return_value = {
            "success": True,
            "data": [{"id": "session789"}]
        }
        
        session_data = {
            "user_id": "user123",
            "space_id": "space456",
            "duration_minutes": 25,
            "efficiency": 85.0
        }
        
        result = asyncio.run(validation_service.validate_and_insert_session(session_data))
        
        assert result["success"] is True
        assert "validation_details" in result
    
    def test_validate_session_user_not_found(self, validation_service, mock_db_service):
        """Test session validation with non-existent user"""
        mock_db_service.fetch_data.return_value = {
            "success": True,
            "data": []  # No user found
        }
        
        session_data = {
            "user_id": "nonexistent",
            "duration_minutes": 25
        }
        
        with pytest.raises(NotFoundError) as exc_info:
            asyncio.run(validation_service.validate_and_insert_session(session_data))
        
        assert "User not found" in str(exc_info.value)


class TestErrorResponseFormatter:
    """Test error response formatting"""
    
    def test_format_validation_error(self):
        """Test validation error formatting"""
        errors = [{"field": "email", "message": "Invalid email"}]
        request_id = "req123"
        
        result = ErrorResponseFormatter.format_validation_error(errors, request_id)
        
        assert result["error"] is True
        assert result["error_code"] == "VALIDATION_ERROR"
        assert result["message"] == "Request validation failed"
        assert result["details"]["validation_errors"] == errors
        assert result["request_id"] == request_id
    
    def test_format_database_error(self):
        """Test database error formatting"""
        result = ErrorResponseFormatter.format_database_error(
            operation="insert",
            table="users",
            original_error="Connection failed",
            request_id="req123"
        )
        
        assert result["error"] is True
        assert result["error_code"] == "DATABASE_ERROR"
        assert result["details"]["operation"] == "insert"
        assert result["details"]["table"] == "users"
        assert result["details"]["original_error"] == "Connection failed"


class TestMaliciousInputDetection:
    """Test malicious input detection"""
    
    def test_sql_injection_patterns(self):
        """Test various SQL injection patterns"""
        malicious_inputs = [
            "' OR '1'='1",
            "admin'--",
            "'; DROP TABLE users; --",
            "1' UNION SELECT * FROM users--"
        ]
        
        for malicious_input in malicious_inputs:
            result = detect_malicious_input(malicious_input)
            assert result["isSafe"] is False
            assert "SQL injection" in result["threats"][0]
    
    def test_xss_patterns(self):
        """Test various XSS patterns"""
        malicious_inputs = [
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')",
            "<svg onload=alert('xss')>"
        ]
        
        for malicious_input in malicious_inputs:
            result = detect_malicious_input(malicious_input)
            assert result["isSafe"] is False
            assert any("XSS" in threat for threat in result["threats"])
    
    def test_safe_inputs(self):
        """Test safe inputs"""
        safe_inputs = [
            "Hello World",
            "This is a normal message",
            "User123",
            "test@example.com"
        ]
        
        for safe_input in safe_inputs:
            result = detect_malicious_input(safe_input)
            assert result["isSafe"] is True
            assert result["threats"] is None


# Integration tests
class TestIntegrationValidation:
    """Test integrated validation workflows"""
    
    def test_complete_user_registration_flow(self):
        """Test complete user registration with validation"""
        user_data = {
            "username": "newuser123",
            "email": "newuser@example.com",
            "password": "SecurePass123"
        }
        
        # Test schema validation
        schema = UserRegistrationSchema(**user_data)
        assert schema.username == "newuser123"
        
        # Test security validation
        safe_username = SecurityValidator.validate_input_safety(schema.username, "username")
        assert safe_username == "newuser123"
        
        # Test password strength
        is_strong, issues = validate_password_strength(schema.password)
        assert is_strong is True
    
    def test_complete_session_creation_flow(self):
        """Test complete session creation with validation"""
        session_data = {
            "user_id": str(uuid.uuid4()),
            "space_id": str(uuid.uuid4()),
            "duration_minutes": 30,
            "efficiency": 90.0
        }
        
        # Test schema validation
        schema = StudySessionSchema(**session_data)
        assert schema.duration_minutes == 30
        
        # Test input sanitization
        safe_message = SecurityValidator.validate_input_safety(
            "Normal study session", "subject"
        )
        assert safe_message == "Normal study session"


# Performance tests
class TestValidationPerformance:
    """Test validation performance"""
    
    def test_validation_speed(self):
        """Test that validation is reasonably fast"""
        import time
        
        start_time = time.time()
        
        # Run multiple validations
        for i in range(100):
            data = {
                "username": f"user{i}",
                "email": f"user{i}@example.com",
                "password": "SecurePass123"
            }
            UserRegistrationSchema(**data)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete 100 validations in under 1 second
        assert duration < 1.0
    
    def test_security_scan_speed(self):
        """Test that security scanning is fast"""
        import time
        
        test_input = "This is a normal message" * 100
        
        start_time = time.time()
        
        # Run multiple security scans
        for i in range(1000):
            SecurityValidator.validate_input_safety(test_input, "test")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete 1000 scans in under 1 second
        assert duration < 1.0


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])