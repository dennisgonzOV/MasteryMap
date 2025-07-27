# MasteryMap - High-Level Integration Tests

This document provides comprehensive end-to-end integration tests that simulate real user interactions through the MasteryMap educational platform. These tests validate complete user workflows and feature integrations rather than individual components.

---

## Test Environment Setup

### Prerequisites
- **Database**: PostgreSQL with Neon Database connection
- **Test Users**: Create accounts for each role
  - Admin: `admin@psi.edu` / `Test123!`
  - Teacher: `teacher@psi.edu` / `Test123!`
  - Student: `student@psi.edu` / `Test123!`
  - Additional Students: `student2@psi.edu`, `student3@psi.edu` (for team testing)
- **School**: PSI High School (default school in system)
- **Environment Variables**: 
  - `OPENAI_API_KEY` configured for AI features
  - `DATABASE_URL` connected to test database

### Browser Requirements
- Modern browsers: Chrome, Firefox, Safari, Edge
- JavaScript enabled
- Cookies enabled for session management

---

## 1. Authentication & Registration Workflows

### Test 1.1: New Teacher Registration
**Scenario**: A new teacher joins the school and creates an account

**User Actions**:
1. Open browser to application homepage
2. Click "Get Started" or navigate to `/register`
3. Fill registration form:
   - Name: "Sarah Johnson"
   - Email: "sjohnson@psi.edu"
   - Password: "SecurePass123!"
   - Role: Select "Teacher"
   - School: Select "PSI High School"
4. Click "Register" button
5. After successful registration, enter credentials on login page
6. Click "Login" button

**Expected Results**:
- ✅ Registration form validates email format and password strength
- ✅ User redirected to login page with success message
- ✅ Login successful with new credentials
- ✅ Teacher dashboard displays with welcome message
- ✅ Navigation shows "Teacher Dashboard" and user name
- ✅ User associated with PSI High School in database

### Test 1.2: Student Registration and First Login
**Scenario**: A new student registers and accesses their dashboard

**User Actions**:
1. Navigate to `/register`
2. Complete registration as student role
3. Login with new credentials
4. Explore student dashboard

**Expected Results**:
- ✅ Student dashboard shows "Join Assessment" card prominently
- ✅ Empty project list with message "No projects assigned yet"
- ✅ Portfolio section accessible but empty
- ✅ Student role restrictions enforced (no create project button)

---

## 2. Project Management Workflows

### Test 2.1: Create Project with AI-Generated Milestones
**Scenario**: Teacher creates a comprehensive project with XQ competencies

**User Actions**:
1. Login as teacher
2. Click "Projects" in navigation
3. Click "Create New Project" button
4. Fill project details:
   - Title: "Climate Change Solutions Research"
   - Description: "Students will research and propose innovative solutions to combat climate change"
   - Start Date: Today
   - Due Date: 30 days from today
5. Expand "Critical Thinking" competency
6. Check these component skills:
   - "Evaluate Sources and Evidence"
   - "Draw Conclusions"
7. Expand "Communication" competency
8. Check "Present Complex Information"
9. Enable "Generate milestones and assessments with AI"
10. Click "Create Project"
11. Wait for AI generation (loading spinner)
12. Review generated milestones
13. Click "Confirm and Create"

**Expected Results**:
- ✅ Component skills selection tree displays all 80 XQ skills
- ✅ AI generates 3-5 milestones with appropriate dates
- ✅ Each milestone has descriptive title and requirements
- ✅ Milestone dates fall between project start and due dates
- ✅ Project appears in teacher's project list
- ✅ Project status shows as "Active"

### Test 2.2: Create and Manage Project Teams
**Scenario**: Teacher creates teams and assigns students to project

**User Actions**:
1. From project list, click on "Climate Change Solutions Research"
2. Click "Manage Project" button
3. In team management section, click "Create Team"
4. Enter team name: "Green Innovators"
5. From available students list, select:
   - student@psi.edu
   - student2@psi.edu
