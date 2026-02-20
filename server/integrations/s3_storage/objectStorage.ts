import { randomUUID } from "crypto";
import { Response } from "express";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

const DEFAULT_THUMBNAIL_PREFIX = "Thumbnails";
const DEFAULT_STUDENT_DELIVERABLES_PREFIX = "Student-deliverables";
const DEFAULT_ASSESSMENT_PDF_PREFIX = "Assesment-PDF";

export const objectStorageClient = new S3Client({
  region: process.env.AWS_REGION,
});

export interface StoredObject {
  bucketName: string;
  objectName: string;
  contentType?: string;
  contentLength?: number;
}

export class ObjectNotFoundError extends Error {
  readonly bucketName?: string;
  readonly objectName?: string;

  constructor(bucketName?: string, objectName?: string) {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    this.bucketName = bucketName;
    this.objectName = objectName;
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectAccessDeniedError extends Error {
  readonly bucketName?: string;
  readonly objectName?: string;

  constructor(bucketName?: string, objectName?: string) {
    super("Access denied while reading object");
    this.name = "ObjectAccessDeniedError";
    this.bucketName = bucketName;
    this.objectName = objectName;
    Object.setPrototypeOf(this, ObjectAccessDeniedError.prototype);
  }
}

export class ObjectStorageService {
  constructor() { }

  private normalizePrefix(prefix: string): string {
    return prefix.trim().replace(/^\/+|\/+$/g, "");
  }

  private normalizeObjectPath(bucketName: string, objectName: string): string {
    return `/objects/${bucketName}/${objectName}`;
  }

  getUploadsBucketName(): string {
    return (process.env.UPLOADS_S3_BUCKET || "").trim();
  }

  getThumbnailBucketName(): string {
    const thumbnailBucket = (process.env.THUMBNAIL_S3_BUCKET || "").trim();
    if (thumbnailBucket) {
      return thumbnailBucket;
    }
    return this.getUploadsBucketName();
  }

  getStudentDeliverablesPrefix(): string {
    return this.normalizePrefix(
      process.env.STUDENT_DELIVERABLES_PREFIX || DEFAULT_STUDENT_DELIVERABLES_PREFIX,
    );
  }

  getAssessmentPdfPrefix(): string {
    return this.normalizePrefix(
      process.env.ASSESSMENT_PDF_PREFIX || DEFAULT_ASSESSMENT_PDF_PREFIX,
    );
  }

  getThumbnailPrefix(): string {
    return this.normalizePrefix(
      process.env.THUMBNAIL_OBJECT_PREFIX || DEFAULT_THUMBNAIL_PREFIX,
    );
  }

  private ensureConfiguredBucket(bucketName: string, envName: string): string {
    if (!bucketName) {
      throw new Error(`Storage bucket is not configured. Set ${envName}.`);
    }
    return bucketName;
  }

  private createUploadObjectTarget(prefix: string): {
    bucketName: string;
    objectName: string;
    objectPath: string;
  } {
    const bucketName = this.ensureConfiguredBucket(
      this.getUploadsBucketName(),
      "UPLOADS_S3_BUCKET",
    );
    const normalizedPrefix = this.normalizePrefix(prefix);
    const objectName = `${normalizedPrefix}/${randomUUID()}`;
    return {
      bucketName,
      objectName,
      objectPath: this.normalizeObjectPath(bucketName, objectName),
    };
  }

  getAssessmentPdfObjectTarget(): {
    bucketName: string;
    objectName: string;
    objectPath: string;
  } {
    return this.createUploadObjectTarget(this.getAssessmentPdfPrefix());
  }

  getStudentDeliverablesObjectTarget(): {
    bucketName: string;
    objectName: string;
    objectPath: string;
  } {
    return this.createUploadObjectTarget(this.getStudentDeliverablesPrefix());
  }

  getThumbnailObjectTarget(): {
    bucketName: string;
    objectName: string;
    objectPath: string;
  } {
    const bucketName = this.ensureConfiguredBucket(
      this.getThumbnailBucketName(),
      "THUMBNAIL_S3_BUCKET or UPLOADS_S3_BUCKET",
    );
    const objectName = `${this.getThumbnailPrefix()}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.png`;
    return {
      bucketName,
      objectName,
      objectPath: this.normalizeObjectPath(bucketName, objectName),
    };
  }

  async uploadBuffer(params: {
    bucketName: string;
    objectName: string;
    buffer: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
    cacheControl?: string;
    acl?: "private" | "public-read";
  }): Promise<void> {
    await objectStorageClient.send(
      new PutObjectCommand({
        Bucket: params.bucketName,
        Key: params.objectName,
        Body: params.buffer,
        ContentType: params.contentType,
        Metadata: params.metadata,
        CacheControl: params.cacheControl,
        ACL: params.acl,
      }),
    );
  }

  async saveAssessmentPdf(params: {
    buffer: Buffer;
    contentType: string;
    originalName?: string;
  }): Promise<string> {
    const target = this.getAssessmentPdfObjectTarget();
    await this.uploadBuffer({
      bucketName: target.bucketName,
      objectName: target.objectName,
      buffer: params.buffer,
      contentType: params.contentType || "application/pdf",
      metadata: params.originalName ? { originalName: params.originalName } : undefined,
    });
    return target.objectPath;
  }

  async saveStudentDeliverable(params: {
    buffer: Buffer;
    contentType: string;
    originalName?: string;
  }): Promise<string> {
    const target = this.getStudentDeliverablesObjectTarget();
    await this.uploadBuffer({
      bucketName: target.bucketName,
      objectName: target.objectName,
      buffer: params.buffer,
      contentType: params.contentType || "application/octet-stream",
      metadata: params.originalName ? { originalName: params.originalName } : undefined,
    });
    return target.objectPath;
  }

  async saveThumbnail(params: {
    buffer: Buffer;
    cacheControl?: string;
  }): Promise<string> {
    const target = this.getThumbnailObjectTarget();
    await this.uploadBuffer({
      bucketName: target.bucketName,
      objectName: target.objectName,
      buffer: params.buffer,
      contentType: "image/png",
      cacheControl: params.cacheControl || "public, max-age=31536000",
    });
    return target.objectPath;
  }

  private parseS3Url(urlValue: URL): { bucketName: string; objectName: string } {
    const host = urlValue.hostname;
    const pathParts = urlValue.pathname.replace(/^\/+/, "").split("/").filter(Boolean);

    // Virtual-hosted style: https://bucket.s3.<region>.amazonaws.com/key
    const virtualHostedMatch = host.match(/^([^.]+)\.s3(?:[.-][^.]+)?\.amazonaws\.com$/);
    if (virtualHostedMatch) {
      const bucketName = virtualHostedMatch[1];
      const objectName = decodeURIComponent(pathParts.join("/"));
      if (!bucketName || !objectName) {
        throw new ObjectNotFoundError();
      }
      return { bucketName, objectName };
    }

    // Path style: https://s3.<region>.amazonaws.com/bucket/key
    if (host.startsWith("s3.") || host.startsWith("s3-")) {
      const bucketName = pathParts[0];
      const objectName = decodeURIComponent(pathParts.slice(1).join("/"));
      if (!bucketName || !objectName) {
        throw new ObjectNotFoundError();
      }
      return { bucketName, objectName };
    }

    throw new ObjectNotFoundError();
  }

  private parseBucketAndObjectPath(rawPath: string): {
    bucketName: string;
    objectName: string;
  } {
    const trimmedPath = rawPath.trim();
    if (!trimmedPath) {
      throw new ObjectNotFoundError();
    }

    if (trimmedPath.startsWith("http://") || trimmedPath.startsWith("https://")) {
      return this.parseS3Url(new URL(trimmedPath));
    }

    const sanitized = trimmedPath.replace(/^\/+/, "");
    const objectPath = sanitized.startsWith("objects/")
      ? sanitized.slice("objects/".length)
      : sanitized;

    const slashIndex = objectPath.indexOf("/");
    if (slashIndex <= 0 || slashIndex === objectPath.length - 1) {
      throw new ObjectNotFoundError();
    }

    const bucketName = objectPath.slice(0, slashIndex);
    const objectName = decodeURIComponent(objectPath.slice(slashIndex + 1));

    if (!bucketName || !objectName) {
      throw new ObjectNotFoundError();
    }

    return { bucketName, objectName };
  }

  async getObjectEntityFile(objectPath: string): Promise<StoredObject> {
    const { bucketName, objectName } = this.parseBucketAndObjectPath(objectPath);

    try {
      const head = await objectStorageClient.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: objectName,
        }),
      );

      return {
        bucketName,
        objectName,
        contentType: head.ContentType,
        contentLength:
          typeof head.ContentLength === "number" ? head.ContentLength : undefined,
      };
    } catch (error: unknown) {
      if (isAccessDeniedError(error)) {
        throw new ObjectAccessDeniedError(bucketName, objectName);
      }
      if (isNotFoundError(error)) {
        throw new ObjectNotFoundError(bucketName, objectName);
      }
      throw error;
    }
  }

  async downloadObject(
    objectRef: StoredObject,
    res: Response,
    cacheTtlSec: number = 3600,
  ): Promise<void> {
    try {
      const response = await objectStorageClient.send(
        new GetObjectCommand({
          Bucket: objectRef.bucketName,
          Key: objectRef.objectName,
        }),
      );

      const body = response.Body;
      if (!body) {
        throw new ObjectNotFoundError();
      }

      const contentType =
        response.ContentType || objectRef.contentType || "application/octet-stream";
      const contentLength =
        response.ContentLength ?? objectRef.contentLength ?? undefined;

      res.set({
        "Content-Type": contentType,
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      });

      if (typeof contentLength === "number") {
        res.set("Content-Length", contentLength.toString());
      }

      if (body instanceof Readable) {
        body.on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error streaming file" });
          }
        });
        body.pipe(res);
        return;
      }

      const buffer = await streamBodyToBuffer(body);
      res.end(buffer);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        throw error;
      }
      if (error instanceof ObjectAccessDeniedError) {
        throw error;
      }
      if (isAccessDeniedError(error)) {
        throw new ObjectAccessDeniedError(objectRef.bucketName, objectRef.objectName);
      }
      if (isNotFoundError(error)) {
        throw new ObjectNotFoundError(objectRef.bucketName, objectRef.objectName);
      }
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async downloadObjectToBuffer(objectPath: string): Promise<Buffer> {
    const objectRef = await this.getObjectEntityFile(objectPath);
    const response = await objectStorageClient.send(
      new GetObjectCommand({
        Bucket: objectRef.bucketName,
        Key: objectRef.objectName,
      }),
    );

    if (!response.Body) {
      throw new ObjectNotFoundError();
    }

    return streamBodyToBuffer(response.Body);
  }

  normalizeObjectEntityPath(rawPath: string): string {
    try {
      const { bucketName, objectName } = this.parseBucketAndObjectPath(rawPath);
      return this.normalizeObjectPath(bucketName, objectName);
    } catch {
      return rawPath;
    }
  }
}

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const withName = error as Error & { $metadata?: { httpStatusCode?: number } };
  return (
    error.name === "NoSuchKey" ||
    error.name === "NotFound" ||
    withName.$metadata?.httpStatusCode === 404
  );
}

function isAccessDeniedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const withName = error as Error & { $metadata?: { httpStatusCode?: number } };
  return (
    error.name === "AccessDenied" ||
    error.name === "Forbidden" ||
    withName.$metadata?.httpStatusCode === 403
  );
}

async function streamBodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    return Buffer.alloc(0);
  }

  const withTransformer = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
  if (typeof withTransformer.transformToByteArray === "function") {
    const bytes = await withTransformer.transformToByteArray();
    return Buffer.from(bytes);
  }

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  throw new Error("Unsupported object body type");
}
