// Modular schema - New organized structure
// This file maintains the exact same exports as the original schema.ts
// but uses the new domain-organized structure

// Import all components from domain schemas
export * from './schemas';

// Note: This file serves as a drop-in replacement for the original schema.ts
// All existing imports should work without modification:
// 
// Before: import { users, projects, assessments } from '../shared/schema';
// After:  import { users, projects, assessments } from '../shared/schema';
//
// The internal organization is now domain-driven but the public API remains identical.