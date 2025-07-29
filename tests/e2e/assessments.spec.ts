import { test, expect } from '@playwright/test';
import { testUsers, testSchool } from '../fixtures/users';
import { testAssessment } from '../fixtures/projects';

test.describe('Assessment Workflows', () => {
  let teacherPage: any;
  let studentPage: any;
  let shareCode: string;

  test.beforeAll(async ({ browser }) => {
    // Setup teacher and student contexts
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();
    
    teacherPage = await teacherContext.newPage();
    studentPage = await studentContext.newPage();

    // Register and login teacher
    await teacherPage.goto('/register');
    await teacherPage.fill('[name="firstName"]', 'Assessment');
    await teacherPage.fill('[name="lastName"]', 'Teacher');
    await teacherPage.fill('[name="email"]', 'e2e-assessment-teacher@psi.edu');
    await teacherPage.fill('[name="password"]', 'Test123!');
    await teacherPage.selectOption('[name="role"]', 'teacher');
    await teacherPage.selectOption('[name="schoolId"]', { label: testSchool.name });
    await teacherPage.click('button[type="submit"]');

    await teacherPage.goto('/login');
    await teacherPage.fill('[name="email"]', 'e2e-assessment-teacher@psi.edu');
    await teacherPage.fill('[name="password"]', 'Test123!');
    await teacherPage.click('button[type="submit"]');

    // Register and login student
    await studentPage.goto('/register');
    await studentPage.fill('[name="firstName"]', 'Assessment');
    await studentPage.fill('[name="lastName"]', 'Student');
    await studentPage.fill('[name="email"]', 'e2e-assessment-student@psi.edu');
    await studentPage.fill('[name="password"]', 'Test123!');
    await studentPage.selectOption('[name="role"]', 'student');
    await studentPage.selectOption('[name="schoolId"]', { label: testSchool.name });
    await studentPage.click('button[type="submit"]');

    await studentPage.goto('/login');
    await studentPage.fill('[name="email"]', 'e2e-assessment-student@psi.edu');
    await studentPage.fill('[name="password"]', 'Test123!');
    await studentPage.click('button[type="submit"]');
  });

  test.describe('Assessment Creation', () => {
    test('should create assessment with AI questions', async () => {
      await teacherPage.goto('/teacher/assessments');
      
      // Create assessment
      await teacherPage.click('button:has-text("Create Assessment")');
      
      // Fill assessment details
      await teacherPage.fill('[name="title"]', testAssessment.title);
      await teacherPage.fill('[name="description"]', testAssessment.description);
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      await teacherPage.fill('[name="dueDate"]', dueDate.toISOString().split('T')[0]);
      
      // Select component skills
      await teacherPage.click('[data-testid="skill-selector"]');
      await teacherPage.check('text="Evaluate Sources and Evidence"');
      await teacherPage.check('text="Draw Conclusions"');
      
      // Add manual question
      await teacherPage.click('button:has-text("Add Question")');
      await teacherPage.selectOption('[name="questionType"]', 'open-ended');
      await teacherPage.fill('[name="question"]', testAssessment.questions[0].question);
      await teacherPage.fill('[name="points"]', testAssessment.questions[0].points.toString());
      
      // Generate AI questions
      await teacherPage.click('button:has-text("Generate Questions with AI")');
      await teacherPage.waitForSelector('.ai-generated-questions', { timeout: 10000 });
      
      // Review generated questions
      const generatedQuestions = teacherPage.locator('.question-preview');
      await expect(generatedQuestions).toHaveCount({ min: 2, max: 5 });
      
      // Edit one question
      await generatedQuestions.first().locator('button:has-text("Edit")').click();
      await teacherPage.fill('[data-testid="edit-question"]', 'Edited AI question for clarity');
      await teacherPage.click('button:has-text("Save")');
      
      // Create assessment
      await teacherPage.click('button:has-text("Create Assessment")');
      
      // Should show share code
      await expect(teacherPage.locator('[data-testid="share-code"]')).toBeVisible();
      const shareCodeElement = teacherPage.locator('[data-testid="share-code"]');
      shareCode = await shareCodeElement.textContent();
      
      expect(shareCode).toMatch(/^[A-Z]{5}$/);
      
      // Should appear in assessments list
      await teacherPage.goto('/teacher/assessments');
      await expect(teacherPage.locator('.assessment-card')).toContainText(testAssessment.title);
      await expect(teacherPage.locator('.share-code')).toContainText(shareCode!);
    });

    test('should copy share code', async () => {
      await teacherPage.goto('/teacher/assessments');
      
      // Find the assessment and copy code
      await teacherPage.click('.assessment-card:has-text("' + testAssessment.title + '") button:has-text("Copy Code")');
      
      // Should show success toast
      await expect(teacherPage.locator('.toast')).toContainText('Code copied');
    });
  });

  test.describe('Student Assessment Access', () => {
    test('should join assessment via code', async () => {
      await studentPage.goto('/student/dashboard');
      
      // Click Join Assessment card
      await studentPage.click('[data-testid="join-assessment-card"]');
      
      // Enter assessment code
      await studentPage.fill('[name="assessmentCode"]', shareCode);
      await studentPage.click('button:has-text("Join")');
      
      // Should open assessment
      await expect(studentPage.locator('h1')).toContainText(testAssessment.title);
      await expect(studentPage.locator('.assessment-description')).toContainText(testAssessment.description);
      await expect(studentPage.locator('.question-navigation')).toBeVisible();
    });

    test('should reject invalid code', async () => {
      await studentPage.goto('/student/enter-code');
      
      await studentPage.fill('[name="assessmentCode"]', 'ZZZZZ');
      await studentPage.click('button:has-text("Join")');
      
      await expect(studentPage.locator('.error-message')).toContainText('Assessment not found');
    });
  });

  test.describe('Assessment Taking', () => {
    test('should complete multi-question assessment', async () => {
      // Access assessment via code (from previous test)
      await studentPage.goto('/student/enter-code');
      await studentPage.fill('[name="assessmentCode"]', shareCode);
      await studentPage.click('button:has-text("Join")');
      
      // Start assessment
      await studentPage.click('button:has-text("Start Assessment")');
      
      // Answer first question (open-ended)
      await studentPage.fill('[data-testid="question-answer"]', 
        'The greenhouse effect is a natural process where certain gases in the atmosphere trap heat from the sun, keeping Earth warm enough to support life. Without it, Earth would be too cold to sustain most current life forms.');
      
      // Navigate to next question
      await studentPage.click('button:has-text("Next Question")');
      
      // Check progress bar
      const progressBar = studentPage.locator('[data-testid="progress-bar"]');
      const progressValue = await progressBar.getAttribute('value');
      expect(parseInt(progressValue!)).toBeGreaterThan(0);
      
      // Answer multiple choice question
      await studentPage.check('[data-testid="option-2"]'); // Water vapor
      
      // Navigate back to review
      await studentPage.click('button:has-text("Previous")');
      
      // Make minor edit to first answer
      const answerField = studentPage.locator('[data-testid="question-answer"]');
      await answerField.fill(await answerField.inputValue() + ' This process is essential for life on Earth.');
      
      // Navigate through all questions
      await studentPage.click('button:has-text("Next Question")');
      
      // Continue to end of assessment
      while (await studentPage.locator('button:has-text("Next Question")').isVisible()) {
        await studentPage.click('button:has-text("Next Question")');
        
        // Answer any additional questions
        if (await studentPage.locator('[data-testid="question-answer"]').isVisible()) {
          await studentPage.fill('[data-testid="question-answer"]', 'Sample answer for this question.');
        }
        if (await studentPage.locator('[data-testid="option-0"]').isVisible()) {
          await studentPage.check('[data-testid="option-0"]');
        }
      }
      
      // Review answers
      await studentPage.click('button:has-text("Review Answers")');
      
      // Should show summary page
      await expect(studentPage.locator('.answer-summary')).toBeVisible();
      
      // Submit assessment
      await studentPage.click('button:has-text("Submit Assessment")');
      
      // Confirm submission
      await studentPage.click('button:has-text("Confirm")');
      
      // Should show success message
      await expect(studentPage.locator('.success-message')).toContainText('submitted successfully');
      
      // Should not be able to re-access assessment
      await studentPage.goto('/student/enter-code');
      await studentPage.fill('[name="assessmentCode"]', shareCode);
      await studentPage.click('button:has-text("Join")');
      
      await expect(studentPage.locator('.error-message')).toContainText('already submitted');
    });
  });

  test.describe('Grading Workflow', () => {
    test('should grade submission with AI feedback', async () => {
      await teacherPage.goto('/teacher/assessments');
      
      // Click on assessment
      await teacherPage.click('.assessment-card:has-text("' + testAssessment.title + '")');
      
      // View submissions
      await teacherPage.click('button:has-text("View Submissions")');
      
      // Should show submission count
      await expect(teacherPage.locator('.submissions-count')).toContainText('1');
      
      // Click on first submission
      await teacherPage.click('.submission-row:first-child');
      
      // Grade open-ended question
      const openEndedSection = teacherPage.locator('[data-testid="question-0"]');
      await openEndedSection.locator('button:has-text("Proficient")').click();
      
      // Generate AI feedback
      await openEndedSection.locator('button:has-text("Generate AI Feedback")').click();
      await teacherPage.waitForSelector('[data-testid="ai-feedback"]', { timeout: 10000 });
      
      // Should show AI feedback
      const aiFeedback = await openEndedSection.locator('[data-testid="ai-feedback"]').textContent();
      expect(aiFeedback!.length).toBeGreaterThan(20);
      
      // Edit feedback
      await openEndedSection.locator('textarea[data-testid="feedback-edit"]').fill(
        aiFeedback + ' Great understanding demonstrated!'
      );
      
      // Grade multiple choice (should be auto-graded)
      const mcSection = teacherPage.locator('[data-testid="question-1"]');
      await expect(mcSection.locator('.auto-graded')).toBeVisible();
      
      // Add overall feedback
      await teacherPage.fill('[data-testid="overall-feedback"]', 
        'Excellent work on this assessment. Your understanding of climate science concepts is strong.');
      
      // Save and next
      await teacherPage.click('button:has-text("Save & Next")');
      
      // Should return to submissions list
      await expect(teacherPage.locator('.submission-row:first-child .status')).toContainText('Graded');
    });

    test('should allow student to view grades', async () => {
      await studentPage.goto('/student/dashboard');
      
      // Should see graded assessment
      await expect(studentPage.locator('.assessment-status')).toContainText('Graded');
      
      // Click to view results
      await studentPage.click('button:has-text("View Results")');
      
      // Should show overall score
      await expect(studentPage.locator('.overall-score')).toBeVisible();
      
      // Should show question feedback
      await expect(studentPage.locator('.question-feedback')).toContainText('Great understanding');
      
      // Should show rubric levels
      await expect(studentPage.locator('.rubric-level')).toContainText('Proficient');
      
      // Should not allow editing answers
      await expect(studentPage.locator('[data-testid="question-answer"]')).toHaveAttribute('readonly');
    });
  });
});