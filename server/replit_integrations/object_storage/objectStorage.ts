import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const isReplit = !!process.env.REPL_ID || !!process.env.REPLIT_ENVIRONMENT;

const storageOptions: any = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT || "",
};

if (isReplit) {
  storageOptions.credentials = {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  };
}

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage(storageOptions);

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() { }

  private normalizePrefix(prefix: string): string {
    return prefix.trim().replace(/^\/+|\/+$/g, "");
  }

  getUploadsBucketName(): string {
    return (process.env.UPLOADS_S3_BUCKET || "masterymap").trim();
  }

  getStudentDeliverablesPrefix(): string {
    return this.normalizePrefix(process.env.STUDENT_DELIVERABLES_PREFIX || "Student-deliverables");
  }

  getAssessmentPdfPrefix(): string {
    return this.normalizePrefix(process.env.ASSESSMENT_PDF_PREFIX || "Assesment-PDF");
  }

  private createUploadObjectTarget(prefix: string): {
    bucketName: string;
    objectName: string;
    objectPath: string;
  } {
    const bucketName = this.getUploadsBucketName();
    const objectName = `${this.normalizePrefix(prefix)}/${randomUUID()}`;
    return {
      bucketName,
      objectName,
      objectPath: `/objects/${bucketName}/${objectName}`,
    };
  }

  async getStudentDeliverablesUploadTarget(): Promise<{
    uploadURL: string;
    objectPath: string;
  }> {
    const target = this.createUploadObjectTarget(this.getStudentDeliverablesPrefix());
    const uploadURL = await signObjectURL({
      bucketName: target.bucketName,
      objectName: target.objectName,
      method: "PUT",
      ttlSec: 900,
    });

    return {
      uploadURL,
      objectPath: target.objectPath,
    };
  }

  getAssessmentPdfObjectTarget(): {
    bucketName: string;
    objectName: string;
    objectPath: string;
  } {
    return this.createUploadObjectTarget(this.getAssessmentPdfPrefix());
  }

  private getKnownBucketNames(): Set<string> {
    const buckets = new Set<string>();

    try {
      const privateDir = this.getPrivateObjectDir();
      buckets.add(parseObjectPath(privateDir).bucketName);
    } catch { }

    try {
      for (const searchPath of this.getPublicObjectSearchPaths()) {
        buckets.add(parseObjectPath(searchPath).bucketName);
      }
    } catch { }

    const uploadsBucket = this.getUploadsBucketName();
    if (uploadsBucket) {
      buckets.add(uploadsBucket);
    }

    const thumbnailBucket = (process.env.THUMBNAIL_S3_BUCKET || "masterymap").trim();
    if (thumbnailBucket) {
      buckets.add(thumbnailBucket);
    }

    return buckets;
  }

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    return Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    return process.env.PRIVATE_OBJECT_DIR || "";
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      // Get the ACL policy for the object.
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"
          }, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");

    // Support explicit bucket paths: /objects/<bucket>/<object_name>
    // This is used for thumbnail storage in external buckets.
    const entityParts = entityId.split("/");
    if (entityParts.length >= 2) {
      const bucketCandidate = entityParts[0];
      const objectCandidate = entityParts.slice(1).join("/");
      if (this.getKnownBucketNames().has(bucketCandidate)) {
        const directBucket = objectStorageClient.bucket(bucketCandidate);
        const directFile = directBucket.file(objectCandidate);
        const [exists] = await directFile.exists();
        if (exists) {
          return directFile;
        }
      }
    }

    const dirsToSearch: string[] = [];

    try {
      let entityDir = this.getPrivateObjectDir();
      if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
      dirsToSearch.push(entityDir);
    } catch { }

    try {
      const publicPaths = this.getPublicObjectSearchPaths();
      for (const pub of publicPaths) {
        let p = pub;
        if (!p.endsWith("/")) p = `${p}/`;
        dirsToSearch.push(p);
      }
    } catch { }

    for (const dir of dirsToSearch) {
      const objectEntityPath = `${dir}${entityId}`;
      const { bucketName, objectName } = parseObjectPath(objectEntityPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(objectName);
      const [exists] = await objectFile.exists();
      if (exists) {
        return objectFile;
      }
    }

    throw new ObjectNotFoundError();
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    const dirsToCheck: string[] = [];

    try {
      let privateDir = this.getPrivateObjectDir();
      if (!privateDir.endsWith("/")) privateDir = `${privateDir}/`;
      dirsToCheck.push(privateDir);
    } catch { }

    try {
      const publicPaths = this.getPublicObjectSearchPaths();
      for (const pub of publicPaths) {
        let p = pub;
        if (!p.endsWith("/")) p = `${p}/`;
        dirsToCheck.push(p);
      }
    } catch { }

    for (const dir of dirsToCheck) {
      if (rawObjectPath.startsWith(dir)) {
        const entityId = rawObjectPath.slice(dir.length);
        return `/objects/${entityId}`;
      }
    }

    // Support explicit known-bucket raw paths:
    // /<bucket>/<object_name> -> /objects/<bucket>/<object_name>
    const rawParts = rawObjectPath.replace(/^\/+/, "").split("/");
    if (rawParts.length >= 2) {
      const bucketCandidate = rawParts[0];
      const objectCandidate = rawParts.slice(1).join("/");
      if (this.getKnownBucketNames().has(bucketCandidate)) {
        return `/objects/${bucketCandidate}/${objectCandidate}`;
      }
    }

    return rawObjectPath;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
      `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
