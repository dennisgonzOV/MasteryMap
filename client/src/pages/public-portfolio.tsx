import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CredentialBadge from "@/components/credential-badge";
import {
  Award,
  Calendar,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Image,
  Printer,
  Search,
  ShieldCheck,
  User,
  Video,
} from "lucide-react";

interface PublicPortfolioData {
  student: {
    id: number;
    username: string;
    profileImageUrl: string | null;
    firstName: string | null;
    lastName: string | null;
    schoolName: string | null;
    grade: string | null;
  };
  portfolio: {
    title: string;
    description: string | null;
    publicUrl: string;
    updatedAt: string | null;
  };
  verification: {
    verifiedCredentialCount: number;
    totalCredentialCount: number;
    lastVerifiedAt: string | null;
  };
  lastActivityAt: string | null;
  artifacts: Array<{
    id: number;
    title: string;
    description: string | null;
    artifactUrl: string | null;
    artifactType: string | null;
    tags: unknown;
    projectId: number | null;
    projectTitle: string | null;
    milestoneId: number | null;
    milestoneTitle: string | null;
    createdAt: string | null;
  }>;
  credentials: Array<{
    id: number;
    type: string;
    title: string;
    description: string | null;
    iconUrl: string | null;
    awardedAt: string | null;
    approvedBy?: number | null;
    componentSkillId: number | null;
    competencyId: number | null;
  }>;
}

const ALL_TYPES = "all";
const ALL_YEARS = "all";

function normalizeTags(tags: unknown): string[] {
  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];
}

