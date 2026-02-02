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

  constructor() {
    this.apiKey = process.env.FLUX_API_KEY || "";
    this.apiUri = process.env.FLUX_API_URI || "";

    if (!this.apiKey || !this.apiUri) {
      console.warn("FLUX_API_KEY or FLUX_API_URI not configured. Image generation will be disabled.");
    }
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
      console.log("FLUX API not configured, skipping thumbnail generation");
      return null;
    }

    try {
      const prompt = this.createSchoolAppropriatePrompt(options);
      console.log("Generating thumbnail with FLUX API...");
      console.log("API URI:", this.apiUri);

      const response = await fetch(this.apiUri, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: "1024x1024",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("FLUX API error:", response.status, errorText);
        throw new Error(`FLUX API request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("FLUX API response structure:", JSON.stringify(result, null, 2).substring(0, 500));
      
      if (result.data && result.data[0]) {
        const imageData = result.data[0];
        if (imageData.url) {
          console.log("FLUX returned direct URL");
          return imageData.url;
        } else if (imageData.b64_json) {
          console.log("FLUX returned base64, saving to storage...");
          const thumbnailUrl = await this.saveBase64ToStorage(imageData.b64_json);
          return thumbnailUrl;
        }
      }
      
      if (result.url) {
        console.log("FLUX returned URL at root level");
        return result.url;
      }
      
      if (result.image) {
        console.log("FLUX returned image at root level, saving to storage...");
        const thumbnailUrl = await this.saveBase64ToStorage(result.image);
        return thumbnailUrl;
      }

      console.error("Unexpected FLUX API response format:", JSON.stringify(result, null, 2));
      return null;
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      return null;
    }
  }

  private async saveBase64ToStorage(base64Data: string): Promise<string | null> {
    try {
      const publicSearchPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS;
      if (!publicSearchPaths) {
        console.error("PUBLIC_OBJECT_SEARCH_PATHS not configured");
        return null;
      }

      const publicDir = publicSearchPaths.split(",")[0].trim();
      const fileName = `thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      
      const { bucketName, objectName } = this.parseObjectPath(`${publicDir}/${fileName}`);

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

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
      console.log("Thumbnail saved to:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error("Error saving thumbnail to storage:", error);
      return null;
    }
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
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
}

export const fluxImageService = new FluxImageService();
