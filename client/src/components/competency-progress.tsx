import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProgressBar from "@/components/progress-bar";
import { TrendingUp, TrendingDown, Minus, Clock, Target, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import React, { useState } from 'react';

interface CompetencyProgressData {
  competencyId: number;
  competencyName: string;
  componentSkillId: number;
  componentSkillName: string;
  averageScore: number;
  totalScores: number[];
  lastScore: number;
  lastUpdated: string;
  progressDirection: 'improving' | 'declining' | 'stable';
}

interface CompetencyProgressProps {
  studentId?: number;
  onProgressDecline?: (competency: CompetencyProgressData) => void;
}

export function CompetencyProgress({ studentId, onProgressDecline }: CompetencyProgressProps) {
  const [collapsedCompetencies, setCollapsedCompetencies] = useState<Set<string>>(new Set());

  const { data: competencyProgress = [], isLoading } = useQuery<CompetencyProgressData[]>({
    queryKey: ['/api/students/competency-progress', studentId],
    queryFn: async () => {
      const url = studentId 
        ? `/api/students/competency-progress?studentId=${studentId}`
        : '/api/students/competency-progress';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch competency progress');
      }
      return response.json();
    },
  });

  const toggleCompetency = (competencyName: string) => {
    const newCollapsed = new Set(collapsedCompetencies);
    if (newCollapsed.has(competencyName)) {
      newCollapsed.delete(competencyName);
    } else {
      newCollapsed.add(competencyName);
    }
    setCollapsedCompetencies(newCollapsed);
  };

  // Group competencies by name
  const groupedCompetencies = competencyProgress.reduce((acc, item) => {
    if (!acc[item.competencyName]) {
      acc[item.competencyName] = [];
    }
    acc[item.competencyName].push(item);
    return acc;
  }, {} as Record<string, CompetencyProgressData[]>);

  if (isLoading) {
    return (
      <Card className="border border-gray-100 shadow-sm bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-lg font-semibold">Competency Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded-lg w-2/3"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-full"></div>
                <div className="h-2 bg-gray-100 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (competencyProgress.length === 0) {
    return (
      <Card className="border border-gray-100 shadow-sm bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-lg font-semibold">Competency Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">No progress data yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Complete assessments to start tracking your competency progress across different skills
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProgressIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
      case 'declining':
        return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const getProgressColor = (score: number, direction: string) => {
    if (direction === 'declining') return 'red';
    if (score >= 90) return 'green';
    if (score >= 80) return 'blue';
    if (score >= 70) return 'yellow';
    return 'orange';
  };

  const getScoreColor = (score: number, direction: string) => {
    if (direction === 'declining') return 'text-red-600';
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-orange-600';
  };

  return (
    <Card className="border border-gray-100 shadow-sm bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-lg font-semibold">Competency Progress</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedCompetencies).map(([competencyName, skills]) => {
          const isCollapsed = collapsedCompetencies.has(competencyName);
          
          return (
            <div key={competencyName} className="space-y-3">
              <div 
                className="flex items-center gap-2 pb-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 rounded-md p-1 -m-1 transition-colors"
                onClick={() => toggleCompetency(competencyName)}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h3 className="font-semibold text-gray-900 text-base">
                  {competencyName}
                </h3>
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600">
                  {skills.length} skill{skills.length !== 1 ? 's' : ''}
                </Badge>
              </div>

            {!isCollapsed && (
                <div className="grid gap-2">
                  {skills.map((skill) => (
                    <div 
                      key={`${skill.competencyId}-${skill.componentSkillId}`} 
                      className="group p-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50/50 to-white hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="font-medium text-gray-900 text-sm truncate">
                            {skill.componentSkillName}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full space-y-2">
                        <ProgressBar 
                          value={skill.averageScore} 
                          color={getProgressColor(skill.averageScore, skill.progressDirection)}
                          size="sm"
                          className="h-1.5 w-full"
                        />
                        
                        {/* Achievement Bar */}
                        <div className="w-full">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Emerging</span>
                            <span>Developing</span>
                            <span>Proficient</span>
                            <span>Applying</span>
                          </div>
                          <div className="flex w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="flex-1 bg-red-200 border-r border-white"></div>
                            <div className="flex-1 bg-yellow-200 border-r border-white"></div>
                            <div className="flex-1 bg-blue-200 border-r border-white"></div>
                            <div className="flex-1 bg-green-200"></div>
                          </div>
                          
                          {/* Achievement indicator */}
                          <div className="relative mt-1">
                            <div 
                              className="absolute w-2 h-2 bg-gray-800 rounded-full transform -translate-x-1/2"
                              style={{ left: `${skill.averageScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}