6. Click "Add to Team"
7. Click "Create Team"
8. Create second team "Eco Warriors" with student3@psi.edu
9. Click "Edit Team" on "Green Innovators"
10. Remove student2@psi.edu
11. Add student3@psi.edu
12. Save changes

**Expected Results**:
- ✅ Student roster shows only students from PSI High School
- ✅ Teams created successfully with selected members
- ✅ Team member counts update correctly
- ✅ All team members receive project assignment notifications
- ✅ Students can see project in their dashboards
- ✅ Milestones automatically assigned to all team members

---

## 3. Assessment Creation and Sharing

### Test 3.1: Create Standalone Assessment with AI Questions
**Scenario**: Teacher creates an assessment with 5-letter share code

**User Actions**:
1. Navigate to "Assessments" page
2. Click "Create Assessment"
3. Fill assessment details:
   - Title: "Climate Science Quiz"
   - Description: "Test your understanding of climate science basics"
   - Due Date: 7 days from today
4. Select component skills:
   - "Evaluate Sources and Evidence"
   - "Draw Conclusions"
5. Manually add question:
   - Type: "Open-ended"
   - Question: "Explain the greenhouse effect in your own words"
   - Points: 10
6. Click "Generate Questions with AI"
7. Review 3-4 generated questions
8. Edit one AI question for clarity
9. Click "Create Assessment"
10. Note the 5-letter code displayed (e.g., "KLMNO")

**Expected Results**:
- ✅ AI generates relevant questions based on selected skills
- ✅ Questions include mix of types (multiple choice, short answer)
- ✅ 5-letter code displays prominently in green box
- ✅ Code format is exactly 5 uppercase letters
- ✅ Assessment appears in list with share code visible
- ✅ "Copy Code" button works correctly

### Test 3.2: Student Joins Assessment via Code
**Scenario**: Student uses 5-letter code to access assessment

**User Actions**:
1. Login as student
2. On dashboard, click "Join Assessment" card
3. Enter code "KLMNO" (from Test 3.1)
4. Click "Join"
5. Start assessment

**Expected Results**:
- ✅ Code entry page has clear instructions
- ✅ Invalid code shows error "Assessment not found"
- ✅ Valid code immediately opens assessment
- ✅ Assessment title and description display
- ✅ Question navigation shows total questions
- ✅ Timer starts if assessment has time limit

---

## 4. Assessment Taking Workflow

### Test 4.1: Complete Multi-Question Assessment
**Scenario**: Student completes assessment with various question types

**User Actions**:
1. Continue from Test 3.2 (assessment open)
2. Read first question (open-ended)
3. Type detailed answer about greenhouse effect
4. Click "Next Question"
5. Answer multiple choice question
6. Click "Previous" to review first answer
7. Make minor edit to answer
8. Click "Next" twice to reach third question
9. Complete all questions
10. On final question, click "Review Answers"
11. Review summary page
12. Click "Submit Assessment"
13. Confirm submission in modal

**Expected Results**:
- ✅ Progress bar updates with each question (25%, 50%, 75%, 100%)
- ✅ Previous/Next navigation works correctly
- ✅ Answers persist when navigating between questions
- ✅ Review page shows all questions with answers
- ✅ Submit confirmation prevents accidental submission
- ✅ Success message displays after submission
- ✅ Cannot re-access assessment after submission

---

## 5. Grading and Feedback Workflow

### Test 5.1: Grade Submissions with AI Feedback
**Scenario**: Teacher grades student work using XQ rubrics and AI assistance

**User Actions**:
1. Login as teacher
2. Navigate to "Assessments"
3. Click on "Climate Science Quiz"
4. Click "View Submissions" (shows count)
5. Click on first student submission
6. For open-ended question:
   - Read student answer
   - Click rubric level "Proficient"
   - Click "Generate AI Feedback"
   - Review generated feedback
   - Edit to add personal comment
