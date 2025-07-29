import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProgressBar from "@/components/progress-bar";
import { TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import React from 'react';

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

  // Group competencies by name
  const groupedCompetencies = competencyProgress.reduce((acc, item) => {
    if (!acc[item.competencyName]) {
      acc[item.competencyName] = [];
    }
    acc[item.competencyName].push(item);
    return acc;
  }, {} as Record<string, CompetencyProgressData[]>);

  const decliningCompetencies = competencyProgress.filter(
    comp => comp.progressDirection === 'declining'
  );

  if (isLoading) {
    return (
      <Card className="apple-shadow border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Competency Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (competencyProgress.length === 0) {
    return (
      <Card className="apple-shadow border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Competency Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No competency data available yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Complete assessments to start tracking your progress
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProgressIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  const getProgressColor = (score: number, direction: string) => {
    if (direction === 'declining') return 'red';
    if (score >= 85) return 'green';
    if (score >= 70) return 'yellow';
    if (score >= 60) return 'orange';
    return 'blue';
  };


  return (
    <div className="space-y-6">


      <Card className="apple-shadow border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Competency Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedCompetencies).map(([competencyName, skills]) => (
            <div key={competencyName} className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg border-b border-gray-200 dark:border-gray-700 pb-2">
                {competencyName}
              </h3>

              <div className="space-y-4">
                {skills.map((skill) => (
                  <div 
                    key={`${skill.competencyId}-${skill.componentSkillId}`} 
                    className={`p-4 rounded-xl transition-all duration-200 ${
                      skill.progressDirection === 'declining' 
                        ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800' 
                        : 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {skill.componentSkillName}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">

                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {skill.totalScores.length} assessment{skill.totalScores.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {skill.averageScore}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Last: {skill.lastScore}%
                        </div>
                      </div>
                    </div>

                    <ProgressBar 
                      value={skill.averageScore} 
                      color={getProgressColor(skill.averageScore, skill.progressDirection)}
                      size="sm"
                      className="mb-2"
                    />

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Updated: {format(new Date(skill.lastUpdated), 'MMM d, yyyy')}
                      </span>
                      {skill.totalScores.length > 1 && (
                        <span>
                          Range: {Math.min(...skill.totalScores)}% - {Math.max(...skill.totalScores)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}