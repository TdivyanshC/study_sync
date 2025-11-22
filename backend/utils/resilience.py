"""
Resilience Patterns: Circuit Breaker, Retry Logic, and Graceful Degradation

This module implements resilience patterns to handle failures gracefully
and improve system reliability.
"""

import asyncio
import time
import logging
import functools
from typing import Callable, Any, Optional, Dict
from datetime import datetime, timedelta
from enum import Enum
import random

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """
    Circuit Breaker pattern implementation
    
    Prevents cascading failures by stopping requests to failing services
    and allowing them time to recover.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
        name: str = "circuit_breaker"
    ):
        """
        Initialize circuit breaker
        
        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before attempting recovery
            expected_exception: Exception type to catch
            name: Name for logging
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.name = name
        
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = CircuitState.CLOSED
        self.success_count = 0
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if self.last_failure_time is None:
            return False
        
        time_since_failure = (datetime.now() - self.last_failure_time).total_seconds()
        return time_since_failure >= self.recovery_timeout
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""
        # Check if circuit is open
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                logger.info(f"Circuit breaker {self.name}: Attempting reset (HALF_OPEN)")
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenError(
                    f"Circuit breaker {self.name} is OPEN. "
                    f"Service unavailable. Retry after {self.recovery_timeout}s"
                )
        
        try:
            # Execute the function
            result = func(*args, **kwargs)
            
            # Success - reset failure count
            self.on_success()
            return result
            
        except self.expected_exception as e:
            # Failure - increment failure count
            self.on_failure()
            raise
    
    async def call_async(self, func: Callable, *args, **kwargs) -> Any:
        """Execute async function with circuit breaker protection"""
        # Check if circuit is open
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                logger.info(f"Circuit breaker {self.name}: Attempting reset (HALF_OPEN)")
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenError(
                    f"Circuit breaker {self.name} is OPEN. "
                    f"Service unavailable. Retry after {self.recovery_timeout}s"
                )
        
        try:
            # Execute the async function
            result = await func(*args, **kwargs)
            
            # Success - reset failure count
            self.on_success()
            return result
            
        except self.expected_exception as e:
            # Failure - increment failure count
            self.on_failure()
            raise
    
    def on_success(self):
        """Handle successful execution"""
        if self.state == CircuitState.HALF_OPEN:
            logger.info(f"Circuit breaker {self.name}: Service recovered (CLOSED)")
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            self.success_count = 0
        elif self.state == CircuitState.CLOSED:
            self.failure_count = max(0, self.failure_count - 1)
    
    def on_failure(self):
        """Handle failed execution"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            if self.state != CircuitState.OPEN:
                logger.error(
                    f"Circuit breaker {self.name}: Threshold reached, "
                    f"opening circuit ({self.failure_count} failures)"
                )
                self.state = CircuitState.OPEN
    
    def get_state(self) -> Dict[str, Any]:
        """Get current circuit breaker state"""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "failure_threshold": self.failure_threshold,
            "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "recovery_timeout": self.recovery_timeout
        }
    
    def reset(self):
        """Manually reset the circuit breaker"""
        logger.info(f"Circuit breaker {self.name}: Manual reset")
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None


class CircuitBreakerOpenError(Exception):
    """Exception raised when circuit breaker is open"""
    pass


def circuit_breaker(
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    expected_exception: type = Exception,
    name: Optional[str] = None
):
    """Decorator to apply circuit breaker pattern"""
    def decorator(func: Callable) -> Callable:
        breaker_name = name or func.__name__
        breaker = CircuitBreaker(
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=expected_exception,
            name=breaker_name
        )
        
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await breaker.call_async(func, *args, **kwargs)
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            return breaker.call(func, *args, **kwargs)
        
        # Attach breaker to function for external access
        wrapper = async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
        wrapper.circuit_breaker = breaker
        
        return wrapper
    
    return decorator


class RetryStrategy:
    """Retry strategy with exponential backoff"""
    
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        """
        Initialize retry strategy
        
        Args:
            max_retries: Maximum number of retry attempts
            base_delay: Initial delay in seconds
            max_delay: Maximum delay in seconds
            exponential_base: Base for exponential backoff
            jitter: Add random jitter to prevent thundering herd
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
    
    def get_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt number"""
        # Exponential backoff: base_delay * (exponential_base ^ attempt)
        delay = min(
            self.base_delay * (self.exponential_base ** attempt),
            self.max_delay
        )
        
        # Add jitter to prevent thundering herd
        if self.jitter:
            delay = delay * (0.5 + random.random() * 0.5)
        
        return delay


async def retry_async(
    func: Callable,
    *args,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retry_on: tuple = (Exception,),
    **kwargs
) -> Any:
    """
    Retry async function with exponential backoff
    
    Args:
        func: Async function to retry
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential backoff
        jitter: Add random jitter
        retry_on: Tuple of exceptions to retry on
        
    Returns:
        Function result
        
    Raises:
        Last exception if all retries fail
    """
    strategy = RetryStrategy(max_retries, base_delay, max_delay, exponential_base, jitter)
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            result = await func(*args, **kwargs)
            
            if attempt > 0:
                logger.info(f"Retry succeeded on attempt {attempt + 1}")
            
            return result
            
        except retry_on as e:
            last_exception = e
            
            if attempt < max_retries:
                delay = strategy.get_delay(attempt)
                logger.warning(
                    f"Attempt {attempt + 1} failed: {str(e)}. "
                    f"Retrying in {delay:.2f}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    f"All {max_retries + 1} attempts failed. "
                    f"Last error: {str(e)}"
                )
    
    raise last_exception


def retry_sync(
    func: Callable,
    *args,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retry_on: tuple = (Exception,),
    **kwargs
) -> Any:
    """
    Retry sync function with exponential backoff
    
    Args:
        func: Function to retry
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential backoff
        jitter: Add random jitter
        retry_on: Tuple of exceptions to retry on
        
    Returns:
        Function result
        
    Raises:
        Last exception if all retries fail
    """
    strategy = RetryStrategy(max_retries, base_delay, max_delay, exponential_base, jitter)
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            result = func(*args, **kwargs)
            
            if attempt > 0:
                logger.info(f"Retry succeeded on attempt {attempt + 1}")
            
            return result
            
        except retry_on as e:
            last_exception = e
            
            if attempt < max_retries:
                delay = strategy.get_delay(attempt)
                logger.warning(
                    f"Attempt {attempt + 1} failed: {str(e)}. "
                    f"Retrying in {delay:.2f}s..."
                )
                time.sleep(delay)
            else:
                logger.error(
                    f"All {max_retries + 1} attempts failed. "
                    f"Last error: {str(e)}"
                )
    
    raise last_exception


def with_retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retry_on: tuple = (Exception,)
):
    """Decorator to add retry logic to functions"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await retry_async(
                func, *args,
                max_retries=max_retries,
                base_delay=base_delay,
                max_delay=max_delay,
                exponential_base=exponential_base,
                jitter=jitter,
                retry_on=retry_on,
                **kwargs
            )
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            return retry_sync(
                func, *args,
                max_retries=max_retries,
                base_delay=base_delay,
                max_delay=max_delay,
                exponential_base=exponential_base,
                jitter=jitter,
                retry_on=retry_on,
                **kwargs
            )
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class FallbackHandler:
    """Handle graceful degradation with fallback values"""
    
    def __init__(self):
        self.fallback_values: Dict[str, Any] = {}
    
    def register_fallback(self, key: str, value: Any):
        """Register a fallback value for a key"""
        self.fallback_values[key] = value
        logger.info(f"Registered fallback for {key}")
    
    def get_fallback(self, key: str, default: Any = None) -> Any:
        """Get fallback value for a key"""
        return self.fallback_values.get(key, default)
    
    async def execute_with_fallback(
        self,
        func: Callable,
        fallback_key: str,
        *args,
        **kwargs
    ) -> Any:
        """Execute function with fallback on failure"""
        try:
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)
        except Exception as e:
            logger.warning(
                f"Function {func.__name__} failed: {str(e)}. "
                f"Using fallback value for {fallback_key}"
            )
            return self.get_fallback(fallback_key)


