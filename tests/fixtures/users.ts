// Test users for integration tests
export const testUsers = {
  admin: {
    username: 'admin',
    password: 'Test123!',
    role: 'admin' as const,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    schoolName: 'Test School',
  },
  teacher: {
    username: 'teacher',
    password: 'Test123!',
    role: 'teacher' as const,
    firstName: 'Teacher',
    lastName: 'One',
    email: 'teacher@test.com',
    schoolName: 'Test School',
  },
  student: {
    username: 'student',
    password: 'Test123!',
    role: 'student' as const,
    firstName: 'Student',
    lastName: 'One',
    email: 'student@test.com',
    schoolName: 'Test School',
  },
  student2: {
    username: 'student2',
    password: 'Test123!',
    role: 'student' as const,
    firstName: 'Student',
    lastName: 'Two',
    email: 'student2@test.com',
    schoolName: 'Test School',
  },
  student3: {
    username: 'student3',
    password: 'Test123!',
    role: 'student' as const,
    firstName: 'Student',
    lastName: 'Three',
    email: 'student3@test.com',
    schoolName: 'Test School',
  },
  newTeacher: {
    username: 'sjohnson',
    password: 'SecurePass123!',
    role: 'teacher' as const,
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sjohnson@test.com',
    schoolName: 'Test School',
  }
};

export const testSchool = {
  name: 'PSI High School',
  address: '123 Education Ave',
  city: 'Learning City',
  state: 'CA',
  zipCode: '90210'
};