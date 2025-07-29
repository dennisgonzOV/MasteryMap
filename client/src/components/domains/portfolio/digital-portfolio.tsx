// Digital Portfolio Component - Extracted from digital-portfolio.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search,
  FileText,
  Image,
  Video,
  Download,
  ExternalLink,
  Share,
  Eye,
  EyeOff,
  Calendar,
  Award,
  QrCode
} from 'lucide-react';
import QRCode from 'qrcode';

interface PortfolioArtifact {
  id: number;
  title: string;
  description: string;
  artifactUrl: string;
  artifactType: 'image' | 'video' | 'document' | 'link' | 'text';
  tags: string[];
  isPublic: boolean;
  isApproved: boolean;
  createdAt: string;
  projectTitle?: string;
  milestoneTitle?: string;
}

interface Portfolio {
  id: number;
  title: string;
  description: string;
  qrCode: string;
  publicUrl: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Credential {
  id: number;
  type: 'sticker' | 'badge' | 'plaque';
  title: string;
  description: string;
  iconUrl: string;
  awardedAt: string;
}

interface DigitalPortfolioProps {
  studentId?: number;
  isPublicView?: boolean;
}

export function DigitalPortfolio({ studentId, isPublicView = false }: DigitalPortfolioProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState('artifacts');

  // Load portfolio data
  const { data: artifacts = [], isLoading: artifactsLoading } = useQuery({
    queryKey: studentId ? [`/api/portfolio/artifacts/${studentId}`] : ['/api/portfolio/artifacts'],
    retry: false,
  });

  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: studentId ? [`/api/portfolio/${studentId}`] : ['/api/portfolio'],
    retry: false,
  });

  const { data: credentials = [], isLoading: credentialsLoading } = useQuery({
    queryKey: studentId ? [`/api/credentials/${studentId}`] : ['/api/credentials'],
    retry: false,
  });

  // Generate QR code for portfolio
  React.useEffect(() => {
    if (portfolio?.publicUrl) {
      QRCode.toDataURL(portfolio.publicUrl)
        .then(dataUrl => setQrCodeDataUrl(dataUrl))
        .catch(err => console.error('Error generating QR code:', err));
    }
  }, [portfolio?.publicUrl]);

  // Filter artifacts based on search and tags
  const filteredArtifacts = artifacts.filter((artifact: PortfolioArtifact) => {
    const matchesSearch = artifact.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         artifact.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || artifact.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Get all unique tags
  const allTags = [...new Set(artifacts.flatMap((artifact: PortfolioArtifact) => artifact.tags))];

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCredentialIcon = (type: string) => {
    switch (type) {
      case 'sticker':
        return '🌟';
      case 'badge':
        return '🏆';
      case 'plaque':
        return '🎖️';
      default:
        return '🏅';
    }
  };

  const handleTogglePublic = async (artifactId: number, isPublic: boolean) => {
    try {
      await fetch(`/api/portfolio/artifacts/${artifactId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic })
      });
      // Refresh artifacts list
      window.location.reload();
    } catch (error) {
      console.error('Error updating artifact visibility:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (artifactsLoading && portfolioLoading && credentialsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Digital Portfolio</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Digital Portfolio</h2>
          {portfolio && (
            <p className="text-muted-foreground mt-1">{portfolio.description}</p>
          )}
        </div>
        {!isPublicView && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share Portfolio
            </Button>
          </div>
        )}
      </div>

      {/* QR Code Display */}
      {qrCodeDataUrl && portfolio?.isPublic && (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <img src={qrCodeDataUrl} alt="Portfolio QR Code" className="h-16 w-16" />
            <div>
              <h3 className="font-medium">Portfolio QR Code</h3>
              <p className="text-sm text-muted-foreground">
                Scan to view public portfolio
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {portfolio.publicUrl}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
        </TabsList>

        <TabsContent value="artifacts" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search artifacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {allTags.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant={!selectedTag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag('')}
                >
                  All
                </Button>
                {allTags.slice(0, 5).map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Artifacts Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredArtifacts.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No artifacts found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchTerm || selectedTag 
                        ? 'Try adjusting your search or filters'
                        : 'Complete projects to start building your portfolio'
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              filteredArtifacts.map((artifact: PortfolioArtifact) => (
                <Card key={artifact.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getArtifactIcon(artifact.artifactType)}
                        <CardTitle className="text-base">{artifact.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={artifact.isPublic ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {artifact.isPublic ? 'Public' : 'Private'}
                        </Badge>
                        {!isPublicView && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePublic(artifact.id, artifact.isPublic)}
                          >
                            {artifact.isPublic ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {artifact.description}
                    </p>
                    
                    {artifact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {artifact.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {(artifact.projectTitle || artifact.milestoneTitle) && (
                      <div className="text-xs text-muted-foreground">
                        {artifact.projectTitle && (
                          <div>Project: {artifact.projectTitle}</div>
                        )}
                        {artifact.milestoneTitle && (
                          <div>Milestone: {artifact.milestoneTitle}</div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(artifact.createdAt)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {credentials.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="text-center py-12">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No credentials earned yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Complete assessments to earn stickers, badges, and plaques
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              credentials.map((credential: Credential) => (
                <Card key={credential.id}>
                  <CardContent className="text-center p-6">
                    <div className="text-4xl mb-3">
                      {getCredentialIcon(credential.type)}
                    </div>
                    <h3 className="font-medium mb-2">{credential.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {credential.description}
                    </p>
                    <Badge variant="outline" className="mb-2">
                      {credential.type}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      Earned {formatDate(credential.awardedAt)}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}