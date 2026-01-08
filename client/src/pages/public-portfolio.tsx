import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CredentialBadge from "@/components/credential-badge";
import { 
  Award,
  Star,
  Image,
  FileText,
  Video,
  ExternalLink,
  User,
  Calendar
} from "lucide-react";

interface PublicPortfolioData {
  student: {
    id: number;
    username: string;
    profileImageUrl: string | null;
  };
  artifacts: Array<{
    id: number;
    title: string;
    description: string | null;
    artifactUrl: string | null;
    artifactType: string | null;
    tags: string[] | null;
    createdAt: string | null;
  }>;
  credentials: Array<{
    id: number;
    type: string;
    title: string;
    description: string | null;
    iconUrl: string | null;
    awardedAt: string | null;
    componentSkillId: number | null;
    competencyId: number | null;
  }>;
}

export default function PublicPortfolio({ params }: { params: { studentId: string } }) {
  const studentId = parseInt(params.studentId);

  const { data: portfolioData, isLoading, error } = useQuery<PublicPortfolioData>({
    queryKey: ["/api/portfolio/public", studentId],
    enabled: !isNaN(studentId),
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/public/${studentId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Portfolio not found");
        }
        throw new Error("Failed to fetch portfolio");
      }
      return response.json();
    },
  });

  const getArtifactIcon = (type: string | null) => {
    switch (type) {
      case 'image':
        return Image;
      case 'video':
        return Video;
      case 'document':
      case 'presentation':
        return FileText;
      default:
        return FileText;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading portfolio...</span>
        </div>
      </div>
    );
  }

  if (error || !portfolioData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Portfolio Not Found</h1>
            <p className="text-gray-600">
              This portfolio doesn't exist or is not available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student, artifacts, credentials } = portfolioData;

  const stickers = credentials.filter(c => c.type === 'sticker');
  const badges = credentials.filter(c => c.type === 'badge');
  const plaques = credentials.filter(c => c.type === 'plaque');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            {student.profileImageUrl ? (
              <img 
                src={student.profileImageUrl} 
                alt={student.username}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {student.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-student-name">
                {student.username}'s Portfolio
              </h1>
              <p className="text-gray-600">Student Learning Portfolio</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="credentials" className="space-y-6">
          <TabsList className="bg-white">
            <TabsTrigger value="credentials" data-testid="tab-credentials">
              <Award className="h-4 w-4 mr-2" />
              Credentials ({credentials.length})
            </TabsTrigger>
            <TabsTrigger value="artifacts" data-testid="tab-artifacts">
              <FileText className="h-4 w-4 mr-2" />
              Artifacts ({artifacts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="credentials" className="space-y-6">
            {credentials.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600">No credentials yet</h3>
                  <p className="text-gray-500 mt-2">This student hasn't earned any credentials yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {stickers.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Star className="h-5 w-5 text-yellow-500 mr-2" />
                      Stickers ({stickers.length})
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {stickers.map((credential) => (
                        <Card 
                          key={credential.id} 
                          className="text-center hover:shadow-md transition-shadow"
                          data-testid={`card-sticker-${credential.id}`}
                        >
                          <CardContent className="pt-4">
                            <CredentialBadge credential={credential as any} size="md" />
                            <p className="text-xs text-gray-600 mt-2 font-medium truncate">{credential.title}</p>
                            {credential.awardedAt && (
                              <p className="text-xs text-gray-400 mt-1">
                                {format(new Date(credential.awardedAt), 'MMM d, yyyy')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {badges.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Award className="h-5 w-5 text-blue-500 mr-2" />
                      Badges ({badges.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {badges.map((credential) => (
                        <Card 
                          key={credential.id} 
                          className="hover:shadow-md transition-shadow"
                          data-testid={`card-badge-${credential.id}`}
                        >
                          <CardContent className="pt-4 flex items-center space-x-4">
                            <CredentialBadge credential={credential as any} size="lg" />
                            <div>
                              <p className="font-medium text-gray-900">{credential.title}</p>
                              {credential.description && (
                                <p className="text-sm text-gray-600 line-clamp-2">{credential.description}</p>
                              )}
                              {credential.awardedAt && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {format(new Date(credential.awardedAt), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {plaques.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Award className="h-5 w-5 text-purple-500 mr-2" />
                      Plaques ({plaques.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {plaques.map((credential) => (
                        <Card 
                          key={credential.id} 
                          className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500"
                          data-testid={`card-plaque-${credential.id}`}
                        >
                          <CardContent className="pt-4 flex items-center space-x-4">
                            <CredentialBadge credential={credential as any} size="lg" />
                            <div>
                              <p className="font-medium text-gray-900">{credential.title}</p>
                              {credential.description && (
                                <p className="text-sm text-gray-600 line-clamp-2">{credential.description}</p>
                              )}
                              {credential.awardedAt && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {format(new Date(credential.awardedAt), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="artifacts" className="space-y-6">
            {artifacts.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600">No public artifacts</h3>
                  <p className="text-gray-500 mt-2">This student hasn't shared any artifacts publicly yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {artifacts.map((artifact) => {
                  const IconComponent = getArtifactIcon(artifact.artifactType);
                  return (
                    <Card 
                      key={artifact.id} 
                      className="hover:shadow-lg transition-shadow"
                      data-testid={`card-artifact-${artifact.id}`}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-sm">
                          <IconComponent className="h-4 w-4 text-blue-600" />
                          <span className="truncate">{artifact.title}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {artifact.description && (
                          <p className="text-sm text-gray-600 line-clamp-3">{artifact.description}</p>
                        )}
                        
                        {artifact.artifactType && (
                          <Badge variant="outline" className="text-xs">
                            {artifact.artifactType}
                          </Badge>
                        )}
                        
                        {artifact.tags && artifact.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {artifact.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {artifact.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{artifact.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between pt-2">
                          {artifact.createdAt && (
                            <span className="text-xs text-gray-400 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(artifact.createdAt), 'MMM d, yyyy')}
                            </span>
                          )}
                          {artifact.artifactUrl && (
                            <a 
                              href={artifact.artifactUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                              data-testid={`link-artifact-${artifact.id}`}
                            >
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-500 text-sm">
          <p>Powered by MasteryMap - Student Learning Portfolio</p>
        </div>
      </footer>
    </div>
  );
}