7. For multiple choice: verify auto-graded
8. Add overall feedback comment
9. Click "Save & Next"
10. Grade remaining submissions
11. Return to submissions list

**Expected Results**:
- ✅ Submission list shows all students who completed
- ✅ Grading interface displays question and student answer
- ✅ XQ rubric levels clearly labeled (Emerging → Developing → Proficient → Applying)
- ✅ AI feedback is specific to student's answer
- ✅ Points automatically calculated based on rubric
- ✅ Save & Next efficiently moves through submissions
- ✅ Submissions list shows graded status

### Test 5.2: Student Views Grades and Feedback
**Scenario**: Student reviews their graded assessment

**User Actions**:
1. Login as student
2. Navigate to "My Assessments"
3. Find "Climate Science Quiz" marked as "Graded"
4. Click "View Results"
5. Review each question's feedback
6. Check total score and rubric levels

**Expected Results**:
- ✅ Overall score displays prominently
- ✅ Each question shows points earned
- ✅ Rubric level visible for each question
- ✅ Teacher feedback displays clearly
- ✅ Correct/incorrect indicators on multiple choice
- ✅ Can view but not edit answers

---

## 6. Project Progress and Milestone Tracking

### Test 6.1: Student Views Project Timeline
**Scenario**: Student tracks project progress and milestones

**User Actions**:
1. Login as student (assigned to project)
2. Click "Projects" in navigation
3. Click on "Climate Change Solutions Research"
4. View project overview with timeline
5. Click on first milestone
6. Check milestone requirements
7. Click "View Assessments" for milestone
8. Return to project page
9. Check team members list

**Expected Results**:
- ✅ Project page shows visual timeline
- ✅ Milestones display with due dates
- ✅ Progress indicators show completion status
- ✅ Current milestone highlighted
- ✅ Team members listed with avatars
- ✅ Milestone details show required assessments
- ✅ Completed milestones show checkmarks

---

## 7. Digital Portfolio Management

### Test 7.1: Portfolio Generation and QR Sharing
**Scenario**: Student's portfolio updates automatically and shares publicly

**User Actions**:
1. Login as student with completed assessments
2. Navigate to "Portfolio"
3. View artifacts section
4. Check credentials earned
5. Observe QR code displayed
6. Click "Copy Portfolio Link"
7. Open link in incognito/private browser
8. Scan QR code with mobile device

**Expected Results**:
- ✅ Portfolio shows all completed assessments as artifacts
- ✅ Graded assessments appear with scores
- ✅ Earned credentials (badges/stickers) display
- ✅ QR code generates automatically
- ✅ Public link works without authentication
- ✅ Mobile QR scan opens portfolio
- ✅ Public view is read-only
- ✅ Layout responsive on mobile

---

## 8. Credential and Achievement System

### Test 8.1: Earn Credentials Through Performance
**Scenario**: Student earns credentials based on assessment performance

**User Actions**:
1. Complete assessment with high scores (Proficient/Applying)
2. Teacher grades with high rubric levels
3. Student checks notifications
4. Navigate to portfolio
5. View new credential
6. Click credential for details

**Expected Results**:
- ✅ Notification appears for credential earned
- ✅ Credential shows in portfolio
- ✅ Credential type matches performance (Sticker/Badge/Plaque)
- ✅ Credential linked to specific competency
- ✅ Award date recorded
- ✅ Credential appears in public portfolio

---

## 9. Analytics and Reporting

### Test 9.1: Teacher Analytics Dashboard
**Scenario**: Teacher reviews class progress and performance

**User Actions**:
1. Login as teacher
2. Navigate to "Analytics"
3. View class overview metrics
4. Click "Component Skills Progress"
5. Filter by specific competency
6. View individual student progress
7. Click "Export Data"
8. Download CSV report