export default function PublicPortfolio({ params }: { params: { publicUrl: string } }) {
  const publicUrl = params.publicUrl;
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);
  const [yearFilter, setYearFilter] = useState<string>(ALL_YEARS);

  const querySuffix = typeof window !== "undefined" ? window.location.search : "";

  const { data: portfolioData, isLoading, error } = useQuery<PublicPortfolioData>({
    queryKey: ["/api/portfolio/public", publicUrl, querySuffix],
    enabled: Boolean(publicUrl),
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/public/${encodeURIComponent(publicUrl)}${querySuffix}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Portfolio not found");
        }
        if (response.status === 410) {
          throw new Error("This portfolio link has expired");
        }
        throw new Error("Failed to fetch portfolio");
      }
      return response.json();
    },
  });

  const { student, portfolio, artifacts, credentials, verification, lastActivityAt } =
    portfolioData || {
      student: null,
      portfolio: null,
      artifacts: [],
      credentials: [],
      verification: null,
      lastActivityAt: null,
    };

  const fullName = student
    ? [student.firstName, student.lastName].filter(Boolean).join(" ") || student.username
    : "";

  const artifactTypes = useMemo(() => {
    const types = new Set<string>();
    artifacts.forEach((artifact) => {
      if (artifact.artifactType) {
        types.add(artifact.artifactType);
      }
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [artifacts]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    artifacts.forEach((artifact) => {
      if (artifact.createdAt) {
        years.add(new Date(artifact.createdAt).getFullYear().toString());
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [artifacts]);

  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((artifact) => {
      const title = artifact.title.toLowerCase();
      const description = (artifact.description || "").toLowerCase();
      const projectTitle = (artifact.projectTitle || "").toLowerCase();
      const milestoneTitle = (artifact.milestoneTitle || "").toLowerCase();
      const tags = normalizeTags(artifact.tags).map((tag) => tag.toLowerCase());
      const query = search.trim().toLowerCase();

      const matchesSearch =
        query.length === 0 ||
        title.includes(query) ||
        description.includes(query) ||
        projectTitle.includes(query) ||
        milestoneTitle.includes(query) ||
        tags.some((tag) => tag.includes(query));
      const matchesType = typeFilter === ALL_TYPES || artifact.artifactType === typeFilter;
      const artifactYear = artifact.createdAt ? new Date(artifact.createdAt).getFullYear().toString() : null;
      const matchesYear = yearFilter === ALL_YEARS || artifactYear === yearFilter;

      return matchesSearch && matchesType && matchesYear;
    });
  }, [artifacts, search, typeFilter, yearFilter]);

  const credentialCounts = useMemo(() => {
    return {
      stickers: credentials.filter((credential) => credential.type === "sticker").length,
      badges: credentials.filter((credential) => credential.type === "badge").length,
      plaques: credentials.filter((credential) => credential.type === "plaque").length,
    };
  }, [credentials]);

  const handlePrint = () => {
    window.print();
  };

  const renderArtifactPreview = (artifact: PublicPortfolioData["artifacts"][number]) => {
    if (!artifact.artifactUrl) {
      return (
        <div className="h-36 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
          No preview available
        </div>
      );
    }

    if (artifact.artifactType === "image") {
      return (
        <img
          src={artifact.artifactUrl}
          alt={artifact.title}
          className="h-36 w-full rounded-lg object-cover border border-slate-200"
        />
      );
    }

    if (artifact.artifactType === "video") {
      return (
        <video className="h-36 w-full rounded-lg border border-slate-200" controls preload="metadata">
          <source src={artifact.artifactUrl} />
        </video>
      );
    }

    return (
      <div className="h-40 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-600 text-sm px-3 text-center">
        <div className="space-y-2">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200">
            <FileText className="h-4 w-4 text-slate-600" />
          </div>
          <p>Open artifact to review source evidence</p>
        </div>
      </div>
    );
  };

  const getArtifactIcon = (type: string | null) => {
    switch (type) {
      case "image":
        return Image;
      case "video":
        return Video;
      default:
        return FileText;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700" />
          <span className="text-slate-700">Loading portfolio...</span>
        </div>
      </div>
    );
  }

  if (error || !portfolioData || !student || !portfolio || !verification) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md mx-4 w-full">
          <CardContent className="pt-6 text-center">
            <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Portfolio Unavailable</h1>
            <p className="text-slate-600 text-sm">{error instanceof Error ? error.message : "Unable to load this portfolio."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              {student.profileImageUrl ? (
                <img
                  src={student.profileImageUrl}
                  alt={fullName}
                  className="h-16 w-16 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-slate-800 text-white flex items-center justify-center text-xl font-semibold">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{portfolio.title}</h1>
                <p className="text-slate-700 text-sm">Digital learning transcript for project-based competency evidence.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <Badge variant="outline">Student: {fullName}</Badge>
                  {student.grade && <Badge variant="outline">Grade {student.grade}</Badge>}
                  {student.schoolName && <Badge variant="outline">{student.schoolName}</Badge>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Credentials</p>
              <p className="text-2xl font-semibold text-slate-900">{credentials.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Public Artifacts</p>
              <p className="text-2xl font-semibold text-slate-900">{artifacts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Verified Credentials</p>
              <p className="text-2xl font-semibold text-slate-900">{verification.verifiedCredentialCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Last Activity</p>
              <p className="text-sm font-semibold text-slate-900">
                {lastActivityAt ? format(new Date(lastActivityAt), "MMM d, yyyy") : "Not available"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <ShieldCheck className="h-4 w-4 mr-2 text-emerald-600" />
              Verification and Issuance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              <strong>{verification.verifiedCredentialCount}</strong> of <strong>{verification.totalCredentialCount}</strong> credentials include teacher verification metadata.
            </p>
            <p>
              Last verified update: {verification.lastVerifiedAt ? format(new Date(verification.lastVerifiedAt), "MMMM d, yyyy") : "Not available"}
            </p>
            <p>
              Proficiency rubric reference: <span className="font-medium">Emerging → Developing → Proficient → Applying</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Award className="h-4 w-4 mr-2 text-indigo-600" />
              Credential Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4 text-sm">
              <Badge variant="secondary">Stickers: {credentialCounts.stickers}</Badge>
              <Badge variant="secondary">Badges: {credentialCounts.badges}</Badge>
              <Badge variant="secondary">Plaques: {credentialCounts.plaques}</Badge>
            </div>
            {credentials.length === 0 ? (
              <p className="text-sm text-slate-600">No credentials are published yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {credentials.map((credential) => (
                  <Card key={credential.id} className="border border-slate-200">
                    <CardContent className="pt-4">
                      <CredentialBadge credential={credential as any} size="lg" showDetails />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Eye className="h-4 w-4 mr-2 text-blue-600" />
              Project Evidence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 print:hidden">
              <div className="lg:col-span-2 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search title, description, or tags"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TYPES}>All types</SelectItem>
                  {artifactTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_YEARS}>All years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredArtifacts.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-600 text-sm">
                No artifacts match the selected filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredArtifacts.map((artifact) => {
                  const Icon = getArtifactIcon(artifact.artifactType);
                  const tags = normalizeTags(artifact.tags);
                  const projectLabel = artifact.projectTitle || "Independent evidence";
                  const milestoneLabel = artifact.milestoneTitle || "No milestone linked";
                  return (
                    <Card key={artifact.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="h-4 w-4 text-blue-600 shrink-0" />
                            <h3 className="font-medium text-sm text-slate-900 truncate">{artifact.title}</h3>
                          </div>
                          {artifact.artifactType && <Badge variant="outline" className="text-[11px]">{artifact.artifactType}</Badge>}
                        </div>

                        <div className="overflow-hidden rounded-xl">
                          {renderArtifactPreview(artifact)}
                        </div>

                        {artifact.description && (
                          <p className="text-sm text-slate-600 line-clamp-3">{artifact.description}</p>
                        )}

                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            Traceability
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-800">
                            <FolderOpen className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{projectLabel}</span>
                            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate text-slate-600">{milestoneLabel}</span>
                          </div>
                        </div>

                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 4).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[11px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {artifact.createdAt ? format(new Date(artifact.createdAt), "MMM d, yyyy") : "No date"}
                          </span>
                          <div className="flex items-center gap-3">
                            {artifact.projectId && (
                              <a
                                href={`/explore/project/${artifact.projectId}`}
                                className="inline-flex items-center text-slate-600 hover:text-slate-800"
                              >
                                Project
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            )}
                            {artifact.artifactUrl && (
                              <a
                                href={artifact.artifactUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-700 hover:text-blue-800"
                              >
                                Open
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-xs text-slate-500">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>MasteryMap Public Portfolio</span>
            <span>Link token: {portfolio.publicUrl}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
