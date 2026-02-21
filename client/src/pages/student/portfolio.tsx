import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import { useUpload } from "@/hooks/use-upload";
import Navigation from "@/components/navigation";
import CredentialBadge from "@/components/credential-badge";
import { CompetencyProgress } from "@/components/competency-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Image,
  Link as LinkIcon,
  Pencil,
  QrCode,
  Search,
  Share,
  Star,
  Trophy,
  Video,
} from "lucide-react";
import { format } from "date-fns";
import type { CredentialDTO, PortfolioArtifactDTO } from "@shared/contracts/api";

type PortfolioArtifactView = PortfolioArtifactDTO & {
  tags?: unknown;
};

const ARTIFACT_TYPE_OPTIONS = [
  { label: "All Types", value: "all" },
  { label: "Documents", value: "document" },
  { label: "Presentations", value: "presentation" },
  { label: "Videos", value: "video" },
  { label: "Images", value: "image" },
  { label: "Interactive", value: "interactive" },
  { label: "Files", value: "file" },
];

const ARTIFACT_SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Most Viewed", value: "most-viewed" },
] as const;

type ArtifactSortValue = (typeof ARTIFACT_SORT_OPTIONS)[number]["value"];

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags.filter((tag): tag is string => typeof tag === "string");
}

function normalizeViewCount(rawCount: unknown): number {
  if (typeof rawCount === "number" && Number.isFinite(rawCount)) {
    return Math.max(0, rawCount);
  }
  if (typeof rawCount === "string") {
    const parsed = Number.parseInt(rawCount, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }
  return 0;
}

export default function StudentPortfolio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<ArtifactSortValue>("newest");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [qrCodeError, setQrCodeError] = useState<string>("");
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const [editingArtifact, setEditingArtifact] = useState<PortfolioArtifactView | null>(null);
  const [artifactTags, setArtifactTags] = useState("");
  const [artifactIsPublic, setArtifactIsPublic] = useState(false);
  const [artifactReplacementFile, setArtifactReplacementFile] = useState<File | null>(null);

  const artifactQueryKey = useMemo(() => ["/api/portfolio/artifacts", user?.id], [user?.id]);

  const { uploadFile, isUploading, progress } = useUpload({
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, isLoading, toast]);

  const {
    data: credentials = [],
    isLoading: credentialsLoading,
    error: credentialsError,
  } = useQuery<CredentialDTO[]>({
    queryKey: ["/api/credentials/student", user?.id],
    queryFn: api.getStudentCredentials,
    enabled: isAuthenticated && user?.role === "student" && !!user?.id,
    retry: false,
  });

  const {
    data: artifacts = [],
    isLoading: artifactsLoading,
    error: artifactsError,
  } = useQuery<PortfolioArtifactView[]>({
    queryKey: artifactQueryKey,
    queryFn: api.getPortfolioArtifacts,
    enabled: isAuthenticated && user?.role === "student" && !!user?.id,
    retry: false,
  });

  useEffect(() => {
    if (
      (credentialsError && isUnauthorizedError(credentialsError as Error)) ||
      (artifactsError && isUnauthorizedError(artifactsError as Error))
    ) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
    }
  }, [credentialsError, artifactsError, toast]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student" || !user?.id) {
      return;
    }

    const loadShareData = async () => {
      setIsShareLoading(true);
      try {
        const [linkData, qrData] = await Promise.all([
          api.getPortfolioShareLink(),
          api.getPortfolioShareQrCode(),
        ]);

        setPortfolioUrl(linkData.portfolioUrl);
        setQrCodeDataUrl(qrData.qrCodeUrl || "");
        setQrCodeError("");
      } catch (error) {
        console.error("Error loading share metadata:", error);
        setQrCodeDataUrl("");
        setQrCodeError("Unable to generate share assets right now.");
      } finally {
        setIsShareLoading(false);
      }
    };

    loadShareData();
  }, [isAuthenticated, user?.id, user?.role]);

  const updateArtifactMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updatePortfolioArtifact(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: artifactQueryKey });
    },
  });

  const filteredArtifacts = useMemo(() => {
    const nextArtifacts = artifacts.filter((artifact) => {
      const description = artifact.description ?? "";
      const tags = normalizeTags(artifact.tags);
      const matchesSearch =
        artifact.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || artifact.artifactType === typeFilter;
      return matchesSearch && matchesType;
    });

    nextArtifacts.sort((artifactA, artifactB) => {
      const artifactATime = artifactA.createdAt ? new Date(artifactA.createdAt).getTime() : 0;
      const artifactBTime = artifactB.createdAt ? new Date(artifactB.createdAt).getTime() : 0;

      if (sortBy === "oldest") {
        return artifactATime - artifactBTime;
      }

      if (sortBy === "most-viewed") {
        const viewCountA = normalizeViewCount((artifactA as { viewCount?: unknown; views?: unknown }).viewCount ?? (artifactA as { viewCount?: unknown; views?: unknown }).views);
        const viewCountB = normalizeViewCount((artifactB as { viewCount?: unknown; views?: unknown }).viewCount ?? (artifactB as { viewCount?: unknown; views?: unknown }).views);
        if (viewCountB !== viewCountA) {
          return viewCountB - viewCountA;
        }
      }

      return artifactBTime - artifactATime;
    });

    return nextArtifacts;
  }, [artifacts, searchQuery, sortBy, typeFilter]);

  const filteredCredentials = credentials.filter((credential) =>
    credential.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const hasArtifactViewMetrics = useMemo(
    () =>
      artifacts.some((artifact) => {
        const typedArtifact = artifact as { viewCount?: unknown; views?: unknown };
        return normalizeViewCount(typedArtifact.viewCount ?? typedArtifact.views) > 0;
      }),
    [artifacts],
  );

  useEffect(() => {
    if (!copiedRecently) {
      return;
    }
    const timer = window.setTimeout(() => setCopiedRecently(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedRecently]);

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case "image":
        return Image;
      case "video":
        return Video;
      case "document":
      case "presentation":
        return FileText;
      case "interactive":
        return LinkIcon;
      default:
        return FileText;
    }
  };

  const getCredentialCount = (type: string) => credentials.filter((credential) => credential.type === type).length;

  const getArtifactTypeFromFileName = (fileName: string): string => {
    const ext = fileName.toLowerCase().split(".").pop() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
    if (["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
    if (["pdf", "doc", "docx", "txt", "rtf"].includes(ext)) return "document";
    if (["ppt", "pptx", "key"].includes(ext)) return "presentation";
    return "file";
  };

  const handleCopyLink = async () => {
    if (!portfolioUrl) {
      toast({
        title: "Share URL unavailable",
        description: "Please wait for the portfolio link to finish generating.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(portfolioUrl);
      setCopiedRecently(true);
      toast({
        title: "Link copied",
        description: "Portfolio link copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy the portfolio link. Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const handleOpenPublicView = () => {
    if (!portfolioUrl) {
      toast({
        title: "Share URL unavailable",
        description: "Please wait for the portfolio link to finish generating.",
        variant: "destructive",
      });
      return;
    }
    window.open(portfolioUrl, "_blank", "noopener,noreferrer");
  };

  const clearArtifactFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSortBy("newest");
  };

  const openArtifactEditor = (artifact: PortfolioArtifactView) => {
    setEditingArtifact(artifact);
    setArtifactTags(normalizeTags(artifact.tags).join(", "));
    setArtifactIsPublic(Boolean(artifact.isPublic));
    setArtifactReplacementFile(null);
  };

  const handleSaveArtifact = async () => {
    if (!editingArtifact) {
      return;
    }

    const tags = artifactTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    let replacementUploadPath: string | null = null;
    let replacementArtifactType: string | null = null;

    try {
      if (artifactReplacementFile) {
        const uploadResponse = await uploadFile(artifactReplacementFile);
        if (!uploadResponse) {
          return;
        }
        replacementUploadPath = uploadResponse.objectPath;
        replacementArtifactType = getArtifactTypeFromFileName(artifactReplacementFile.name);
      }

      if (editingArtifact.milestoneId && replacementUploadPath) {
        await api.updateMilestoneDeliverable(editingArtifact.milestoneId, {
          deliverableId: editingArtifact.id,
          deliverableUrl: replacementUploadPath,
          deliverableFileName: artifactReplacementFile?.name || "deliverable",
          deliverableDescription: editingArtifact.description || "",
          includeInPortfolio: artifactIsPublic,
        });
      }

      const payload: Record<string, unknown> = {
        tags,
        isPublic: artifactIsPublic,
      };

      if (replacementUploadPath && replacementArtifactType) {
        payload.artifactUrl = replacementUploadPath;
        payload.artifactType = replacementArtifactType;
      }

      await updateArtifactMutation.mutateAsync({
        id: editingArtifact.id,
        data: payload,
      });

      setEditingArtifact(null);
      setArtifactReplacementFile(null);
      toast({
        title: "Artifact updated",
        description: replacementUploadPath
          ? "Deliverable and portfolio settings were updated."
          : "Portfolio artifact settings were saved.",
      });
    } catch {
      toast({
        title: "Update failed",
        description: "Could not save artifact changes.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
          <span className="text-lg text-slate-700">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "student") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <Navigation />

      <main className="pt-20 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 mb-1">My Portfolio</h1>
              <p className="text-slate-700">Manage your public portfolio, artifacts, and credential showcase.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 apple-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-slate-800">Stickers</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{getCredentialCount("sticker")}</span>
              </CardContent>
            </Card>
            <Card className="border-0 apple-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-slate-800">Badges</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{getCredentialCount("badge")}</span>
              </CardContent>
            </Card>
            <Card className="border-0 apple-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-purple-600" />
                  <span className="text-sm text-slate-800">Plaques</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{getCredentialCount("plaque")}</span>
              </CardContent>
            </Card>
            <Card className="border-0 apple-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm text-slate-800">Artifacts</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{artifacts.length}</span>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 apple-shadow mb-6">
            <CardContent className="p-5 sm:p-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Share Portfolio
                  </h2>

                  <p className="text-sm text-slate-700">
                    Your portfolio is always public. Use this link or QR code to share it with admissions teams and other
                    reviewers.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm">
                  <p className="text-slate-800 break-all">{portfolioUrl || "Generating share URL..."}</p>
                  <p className="text-xs text-slate-600 mt-1">This share link does not expire.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleCopyLink}
                    disabled={!portfolioUrl}
                    className="focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    {copiedRecently ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Share className="h-4 w-4 mr-2" />
                        Copy Public Link
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleOpenPublicView}
                    disabled={!portfolioUrl}
                    className="focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Public View
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowQrCode((current) => !current)}
                    className="text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    {showQrCode ? "Hide QR" : "Show QR"}
                    {showQrCode ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                  </Button>
                </div>

                {showQrCode && (
                  <div className="w-full sm:max-w-[240px] rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-700 mb-3">Scan Portfolio QR</p>
                    <div className="w-full aspect-square bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center">
                      {isShareLoading ? (
                        <div className="animate-pulse w-24 h-24 bg-slate-200 rounded" />
                      ) : qrCodeDataUrl ? (
                        <img src={qrCodeDataUrl} alt="Portfolio QR code" className="w-24 h-24" />
                      ) : (
                        <div className="text-xs text-slate-600 text-center px-2">
                          <QrCode className="h-7 w-7 mx-auto mb-1" />
                          QR unavailable
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Open with a mobile camera for quick access.</p>
                    {qrCodeError && <p className="text-xs text-red-600 mt-1">{qrCodeError}</p>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="apple-shadow border-0 mb-6">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search artifacts and credentials..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10 placeholder:text-slate-500 text-slate-900 focus-visible:ring-blue-600 focus-visible:ring-2 focus-visible:ring-offset-2"
                />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="artifacts" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 h-auto">
              <TabsTrigger
                value="artifacts"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Artifacts
                <span className="text-xs text-slate-600">({artifacts.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="credentials"
                className="gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Credentials
                <span className="text-xs text-slate-600">({credentials.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="artifacts" className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">Project Artifacts</h2>
                  <p className="text-sm text-slate-700">Curate what reviewers see with clean metadata and previews.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-52 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ARTIFACT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as ArtifactSortValue)}>
                    <SelectTrigger className="w-full sm:w-44 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {ARTIFACT_SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {sortBy === "most-viewed" && !hasArtifactViewMetrics && (
                <p className="text-xs text-slate-600">View analytics are not available yet. Showing newest artifacts first.</p>
              )}

              {artifactsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((item) => (
                    <Card key={item} className="animate-pulse border-0 apple-shadow">
                      <CardContent className="p-6 space-y-3">
                        <div className="h-20 bg-slate-200 rounded" />
                        <div className="h-4 bg-slate-200 rounded w-2/3" />
                        <div className="h-3 bg-slate-200 rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredArtifacts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-slate-900 mb-2">
                    {searchQuery || typeFilter !== "all" ? "No artifacts match your filters" : "No artifacts yet"}
                  </h3>
                  <p className="text-slate-700 max-w-md mx-auto">
                    Complete project milestones to collect artifacts, then curate title/description/tags before sharing.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {(searchQuery || typeFilter !== "all" || sortBy !== "newest") && (
                      <Button
                        variant="outline"
                        onClick={clearArtifactFilters}
                        className="focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                      >
                        Clear filters
                      </Button>
                    )}
                    <Button asChild className="focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                      <a href="/student/projects">Explore Projects</a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredArtifacts.map((artifact) => {
                    const Icon = getArtifactIcon(artifact.artifactType || "document");
                    const artifactTags = normalizeTags(artifact.tags);
                    const isImageArtifact = artifact.artifactType === "image" && Boolean(artifact.artifactUrl);
                    const projectLabel = artifact.projectTitle || "Independent artifact";
                    const milestoneLabel = artifact.milestoneTitle || "No milestone linked";
                    return (
                      <Card key={artifact.id} className="apple-shadow border-0">
                        <CardContent className="p-6">
                          <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center">
                            {isImageArtifact ? (
                              <img
                                src={artifact.artifactUrl || ""}
                                alt={`${artifact.title} preview`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="text-center px-3">
                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                  <Icon className="h-5 w-5 text-blue-700" />
                                </div>
                                <p className="text-xs uppercase tracking-wide text-slate-600">
                                  {(artifact.artifactType || "file").replace("-", " ")}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="font-semibold text-slate-900 line-clamp-2">{artifact.title}</h4>
                            <Badge variant={artifact.isPublic ? "secondary" : "outline"} className="shrink-0">
                              {artifact.isPublic ? "Public" : "Private"}
                            </Badge>
                          </div>

                          <p className="text-sm text-slate-700 mb-3 line-clamp-2">{artifact.description || "No description provided."}</p>

                          <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-600 mb-1">
                              Parent decomposition
                            </p>
                            <p className="text-xs font-medium text-slate-800 line-clamp-1">{projectLabel}</p>
                            <p className="text-xs text-slate-700 line-clamp-1">{milestoneLabel}</p>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
                            <span>{artifact.createdAt ? format(new Date(artifact.createdAt), "MMM d, yyyy") : "No date"}</span>
                            <span className="capitalize">{artifact.artifactType || "file"}</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-4 min-h-6">
                            {artifactTags.length > 0 ? (
                              artifactTags.slice(0, 4).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs border-slate-300 text-slate-700">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-slate-600">No tags yet</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {artifact.artifactUrl && (
                              <a href={artifact.artifactUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View details
                                </Button>
                              </a>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openArtifactEditor(artifact)}
                              className="focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="credentials" className="space-y-6">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">My Achievements</h2>

              <CompetencyProgress studentId={user?.id} />

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Earned Credentials</h3>
                {credentialsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((item) => (
                      <Card key={item} className="animate-pulse border-0 apple-shadow">
                        <CardContent className="p-6">
                          <div className="h-5 bg-slate-200 rounded w-2/3 mb-2" />
                          <div className="h-3 bg-slate-200 rounded w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredCredentials.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-slate-900 mb-2">
                      {searchQuery ? "No credentials match your search" : "No credentials earned yet"}
                    </h3>
                    <p className="text-slate-700 max-w-md mx-auto">
                      Complete assessments and demonstrate competency growth to earn stickers, badges, and plaques.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      {searchQuery && (
                        <Button
                          variant="outline"
                          onClick={() => setSearchQuery("")}
                          className="focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                        >
                          Clear search
                        </Button>
                      )}
                      <Button asChild className="focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                        <a href="/student/dashboard">View Assessments</a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCredentials.map((credential) => (
                      <CredentialBadge key={credential.id} credential={credential} showDetails size="lg" />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog
        open={editingArtifact !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingArtifact(null);
            setArtifactReplacementFile(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Artifact Metadata</DialogTitle>
            <DialogDescription>
              Milestone title and description are managed in the milestone. You can update tags, visibility, and replace the deliverable file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 p-3 bg-slate-50">
              <p className="text-xs text-slate-500 mb-1">Milestone Title (read-only)</p>
              <p className="text-sm font-medium text-slate-900">{editingArtifact?.title}</p>
            </div>

            <div className="rounded-md border border-slate-200 p-3 bg-slate-50">
              <p className="text-xs text-slate-500 mb-1">Milestone Description (read-only)</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{editingArtifact?.description || "No description"}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="artifact-file-upload">Replace Deliverable (optional)</Label>
              <input
                id="artifact-file-upload"
                type="file"
                onChange={(event) => setArtifactReplacementFile(event.target.files?.[0] || null)}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("artifact-file-upload")?.click()}
                  disabled={isUploading}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  {artifactReplacementFile ? "Change File" : "Select Replacement"}
                </Button>
                {artifactReplacementFile ? (
                  <span className="text-sm text-slate-600">
                    {artifactReplacementFile.name} ({(artifactReplacementFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                ) : (
                  <span className="text-sm text-slate-500">No replacement selected</span>
                )}
              </div>
              {isUploading && (
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="artifact-tags">Tags</Label>
              <Input
                id="artifact-tags"
                value={artifactTags}
                onChange={(event) => setArtifactTags(event.target.value)}
                placeholder="research, collaboration, prototype"
              />
              <p className="text-xs text-slate-500">Comma-separated tags</p>
            </div>

            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">Public visibility</p>
                <p className="text-xs text-slate-500">Visible on your published portfolio page</p>
              </div>
              <Button
                type="button"
                variant={artifactIsPublic ? "default" : "outline"}
                size="sm"
                onClick={() => setArtifactIsPublic((current) => !current)}
              >
                {artifactIsPublic ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" /> Public
                  </>
                ) : (
                  "Private"
                )}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingArtifact(null);
                setArtifactReplacementFile(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveArtifact} disabled={updateArtifactMutation.isPending || isUploading}>
              {isUploading ? "Uploading..." : updateArtifactMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
