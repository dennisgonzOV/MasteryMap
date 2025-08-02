import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Brain, 
  BookOpen, 
  Lightbulb, 
  Users, 
  Target,
  Calculator,
  MessageSquare,
  Search,
  Microscope,
  Palette,
  Building,
  Globe,
  Heart,
  Zap,
  Shield,
  Star,
  TrendingUp,
  Eye,
  Handshake,
  Award,
  Settings,
  ChevronUp,
  MessageCircle,
  Puzzle,
  Scale,
  Compass,
  Flower,
  CheckCircle2
} from "lucide-react";

// Competency data with XQ competencies from the hive image
const competencyData = [
  // Green - Learners for Life (Self-skills)
  { id: 1, name: "Self-Regulation", category: "learners-for-life", icon: Settings, row: 0, col: 0, color: "bg-green-500" },
  { id: 2, name: "Self-Advocacy", category: "learners-for-life", icon: ChevronUp, row: 0, col: 1, color: "bg-green-500" },
  { id: 3, name: "Self-Motivation", category: "learners-for-life", icon: Target, row: 0, col: 2, color: "bg-green-500" },
  { id: 4, name: "Wayfinding", category: "learners-for-life", icon: Compass, row: 0, col: 3, color: "bg-green-500" },
  
  // Orange - Masters of All Fundamental Literacies
  { id: 5, name: "Mathematical Modeling", category: "fundamental-literacies", icon: Calculator, row: 1, col: 0, color: "bg-orange-500" },
  { id: 6, name: "Persuasive Communication", category: "fundamental-literacies", icon: MessageSquare, row: 1, col: 1, color: "bg-orange-500" },
  { id: 7, name: "Recognizing Conflict", category: "learners-for-life", icon: Eye, row: 1, col: 2, color: "bg-green-500" },
  { id: 8, name: "Understanding Self", category: "learners-for-life", icon: Brain, row: 1, col: 3, color: "bg-green-500" },
  { id: 9, name: "Pursuing Goals", category: "original-thinkers", icon: Target, row: 1, col: 4, color: "bg-red-500" },
  { id: 10, name: "Sharing Ideas", category: "original-thinkers", icon: MessageCircle, row: 1, col: 5, color: "bg-red-500" },
  { id: 11, name: "Problem Seeking", category: "original-thinkers", icon: Search, row: 1, col: 6, color: "bg-red-500" },
  
  // Second Orange row
  { id: 12, name: "Interpreting Data", category: "fundamental-literacies", icon: TrendingUp, row: 2, col: 0, color: "bg-orange-500" },
  { id: 13, name: "Making Meaning", category: "fundamental-literacies", icon: Lightbulb, row: 2, col: 1, color: "bg-orange-500" },
  { id: 14, name: "Computational Thinking", category: "fundamental-literacies", icon: Brain, row: 2, col: 2, color: "bg-orange-500" },
  { id: 15, name: "Receiving Feedback", category: "learners-for-life", icon: MessageSquare, row: 2, col: 3, color: "bg-green-500" },
  { id: 16, name: "Wellness", category: "learners-for-life", icon: Heart, row: 2, col: 4, color: "bg-green-500" },
  { id: 17, name: "Synthesis", category: "original-thinkers", icon: Puzzle, row: 2, col: 5, color: "bg-red-500" },
  { id: 18, name: "Interpreting Information", category: "original-thinkers", icon: BookOpen, row: 2, col: 6, color: "bg-red-500" },
  { id: 19, name: "Problem Solving", category: "original-thinkers", icon: Zap, row: 2, col: 7, color: "bg-red-500" },
  
  // Third row with center pieces
  { id: 20, name: "Scientific Investigation", category: "fundamental-literacies", icon: Microscope, row: 3, col: 1, color: "bg-orange-500" },
  { id: 21, name: "Critical Dialogue", category: "fundamental-literacies", icon: MessageSquare, row: 3, col: 2, color: "bg-orange-500" },
  { id: 22, name: "Masters of All Fundamental Literacies", category: "fundamental-literacies", icon: Award, row: 3, col: 3, color: "bg-orange-500", isCenter: true },
  { id: 23, name: "Learners for Life", category: "learners-for-life", icon: Flower, row: 3, col: 4, color: "bg-green-500", isCenter: true },
  { id: 24, name: "Original Thinkers", category: "original-thinkers", icon: Star, row: 3, col: 5, color: "bg-red-500", isCenter: true },
  { id: 25, name: "Creative Process", category: "original-thinkers", icon: Palette, row: 3, col: 6, color: "bg-red-500" },
  { id: 26, name: "Logical Thinking", category: "original-thinkers", icon: Brain, row: 3, col: 7, color: "bg-red-500" },
  
  // Blue row - Holders of Foundational Knowledge
  { id: 27, name: "Governments", category: "foundational-knowledge", icon: Building, row: 4, col: 2, color: "bg-blue-500" },
  { id: 28, name: "Politics", category: "foundational-knowledge", icon: Scale, row: 4, col: 3, color: "bg-blue-500" },
  { id: 29, name: "Holders of Foundational Knowledge", category: "foundational-knowledge", icon: BookOpen, row: 4, col: 4, color: "bg-blue-500", isCenter: true },
  { id: 30, name: "Generous Collaborators", category: "generous-collaborators", icon: Users, row: 4, col: 5, color: "bg-purple-500", isCenter: true },
  { id: 31, name: "Healthy Relationships", category: "generous-collaborators", icon: Heart, row: 4, col: 6, color: "bg-purple-500" },
  { id: 32, name: "Negotiating Conflict", category: "generous-collaborators", icon: Handshake, row: 4, col: 7, color: "bg-purple-500" },
  
  // Bottom blue and purple rows
  { id: 33, name: "Artistic Expression", category: "foundational-knowledge", icon: Palette, row: 5, col: 3, color: "bg-blue-500" },
  { id: 34, name: "Art Analysis", category: "foundational-knowledge", icon: Eye, row: 5, col: 4, color: "bg-blue-500" },
  { id: 35, name: "Navigating Power", category: "generous-collaborators", icon: Compass, row: 5, col: 5, color: "bg-purple-500" },
  { id: 36, name: "Diverse Perspectives", category: "generous-collaborators", icon: Globe, row: 5, col: 6, color: "bg-purple-500" },
  { id: 37, name: "Building Empathy", category: "generous-collaborators", icon: Heart, row: 5, col: 7, color: "bg-purple-500" },
  
  // Final bottom row
  { id: 38, name: "Cultures", category: "foundational-knowledge", icon: Globe, row: 6, col: 4, color: "bg-blue-500" },
  { id: 39, name: "Economics", category: "foundational-knowledge", icon: TrendingUp, row: 6, col: 5, color: "bg-blue-500" },
  { id: 40, name: "Community Mobilization", category: "generous-collaborators", icon: Users, row: 6, col: 6, color: "bg-purple-500" },
  { id: 41, name: "Productive Collaboration", category: "generous-collaborators", icon: Handshake, row: 6, col: 7, color: "bg-purple-500" },
  
  // Very bottom
  { id: 42, name: "Community Advocacy", category: "generous-collaborators", icon: Shield, row: 7, col: 6, color: "bg-purple-500" },
];

