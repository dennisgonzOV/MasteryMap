import type { Express } from "express";
import multer from "multer";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  ObjectAccessDeniedError,
} from "./objectStorage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.post("/api/uploads/file", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const uploadType = req.body.uploadType === "deliverable" ? "deliverable" : "assessment_pdf";
      const objectPath =
        uploadType === "deliverable"
          ? await objectStorageService.saveStudentDeliverable({
              buffer: req.file.buffer,
              contentType: req.file.mimetype,
              originalName: req.file.originalname,
            })
          : await objectStorageService.saveAssessmentPdf({
              buffer: req.file.buffer,
              contentType: req.file.mimetype,
              originalName: req.file.originalname,
            });

      res.json({ objectPath });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const lookupPath = req.path;
      const objectFile = await objectStorageService.getObjectEntityFile(lookupPath);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", {
        requestPath: req.path,
        objectPathParam: req.params.objectPath,
        details: formatObjectServingError(error),
      });
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      if (error instanceof ObjectAccessDeniedError) {
        return res.status(403).json({ error: "Object access denied" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

function formatObjectServingError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { type: typeof error };
  }

  const sdkError = error as Error & {
    code?: string;
    $metadata?: {
      httpStatusCode?: number;
      requestId?: string;
      extendedRequestId?: string;
      cfId?: string;
    };
    bucketName?: string;
    objectName?: string;
  };

  return {
    name: error.name,
    message: error.message,
    code: sdkError.code,
    httpStatusCode: sdkError.$metadata?.httpStatusCode,
    requestId: sdkError.$metadata?.requestId,
    extendedRequestId: sdkError.$metadata?.extendedRequestId,
    cfId: sdkError.$metadata?.cfId,
    bucketName: sdkError.bucketName,
    objectName: sdkError.objectName,
  };
}
