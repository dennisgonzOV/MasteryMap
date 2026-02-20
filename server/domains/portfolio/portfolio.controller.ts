import { Router } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { portfolioService, type IPortfolioService } from "./portfolio.service";
import { requireAuth, type AuthenticatedRequest } from "../auth";
import { insertPortfolioArtifactSchema } from "../../../shared/schema";

const LINK_SECRET =
  process.env.PORTFOLIO_LINK_SECRET || process.env.JWT_SECRET || "portfolio-link-dev-secret";

const EXPIRATION_OPTIONS = [7, 30, 90] as const;

function signExpirationToken(publicUrl: string, expiresAtIso: string): string {
  return createHmac("sha256", LINK_SECRET).update(`${publicUrl}:${expiresAtIso}`).digest("hex");
}

function safeSignaturesMatch(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function parseExpiryDays(rawValue: unknown): number | undefined {
  if (rawValue == null || rawValue === "") {
    return undefined;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  if (!EXPIRATION_OPTIONS.includes(parsed as (typeof EXPIRATION_OPTIONS)[number])) {
    return undefined;
  }

  return parsed;
}

export class PortfolioController {
  constructor(private service: IPortfolioService = portfolioService) {}

  createRouter(): Router {
    const router = Router();

    router.get("/artifacts", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const artifacts = await this.service.getStudentArtifacts(userId);
        res.json(artifacts);
      } catch (error) {
        console.error("Error fetching portfolio artifacts:", error);
        res.status(500).json({ message: "Failed to fetch portfolio artifacts" });
      }
    });

    router.post("/artifacts", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;

        if (req.user?.role !== "student") {
          return res.status(403).json({ message: "Only students can create portfolio artifacts" });
        }

        const artifactData = insertPortfolioArtifactSchema.parse({
          ...req.body,
          studentId: userId,
        });

        const artifact = await this.service.createArtifact(artifactData);
        res.json(artifact);
      } catch (error) {
        console.error("Error creating portfolio artifact:", error);
        res.status(500).json({ message: "Failed to create portfolio artifact" });
      }
    });

    router.patch("/artifacts/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        if (req.user?.role !== "student") {
          return res.status(403).json({ message: "Only students can update portfolio artifacts" });
        }

        const artifactId = parseInt(req.params.id, 10);
        if (Number.isNaN(artifactId)) {
          return res.status(400).json({ message: "Invalid artifact ID" });
        }

        const updates: {
          title?: string;
          description?: string | null;
          tags?: string[];
          isPublic?: boolean;
          artifactUrl?: string;
          artifactType?: string;
        } = {};

        if (typeof req.body.title === "string" && req.body.title.trim().length > 0) {
          updates.title = req.body.title.trim();
        }

        if (req.body.description === null || typeof req.body.description === "string") {
          updates.description = req.body.description;
        }

        if (Array.isArray(req.body.tags)) {
          updates.tags = req.body.tags.filter((tag: unknown): tag is string => typeof tag === "string");
        }

        if (typeof req.body.isPublic === "boolean") {
          updates.isPublic = req.body.isPublic;
        }

        if (typeof req.body.artifactUrl === "string" && req.body.artifactUrl.trim().length > 0) {
          updates.artifactUrl = req.body.artifactUrl.trim();
        }

        if (typeof req.body.artifactType === "string" && req.body.artifactType.trim().length > 0) {
          updates.artifactType = req.body.artifactType.trim();
        }

        const artifact = await this.service.updateArtifactForStudent(req.user.id, artifactId, updates);
        res.json(artifact);
      } catch (error) {
        console.error("Error updating portfolio artifact:", error);
        res.status(500).json({ message: "Failed to update portfolio artifact" });
      }
    });

    router.patch("/artifacts/:id/visibility", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        if (req.user?.role !== "student") {
          return res.status(403).json({ message: "Only students can update portfolio artifacts" });
        }

        const artifactId = parseInt(req.params.id, 10);
        const { isPublic } = req.body;

        if (Number.isNaN(artifactId)) {
          return res.status(400).json({ message: "Invalid artifact ID" });
        }

        if (typeof isPublic !== "boolean") {
          return res.status(400).json({ message: "isPublic must be a boolean" });
        }

        const artifact = await this.service.updateArtifactForStudent(req.user.id, artifactId, { isPublic });
        res.json(artifact);
      } catch (error) {
        console.error("Error updating artifact visibility:", error);
        res.status(500).json({ message: "Failed to update artifact visibility" });
      }
    });

    router.get("/settings", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        if (req.user?.role !== "student") {
          return res.status(403).json({ message: "Only students can manage portfolio settings" });
        }

        const settings = await this.service.getStudentPortfolioSettings(req.user.id);
        res.json(settings);
      } catch (error) {
        console.error("Error fetching portfolio settings:", error);
        res.status(500).json({ message: "Failed to fetch portfolio settings" });
      }
    });

    router.patch("/settings", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        if (req.user?.role !== "student") {
          return res.status(403).json({ message: "Only students can manage portfolio settings" });
        }

        const updates: { isPublic?: boolean; title?: string; description?: string | null } = {};

        if (typeof req.body.isPublic === "boolean") {
          updates.isPublic = req.body.isPublic;
        }

        if (typeof req.body.title === "string" && req.body.title.trim().length > 0) {
          updates.title = req.body.title.trim();
        }

        if (req.body.description === null || typeof req.body.description === "string") {
          updates.description = req.body.description;
        }

        const settings = await this.service.updateStudentPortfolioSettings(req.user.id, updates);
        res.json(settings);
      } catch (error) {
        console.error("Error updating portfolio settings:", error);
        res.status(500).json({ message: "Failed to update portfolio settings" });
      }
    });

    router.get("/share-link", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        if (req.user?.role !== "student") {
          return res.status(403).json({ message: "Only students can generate share links" });
        }

        const expirationDays = parseExpiryDays(req.query.expirationDays);
        if (req.query.expirationDays != null && !expirationDays) {
          return res.status(400).json({ message: "Invalid expirationDays. Allowed values: 7, 30, 90" });
        }

        const publicUrl = await this.service.getOrCreateShareSlug(req.user.id);
        const basePortfolioUrl = `${req.protocol}://${req.get("host")}/portfolio/public/${publicUrl}`;

        if (!expirationDays) {
          return res.json({
            portfolioUrl: basePortfolioUrl,
            publicUrl,
            expiresAt: null,
            expirationDays: null,
          });
        }

        const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);
        const expiresAtIso = expiresAt.toISOString();
        const signature = signExpirationToken(publicUrl, expiresAtIso);
        const signedUrl = `${basePortfolioUrl}?expiresAt=${encodeURIComponent(expiresAtIso)}&sig=${signature}`;

        return res.json({
          portfolioUrl: signedUrl,
          publicUrl,
          expiresAt: expiresAtIso,
          expirationDays,
        });
      } catch (error) {
        console.error("Error generating share link:", error);
        res.status(500).json({ message: "Failed to generate share link" });
      }
    });

    router.get("/qr-code", requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        if (req.user?.role !== "student") {
          return res.status(403).json({ message: "Only students can generate portfolio QR codes" });
        }

        const expirationDays = parseExpiryDays(req.query.expirationDays);
        if (req.query.expirationDays != null && !expirationDays) {
          return res.status(400).json({ message: "Invalid expirationDays. Allowed values: 7, 30, 90" });
        }

        const publicUrl = await this.service.getOrCreateShareSlug(req.user.id);
        const basePortfolioUrl = `${req.protocol}://${req.get("host")}/portfolio/public/${publicUrl}`;

        let portfolioUrl = basePortfolioUrl;
        let expiresAt: string | null = null;

        if (expirationDays) {
          const expiryDate = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);
          expiresAt = expiryDate.toISOString();
          const signature = signExpirationToken(publicUrl, expiresAt);
          portfolioUrl = `${basePortfolioUrl}?expiresAt=${encodeURIComponent(expiresAt)}&sig=${signature}`;
        }

        const QRCode = await import("qrcode");
        const qrCodeDataUrl = await QRCode.toDataURL(portfolioUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: "#1F2937",
            light: "#FFFFFF",
          },
        });

        res.json({
          portfolioUrl,
          publicUrl,
          expiresAt,
          expirationDays: expirationDays ?? null,
          qrCodeUrl: qrCodeDataUrl,
        });
      } catch (error) {
        console.error("Error generating QR code:", error);
        res.status(500).json({ message: "Failed to generate QR code" });
      }
    });

    router.get("/public/:publicUrl", async (req, res) => {
      try {
        const publicUrl = (req.params.publicUrl || "").trim();
        if (!publicUrl) {
          return res.status(400).json({ message: "Invalid portfolio URL" });
        }

        const { expiresAt, sig } = req.query;
        if ((expiresAt && !sig) || (!expiresAt && sig)) {
          return res.status(400).json({ message: "Invalid signed link parameters" });
        }

        if (expiresAt && sig) {
          const expiresAtIso = String(expiresAt);
          const signature = String(sig);
          const parsedExpiry = new Date(expiresAtIso);
          if (Number.isNaN(parsedExpiry.getTime())) {
            return res.status(400).json({ message: "Invalid expiresAt value" });
          }

          if (parsedExpiry.getTime() < Date.now()) {
            return res.status(410).json({ message: "This portfolio link has expired" });
          }

          const expectedSig = signExpirationToken(publicUrl, expiresAtIso);
          if (!safeSignaturesMatch(expectedSig, signature)) {
            return res.status(403).json({ message: "Invalid portfolio link signature" });
          }
        }

        // Backward compatibility: if path is numeric, resolve through student ID flow.
        const isLegacyNumericId = /^[0-9]+$/.test(publicUrl);
        const portfolioData = isLegacyNumericId
          ? await this.service.getPublicPortfolio(Number(publicUrl))
          : await this.service.getPublicPortfolioByUrl(publicUrl);

        if (!portfolioData) {
          return res.status(404).json({ message: "Portfolio not found" });
        }

        return res.json(portfolioData);
      } catch (error) {
        console.error("Error fetching public portfolio:", error);
        return res.status(500).json({ message: "Failed to fetch public portfolio" });
      }
    });

    return router;
  }
}

export const portfolioController = new PortfolioController();
export const portfolioRouter = portfolioController.createRouter();
