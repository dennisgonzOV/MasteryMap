import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { api } from "@/lib/api";
import QRCode from "qrcode";
import Navigation from "@/components/navigation";
import CredentialBadge from "@/components/credential-badge";
import { CompetencyProgress } from "@/components/competency-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Award,
  QrCode,
  Share,
  Eye,
  Download,
  Star,
  Trophy,
  Image,
  FileText,
  Video,
  Link as LinkIcon,
  ExternalLink
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export default function StudentPortfolio() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch student credentials
  const { data: credentials = [], isLoading: credentialsLoading, error: credentialsError } = useQuery({
    queryKey: ["/api/credentials/student", user?.id],
    enabled: isAuthenticated && user?.role === 'student' && !!user?.id,
    retry: false,
  });

  // Fetch portfolio artifacts
  const { data: artifacts = [], isLoading: artifactsLoading, error: artifactsError } = useQuery({
    queryKey: ["/api/portfolio/artifacts", user?.id],
    enabled: isAuthenticated && user?.role === 'student' && !!user?.id,
    retry: false,
  });

  // Generate QR code for portfolio sharing
  useEffect(() => {
    if (isAuthenticated && user) {
      const portfolioUrl = `${window.location.origin}/portfolio/student/${user.id}`;
      QRCode.toDataURL(portfolioUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1F2937', // Dark gray
          light: '#FFFFFF', // White
        },
      })
        .then((dataUrl) => {
          setQrCodeDataUrl(dataUrl);
        })
        .catch((error) => {
          console.error('Error generating QR code:', error);
        });
    }
  }, [isAuthenticated, user]);

  // Handle unauthorized errors
  useEffect(() => {
    if ((credentialsError && isUnauthorizedError(credentialsError as Error)) ||
        (artifactsError && isUnauthorizedError(artifactsError as Error))) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
    }
  }, [credentialsError, artifactsError, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'student') {
    return null;
  }

  // Use real artifacts from API
  const allArtifacts = artifacts;

  // Filter artifacts
  const filteredArtifacts = allArtifacts.filter(artifact => {
    const matchesSearch = artifact.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artifact.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artifact.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === "all" || artifact.artifactType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Filter credentials
  const filteredCredentials = credentials.filter(credential => {
    return credential.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'image':
        return Image;
      case 'video':
        return Video;
      case 'document':
      case 'presentation':
        return FileText;
      case 'interactive':
        return LinkIcon;
      default:
        return FileText;
    }
  };

  const getCredentialCount = (type: string) => {
    return credentials.filter(c => c.type === type).length;
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navigation />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Portfolio
              </h1>
              <p className="text-gray-600">
                Showcase your work, achievements, and learning journey.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  const portfolioUrl = `${window.location.origin}/portfolio/student/${user?.id}`;
                  navigator.clipboard.writeText(portfolioUrl);
                  toast({
                    title: "Link copied!",
                    description: "Portfolio link has been copied to clipboard.",
                  });
                }}
              >
                <Share className="h-4 w-4 mr-2" />
                Share Portfolio
              </Button>
            </div>
          </div>

          {/* Portfolio Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="apple-shadow border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Stickers</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {getCredentialCount('sticker')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-700">Badges</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {getCredentialCount('badge')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">Plaques</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {getCredentialCount('plaque')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="apple-shadow border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Artifacts</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {allArtifacts.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="apple-shadow border-0 mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search artifacts and credentials..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 focus-ring"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Content */}
          <Tabs defaultValue="artifacts" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
            </TabsList>

            {/* Artifacts Tab */}
            <TabsContent value="artifacts" className="space-y-6">
              {/* Artifact Type Filter */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Project Artifacts</h3>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48 focus-ring">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="presentation">Presentations</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="interactive">Interactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {artifactsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="animate-pulse">
                      <Card className="apple-shadow border-0">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="h-32 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-full"></div>
                            <div className="flex justify-between">
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                              <div className="h-6 bg-gray-200 rounded w-16"></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : filteredArtifacts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {searchQuery || typeFilter !== "all" ? "No artifacts match your filters" : "No artifacts yet"}
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {searchQuery || typeFilter !== "all" 
                      ? "Try adjusting your search criteria or filters to find what you're looking for."
                      : "Complete project milestones to add artifacts to your portfolio."
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredArtifacts.map((artifact) => {
                    const Icon = getArtifactIcon(artifact.artifactType);
                    return (
                      <Card key={artifact.id} className="apple-shadow border-0 card-hover">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                              <Icon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex items-center space-x-2">
                              {artifact.isPublic && (
                                <Badge variant="secondary" className="text-xs">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Public
                                </Badge>
                              )}
                              {!artifact.isApproved && (
                                <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                  Pending Review
                                </Badge>
                              )}
                            </div>
                          </div>

                          <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                            {artifact.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {artifact.description}
                          </p>

                          <div className="space-y-2 mb-4">
                            <p className="text-xs text-blue-600 font-medium">
                              {artifact.projectTitle}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {artifact.tags?.map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {format(new Date(artifact.createdAt), 'MMM d, yyyy')}
                            </span>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Credentials Tab */}
            <TabsContent value="credentials" className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">My Achievements</h3>
              
              {/* Competency Progress Section */}
              <CompetencyProgress />

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Earned Credentials</h4>

                {credentialsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="animate-pulse">
                      <Card className="apple-shadow border-0">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : filteredCredentials.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {searchQuery ? "No credentials match your search" : "No credentials earned yet"}
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {searchQuery 
                      ? "Try adjusting your search to find specific achievements."
                      : "Complete assessments and demonstrate competency mastery to earn stickers, badges, and plaques."
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCredentials.map((credential) => (
                    <CredentialBadge 
                      key={credential.id} 
                      credential={credential} 
                      showDetails 
                      size="lg"
                    />
                  ))}
                </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* QR Code Sharing Section */}
          <Card className="apple-shadow border-0 mt-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Share Your Portfolio</h4>
                  <p className="text-sm text-gray-600">
                    Scan this QR code or copy the link to share your portfolio with others
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                    {qrCodeDataUrl ? (
                      <img 
                        src={qrCodeDataUrl} 
                        alt="Portfolio QR Code"
                        className="w-20 h-20"
                      />
                    ) : (
                      <div className="animate-pulse w-20 h-20 bg-gray-200 rounded"></div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const portfolioUrl = `${window.location.origin}/portfolio/student/${user?.id}`;
                        navigator.clipboard.writeText(portfolioUrl);
                        toast({
                          title: "Link copied!",
                          description: "Portfolio link has been copied to clipboard.",
                        });
                      }}
                      className="w-full"
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
