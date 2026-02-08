import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { setupRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testDatabaseConnection } from "./db";
import { securityHeaders, apiLimiter } from "./middleware/security";
import { errorHandler, notFoundHandler, handleUncaughtExceptions } from "./middleware/errorHandler";
import cookieParser from 'cookie-parser';

const app = express();

// Configure trust proxy for proper IP detection (needed for rate limiting)
app.set('trust proxy', 1);

// Apply security headers first
app.use(securityHeaders);

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Parse cookies globally
app.use(cookieParser());

app.use(express.json({ limit: '10mb' })); // Add size limit
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Set up uncaught exception handlers
handleUncaughtExceptions();

(async () => {
  try {
    // Test database connection first
    log("Testing database connection...");
    const dbConnected = await testDatabaseConnection();

    if (!dbConnected) {
      log("Database connection failed. Exiting...");
      process.exit(1);
    }

    setupRoutes(app);

    const server = createServer(app);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Add 404 handler for unmatched API routes AFTER Vite/static setup
    app.use('/api/*', notFoundHandler);

    // Global error handler
    app.use(errorHandler);

    // Use PORT from environment or fallback to 5000
    const port = parseInt(process.env.PORT || "5000");
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();