**Expected Results**:
- ✅ Dashboard shows key metrics (students, projects, assessments)
- ✅ Progress charts display correctly
- ✅ Skill mastery levels show distribution
- ✅ Individual student data accessible
- ✅ Filters work correctly
- ✅ CSV export includes all visible data
- ✅ Charts are interactive and responsive

### Test 9.2: Admin System-Wide Analytics
**Scenario**: Admin reviews school-wide performance metrics

**User Actions**:
1. Login as admin
2. Access admin dashboard
3. View system statistics
4. Check user growth trends
5. Review assessment completion rates
6. Export comprehensive report

**Expected Results**:
- ✅ Total users by role displayed
- ✅ Active projects count accurate
- ✅ Assessment metrics calculate correctly
- ✅ Trend graphs show historical data
- ✅ School-level filtering works
- ✅ Export includes all analytics data

---

## 10. Error Handling and Edge Cases

### Test 10.1: Invalid Assessment Code
**Scenario**: Student enters wrong or expired code

**User Actions**:
1. As student, click "Join Assessment"
2. Enter invalid code "ZZZZZ"
3. Try expired code (if available)
4. Enter code with lowercase "abcde"

**Expected Results**:
- ✅ Clear error: "Invalid assessment code"
- ✅ Error for expired: "This assessment code has expired"
- ✅ System accepts uppercase or lowercase
- ✅ Can retry without page refresh
- ✅ No system errors or crashes

### Test 10.2: Concurrent Access Handling
**Scenario**: Multiple users access same resources

**User Actions**:
1. Teacher1 opens project for editing
2. Teacher2 tries to edit same project
3. Multiple students submit assessment simultaneously
4. Teacher grades while student checks results

**Expected Results**:
- ✅ Last save wins without data corruption
- ✅ All submissions recorded correctly
- ✅ No lost data or system errors
- ✅ Real-time updates where applicable

---

## 11. Mobile Responsiveness

### Test 11.1: Mobile Student Experience
**Scenario**: Student completes assessment on mobile device

**User Actions**:
1. Open application on mobile browser
2. Login as student
3. Enter assessment code
4. Complete assessment on mobile
5. View portfolio on mobile

**Expected Results**:
- ✅ Login form adapts to mobile screen
- ✅ Navigation becomes mobile menu
- ✅ Assessment questions readable
- ✅ Answer inputs work on mobile
- ✅ Submit button easily accessible
- ✅ Portfolio QR code sized appropriately

---

## 12. Performance Benchmarks

### Test 12.1: Load Time Validation
**Scenario**: Verify acceptable performance across features

**Measurements**:
- Initial page load: < 3 seconds
- Login authentication: < 2 seconds
- Dashboard rendering: < 2 seconds
- AI milestone generation: < 5 seconds
- Assessment loading: < 2 seconds
- Analytics calculation: < 3 seconds
- Portfolio generation: < 2 seconds

### Test 12.2: Stress Testing
**Scenario**: System handles multiple concurrent users

**Setup**:
- 50 concurrent student logins
- 20 simultaneous assessment submissions
- 10 teachers grading simultaneously
- 5 AI generation requests

**Expected Results**:
- ✅ All operations complete successfully
- ✅ No timeout errors
- ✅ Response times remain acceptable
- ✅ Database connections stable

---

## 13. Cross-Browser Compatibility

### Test 13.1: Browser Feature Matrix
**Browsers to Test**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Features to Verify**:
- ✅ Authentication flow
- ✅ Component skill selection tree
- ✅ Assessment taking interface
- ✅ Grading rubric interface
- ✅ QR code generation
- ✅ File uploads (if applicable)
- ✅ Analytics charts
- ✅ Mobile responsive design

---

## 14. Accessibility Compliance

### Test 14.1: Keyboard Navigation
**Scenario**: Navigate application without mouse

