import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Milestone {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  progress: number;
}

interface ProgressTrackerProps {
  milestones: Milestone[];
  overallProgress: number;
  projectTitle: string;
}

export default function ProgressTracker({ milestones, overallProgress, projectTitle }: ProgressTrackerProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = milestones.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{projectTitle} Progress</span>
          <Badge variant="outline" className="text-sm">
            {completedMilestones}/{totalMilestones} Milestones
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-gray-600">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Milestone List */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Milestones</h4>
          {milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0">
                {getStatusIcon(milestone.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-sm text-gray-900 truncate">
                    {milestone.title}
                  </h5>
                  <Badge className={`text-xs ${getStatusColor(milestone.status)}`}>
                    {milestone.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {milestone.description}
                </p>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    Due: {formatDate(milestone.dueDate)}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {milestone.progress}%
                    </span>
                    <Progress value={milestone.progress} className="h-1 w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedMilestones}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {milestones.filter(m => m.status === 'in_progress').length}
            </div>
            <div className="text-xs text-gray-600">In Progress</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}