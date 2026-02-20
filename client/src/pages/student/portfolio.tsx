import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
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
import type { CredentialDTO, PortfolioArtifactDTO, PortfolioSettingsDTO } from "@shared/contracts/api";

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

const LINK_EXPIRY_OPTIONS = [
  { label: "Never", value: "never" },
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
];

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags.filter((tag): tag is string => typeof tag === "string");
}

export default function StudentPortfolio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [linkExpiration, setLinkExpiration] = useState("never");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [qrCodeError, setQrCodeError] = useState<string>("");
  const [isShareLoading, setIsShareLoading] = useState(false);

  const [editingArtifact, setEditingArtifact] = useState<PortfolioArtifactView | null>(null);
  const [artifactTitle, setArtifactTitle] = useState("");
  const [artifactDescription, setArtifactDescription] = useState("");
  const [artifactTags, setArtifactTags] = useState("");
  const [artifactIsPublic, setArtifactIsPublic] = useState(false);

  const artifactQueryKey = useMemo(() => ["/api/portfolio/artifacts", user?.id], [user?.id]);
  const settingsQueryKey = useMemo(() => ["/api/portfolio/settings", user?.id], [user?.id]);

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

  const {
    data: portfolioSettings,
    isLoading: settingsLoading,
    error: settingsError,
  } = useQuery<PortfolioSettingsDTO>({
    queryKey: settingsQueryKey,
    queryFn: api.getPortfolioSettings,
    enabled: isAuthenticated && user?.role === "student" && !!user?.id,
    retry: false,
  });

  useEffect(() => {
    if (
      (credentialsError && isUnauthorizedError(credentialsError as Error)) ||
      (artifactsError && isUnauthorizedError(artifactsError as Error)) ||
      (settingsError && isUnauthorizedError(settingsError as Error))
    ) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
    }
  }, [credentialsError, artifactsError, settingsError, toast]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student" || !user?.id) {
      return;
    }

    const loadShareData = async () => {
      setIsShareLoading(true);
      try {
        const expirationDays = linkExpiration === "never" ? undefined : Number(linkExpiration);

        const [linkData, qrData] = await Promise.all([
          api.getPortfolioShareLink(expirationDays),
          api.getPortfolioShareQrCode(expirationDays),
        ]);

        setPortfolioUrl(linkData.portfolioUrl);
        setShareExpiresAt(linkData.expiresAt ? String(linkData.expiresAt) : null);
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
  }, [isAuthenticated, linkExpiration, user?.id, user?.role]);

  const updatePortfolioSettingsMutation = useMutation({
    mutationFn: (payload: { isPublic?: boolean; title?: string; description?: string | null }) =>
      api.updatePortfolioSettings(payload),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(settingsQueryKey, updatedSettings);
    },
  });

  const updateArtifactMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updatePortfolioArtifact(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: artifactQueryKey });
    },
  });

  const filteredArtifacts = artifacts.filter((artifact) => {
    const description = artifact.description ?? "";
    const tags = normalizeTags(artifact.tags);
    const matchesSearch =
      artifact.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === "all" || artifact.artifactType === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredCredentials = credentials.filter((credential) =>
    credential.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

  const handleTogglePublish = async () => {
    if (!portfolioSettings) {
      return;
    }

    const nextState = !(portfolioSettings.isPublic ?? false);
    try {
      await updatePortfolioSettingsMutation.mutateAsync({ isPublic: nextState });
      toast({
        title: nextState ? "Portfolio published" : "Portfolio set to private",
        description: nextState
          ? "External viewers can access your shared link."
          : "Public access is now disabled for your shared link.",
      });
    } catch {
      toast({
        title: "Update failed",
        description: "Could not update portfolio visibility. Try again.",
        variant: "destructive",
      });
    }
  };

  const openArtifactEditor = (artifact: PortfolioArtifactView) => {
    setEditingArtifact(artifact);
    setArtifactTitle(artifact.title);
    setArtifactDescription(artifact.description ?? "");
    setArtifactTags(normalizeTags(artifact.tags).join(", "));
    setArtifactIsPublic(Boolean(artifact.isPublic));
  };

  const handleSaveArtifact = async () => {
    if (!editingArtifact) {
      return;
    }

    if (!artifactTitle.trim()) {
      toast({
        title: "Title required",
        description: "Artifact title cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    const tags = artifactTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      await updateArtifactMutation.mutateAsync({
        id: editingArtifact.id,
        data: {
          title: artifactTitle.trim(),
          description: artifactDescription.trim() ? artifactDescription.trim() : null,
          tags,
          isPublic: artifactIsPublic,
        },
      });

      setEditingArtifact(null);
      toast({
        title: "Artifact updated",
        description: "Portfolio artifact details were saved.",
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

      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">My Portfolio</h1>
              <p className="text-slate-600">Manage your public portfolio, artifacts, and credential showcase.</p>
            </div>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              disabled={!portfolioUrl || !(portfolioSettings?.isPublic ?? false)}
            >
              <Share className="h-4 w-4 mr-2" />
              Copy Public Link
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 apple-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-slate-700">Stickers</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{getCredentialCount("sticker")}</span>
              </CardContent>
            </Card>
            <Card className="border-0 apple-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-slate-700">Badges</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{getCredentialCount("badge")}</span>
              </CardContent>
            </Card>
            <Card className="border-0 apple-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-purple-600" />
                  <span className="text-sm text-slate-700">Plaques</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{getCredentialCount("plaque")}</span>
              </CardContent>
            </Card>
            <Card className="border-0 apple-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm text-slate-700">Artifacts</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{artifacts.length}</span>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 apple-shadow mb-8">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-600" />
                      Public Portfolio Controls
                    </h3>
                    {settingsLoading ? (
                      <Badge variant="outline">Loading...</Badge>
                    ) : (
                      <Badge variant={portfolioSettings?.isPublic ? "default" : "secondary"}>
                        {portfolioSettings?.isPublic ? "Published" : "Private"}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-slate-600">
                    Portfolio-level publishing controls who can access your shared page. Artifact-level visibility controls
                    which pieces appear there.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant={portfolioSettings?.isPublic ? "outline" : "default"}
                      onClick={handleTogglePublish}
                      disabled={updatePortfolioSettingsMutation.isPending || settingsLoading}
                    >
                      {portfolioSettings?.isPublic ? "Set Portfolio Private" : "Publish Portfolio"}
                    </Button>

                    <Select value={linkExpiration} onValueChange={setLinkExpiration}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Link expiry" />
                      </SelectTrigger>
                      <SelectContent>
                        {LINK_EXPIRY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      onClick={handleCopyLink}
                      disabled={!portfolioUrl || !(portfolioSettings?.isPublic ?? false)}
                    >
                      Copy Link
                    </Button>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="text-slate-700 break-all">{portfolioUrl || "Generating share URL..."}</p>
                    {shareExpiresAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        Expires on {format(new Date(shareExpiresAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                    {!shareExpiresAt && (
                      <p className="text-xs text-slate-500 mt-1">This share link does not expire.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-2">
                  <div className="w-28 h-28 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                    {isShareLoading ? (
                      <div className="animate-pulse w-20 h-20 bg-slate-200 rounded" />
                    ) : qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="Portfolio QR code" className="w-20 h-20" />
                    ) : (
                      <div className="text-xs text-slate-500 text-center px-2">
                        <QrCode className="h-7 w-7 mx-auto mb-1" />
                        QR unavailable
                      </div>
                    )}
                  </div>
                  {qrCodeError && <p className="text-xs text-red-600 max-w-[180px] text-right">{qrCodeError}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="apple-shadow border-0 mb-8">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search artifacts and credentials..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="artifacts" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
            </TabsList>

            <TabsContent value="artifacts" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-900">Project Artifacts</h3>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-52">
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
              </div>

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
                  <p className="text-slate-600 max-w-md mx-auto">
                    Complete project milestones to collect artifacts, then curate title/description/tags before sharing.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredArtifacts.map((artifact) => {
                    const Icon = getArtifactIcon(artifact.artifactType || "document");
                    const artifactTags = normalizeTags(artifact.tags);
                    return (
                      <Card key={artifact.id} className="apple-shadow border-0">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                              <Icon className="h-6 w-6 text-blue-700" />
                            </div>
                            <Badge variant={artifact.isPublic ? "secondary" : "outline"}>
                              {artifact.isPublic ? "Public" : "Private"}
                            </Badge>
                          </div>

                          <h4 className="font-semibold text-slate-900 mb-2 line-clamp-2">{artifact.title}</h4>
                          <p className="text-sm text-slate-600 mb-3 line-clamp-3">{artifact.description || "No description"}</p>

                          <div className="flex flex-wrap gap-1 mb-4 min-h-6">
                            {artifactTags.length > 0 ? (
                              artifactTags.slice(0, 4).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">No tags</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-500">
                              {artifact.createdAt ? format(new Date(artifact.createdAt), "MMM d, yyyy") : "No date"}
                            </span>
                            <div className="flex items-center gap-2">
                              {artifact.artifactUrl && (
                                <a href={artifact.artifactUrl} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                </a>
                              )}
                              <Button size="sm" variant="outline" onClick={() => openArtifactEditor(artifact)}>
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="credentials" className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">My Achievements</h3>

              <CompetencyProgress studentId={user?.id} />

              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-md font-medium text-slate-900 mb-4">Earned Credentials</h4>
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
                    <p className="text-slate-600 max-w-md mx-auto">
                      Complete assessments and demonstrate competency growth to earn stickers, badges, and plaques.
                    </p>
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

      <Dialog open={editingArtifact !== null} onOpenChange={(open) => !open && setEditingArtifact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Artifact Metadata</DialogTitle>
            <DialogDescription>
              Update how this artifact appears in your public portfolio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="artifact-title">Title</Label>
              <Input
                id="artifact-title"
                value={artifactTitle}
                onChange={(event) => setArtifactTitle(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="artifact-description">Description</Label>
              <Textarea
                id="artifact-description"
                value={artifactDescription}
                onChange={(event) => setArtifactDescription(event.target.value)}
                rows={4}
              />
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
            <Button variant="outline" onClick={() => setEditingArtifact(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveArtifact} disabled={updateArtifactMutation.isPending}>
              {updateArtifactMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
