// Test users for integration tests
export const testUsers = {
  admin: {
    email: 'admin@psi.edu',
    password: 'Test123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
  },
  teacher: {
    email: 'teacher@psi.edu', 
    password: 'Test123!',
    firstName: 'Teacher',
    lastName: 'User',
    role: 'teacher' as const,
  },
  student: {
    email: 'student@psi.edu',
    password: 'Test123!',
    firstName: 'Student',
    lastName: 'User', 
    role: 'student' as const,
  },
  student2: {
    email: 'student2@psi.edu',
    password: 'Test123!',
    firstName: 'Student',
    lastName: 'Two',
    role: 'student' as const,
  },
  student3: {
    email: 'student3@psi.edu',
    password: 'Test123!',
    firstName: 'Student', 
    lastName: 'Three',
    role: 'student' as const,
  },
  newTeacher: {
    email: 'sjohnson@psi.edu',
    password: 'SecurePass123!',
    firstName: 'Sarah',
    lastName: 'Johnson',
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