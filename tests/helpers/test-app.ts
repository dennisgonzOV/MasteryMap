// Test application setup for API testing
import express from 'express';
import { registerRoutes } from '../../server/routes.modular';

// Create test app with the same middleware as main server
export async function createTestApp() {
  const app = express();
  
  // Same middleware as main server
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Register routes (this returns the server instance but we just need the routes)
  await registerRoutes(app);
  
  return app;
}

// Export a singleton instance for tests
let testAppInstance: express.Application | null = null;

export async function getTestApp() {
  if (!testAppInstance) {
    testAppInstance = await createTestApp();
  }
  return testAppInstance;
}