// Simple test to verify project creation with learner outcomes
const testProjectData = {
  title: "Test Project with LO",
  description: "Testing learner outcomes storage",
  learnerOutcomes: [
    {
      outcomeId: 14,
      competencyIds: [21, 22]
    }
  ],
  status: "draft"
};

console.log('Test data:', JSON.stringify(testProjectData, null, 2));

// Test if the data structure matches what we expect
console.log('learnerOutcomes is array:', Array.isArray(testProjectData.learnerOutcomes));
console.log('learnerOutcomes length:', testProjectData.learnerOutcomes.length);
console.log('First outcome:', testProjectData.learnerOutcomes[0]);