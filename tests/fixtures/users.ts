// Test users for integration tests
export const testUsers = {
  admin: {
    username: 'admin',
    password: 'Test123!',
    role: 'admin' as const,
  },
  teacher: {
    username: 'teacher', 
    password: 'Test123!',
    role: 'teacher' as const,
  },
  student: {
    username: 'student',
    password: 'Test123!',
    role: 'student' as const,
  },
  student2: {
    username: 'student2',
    password: 'Test123!',
    role: 'student' as const,
  },
  student3: {
    username: 'student3',
    password: 'Test123!',
    role: 'student' as const,
  },
  newTeacher: {
    username: 'sjohnson',
    password: 'SecurePass123!',
    role: 'teacher' as const,
  }
};

export const testSchool = {
  name: 'PSI High School',
  address: '123 Education Ave',
  city: 'Learning City',
  state: 'CA',
  zipCode: '90210'
};