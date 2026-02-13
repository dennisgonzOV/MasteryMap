// Test application setup for API testing
import express from 'express';
import cookieParser from 'cookie-parser';
import { setupRoutes } from '../../server/routes';

export async function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  setupRoutes(app);

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