"""
Comprehensive Data Validation Schemas
"""

import re
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Tuple
from email_validator import validate_email, EmailNotValidError
from pydantic import BaseModel, Field, validator, root_validator
from .error_classes import ValidationError

# Common validation patterns
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,20}$')
PASSWORD_PATTERN = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$')
UUID_PATTERN = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', re.IGNORECASE)


class BaseValidationModel(BaseModel):
    """Base model with common validation methods"""
    
    class Config:
        # Enable validation on assignment
        validate_assignment = True
        # Use enum values
        use_enum_values = True
        # Validate nested models
        validate_nested = True
    
    @classmethod
    def validate_required_fields(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that all required fields are present and not None"""
        errors = []
        
        for field_name, field_info in cls.__fields__.items():
            if field_info.required and (field_name not in data or data[field_name] is None):
                errors.append(f"Required field '{field_name}' is missing")
        
        if errors:
            raise ValidationError(
                message="Missing required fields",
                details={"errors": errors}
            )
        
        return data
    
    @classmethod
    def sanitize_input(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize input data by removing potentially harmful content"""
        sanitized = {}
        
        for key, value in data.items():
            if isinstance(value, str):
                # Basic HTML/script tag removal
                sanitized_value = re.sub(r'<[^>]+>', '', value)
                # Remove null bytes
                sanitized_value = sanitized_value.replace('\x00', '')
                # Strip whitespace
                sanitized[key] = sanitized_value.strip()
            else:
                sanitized[key] = value
        
        return sanitized


class UserRegistrationSchema(BaseValidationModel):
    """Schema for user registration validation"""
    
    username: str = Field(..., min_length=3, max_length=20, description="Username")
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password")
    
    @validator('username')
    def validate_username(cls, v):
        if not USERNAME_PATTERN.match(v):
            raise ValidationError(
                "Username must be 3-20 characters, alphanumeric with underscores only",
                field="username",
                value=v,
                validation_rules=["^[a-zA-Z0-9_]{3,20}$"]
            )
        return v
    
    @validator('email')
    def validate_email_address(cls, v):
        try:
            validate_email(v)
            return v
        except EmailNotValidError as e:
            raise ValidationError(
                f"Invalid email address: {str(e)}",
                field="email",
                value=v
            )
    
    @validator('password')
    def validate_password_strength(cls, v):
        if not PASSWORD_PATTERN.match(v):
            raise ValidationError(
                "Password must be at least 8 characters with uppercase, lowercase, and number",
                field="password",
                validation_rules=[
                    "Minimum 8 characters",
                    "At least one uppercase letter",
                    "At least one lowercase letter", 
                    "At least one number"
                ]
            )
        return v


class UserLoginSchema(BaseValidationModel):
    """Schema for user login validation"""
    
    email: str = Field(..., description="Email address")
    password: str = Field(..., description="Password")
    
    @validator('email')
    def validate_email_address(cls, v):
        try:
            validate_email(v)
            return v
        except EmailNotValidError as e:
            raise ValidationError(
                f"Invalid email address: {str(e)}",
                field="email",
                value=v
            )


class UUIDValidationModel(BaseValidationModel):
    """Base model for UUID validation"""
    
    id: str = Field(..., description="UUID")
    
    @validator('id')
    def validate_uuid(cls, v):
        try:
            uuid.UUID(v)
            return v
        except (ValueError, TypeError):
            raise ValidationError(
                "Invalid UUID format",
                field="id",
                value=v,
                validation_rules=["Must be a valid UUID"]
            )


class StudySessionSchema(BaseValidationModel):
    """Schema for study session validation"""
    
    space_id: Optional[str] = Field(None, description="Study space ID")
    user_id: str = Field(..., description="User ID")
    duration_minutes: int = Field(..., gt=0, le=1440, description="Session duration in minutes")
    efficiency: Optional[float] = Field(None, ge=0, le=100, description="Efficiency percentage")
    
    @validator('user_id')
    def validate_user_id(cls, v):
        if not UUID_PATTERN.match(v):
            raise ValidationError(
                "Invalid user ID format",
                field="user_id",
                value=v,
                validation_rules=["Must be a valid UUID"]
            )
        return v
    
    @validator('space_id')
    def validate_space_id(cls, v):
        if v is not None and not UUID_PATTERN.match(v):
            raise ValidationError(
                "Invalid space ID format",
                field="space_id",
                value=v,
                validation_rules=["Must be a valid UUID"]
            )
        return v
    
    @validator('efficiency')
    def validate_efficiency(cls, v):
        if v is not None and not (0 <= v <= 100):
            raise ValidationError(
                "Efficiency must be between 0 and 100",
                field="efficiency",
                value=v,
                validation_rules=["Range: 0-100"]
            )
        return v


class SpaceCreateSchema(BaseValidationModel):
    """Schema for creating study spaces"""
    
    name: str = Field(..., min_length=1, max_length=100, description="Space name")
    created_by: str = Field(..., description="Creator user ID")
    visibility: str = Field(default="public", description="Space visibility")
    
    @validator('created_by')
    def validate_creator_id(cls, v):
        if not UUID_PATTERN.match(v):
            raise ValidationError(
                "Invalid creator ID format",
                field="created_by",
                value=v,
                validation_rules=["Must be a valid UUID"]
            )
        return v
    
    @validator('visibility')
    def validate_visibility(cls, v):
        valid_visibility = ['public', 'private']
        if v not in valid_visibility:
            raise ValidationError(
                f"Visibility must be one of: {', '.join(valid_visibility)}",
                field="visibility",
                value=v,
                validation_rules=valid_visibility
            )
        return v


class SpaceJoinSchema(BaseValidationModel):
    """Schema for joining study spaces"""
    
    space_id: str = Field(..., description="Space ID to join")
    user_id: str = Field(..., description="User ID joining the space")
    
    @validator('space_id', 'user_id')
    def validate_uuids(cls, v):
        if not UUID_PATTERN.match(v):
            raise ValidationError(
                "Invalid ID format",
                value=v,
                validation_rules=["Must be a valid UUID"]
            )
        return v


class ChatMessageSchema(BaseValidationModel):
    """Schema for chat messages"""
    
    space_id: str = Field(..., description="Space ID")
    user_id: str = Field(..., description="User ID")
    message: str = Field(..., min_length=1, max_length=1000, description="Message content")
    
    @validator('space_id', 'user_id')
    def validate_uuids(cls, v):
        if not UUID_PATTERN.match(v):
            raise ValidationError(
                "Invalid ID format",
                value=v,
                validation_rules=["Must be a valid UUID"]
            )
        return v
    
    @validator('message')
    def validate_message_content(cls, v):
        # Remove potentially harmful content
        sanitized = re.sub(r'<[^>]+>', '', v).strip()
        if not sanitized:
            raise ValidationError(
                "Message cannot be empty or contain only HTML tags",
                field="message",
                value=v
            )
        
        # Check for excessive special characters (potential spam)
        special_char_count = len(re.findall(r'[^\w\s]', sanitized))
        if special_char_count > len(sanitized) * 0.5:
            raise ValidationError(
                "Message contains too many special characters",
                field="message",
                value=v,
                validation_rules=["Limit special characters to 50% of message"]
            )
        
        return sanitized


class ActivityUpdateSchema(BaseValidationModel):
    """Schema for activity updates"""
    
    space_id: str = Field(..., description="Space ID")
    user_id: str = Field(..., description="User ID")
    action: str = Field(..., min_length=1, max_length=100, description="Activity action")
    progress: int = Field(default=0, ge=0, le=100, description="Progress percentage")
    subject: Optional[str] = Field(default="General", max_length=100, description="Subject")
    
    @validator('space_id', 'user_id')
    def validate_uuids(cls, v):
        if not UUID_PATTERN.match(v):
            raise ValidationError(
                "Invalid ID format",
                value=v,
                validation_rules=["Must be a valid UUID"]
            )
        return v
    
    @validator('progress')
    def validate_progress(cls, v):
        if not (0 <= v <= 100):
            raise ValidationError(
                "Progress must be between 0 and 100",
                field="progress",
                value=v,
                validation_rules=["Range: 0-100"]
            )
        return v


class XPAwardSchema(BaseValidationModel):
    """Schema for XP award validation"""
    
    user_id: str = Field(..., description="User ID")
    amount: int = Field(..., gt=0, le=10000, description="XP amount")
    source: str = Field(..., description="XP source")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('user_id')
    def validate_user_id(cls, v):
        if not UUID_PATTERN.match(v):
            raise ValidationError(
                "Invalid user ID format",
                field="user_id",
                value=v,
                validation_rules=["Must be a valid UUID"]
            )
        return v
    
    @validator('amount')
    def validate_xp_amount(cls, v):
        if v <= 0:
            raise ValidationError(
                "XP amount must be positive",
                field="amount",
                value=v
            )
        if v > 10000:
            raise ValidationError(
                "XP amount too large (max 10000)",
                field="amount",
                value=v,
                validation_rules=["Maximum: 10000 XP"]
            )
        return v
    
    @validator('source')
    def validate_xp_source(cls, v):
        valid_sources = [
            'session', 'streak', 'daily_bonus', 'milestone', 
            'achievement', 'admin', 'correction', 'referral'
        ]
        if v not in valid_sources:
            raise ValidationError(
                f"Invalid XP source. Must be one of: {', '.join(valid_sources)}",
                field="source",
                value=v,
                validation_rules=valid_sources
            )
        return v


class AuditValidationSchema(BaseValidationModel):
    """Schema for audit validation requests"""
    
    session_id: str = Field(..., description="Session ID")
    user_id: str = Field(..., description="User ID")
    validation_mode: str = Field(default="soft", description="Validation mode")
    events: Optional[List[Dict[str, Any]]] = Field(default=None, description="Session events")
    
    @validator('session_id', 'user_id')
    def validate_uuids(cls, v):
        if not UUID_PATTERN.match(v):
            raise ValidationError(
                "Invalid ID format",
                value=v,
                validation_rules=["Must be a valid UUID"]
            )
        return v
    
    @validator('validation_mode')
    def validate_validation_mode(cls, v):
        valid_modes = ['soft', 'strict']
        if v not in valid_modes:
            raise ValidationError(
                f"Validation mode must be one of: {', '.join(valid_modes)}",
                field="validation_mode",
                value=v,
                validation_rules=valid_modes
            )
        return v
    
    @validator('events')
    def validate_events(cls, v):
        if v is not None:
            if not isinstance(v, list):
                raise ValidationError(
                    "Events must be a list",
                    field="events",
                    value=v
                )
            
            # Validate each event
            for i, event in enumerate(v):
                if not isinstance(event, dict):
                    raise ValidationError(
                        f"Event {i} must be a dictionary",
                        field="events",
                        value=event
                    )
                
                required_event_fields = ['event_type', 'created_at']
                for field in required_event_fields:
                    if field not in event:
                        raise ValidationError(
                            f"Event {i} missing required field: {field}",
                            field="events",
                            details={"event_index": i, "missing_field": field}
                        )
        
        return v


class PaginationSchema(BaseValidationModel):
    """Schema for pagination validation"""
    
    page: int = Field(default=1, ge=1, le=1000, description="Page number")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(default=None, description="Sort field")
    sort_order: Optional[str] = Field(default="desc", description="Sort order")
    
    @validator('sort_order')
    def validate_sort_order(cls, v):
        valid_orders = ['asc', 'desc']
        if v not in valid_orders:
            raise ValidationError(
                f"Sort order must be one of: {', '.join(valid_orders)}",
                field="sort_order",
                value=v,
                validation_rules=valid_orders
            )
        return v
    
    @classmethod
    def get_offset_limit(cls, page: int, limit: int) -> Tuple[int, int]:
        """Calculate offset and limit for database queries"""
        offset = (page - 1) * limit
        return offset, limit


class DateRangeSchema(BaseValidationModel):
    """Schema for date range validation"""
    
    start_date: Optional[datetime] = Field(None, description="Start date")
    end_date: Optional[datetime] = Field(None, description="End date")
    
    @root_validator
    def validate_date_range(cls, values):
        start_date = values.get('start_date')
        end_date = values.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise ValidationError(
                "Start date cannot be after end date",
                field="start_date",
                details={"start_date": start_date.isoformat(), "end_date": end_date.isoformat()}
            )
        
        # Check if date range is not too large (max 1 year)
        if start_date and end_date:
            max_range = timedelta(days=365)
            if end_date - start_date > max_range:
                raise ValidationError(
                    "Date range cannot exceed 1 year",
                    field="end_date",
                    details={"max_days": 365}
                )
        
        return values


# Utility functions for common validations
def validate_uuid(uuid_string: str) -> bool:
    """Validate UUID format"""
    try:
        uuid.UUID(uuid_string)
        return True
    except (ValueError, TypeError):
        return False


def validate_email(email: str) -> bool:
    """Validate email address"""
    try:
        validate_email(email)
        return True
    except EmailNotValidError:
        return False


def validate_password_strength(password: str) -> Tuple[bool, List[str]]:
    """Validate password strength and return issues"""
    issues = []
    
    if len(password) < 8:
        issues.append("Password must be at least 8 characters long")
    
    if not re.search(r'[a-z]', password):
        issues.append("Password must contain at least one lowercase letter")
    
    if not re.search(r'[A-Z]', password):
        issues.append("Password must contain at least one uppercase letter")
    
    if not re.search(r'\d', password):
        issues.append("Password must contain at least one number")
    
    if not re.search(r'[@$!%*?&]', password):
        issues.append("Password must contain at least one special character (@$!%*?&)")
    
    return len(issues) == 0, issues


def sanitize_html(input_string: str) -> str:
    """Remove potentially harmful HTML tags"""
    if not isinstance(input_string, str):
        return str(input_string)
    
    # Remove HTML tags
    cleaned = re.sub(r'<[^>]+>', '', input_string)
    
    # Remove null bytes
    cleaned = cleaned.replace('\x00', '')
    
    # Strip whitespace
    return cleaned.strip()


def validate_file_upload(file_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate file upload data"""
    issues = []
    
    # Check required fields
    required_fields = ['filename', 'content_type', 'size']
    for field in required_fields:
        if field not in file_data:
            issues.append(f"Missing required field: {field}")
    
    # Validate file size (max 10MB)
    if 'size' in file_data and file_data['size'] > 10 * 1024 * 1024:
        issues.append("File size cannot exceed 10MB")
    
    # Validate content type
    allowed_types = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/markdown'
    ]
    if 'content_type' in file_data and file_data['content_type'] not in allowed_types:
        issues.append(f"File type not allowed. Allowed types: {', '.join(allowed_types)}")
    
    # Validate filename
    if 'filename' in file_data:
        filename = file_data['filename']
        if not filename or len(filename) > 255:
            issues.append("Invalid filename length")
        
        # Check for dangerous characters
        dangerous_chars = ['<', '>', ':', '"', '|', '?', '*']
        if any(char in filename for char in dangerous_chars):
            issues.append("Filename contains invalid characters")
    
    return len(issues) == 0, issues