"""
Database Validation Service - Enhanced validation for database operations
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from utils.error_classes import DatabaseError, ValidationError, NotFoundError, ConflictError
from utils.validation_schemas import (
    UserRegistrationSchema, StudySessionSchema, SpaceCreateSchema,
    ChatMessageSchema, XPAwardSchema, AuditValidationSchema
)
from utils.security_validation import SecurityValidator

logger = logging.getLogger(__name__)


class DatabaseValidationService:
    """Enhanced database service with comprehensive validation"""
    
    def __init__(self, base_db_service):
        """
        Initialize with base database service
        
        Args:
            base_db_service: Existing SupabaseDB service instance
        """
        self.db = base_db_service
    
    async def validate_and_insert_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and insert user data with comprehensive checks
        
        Args:
            user_data: User registration data
            
        Returns:
            Insert result with validation metadata
            
        Raises:
            ValidationError: If data validation fails
            DatabaseError: If database operation fails
            ConflictError: If user already exists
        """
        try:
            # Validate input data
            validated_data = UserRegistrationSchema(**user_data).dict()
            
            # Additional security validation
            validated_data['username'] = SecurityValidator.validate_input_safety(
                validated_data['username'], 'username'
            )
            validated_data['email'] = SecurityValidator.validate_input_safety(
                validated_data['email'], 'email'
            )
            
            # Check if user already exists
            existing_user = await self.db.fetch_data('users', {
                'eq_email': validated_data['email']
            })
            
            if existing_user['success'] and existing_user['data']:
                raise ConflictError(
                    "User with this email already exists",
                    conflict_type="email_exists",
                    conflicting_data={"email": validated_data['email']}
                )
            
            # Check username uniqueness
            existing_username = await self.db.fetch_data('users', {
                'eq_username': validated_data['username']
            })
            
            if existing_username['success'] and existing_username['data']:
                raise ConflictError(
                    "Username already taken",
                    conflict_type="username_exists",
                    conflicting_data={"username": validated_data['username']}
                )
            
            # Hash password (should be done in auth service)
            validated_data['password_hash'] = user_data.get('password_hash')
            
            # Insert user
            result = await self.db.insert_data('users', validated_data)
            
            if not result['success']:
                raise DatabaseError(
                    f"Failed to create user: {result['message']}",
                    operation="insert",
                    table="users"
                )
            
            logger.info(f"User created successfully: {validated_data['email']}")
            
            return {
                **result,
                "validation_details": {
                    "data_validated": True,
                    "security_scanned": True,
                    "uniqueness_checked": True
                }
            }
            
        except (ValidationError, ConflictError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in user validation: {str(e)}")
            raise DatabaseError(
                f"Unexpected error during user validation: {str(e)}",
                operation="validate_and_insert_user"
            )
    
    async def validate_and_insert_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and insert study session data
        
        Args:
            session_data: Study session data
            
        Returns:
            Insert result with validation metadata
        """
        try:
            # Validate input data
            validated_data = StudySessionSchema(**session_data).dict()
            
            # Security validation for optional fields
            if validated_data.get('space_id'):
                validated_data['space_id'] = SecurityValidator.validate_input_safety(
                    validated_data['space_id'], 'space_id'
                )
            
            # Business logic validation
            if validated_data['duration_minutes'] > 1440:  # 24 hours
                raise ValidationError(
                    "Session duration cannot exceed 24 hours",
                    field="duration_minutes",
                    value=validated_data['duration_minutes']
                )
            
            # Check if user exists
            user_check = await self.db.fetch_data('users', {
                'eq_id': validated_data['user_id']
            })
            
            if not user_check['success'] or not user_check['data']:
                raise NotFoundError("User", validated_data['user_id'])
            
            # Check space if provided
            if validated_data.get('space_id'):
                space_check = await self.db.fetch_data('spaces', {
                    'eq_id': validated_data['space_id']
                })
                
                if not space_check['success'] or not space_check['data']:
                    raise NotFoundError("Space", validated_data['space_id'])
            
            # Insert session
            result = await self.db.insert_data('study_sessions', validated_data)
            
            if not result['success']:
                raise DatabaseError(
                    f"Failed to create session: {result['message']}",
                    operation="insert",
                    table="study_sessions"
                )
            
            logger.info(f"Study session created: {validated_data['user_id']}")
            
            return {
                **result,
                "validation_details": {
                    "data_validated": True,
                    "security_scanned": True,
                    "referential_integrity_checked": True
                }
            }
            
        except (ValidationError, NotFoundError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in session validation: {str(e)}")
            raise DatabaseError(
                f"Unexpected error during session validation: {str(e)}",
                operation="validate_and_insert_session"
            )
    
    async def validate_and_insert_space(self, space_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and insert space data
        
        Args:
            space_data: Space creation data
            
        Returns:
            Insert result with validation metadata
        """
        try:
            # Validate input data
            validated_data = SpaceCreateSchema(**space_data).dict()
            
            # Security validation
            validated_data['name'] = SecurityValidator.validate_input_safety(
                validated_data['name'], 'name'
            )
            
            # Check if creator exists
            creator_check = await self.db.fetch_data('users', {
                'eq_id': validated_data['created_by']
            })
            
            if not creator_check['success'] or not creator_check['data']:
                raise NotFoundError("User", validated_data['created_by'])
            
            # Check name uniqueness for creator
            existing_space = await self.db.fetch_data('spaces', {
                'eq_created_by': validated_data['created_by'],
                'eq_name': validated_data['name']
            })
            
            if existing_space['success'] and existing_space['data']:
                raise ConflictError(
                    "You already have a space with this name",
                    conflict_type="space_name_exists",
                    conflicting_data={
                        "created_by": validated_data['created_by'],
                        "name": validated_data['name']
                    }
                )
            
            # Insert space
            result = await self.db.insert_data('spaces', validated_data)
            
            if not result['success']:
                raise DatabaseError(
                    f"Failed to create space: {result['message']}",
                    operation="insert",
                    table="spaces"
                )
            
            logger.info(f"Space created: {validated_data['name']}")
            
            return {
                **result,
                "validation_details": {
                    "data_validated": True,
                    "security_scanned": True,
                    "creator_exists": True,
                    "name_uniqueness_checked": True
                }
            }
            
        except (ValidationError, NotFoundError, ConflictError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in space validation: {str(e)}")
            raise DatabaseError(
                f"Unexpected error during space validation: {str(e)}",
                operation="validate_and_insert_space"
            )
    
    async def validate_and_insert_chat_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and insert chat message
        
        Args:
            message_data: Chat message data
            
        Returns:
            Insert result with validation metadata
        """
        try:
            # Validate input data
            validated_data = ChatMessageSchema(**message_data).dict()
            
            # Security validation (already done in schema)
            validated_data['message'] = SecurityValidator.validate_input_safety(
                validated_data['message'], 'message'
            )
            
            # Check if user exists
            user_check = await self.db.fetch_data('users', {
                'eq_id': validated_data['user_id']
            })
            
            if not user_check['success'] or not user_check['data']:
                raise NotFoundError("User", validated_data['user_id'])
            
            # Check if space exists and user is a member
            space_check = await self.db.fetch_data('spaces', {
                'eq_id': validated_data['space_id']
            })
            
            if not space_check['success'] or not space_check['data']:
                raise NotFoundError("Space", validated_data['space_id'])
            
            # Check if user is member of space
            member_check = await self.db.fetch_data('space_members', {
                'eq_space_id': validated_data['space_id'],
                'eq_user_id': validated_data['user_id']
            })
            
            if not member_check['success'] or not member_check['data']:
                raise ConflictError(
                    "User is not a member of this space",
                    conflict_type="not_space_member",
                    conflicting_data={
                        "space_id": validated_data['space_id'],
                        "user_id": validated_data['user_id']
                    }
                )
            
            # Insert message
            result = await self.db.insert_data('space_chat', validated_data)
            
            if not result['success']:
                raise DatabaseError(
                    f"Failed to insert chat message: {result['message']}",
                    operation="insert",
                    table="space_chat"
                )
            
            logger.info(f"Chat message inserted: {validated_data['user_id']} in {validated_data['space_id']}")
            
            return {
                **result,
                "validation_details": {
                    "data_validated": True,
                    "security_scanned": True,
                    "user_exists": True,
                    "space_exists": True,
                    "membership_verified": True
                }
            }
            
        except (ValidationError, NotFoundError, ConflictError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in chat message validation: {str(e)}")
            raise DatabaseError(
                f"Unexpected error during chat message validation: {str(e)}",
                operation="validate_and_insert_chat_message"
            )
    
    async def validate_xp_operation(self, xp_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate XP award operation
        
        Args:
            xp_data: XP award data
            
        Returns:
            Validation result with metadata
        """
        try:
            # Validate input data
            validated_data = XPAwardSchema(**xp_data).dict()
            
            # Check if user exists
            user_check = await self.db.fetch_data('users', {
                'eq_id': validated_data['user_id']
            })
            
            if not user_check['success'] or not user_check['data']:
                raise NotFoundError("User", validated_data['user_id'])
            
            # Additional XP-specific validations
            user = user_check['data'][0]
            
            # Check if this would cause XP to exceed reasonable limits
            current_xp = user.get('xp', 0)
            new_xp = current_xp + validated_data['amount']
            
            if new_xp > 1000000:  # 1 million XP limit
                raise ValidationError(
                    "XP amount would exceed maximum allowed XP",
                    field="amount",
                    value=validated_data['amount'],
                    details={
                        "current_xp": current_xp,
                        "new_xp": new_xp,
                        "max_allowed": 1000000
                    }
                )
            
            # Validate metadata if present
            if validated_data.get('metadata'):
                if not isinstance(validated_data['metadata'], dict):
                    raise ValidationError(
                        "Metadata must be a dictionary",
                        field="metadata",
                        value=validated_data['metadata']
                    )
                
                # Sanitize metadata values
                sanitized_metadata = {}
                for key, value in validated_data['metadata'].items():
                    if isinstance(value, str):
                        sanitized_metadata[key] = SecurityValidator.validate_input_safety(
                            value, f"metadata.{key}"
                        )
                    else:
                        sanitized_metadata[key] = value
                
                validated_data['metadata'] = sanitized_metadata
            
            logger.info(f"XP operation validated: {validated_data['user_id']} +{validated_data['amount']}")
            
            return {
                "success": True,
                "validation_details": {
                    "data_validated": True,
                    "user_exists": True,
                    "xp_limits_checked": True,
                    "metadata_sanitized": True
                },
                "validated_data": validated_data
            }
            
        except (ValidationError, NotFoundError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in XP validation: {str(e)}")
            raise DatabaseError(
                f"Unexpected error during XP validation: {str(e)}",
                operation="validate_xp_operation"
            )
    
    async def validate_audit_request(self, audit_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate audit validation request
        
        Args:
            audit_data: Audit validation data
            
        Returns:
            Validation result with metadata
        """
        try:
            # Validate input data
            validated_data = AuditValidationSchema(**audit_data).dict()
            
            # Check if session exists
            session_check = await self.db.fetch_data('study_sessions', {
                'eq_id': validated_data['session_id']
            })
            
            if not session_check['success'] or not session_check['data']:
                raise NotFoundError("Study Session", validated_data['session_id'])
            
            # Verify session belongs to user
            session = session_check['data'][0]
            if session['user_id'] != validated_data['user_id']:
                raise ValidationError(
                    "Session does not belong to specified user",
                    field="user_id",
                    details={
                        "session_user_id": session['user_id'],
                        "requested_user_id": validated_data['user_id']
                    }
                )
            
            # Validate events if provided
            if validated_data.get('events'):
                for i, event in enumerate(validated_data['events']):
                    if not isinstance(event, dict):
                        raise ValidationError(
                            f"Event {i} must be a dictionary",
                            field="events",
                            value=event
                        )
                    
                    # Validate event structure
                    required_event_fields = ['event_type', 'created_at']
                    for field in required_event_fields:
                        if field not in event:
                            raise ValidationError(
                                f"Event {i} missing required field: {field}",
                                field="events",
                                details={"event_index": i, "missing_field": field}
                            )
                    
                    # Validate event_type
                    valid_event_types = [
                        'start', 'end', 'pause', 'resume', 'heartbeat', 
                        'activity_update', 'progress', 'focus_loss', 'focus_gain'
                    ]
                    
                    if event['event_type'] not in valid_event_types:
                        raise ValidationError(
                            f"Invalid event type: {event['event_type']}",
                            field="events",
                            details={
                                "event_index": i,
                                "invalid_type": event['event_type'],
                                "valid_types": valid_event_types
                            }
                        )
            
            logger.info(f"Audit request validated: {validated_data['session_id']}")
            
            return {
                "success": True,
                "validation_details": {
                    "data_validated": True,
                    "session_exists": True,
                    "user_session_ownership_verified": True,
                    "events_structure_validated": True
                },
                "validated_data": validated_data
            }
            
        except (ValidationError, NotFoundError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in audit validation: {str(e)}")
            raise DatabaseError(
                f"Unexpected error during audit validation: {str(e)}",
                operation="validate_audit_request"
            )
    
    async def batch_validate_users(self, users_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate multiple users in batch
        
        Args:
            users_data: List of user data dictionaries
            
        Returns:
            Batch validation result
        """
        results = []
        errors = []
        
        for i, user_data in enumerate(users_data):
            try:
                validated_data = UserRegistrationSchema(**user_data).dict()
                results.append({
                    "index": i,
                    "status": "valid",
                    "data": validated_data,
                    "email": validated_data['email'],
                    "username": validated_data['username']
                })
            except ValidationError as e:
                errors.append({
                    "index": i,
                    "status": "invalid",
                    "error": e.to_dict(),
                    "original_data": user_data
                })
            except Exception as e:
                errors.append({
                    "index": i,
                    "status": "error",
                    "error": {"message": str(e), "type": type(e).__name__},
                    "original_data": user_data
                })
        
        return {
            "success": True,
            "total_count": len(users_data),
            "valid_count": len(results),
            "error_count": len(errors),
            "results": results,
            "errors": errors
        }
    
    async def get_validation_summary(self, table: str, time_range_hours: int = 24) -> Dict[str, Any]:
        """
        Get validation summary statistics for a table
        
        Args:
            table: Table name
            time_range_hours: Hours to look back
            
        Returns:
            Validation summary statistics
        """
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=time_range_hours)
            
            # This would require additional tracking tables in production
            # For now, return placeholder data
            return {
                "table": table,
                "time_range_hours": time_range_hours,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "validation_stats": {
                    "total_operations": 0,
                    "successful_validations": 0,
                    "validation_errors": 0,
                    "security_blocks": 0,
                    "average_validation_time_ms": 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting validation summary: {str(e)}")
            return {
                "table": table,
                "error": str(e),
                "validation_stats": {}
            }