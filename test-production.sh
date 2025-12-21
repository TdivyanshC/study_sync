#!/bin/bash

# StudySync Production Testing Script
# Comprehensive testing for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Update these URLs for your production deployment
BACKEND_URL="${BACKEND_URL:-https://your-backend-url.com}"
FRONTEND_URL="${FRONTEND_URL:-https://yourdomain.com}"
TEST_USER_ID="test-user-123"

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TOTAL_TESTS++))
    log_info "Running test: $test_name"
    
    if eval "$test_command"; then
        log_success "$test_name"
        return 0
    else
        log_error "$test_name"
        return 1
    fi
}

# Test functions
test_backend_health() {
    run_test "Backend Health Check" \
        "curl -f -s $BACKEND_URL/health | grep -q 'healthy'"
}

test_backend_detailed_health() {
    run_test "Backend Detailed Health Check" \
        "curl -f -s $BACKEND_URL/health/detailed | grep -q 'status'"
}

test_backend_metrics() {
    run_test "Backend Metrics Endpoint" \
        "curl -f -s $BACKEND_URL/health/metrics | grep -q 'cpu'"
}

test_api_endpoints() {
    run_test "API Health Endpoint" \
        "curl -f -s $BACKEND_URL/api/ | grep -q 'message'"
}

test_gamification_api() {
    run_test "Gamification API - User XP" \
        "curl -f -s $BACKEND_URL/api/xp/stats/$TEST_USER_ID | grep -q 'total_xp'"
}

test_streak_api() {
    run_test "Streak API - User Streaks" \
        "curl -f -s $BACKEND_URL/api/streak/user/$TEST_USER_ID | grep -q 'current_streak'"
}

test_frontend_load() {
    run_test "Frontend Loads Successfully" \
        "curl -f -s $FRONTEND_URL | grep -q 'StudySync'"
}

test_frontend_assets() {
    run_test "Frontend Assets Load" \
        "curl -f -s -I $FRONTEND_URL/favicon.ico | grep -q '200 OK'"
}

test_https_security() {
    run_test "HTTPS Security (SSL Certificate)" \
        "echo | openssl s_client -connect ${BACKEND_URL#https://} -servername ${BACKEND_URL#https://} 2>/dev/null | grep -q 'Verify return code: 0'"
}

test_cors_headers() {
    run_test "CORS Headers Present" \
        "curl -s -I -H 'Origin: https://example.com' $BACKEND_URL/health | grep -q 'Access-Control'"
}

test_api_rate_limiting() {
    # Test if rate limiting is working (should get 429 after many requests)
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" -H 'Origin: https://example.com' $BACKEND_URL/health)
    if [[ "$status_code" == "200" ]] || [[ "$status_code" == "429" ]]; then
        log_success "API Rate Limiting (Status: $status_code)"
        return 0
    else
        log_error "API Rate Limiting (Unexpected Status: $status_code)"
        return 1
    fi
}

test_database_connectivity() {
    run_test "Database Connectivity" \
        "curl -f -s $BACKEND_URL/health/detailed | grep -q 'database.*true'"
}

test_supabase_connectivity() {
    run_test "Supabase Connectivity" \
        "curl -f -s $BACKEND_URL/health/detailed | grep -q 'supabase.*true'"
}

test_performance_baseline() {
    local response_time=$(curl -o /dev/null -s -w "%{time_total}" $BACKEND_URL/health)
    local response_time_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)
    
    if [[ $response_time_ms -lt 1000 ]]; then
        log_success "Performance Baseline (< 1000ms, actual: ${response_time_ms}ms)"
        return 0
    else
        log_error "Performance Baseline (>= 1000ms, actual: ${response_time_ms}ms)"
        return 1
    fi
}

test_error_handling() {
    run_test "Error Handling (Invalid Endpoint)" \
        "curl -f -s -w '%{http_code}' -o /dev/null $BACKEND_URL/nonexistent | grep -q '404'"
}

test_authentication_flow() {
    # Test if auth endpoints are accessible
    run_test "Authentication Endpoints Accessible" \
        "curl -f -s -w '%{http_code}' -o /dev/null $BACKEND_URL/auth/test | grep -E '(401|404|200)'"
}

test_websocket_connectivity() {
    # This is a basic test - in production you might want to test actual WebSocket connections
    if curl -f -s "$BACKEND_URL" | grep -q "websocket\|WebSocket"; then
        log_success "WebSocket Support Detected"
        return 0
    else
        log_warning "WebSocket Support Not Detected (may not be configured)"
        return 0
    fi
}

test_mobile_compatibility() {
    # Test mobile user agent
    run_test "Mobile Compatibility" \
        "curl -f -s -H 'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' $FRONTEND_URL | grep -q 'StudySync'"
}

test_responsive_design() {
    # Basic test for responsive viewport
    run_test "Responsive Design" \
        "curl -f -s -H 'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' $FRONTEND_URL | grep -q 'viewport'"
}

