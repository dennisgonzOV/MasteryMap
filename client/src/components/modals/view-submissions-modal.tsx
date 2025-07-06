import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User,
  Calendar,
  Star,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface SubmissionWithDetails {
  id: number;
  assessmentId: number;
  studentId: number;
  responses: Array<{
    questionId: string;
    answer: string;
  }>;
  submittedAt: string;
  studentName: string;
  studentEmail: string;
  status?: 'graded' | 'pending' | 'late';
  grade?: {
    score: string;
    rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
    feedback: string;
    gradedAt: string;
    gradedBy: string;
  };
}

interface ViewSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentId: number;
  assessmentTitle: string;
}

export default function ViewSubmissionsModal({
  isOpen,
  onClose,
  assessmentId,
  assessmentTitle
}: ViewSubmissionsModalProps) {
  
  // Fetch real submission data
  const { data: submissions, isLoading } = useQuery<SubmissionWithDetails[]>({
    queryKey: [`/api/assessments/${assessmentId}/submissions`],
    enabled: isOpen && !!assessmentId,
  });

  // Also fetch assessment data to get questions
  const { data: assessmentData } = useQuery<any>({
    queryKey: [`/api/assessments/${assessmentId}`],
    enabled: isOpen && !!assessmentId,
  });

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Loading submissions...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getQuestionText = (questionId: string): string => {
    if (!assessmentData?.questions) return `Question ${questionId}`;
    const question = assessmentData.questions.find((q: any) => q.id === questionId);
    return question?.text || `Question ${questionId}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'late':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'graded':
        return <Badge className="bg-green-100 text-green-800">Graded</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'late':
        return <Badge className="bg-red-100 text-red-800">Late</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRubricBadge = (level: string) => {
    const colors = {
      emerging: "bg-blue-100 text-blue-800",
      developing: "bg-yellow-100 text-yellow-800", 
      proficient: "bg-green-100 text-green-800",
      applying: "bg-purple-100 text-purple-800"
    };
    return (
      <Badge className={colors[level as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    );
  };

  const statsData = {
    total: submissions?.length || 0,
    graded: submissions?.filter(s => s.status === 'graded').length || 0,
    pending: submissions?.filter(s => s.status === 'pending' || !s.status).length || 0,
    late: submissions?.filter(s => s.status === 'late').length || 0
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Submissions for "{assessmentTitle}"
          </DialogTitle>
        </DialogHeader>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{statsData.total}</div>
              <div className="text-sm text-gray-600">Total Submissions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{statsData.graded}</div>
              <div className="text-sm text-gray-600">Graded</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{statsData.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{statsData.late}</div>
              <div className="text-sm text-gray-600">Late</div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        <ScrollArea className="flex-1 max-h-[500px]">
          <div className="space-y-4">
            {!submissions || submissions.length === 0 ? (
              <Card className="border border-gray-200">
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    No submissions yet for this assessment.
                  </div>
                </CardContent>
              </Card>
            ) : (
              submissions.map((submission) => (
                <Card key={submission.id} className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-500" />
                        <div>
                          <h3 className="font-medium text-gray-900">{submission.studentName}</h3>
                          <p className="text-sm text-gray-500">{submission.studentEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(submission.status || 'pending')}
                        {getStatusBadge(submission.status || 'pending')}
                        <div className="text-sm text-gray-500">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {submission.submittedAt ? format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a') : 'Unknown date'}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Grade Information */}
                    {submission.grade && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Star className="h-5 w-5 text-yellow-500" />
                            <span className="font-medium text-gray-900">Grade: {submission.grade.score}</span>
                            {getRubricBadge(submission.grade.rubricLevel)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Graded by {submission.grade.gradedBy} on{' '}
                            {format(new Date(submission.grade.gradedAt), 'MMM d, yyyy')}
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded border">
                          <div className="flex items-start space-x-2">
                            <MessageSquare className="h-4 w-4 text-blue-500 mt-1" />
                            <div>
                              <div className="font-medium text-gray-900 mb-1">AI Feedback:</div>
                              <p className="text-gray-700 text-sm leading-relaxed">
                                {submission.grade.feedback}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Student Responses */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Student Responses:</h4>
                      {submission.responses.map((response, index) => (
                        <div key={response.questionId} className="border border-gray-200 rounded-lg p-4">
                          <div className="font-medium text-gray-900 mb-2">
                            Q{index + 1}: {getQuestionText(response.questionId)}
                          </div>
                          <div className="text-gray-700 text-sm leading-relaxed">
                            {response.answer}
                          </div>
                        </div>
                      ))}
                    </div>

                    {!submission.grade && (
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Grade This Submission
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}