**User Actions**:
1. Use Tab key to navigate
2. Use Enter to activate buttons
3. Use Space for checkboxes
4. Use Arrow keys in dropdowns
5. Use Escape to close modals

**Expected Results**:
- ✅ All interactive elements reachable
- ✅ Focus indicators visible
- ✅ Logical tab order
- ✅ Skip links available
- ✅ Modal focus trapped correctly

### Test 14.2: Screen Reader Testing
**Scenario**: Use with screen reader software

**Tools**: NVDA, JAWS, or VoiceOver

**Expected Results**:
- ✅ All content announced properly
- ✅ Form labels read correctly
- ✅ Error messages announced
- ✅ Navigation landmarks present
- ✅ Dynamic content updates announced

---

## Test Execution Log

| Test ID | Test Name | Priority | Last Executed | Status | Issues Found | Notes |
|---------|-----------|----------|---------------|---------|--------------|-------|
| 1.1 | Teacher Registration | High | - | ⏳ | - | - |
| 1.2 | Student Registration | High | - | ⏳ | - | - |
| 2.1 | Project Creation | High | - | ⏳ | - | - |
| 2.2 | Team Management | High | - | ⏳ | - | - |
| 3.1 | Assessment Creation | High | - | ⏳ | - | - |
| 3.2 | Join via Code | High | - | ⏳ | - | - |
| 4.1 | Take Assessment | High | - | ⏳ | - | - |
| 5.1 | Grade with AI | High | - | ⏳ | - | - |
| 5.2 | View Grades | High | - | ⏳ | - | - |
| 6.1 | Project Timeline | Medium | - | ⏳ | - | - |
| 7.1 | Portfolio & QR | High | - | ⏳ | - | - |
| 8.1 | Earn Credentials | Medium | - | ⏳ | - | - |
| 9.1 | Teacher Analytics | Medium | - | ⏳ | - | - |
| 9.2 | Admin Analytics | Medium | - | ⏳ | - | - |
| 10.1 | Error Handling | High | - | ⏳ | - | - |
| 10.2 | Concurrent Access | High | - | ⏳ | - | - |
| 11.1 | Mobile Experience | High | - | ⏳ | - | - |
| 12.1 | Performance | Medium | - | ⏳ | - | - |
| 13.1 | Cross-Browser | Medium | - | ⏳ | - | - |
| 14.1 | Accessibility | High | - | ⏳ | - | - |

**Status Legend**:
- ⏳ Pending
- ✅ Passed
- ❌ Failed
- ⚠️ Passed with Issues
- 🔄 In Progress

---

## Automation Recommendations

### Tools for Future Automation:
1. **Cypress** - Modern E2E testing with great debugging
2. **Playwright** - Cross-browser automation by Microsoft
3. **Selenium Grid** - For parallel cross-browser testing
4. **Jest + Testing Library** - For React component integration
5. **k6** or **JMeter** - For performance testing
6. **axe-core** - For automated accessibility testing

### Priority Automation Targets:
1. Authentication flows (high reuse)
2. Assessment code entry (critical feature)
3. Basic CRUD operations
4. Smoke tests for each role

---

## Issue Reporting Template

When issues are found during testing:

```
Issue ID: [TEST-ID]-[NUMBER]
Test Case: [Test name and ID]
Severity: Critical/High/Medium/Low
Environment: [Browser, OS, User Role]

Steps to Reproduce:
1. [Detailed steps]
2. [Include test data used]

Expected Result:
[What should happen]

Actual Result:
[What actually happened]

Screenshots/Logs:
[Attach if applicable]

Additional Notes:
[Any relevant context]
```

---

*Document Version: 2.0*
*Last Updated: July 27, 2025*
*Next Review: Monthly or after major releases*

## Notes for Testers

- Always test with realistic data volumes
- Test both happy paths and edge cases
- Verify error messages are user-friendly
- Check for console errors during testing
- Test with slow network conditions
- Validate accessibility with each new feature
- Document any workarounds discovered