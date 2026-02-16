import { objectStorageClient } from "../../replit_integrations/object_storage/objectStorage";
import { setObjectAclPolicy } from "../../replit_integrations/object_storage/objectAcl";

interface GenerateThumbnailOptions {
  projectTitle: string;
  projectDescription: string;
  subject?: string;
  topic?: string;
}

export class FluxImageService {
  private apiKey: string;
  private apiUri: string;
  private thumbnailBucket: string;
  private thumbnailPrefix: string;

  constructor() {
    this.apiKey = process.env.FLUX_API_KEY || "";
    this.apiUri = process.env.FLUX_API_URI || "";
    this.thumbnailBucket =
      (process.env.THUMBNAIL_S3_BUCKET || process.env.UPLOADS_S3_BUCKET || "").trim();
    this.thumbnailPrefix = (process.env.THUMBNAIL_OBJECT_PREFIX || "Thumbnails").trim().replace(/^\/+|\/+$/g, "");
  }

  private sanitizePromptInput(input: string): string {
    return input
      .replace(/[<>{}[\]\\]/g, "")
      .substring(0, 500)
      .trim();
  }

  private createSchoolAppropriatePrompt(options: GenerateThumbnailOptions): string {
    const projectTitle = this.sanitizePromptInput(options.projectTitle);
    const projectDescription = this.sanitizePromptInput(options.projectDescription || "");
    const subject = options.subject ? this.sanitizePromptInput(options.subject) : "";
    const topic = options.topic ? this.sanitizePromptInput(options.topic) : "";

    const basePrompt = `Create a colorful, educational illustration for a school project. The image should be:
- Professional and school-appropriate
- Visually engaging for students
- Modern flat design style
- Clean and simple composition
- Bright, cheerful colors suitable for an educational setting

Project Theme: "${projectTitle}"
${projectDescription ? `Description: ${projectDescription.substring(0, 200)}` : ""}
${subject ? `Subject Area: ${subject}` : ""}
${topic ? `Topic: ${topic}` : ""}

Style: Modern educational illustration, flat design, vibrant colors, no text in image, suitable for all ages, professional quality, educational themed.`;

    return basePrompt;
  }

  async generateThumbnail(options: GenerateThumbnailOptions): Promise<string | null> {
    if (!this.apiKey || !this.apiUri) {
      return null;
    }

    try {
      const prompt = this.createSchoolAppropriatePrompt(options);

      const response = await fetch(this.apiUri, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: "512x512",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("FLUX API error:", response.status, errorText);
        throw new Error(`FLUX API request failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.data && result.data[0]) {
        const imageData = result.data[0];
        if (imageData.b64_json) {
          return await this.saveBase64ToStorage(imageData.b64_json);
        } else if (imageData.url) {
          return await this.saveUrlToStorage(imageData.url);
        }
      }

      if (result.image) {
        return await this.saveBase64ToStorage(result.image);
      }

      if (result.url) {
        return await this.saveUrlToStorage(result.url);
      }

      console.error("Unexpected FLUX API response format:", JSON.stringify(result, null, 2));
      return null;
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      return null;
    }
  }

  private async saveUrlToStorage(imageUrl: string): Promise<string | null> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error("Failed to download image from URL:", response.status);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");
      return await this.saveBase64ToStorage(base64Data);
    } catch (error) {
      console.error("Error downloading image from URL:", error);
      return null;
    }
  }

  private async saveBase64ToStorage(base64Data: string): Promise<string | null> {
    try {
      if (!this.thumbnailBucket) {
        console.error(
          "Thumbnail storage bucket is not configured. Set THUMBNAIL_S3_BUCKET or UPLOADS_S3_BUCKET.",
        );
        return null;
      }

      const objectName = `${this.thumbnailPrefix}/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      const bucketName = this.thumbnailBucket;

      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const imageBuffer = Buffer.from(base64Data, "base64");

      await file.save(imageBuffer, {
        contentType: "image/png",
        metadata: {
          cacheControl: "public, max-age=31536000",
        },
      });

      await setObjectAclPolicy(file, { owner: "system", visibility: "public" });

      return `/objects/${bucketName}/${objectName}`;
    } catch (error) {
      console.error(`Error saving thumbnail to storage bucket "${this.thumbnailBucket}":`, error);
      return null;
    }
  }
}

export const fluxImageService = new FluxImageService();