// Calculate hexagon positions
const getHexagonPosition = (row: number, col: number) => {
  const hexWidth = 100;
  const hexHeight = 86;
  const horizontalSpacing = hexWidth * 0.75;
  const verticalSpacing = hexHeight;
  
  const x = col * horizontalSpacing;
  const y = row * verticalSpacing + (col % 2) * (verticalSpacing / 2);
  
  return { x, y };
};

interface CompetencyHiveProps {
  studentId?: number;
  showProgress?: boolean;
}

export default function CompetencyHive({ studentId, showProgress = true }: CompetencyHiveProps) {
  // Fetch student's competency progress if showing progress
  const { data: progressData = [] } = useQuery({
    queryKey: ["/api/competency-progress/student", studentId],
    enabled: showProgress && !!studentId,
    retry: false,
  });

  // Calculate grid dimensions
  const maxRow = Math.max(...competencyData.map(c => c.row));
  const maxCol = Math.max(...competencyData.map(c => c.col));
  const gridWidth = (maxCol + 1) * 75;
  const gridHeight = (maxRow + 1) * 86 + 50;

  const getCompetencyProgress = (competencyId: number) => {
    if (!showProgress || !Array.isArray(progressData) || !progressData.length) return null;
    return (progressData as any[]).find((p: any) => p.competencyId === competencyId);
  };

  const getProgressLevel = (progress: any) => {
    if (!progress) return 0;
    const avgScore = progress.averageScore || 0;
    if (avgScore >= 3.5) return 4; // Applying
    if (avgScore >= 2.5) return 3; // Proficient  
    if (avgScore >= 1.5) return 2; // Developing
    if (avgScore >= 0.5) return 1; // Emerging
    return 0; // Not started
  };

  const getProgressColor = (level: number) => {
    switch (level) {
      case 4: return "ring-4 ring-green-400 ring-opacity-60";
      case 3: return "ring-4 ring-blue-400 ring-opacity-60";
      case 2: return "ring-4 ring-yellow-400 ring-opacity-60";
      case 1: return "ring-4 ring-orange-400 ring-opacity-60";
      default: return "ring-2 ring-gray-300 ring-opacity-40";
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-fit p-8">
        <div 
          className="relative mx-auto"
          style={{ width: `${gridWidth}px`, height: `${gridHeight}px` }}
        >
          <TooltipProvider>
            {competencyData.map((competency) => {
              const position = getHexagonPosition(competency.row, competency.col);
              const progress = getCompetencyProgress(competency.id);
              const progressLevel = getProgressLevel(progress);
              const Icon = competency.icon;
              const isCenter = competency.isCenter;
              
              return (
                <Tooltip key={competency.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-110 hover:z-10 ${
                        showProgress ? getProgressColor(progressLevel) : ""
                      }`}
                      style={{
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                      }}
                    >
                      <div
                        className={`
                          hexagon relative flex items-center justify-center text-white
                          ${competency.color} 
                          ${isCenter ? "w-20 h-20" : "w-16 h-16"}
                          shadow-lg hover:shadow-xl transition-shadow duration-200
                        `}
                        style={{
                          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                        }}
                      >
                        <Icon className={`${isCenter ? "h-8 w-8" : "h-6 w-6"} text-white drop-shadow-sm`} />
                        
                        {showProgress && progressLevel > 0 && (
                          <div className="absolute -top-1 -right-1">
                            <CheckCircle2 className="h-4 w-4 text-green-400 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="p-2">
                      <h4 className="font-semibold text-sm mb-1">{competency.name}</h4>
                      <Badge variant="secondary" className="text-xs mb-2">
                        {competency.category.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                      {showProgress && progress && (
                        <div className="mt-2 text-xs text-gray-600">
                          <p>Progress Level: {progressLevel}/4</p>
                          {progress.averageScore && (
                            <p>Average Score: {progress.averageScore.toFixed(1)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
        
        {showProgress && (
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400"></div>
              <span>Emerging</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <span>Developing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              <span>Proficient</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span>Applying</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}