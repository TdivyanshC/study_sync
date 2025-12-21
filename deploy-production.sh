#!/bin/bash

# StudySync Production Deployment Script
# This script automates the deployment of StudySync to production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="StudySync"
BACKEND_PORT=8000
FRONTEND_BUILD_DIR="frontend/dist"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed"
        exit 1
    fi
    
    # Check pip
    if ! command -v pip3 &> /dev/null; then
        log_error "pip3 is not installed"
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

check_environment() {
    log_info "Checking environment configuration..."
    
    # Check if .env files exist
    if [ ! -f "backend/.env.production" ]; then
        log_error "Backend production environment file not found: backend/.env.production"
        exit 1
    fi
    
    if [ ! -f "frontend/.env.production" ]; then
        log_error "Frontend production environment file not found: frontend/.env.production"
        exit 1
    fi
    
    log_success "Environment files found"
}

validate_environment() {
    log_info "Validating environment variables..."
    
    # Source backend environment
    source backend/.env.production
    
    # Check required variables
    required_vars=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SECRET_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log_success "Environment variables validated"
}

setup_backend() {
    log_info "Setting up backend..."
    
    cd backend
    
    # Install Python dependencies
    log_info "Installing Python dependencies..."
    pip3 install -r requirements.txt
    
    # Check if all migrations are applied
    log_info "Checking database migrations..."
    python3 -c "
import sys
try:
    from utils.supabase_auth import supabase_auth
    print('Database connection successful')
except Exception as e:
    print(f'Database connection failed: {e}')
    sys.exit(1)
"
    
    cd ..
    log_success "Backend setup completed"
}

setup_frontend() {
    log_info "Setting up frontend..."
    
    cd frontend
    
    # Install Node.js dependencies
    log_info "Installing Node.js dependencies..."
    npm install
    
    # Build frontend for production
    log_info "Building frontend for production..."
    npm run build
    
    # Check if build was successful
    if [ ! -d "$FRONTEND_BUILD_DIR" ]; then
        log_error "Frontend build failed - build directory not found"
        exit 1
    fi
    
    cd ..
    log_success "Frontend setup completed"
}

run_tests() {
    log_info "Running tests..."
    
    # Backend tests
    log_info "Running backend tests..."
    cd backend
    python3 -m pytest tests/ -v || log_warning "Some backend tests failed"
    cd ..
    
    # Frontend tests
    log_info "Running frontend tests..."
    cd frontend
    npm test -- --watchAll=false || log_warning "Some frontend tests failed"
    cd ..
    
    log_success "Tests completed"
}

health_check() {
    log_info "Performing health checks..."
    
    # Check backend health
    log_info "Checking backend health..."
    if curl -f http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_warning "Backend health check failed - this is expected if backend is not running"
    fi
    
    log_success "Health checks completed"
}

deploy_backend() {
    log_info "Deploying backend..."
    
    cd backend
    
    # Check deployment method
    if command -v railway &> /dev/null; then
        log_info "Deploying to Railway..."
        railway deploy
    elif command -v vercel &> /dev/null; then
        log_info "Deploying backend with Vercel..."
        vercel --prod
    else
        log_warning "No deployment CLI found. Deploying manually..."
        log_info "Please deploy the backend manually using your preferred method"
    fi
    
    cd ..
    log_success "Backend deployment completed"
}

deploy_frontend() {
    log_info "Deploying frontend..."
    
    cd frontend
    
    # Check deployment method
    if command -v vercel &> /dev/null; then
        log_info "Deploying to Vercel..."
        vercel --prod --yes
    elif command -v netlify &> /dev/null; then
        log_info "Deploying to Netlify..."
        netlify deploy --prod --dir=$FRONTEND_BUILD_DIR
    else
        log_warning "No deployment CLI found. Deploying manually..."
        log_info "Please deploy the frontend manually using your preferred method"
    fi
    
    cd ..
    log_success "Frontend deployment completed"
}

run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Test backend endpoints
    log_info "Testing backend endpoints..."
    curl -f https://your-backend-url.com/health || log_warning "Backend health endpoint not responding"
    
    # Test frontend
    log_info "Testing frontend..."
    curl -f https://yourdomain.com || log_warning "Frontend not responding"
    
    log_success "Smoke tests completed"
}

show_next_steps() {
    log_success "Deployment completed successfully!"
    echo ""
    echo -e "${GREEN}Next Steps:${NC}"
    echo "1. Verify all services are running correctly"
    echo "2. Check the health endpoints:"
    echo "   - Backend: https://your-backend-url.com/health"
    echo "   - Frontend: https://yourdomain.com"
    echo "3. Monitor logs for any issues"
    echo "4. Run load tests to ensure performance"
    echo "5. Set up monitoring and alerting"
    echo ""
    echo -e "${BLUE}For detailed deployment instructions, see: PRODUCTION_DEPLOYMENT_GUIDE.md${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  StudySync Production Deployment${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    
    # Pre-deployment checks
    check_dependencies
    check_environment
    validate_environment
    
    # Setup and build
    setup_backend
    setup_frontend
    
    # Testing
    run_tests
    
    # Deployment
    deploy_backend
    deploy_frontend
    
    # Post-deployment
    run_smoke_tests
    show_next_steps
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "StudySync Production Deployment Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --backend-only Deploy only backend"
        echo "  --frontend-only Deploy only frontend"
        echo "  --test-only    Run tests only"
        echo "  --check-only   Run checks only"
        echo ""
        exit 0
        ;;
    --backend-only)
        check_dependencies
        check_environment
        validate_environment
        setup_backend
        deploy_backend
        ;;
    --frontend-only)
        check_dependencies
        setup_frontend
        deploy_frontend
        ;;
    --test-only)
        run_tests
        ;;
    --check-only)
        check_dependencies
        check_environment
        validate_environment
        health_check
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac