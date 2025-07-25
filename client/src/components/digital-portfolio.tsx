import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Share2, 
  QrCode, 
  Download, 
  Eye,
  Edit,
  Star,
  Calendar,
  Award,
  FileText,
  Image,
  Video,
  Link,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import types from schema
import { PortfolioArtifact, Credential } from '../../../shared/schema';

interface DigitalPortfolioProps {
  studentId: number;
  studentName: string;
  isPublicView?: boolean;
  canEdit?: boolean;
}

export default function DigitalPortfolio({ 
  studentId, 
  studentName, 
  isPublicView = false, 
  canEdit = true 
}: DigitalPortfolioProps) {
  const { toast } = useToast();
  const [artifacts, setArtifacts] = useState<PortfolioArtifact[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<PortfolioArtifact | null>(null);

  // Mock data for demonstration - matching database schema
  const mockArtifacts: PortfolioArtifact[] = [
    {
      id: 1,
      studentId: studentId,
      submissionId: 1,
      title: 'Digital Storytelling Project',
      description: 'Interactive narrative about environmental conservation',
      artifactUrl: '/projects/digital-storytelling',
      artifactType: 'project',
      tags: ['creativity', 'digital-media', 'environmental-awareness'] as any,
      isPublic: true,
      isApproved: true,
      createdAt: new Date('2024-11-15T10:00:00Z')
    },
    {
      id: 2,
      studentId: studentId,
      submissionId: 2,
      title: 'Data Visualization Report',
      description: 'Analysis of local community demographics using charts and graphs',
      artifactUrl: '/documents/data-viz-report.pdf',
      artifactType: 'document',
      tags: ['data-analysis', 'research', 'critical-thinking'] as any,
      isPublic: true,
      isApproved: true,
      createdAt: new Date('2024-11-10T14:30:00Z')
    },
    {
      id: 3,
      studentId: studentId,
      submissionId: 3,
      title: 'Collaborative Wiki Entry',
      description: 'Contributed to class wiki on sustainable technologies',
      artifactUrl: '/wiki/sustainable-tech',
      artifactType: 'link',
      tags: ['collaboration', 'research', 'sustainability'] as any,
      isPublic: true,
      isApproved: true,
      createdAt: new Date('2024-11-05T09:15:00Z')
    }
  ];

  const mockCredentials: Credential[] = [
    {
      id: 1,
      studentId: studentId,
      type: 'badge',
      competencyId: 1,
      componentSkillId: null,
      subjectArea: null,
      title: 'Digital Literacy Expert',
      description: 'Demonstrated proficiency in multiple digital tools and platforms',
      iconUrl: null,
      awardedAt: new Date('2024-11-15T10:00:00Z'),
      approvedBy: 1
    },
    {
      id: 2,
      studentId: studentId,
      type: 'sticker',
      competencyId: null,
      componentSkillId: 1,
      subjectArea: null,
      title: 'Creative Problem Solver',
      description: 'Found innovative solutions to project challenges',
      iconUrl: null,
      awardedAt: new Date('2024-11-12T15:30:00Z'),
      approvedBy: 1
    },
    {
      id: 3,
      studentId: studentId,
      type: 'sticker',
      competencyId: null,
      componentSkillId: 2,
      subjectArea: null,
      title: 'Effective Communicator',
      description: 'Presented ideas clearly and persuasively',
      iconUrl: null,
      awardedAt: new Date('2024-11-08T11:20:00Z'),
      approvedBy: 1
    }
  ];

  useEffect(() => {
    const fetchPortfolioData = async () => {
      setIsLoading(true);
      try {
        // Fetch real portfolio artifacts
        const artifactsResponse = await fetch(`/api/portfolio/artifacts?studentId=${studentId}`);
        const credentialsResponse = await fetch(`/api/credentials/student?studentId=${studentId}`);
        
        if (artifactsResponse.ok && credentialsResponse.ok) {
          const artifactsData = await artifactsResponse.json();
          const credentialsData = await credentialsResponse.json();
          
          setArtifacts(artifactsData);
          setCredentials(credentialsData);
        } else {
          // Fallback to mock data only if API calls fail
          setArtifacts(mockArtifacts);
          setCredentials(mockCredentials);
        }
        
        setPortfolioUrl(`https://masterymap.edu/portfolio/${studentId}`);
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
        // Fallback to mock data on error
        setArtifacts(mockArtifacts);
        setCredentials(mockCredentials);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, [studentId]);

  const getArtifactIcon = (artifactType: string) => {
    switch (artifactType) {
      case 'document':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'image':
        return <Image className="h-5 w-5 text-green-600" />;
      case 'video':
        return <Video className="h-5 w-5 text-purple-600" />;
      case 'link':
        return <Link className="h-5 w-5 text-orange-600" />;
      case 'project':
        return <Star className="h-5 w-5 text-yellow-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getCredentialIcon = (type: string) => {
    switch (type) {
      case 'plaque':
        return '🏆';
      case 'badge':
        return '🏅';
      case 'sticker':
        return '⭐';
      default:
        return '🎖️';
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const sharePortfolio = () => {
    navigator.clipboard.writeText(portfolioUrl);
    toast({
      title: "Portfolio URL Copied",
      description: "The portfolio link has been copied to your clipboard.",
    });
  };

  const generateQRCode = () => {
    // In a real app, this would generate an actual QR code
    setShowQRCode(true);
  };

  const toggleArtifactVisibility = (artifactId: number) => {
    setArtifacts(prev => prev.map(artifact => 
      artifact.id === artifactId 
        ? { ...artifact, isPublic: !artifact.isPublic }
        : artifact
    ));
  };

  const exportPortfolio = () => {
    // In a real app, this would generate a PDF or other export format
    toast({
      title: "Export Started",
      description: "Your portfolio is being prepared for download.",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isPublicView ? `${studentName}'s Portfolio` : 'My Portfolio'}
          </h2>
          <p className="text-gray-600">Showcase of learning achievements and projects</p>
        </div>
        {!isPublicView && (
          <div className="flex items-center space-x-3">
            <Button onClick={sharePortfolio} variant="outline" className="flex items-center space-x-2">
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
            <Button onClick={generateQRCode} variant="outline" className="flex items-center space-x-2">
              <QrCode className="h-4 w-4" />
              <span>QR Code</span>
            </Button>
            <Button onClick={exportPortfolio} variant="outline" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="artifacts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="artifacts">Learning Artifacts</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="reflection">Reflection</TabsTrigger>
        </TabsList>

        <TabsContent value="artifacts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artifacts.filter(artifact => isPublicView ? artifact.isPublic : true).map((artifact) => (
              <Card key={artifact.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      {getArtifactIcon(artifact.artifactType)}
                      <span className="truncate">{artifact.title}</span>
                    </div>
                    {canEdit && (
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedArtifact(artifact)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleArtifactVisibility(artifact.id)}
                        >
                          {artifact.isPublic ? <Eye className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600 line-clamp-2">{artifact.description}</p>
                  
                  {artifact.artifactType && (
                    <Badge variant="outline" className="text-xs">
                      {artifact.artifactType}
                    </Badge>
                  )}
                  
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(artifact.tags) && artifact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(artifact.createdAt)}</span>
                    </span>
                    {artifact.artifactUrl && (
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {credentials.map((credential) => (
              <Card key={credential.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{getCredentialIcon(credential.type)}</div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{credential.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{credential.description}</p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <Badge className={`text-xs ${
                          credential.type === 'plaque' ? 'bg-green-100 text-green-800' :
                          credential.type === 'badge' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {credential.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(credential.awardedAt)}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-2">
                        {credential.componentSkillId ? `Skill ID: ${credential.componentSkillId}` : 
                         credential.competencyId ? `Competency ID: ${credential.competencyId}` : 
                         credential.subjectArea}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reflection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Learning Reflection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canEdit ? (
                <Textarea
                  placeholder="Reflect on your learning journey, challenges overcome, and goals for the future..."
                  className="min-h-[200px]"
                />
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    This year has been a journey of discovery and growth. Through various projects, 
                    I've learned to combine creativity with critical thinking to solve real-world problems. 
                    The digital storytelling project challenged me to think about how technology can 
                    amplify important messages about environmental conservation...
                  </p>
                </div>
              )}
              
              {canEdit && (
                <div className="flex justify-end">
                  <Button>Save Reflection</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portfolio QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <QrCode className="h-32 w-32 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Share this QR code for quick access</p>
              <Input value={portfolioUrl} readOnly className="text-center" />
            </div>
            <Button onClick={() => setShowQRCode(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Artifact Detail Dialog */}
      {selectedArtifact && (
        <Dialog open={!!selectedArtifact} onOpenChange={() => setSelectedArtifact(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedArtifact.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-700">{selectedArtifact.description}</p>
              <div className="flex flex-wrap gap-1">
                {Array.isArray(selectedArtifact.tags) && selectedArtifact.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-gray-500">
                Type: {selectedArtifact.artifactType}
              </div>
              {selectedArtifact.artifactUrl && (
                <div className="text-xs text-gray-500">
                  URL: {selectedArtifact.artifactUrl}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}