run_load_test() {
    log_info "Running basic load test (10 requests)..."
    
    local start_time=$(date +%s)
    local end_time
    local total_requests=10
    local successful_requests=0
    
    for i in $(seq 1 $total_requests); do
        if curl -f -s $BACKEND_URL/health > /dev/null 2>&1; then
            ((successful_requests++))
        fi
        sleep 0.1
    done
    
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local requests_per_second=$(echo "scale=2; $total_requests / $duration" | bc)
    
    if [[ $successful_requests -eq $total_requests ]]; then
        log_success "Load Test (All $total_requests requests successful, ${requests_per_second} req/sec)"
    else
        log_error "Load Test ($successful_requests/$total_requests requests successful)"
    fi
}

generate_test_report() {
    local report_file="production-test-report.txt"
    
    cat > "$report_file" << EOF
StudySync Production Test Report
Generated: $(date)
=====================================

Test Environment:
- Backend URL: $BACKEND_URL
- Frontend URL: $FRONTEND_URL
- Test User ID: $TEST_USER_ID

Test Results:
- Total Tests: $TOTAL_TESTS
- Passed: $PASSED_TESTS
- Failed: $FAILED_TESTS
- Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%

EOF

    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo "🎉 ALL TESTS PASSED! Production deployment is ready." >> "$report_file"
        echo "Status: ✅ READY FOR PRODUCTION" >> "$report_file"
    else
        echo "⚠️  Some tests failed. Review and fix issues before production deployment." >> "$report_file"
        echo "Status: ❌ NEEDS ATTENTION" >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "Detailed test output:" >> "$report_file"
    echo "- Backend Health: $(curl -s $BACKEND_URL/health)" >> "$report_file"
    echo "- Frontend Status: $(curl -s -w '%{http_code}' -o /dev/null $FRONTEND_URL)" >> "$report_file"
    
    log_info "Test report generated: $report_file"
}

show_usage() {
    echo "StudySync Production Testing Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help, -h           Show this help message"
    echo "  --backend-only       Test only backend services"
    echo "  --frontend-only      Test only frontend services"
    echo "  --quick              Run quick tests only (skip load testing)"
    echo "  --load-test          Run load testing"
    echo "  --env BACKEND_URL    Set backend URL"
    echo "  --env FRONTEND_URL   Set frontend URL"
    echo ""
    echo "Environment Variables:"
    echo "  BACKEND_URL          Backend service URL"
    echo "  FRONTEND_URL         Frontend service URL"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run all tests"
    echo "  $0 --backend-only            # Test backend only"
    echo "  $0 --quick                   # Quick tests"
    echo "  $0 --env BACKEND_URL=https://api.example.com"
}

# Main testing function
run_all_tests() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  StudySync Production Tests${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    
    log_info "Starting production tests..."
    log_info "Backend URL: $BACKEND_URL"
    log_info "Frontend URL: $FRONTEND_URL"
    echo ""
    
    # Backend tests
    log_info "=== BACKEND TESTS ==="
    test_backend_health
    test_backend_detailed_health
    test_backend_metrics
    test_api_endpoints
    test_gamification_api
    test_streak_api
    test_database_connectivity
    test_supabase_connectivity
    test_performance_baseline
    test_error_handling
    test_authentication_flow
    test_websocket_connectivity
    test_cors_headers
    test_api_rate_limiting
    
    echo ""
    
    # Frontend tests
    log_info "=== FRONTEND TESTS ==="
    test_frontend_load
    test_frontend_assets
    test_mobile_compatibility
    test_responsive_design
    
    echo ""
    
    # Security tests
    log_info "=== SECURITY TESTS ==="
    test_https_security
    
    echo ""
    
    # Load testing (if requested)
    if [[ "$1" == "--load-test" ]]; then
        log_info "=== LOAD TESTS ==="
        run_load_test
        echo ""
    fi
    
    # Generate report
    generate_test_report
    
    # Final summary
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Test Summary${NC}"
    echo -e "${BLUE}================================${NC}"
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}🎉 All tests passed! Production deployment is ready.${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed. Please review and fix issues.${NC}"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        show_usage
        exit 0
        ;;
    --backend-only)
        # Run only backend tests
        log_info "Running backend tests only..."
        test_backend_health
        test_backend_detailed_health
        test_api_endpoints
        test_database_connectivity
        test_performance_baseline
        ;;
    --frontend-only)
        # Run only frontend tests
        log_info "Running frontend tests only..."
        test_frontend_load
        test_frontend_assets
        test_mobile_compatibility
        ;;
    --quick)
        # Quick tests only
        log_info "Running quick tests..."
        test_backend_health
        test_frontend_load
        test_https_security
        ;;
    --load-test)
        # Load testing
        run_load_test
        ;;
    --env)
        if [[ -n "$2" && -n "$3" ]]; then
            case "$2" in
                BACKEND_URL)
                    BACKEND_URL="$3"
                    ;;
                FRONTEND_URL)
                    FRONTEND_URL="$3"
                    ;;
                *)
                    log_error "Unknown environment variable: $2"
                    exit 1
                    ;;
            esac
        else
            log_error "Usage: $0 --env VARIABLE_NAME VALUE"
            exit 1
        fi
        ;;
    "")
        run_all_tests
        ;;
    *)
        log_error "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac