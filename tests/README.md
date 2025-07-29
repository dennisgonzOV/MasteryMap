# MasteryMap End-to-End Test Suite

This comprehensive test suite validates all functionality before and after the modularization process to ensure no features are broken during the architectural refactoring.

## Test Structure

### API Tests (`tests/api/`)
- **auth.test.ts**: Authentication, registration, login, token validation
- **projects.test.ts**: Project creation, team management, AI milestone generation
- **assessments.test.ts**: Assessment creation, sharing codes, submissions, grading
- **portfolio.test.ts**: Digital portfolio, QR codes, public access

### End-to-End Tests (`tests/e2e/`)
- **auth.spec.ts**: Complete authentication workflows in browser
- **projects.spec.ts**: Project management UI workflows
- **assessments.spec.ts**: Assessment creation and student taking workflows
- **portfolio.spec.ts**: Portfolio generation and sharing
- **analytics.spec.ts**: Analytics dashboards and reporting
- **mobile.spec.ts**: Mobile responsiveness and touch interactions

## Running Tests

### Quick Start
```bash
# Install test dependencies
./scripts/run-tests.sh setup

# Run all tests (pre-modularization)
./scripts/run-tests.sh pre

# After modularization, verify functionality
./scripts/run-tests.sh post
```

### Individual Test Suites
```bash
# API tests only
./scripts/run-tests.sh api

# Browser tests only  
./scripts/run-tests.sh e2e

# Interactive E2E tests with UI
npx playwright test --ui
```

## Test Coverage

### Core Features Tested
✅ **Authentication System**
- User registration with school selection
- Login/logout workflows
- Role-based access control
- Session management and token validation

✅ **Project Management**
- Project creation with component skill selection
- AI milestone generation with date validation
- Team creation and member management
- Student project assignment and access

✅ **Assessment System**
- Standalone assessment creation
- 5-letter share code generation and access
- AI question generation and manual question creation
- Multi-question assessment taking with navigation
- Auto-grading of multiple choice questions

✅ **Grading & Feedback**
- XQ rubric-based grading (Emerging → Developing → Proficient → Applying)
- AI-generated personalized feedback
- Teacher grading interface with AI assistance
- Student grade and feedback viewing

✅ **Digital Portfolio**
- Automatic artifact collection from completed assessments
- QR code generation for public sharing
- Public portfolio access without authentication
- Credential display with achievement tracking

✅ **Analytics & Reporting**
- Teacher analytics dashboard with component skills progress
- Admin system-wide metrics and reporting
- Data export functionality (CSV)
- Interactive charts and filtering

✅ **Mobile Responsiveness**
- Mobile-optimized navigation and interfaces
- Touch-friendly assessment taking
- Responsive portfolio viewing
- Mobile keyboard and interaction handling

### Browser Compatibility
- Chrome (latest)
- Firefox (latest) 
- Safari/WebKit (latest)
- Mobile Chrome (iOS/Android simulation)

### Performance Benchmarks
- Initial page load: < 3 seconds
- Authentication: < 2 seconds
- AI generation: < 5 seconds
- Database operations: < 2 seconds

## Pre/Post Modularization Testing

### Before Modularization
1. Run complete test suite: `./scripts/run-tests.sh pre`
2. Document any failures in baseline
3. Save test results for comparison

### After Modularization
1. Run identical test suite: `./scripts/run-tests.sh post`
2. Compare results with pre-modularization baseline
3. Verify all functionality preserved
4. Document any regressions for immediate fix

## Test Environment

### Database
- Uses same PostgreSQL database as development
- Tests create isolated test data with unique emails
- No test data cleanup (preserves for debugging)

### Authentication
- Creates temporary test users for each test scenario
- Uses real JWT token validation
- Tests actual password hashing and verification

### AI Integration
- Tests against real OpenAI API (requires OPENAI_API_KEY)
- Validates actual AI responses and generation quality
- Includes proper error handling for API failures

### File Structure
```
tests/
├── api/                    # Backend API tests
│   ├── auth.test.ts
│   ├── projects.test.ts
│   ├── assessments.test.ts
│   └── portfolio.test.ts
├── e2e/                    # Browser automation tests
│   ├── auth.spec.ts
│   ├── projects.spec.ts
│   ├── assessments.spec.ts
│   ├── portfolio.spec.ts
│   ├── analytics.spec.ts
│   └── mobile.spec.ts
├── fixtures/               # Test data and utilities
│   ├── users.ts
│   └── projects.ts
├── setup.ts               # Test environment setup
└── README.md              # This file
```

## Integration with Modularization

This test suite serves as a safety net during the modularization process:

1. **Regression Prevention**: Ensures no functionality breaks during refactoring
2. **API Compatibility**: Validates that domain-separated APIs maintain same interface
3. **UI Consistency**: Confirms user interface continues working with new backend
4. **Performance Validation**: Ensures modularization doesn't impact performance
5. **Cross-browser Compatibility**: Maintains compatibility across all supported browsers

## Debugging Failed Tests

### Common Issues
- **Database Connection**: Ensure DATABASE_URL is configured
- **OpenAI API**: Verify OPENAI_API_KEY is set and valid
- **Port Conflicts**: Ensure port 5000 is available for test server
- **Browser Dependencies**: Run `npx playwright install-deps` if needed

### Debugging Commands
```bash
# Run specific test file
npx vitest tests/api/auth.test.ts

# Run E2E tests in headed mode (visible browser)
npx playwright test --headed

# Debug specific E2E test
npx playwright test tests/e2e/auth.spec.ts --debug

# Generate test report
npx playwright show-report
```

This comprehensive test suite ensures the modularization can proceed with confidence, knowing that all critical functionality will be preserved throughout the architectural transformation.