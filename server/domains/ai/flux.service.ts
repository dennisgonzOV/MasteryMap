import { objectStorageClient } from "../../replit_integrations/object_storage/objectStorage";
import { setObjectAclPolicy } from "../../replit_integrations/object_storage/objectAcl";
import sharp from "sharp";

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
          size: "512x512",
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
        if (imageData.b64_json) {
          console.log("FLUX returned base64, saving to storage...");
          return await this.saveBase64ToStorage(imageData.b64_json);
        } else if (imageData.url) {
          console.log("FLUX returned direct URL, downloading and saving to storage...");
          return await this.saveUrlToStorage(imageData.url);
        }
      }

      if (result.image) {
        console.log("FLUX returned image at root level, saving to storage...");
        return await this.saveBase64ToStorage(result.image);
      }

      if (result.url) {
        console.log("FLUX returned URL at root level, downloading and saving to storage...");
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
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      if (!privateDir) {
        console.error("PRIVATE_OBJECT_DIR not configured");
        return null;
      }

      const fileName = `thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      const fullPath = `${privateDir}/${fileName}`;

      const { bucketName, objectName } = this.parseObjectPath(fullPath);

      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const imageBuffer = Buffer.from(base64Data, "base64");

      // Compress and resize the image using sharp
      const processedBuffer = await sharp(imageBuffer)
        .resize(512, 512, {
          fit: 'cover',
          position: 'center'
        })
        .png({ quality: 80, compressionLevel: 9 })
        .toBuffer();

      await file.save(processedBuffer, {
        contentType: "image/png",
        metadata: {
          cacheControl: "public, max-age=31536000",
        },
      });

      await setObjectAclPolicy(file, { owner: "system", visibility: "public" });

      const localPath = `/objects/${fileName}`;
      console.log("Thumbnail saved, serving at:", localPath);
      return localPath;
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
