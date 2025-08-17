// Test project data for integration tests
export const testProject = {
  title: 'Climate Change Solutions Research',
  description: 'Students will research and propose innovative solutions to combat climate change',
  componentSkillIds: [44, 45, 50], // Critical thinking skills from XQ framework
  status: 'active' as const,
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
};

export const testAssessment = {
  title: 'Climate Science Quiz',
  description: 'Test your understanding of climate science basics',
  componentSkillIds: [44, 45], // Evaluate Sources and Evidence, Draw Conclusions
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  questions: [
    {
      type: 'open-ended' as const,
      question: 'Explain the greenhouse effect in your own words',
      points: 10,
    },
    {
      type: 'multiple-choice' as const,
      question: 'Which greenhouse gas is most abundant in the atmosphere?',
      options: ['Carbon dioxide', 'Methane', 'Water vapor', 'Nitrous oxide'],
      correctAnswer: 2, // Water vapor
      points: 5,
    }
  ]
};

export const testTeams = [
  {
    name: 'Green Innovators',
    members: ['student', 'student2']
  },
  {
    name: 'Eco Warriors', 
    members: ['student3']
  }
];