# Global instances
fallback_handler = FallbackHandler()


def with_fallback(fallback_key: str, fallback_value: Any = None):
    """Decorator to add fallback behavior"""
    def decorator(func: Callable) -> Callable:
        # Register fallback value
        if fallback_value is not None:
            fallback_handler.register_fallback(fallback_key, fallback_value)
        
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await fallback_handler.execute_with_fallback(
                func, fallback_key, *args, **kwargs
            )
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.warning(
                    f"Function {func.__name__} failed: {str(e)}. "
                    f"Using fallback value for {fallback_key}"
                )
                return fallback_handler.get_fallback(fallback_key)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class HealthChecker:
    """Monitor service health"""
    
    def __init__(self):
        self.checks: Dict[str, Callable] = {}
        self.last_check_results: Dict[str, Dict[str, Any]] = {}
    
    def register_check(self, name: str, check_func: Callable):
        """Register a health check"""
        self.checks[name] = check_func
        logger.info(f"Registered health check: {name}")
    
    async def run_check(self, name: str) -> Dict[str, Any]:
        """Run a specific health check"""
        if name not in self.checks:
            return {
                "status": "unknown",
                "message": f"Health check '{name}' not found"
            }
        
        check_func = self.checks[name]
        start_time = time.time()
        
        try:
            if asyncio.iscoroutinefunction(check_func):
                result = await check_func()
            else:
                result = check_func()
            
            duration = time.time() - start_time
            
            check_result = {
                "status": "healthy",
                "message": result if isinstance(result, str) else "OK",
                "duration": duration,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            duration = time.time() - start_time
            check_result = {
                "status": "unhealthy",
                "message": str(e),
                "duration": duration,
                "timestamp": datetime.now().isoformat()
            }
        
        self.last_check_results[name] = check_result
        return check_result
    
    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all registered health checks"""
        results = {}
        
        for name in self.checks:
            results[name] = await self.run_check(name)
        
        # Determine overall health
        all_healthy = all(
            result["status"] == "healthy"
            for result in results.values()
        )
        
        return {
            "status": "healthy" if all_healthy else "degraded",
            "checks": results,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_last_results(self) -> Dict[str, Any]:
        """Get last check results"""
        return self.last_check_results


# Global health checker
health_checker = HealthChecker()


if __name__ == "__main__":
    # Example usage
    print("Resilience patterns initialized")
    print(f"Circuit breaker, retry logic, and fallback handlers ready")
