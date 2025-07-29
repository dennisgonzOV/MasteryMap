#!/bin/bash

# MasteryMap End-to-End Test Runner
# This script runs the comprehensive test suite before and after modularization

set -e

echo "🧪 MasteryMap Test Suite Runner"
echo "==============================="

# Set test environment
export NODE_ENV=test

# Function to run API tests
run_api_tests() {
    echo "🔧 Running API Tests..."
    npx vitest run tests/api --reporter=verbose
}

# Function to run E2E tests
run_e2e_tests() {
    echo "🌐 Running End-to-End Tests..."
    npx playwright test --reporter=html
}

# Function to setup tests
setup_tests() {
    echo "⚙️  Setting up test environment..."
    npx playwright install
    echo "✅ Test environment ready"
}

# Function to run pre-modularization tests
run_pre_modular_tests() {
    echo "📋 Running PRE-MODULARIZATION Test Suite"
    echo "==========================================="
    
    echo "🟦 Phase 1: API Tests"
    run_api_tests
    
    echo "🟦 Phase 2: Browser Tests"
    run_e2e_tests
    
    echo "✅ PRE-MODULARIZATION tests completed successfully!"
    echo "📊 Results saved to: playwright-report/"
}

# Function to run post-modularization tests
run_post_modular_tests() {
    echo "📋 Running POST-MODULARIZATION Test Suite"
    echo "============================================"
    
    echo "🟦 Phase 1: API Tests"
    run_api_tests
    
    echo "🟦 Phase 2: Browser Tests"  
    run_e2e_tests
    
    echo "✅ POST-MODULARIZATION tests completed successfully!"
    echo "🎉 All functionality preserved after modularization!"
}

# Main execution
case "${1:-all}" in
    "setup")
        setup_tests
        ;;
    "api")
        run_api_tests
        ;;
    "e2e")
        run_e2e_tests
        ;;
    "pre")
        run_pre_modular_tests
        ;;
    "post")
        run_post_modular_tests
        ;;
    "all"|"")
        setup_tests
        run_pre_modular_tests
        ;;
    *)
        echo "Usage: $0 [setup|api|e2e|pre|post|all]"
        echo "  setup - Install test dependencies"
        echo "  api   - Run API tests only"
        echo "  e2e   - Run browser tests only"
        echo "  pre   - Run pre-modularization test suite"
        echo "  post  - Run post-modularization test suite"
        echo "  all   - Setup and run all tests (default)"
        exit 1
        ;;
esac