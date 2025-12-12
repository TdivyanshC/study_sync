"""
Supabase Authentication Middleware
Allows backend to accept and validate Supabase auth tokens
"""

import os
import jwt
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Global Supabase client for authentication
_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    """Get or create Supabase client for authentication"""
    global _supabase_client
    
    if _supabase_client is None:
        try:
            supabase_url = os.environ.get('SUPABASE_URL')
            supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
            
            if supabase_url and supabase_key:
                _supabase_client = create_client(supabase_url, supabase_key)
                logger.info("Supabase client initialized for authentication")
            else:
                logger.warning("Supabase credentials not found for authentication")
                
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            
    return _supabase_client

class SupabaseAuthenticationError(Exception):
    """Custom exception for Supabase authentication errors"""
    pass

async def validate_supabase_token(token: str) -> Dict[str, Any]:
    """
    Validate a Supabase JWT token and return user information
    
    Args:
        token: Supabase JWT token
        
    Returns:
        Dict containing user information
        
    Raises:
        SupabaseAuthenticationError: If token is invalid
    """
    try:
        client = get_supabase_client()
        if not client:
            raise SupabaseAuthenticationError("Supabase client not available")
            
        # Use Supabase client to validate the token
        user_response = client.auth.get_user(token)
        
        if user_response.user:
            return {
                'user_id': user_response.user.id,
                'email': user_response.user.email,
                'username': getattr(user_response.user, 'username', None),
                'authenticated': True,
                'auth_provider': 'supabase'
            }
        else:
            raise SupabaseAuthenticationError("Invalid or expired token")
            
    except Exception as e:
        logger.error(f"Supabase token validation failed: {e}")
        raise SupabaseAuthenticationError(f"Token validation failed: {str(e)}")

async def extract_user_from_request(request) -> Optional[Dict[str, Any]]:
    """
    Extract and validate user from request headers
    
    Args:
        request: FastAPI request object
        
    Returns:
        Dict containing user information or None if not authenticated
    """
    try:
        # Get authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
            
        # Check if it's a Bearer token
        if not auth_header.startswith('Bearer '):
            return None
            
        token = auth_header.replace('Bearer ', '')
        
        # Try Supabase authentication first
        try:
            user_info = await validate_supabase_token(token)
            logger.info(f"Supabase authentication successful for user: {user_info.get('user_id')}")
            return user_info
        except SupabaseAuthenticationError:
            logger.info("Supabase authentication failed, token may be backend JWT")
            # Fall through to try backend JWT validation
            pass
            
        # Try backend JWT validation (legacy support)
        jwt_secret = os.environ.get('JWT_SECRET')
        if jwt_secret:
            try:
                payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
                logger.info(f"Backend JWT authentication successful for user: {payload.get('user_id')}")
                return {
                    'user_id': payload.get('user_id'),
                    'email': payload.get('email'),
                    'username': payload.get('username'),
                    'authenticated': True,
                    'auth_provider': 'backend_jwt'
                }
            except jwt.ExpiredSignatureError:
                logger.warning("Backend JWT token has expired")
            except jwt.InvalidTokenError as e:
                logger.warning(f"Invalid backend JWT token: {e}")
                
        # If we get here, authentication failed
        return None
        
    except Exception as e:
        logger.error(f"Error extracting user from request: {e}")
        return None

def require_auth(func):
    """
    Decorator to require authentication for endpoints
    
    Usage:
        @require_auth
        async def protected_endpoint(request, user_info):
            # user_info will contain authenticated user data
            pass
    """
    from functools import wraps
    
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Find request object in arguments
        request = None
        for arg in args:
            if hasattr(arg, 'headers') and hasattr(arg, 'client'):
                request = arg
                break
                
        if not request:
            raise SupabaseAuthenticationError("Request object not found")
            
        # Extract user information
        user_info = await extract_user_from_request(request)
        
        if not user_info or not user_info.get('authenticated'):
            raise SupabaseAuthenticationError("Authentication required")
            
        # Add user_info to kwargs
        kwargs['user_info'] = user_info
        
        return await func(*args, **kwargs)
    
    return wrapper

def get_current_user_id(request) -> str:
    """
    Helper function to get current user ID from request
    
    Args:
        request: FastAPI request object
        
    Returns:
        User ID string
        
    Raises:
        SupabaseAuthenticationError: If user not authenticated
    """
    import asyncio
    
    # Run the extraction synchronously
    loop = asyncio.get_event_loop()
    user_info = loop.run_until_complete(extract_user_from_request(request))
    
    if not user_info or not user_info.get('user_id'):
        raise SupabaseAuthenticationError("User not authenticated")
        
    return user_info['user_id']