import React from 'react';
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
import { Separator } from '@/components/ui/separator';
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

interface Submission {
  id: number;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  status: 'graded' | 'pending' | 'late';
  grade?: {
    score: string;
    rubricLevel: 'emerging' | 'developing' | 'proficient' | 'applying';
    feedback: string;
    gradedAt: string;
    gradedBy: string;
  };
  answers: Array<{
    questionId: string;
    questionText: string;
    answer: string;
  }>;
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
  
  // Mock data - replace with real API call
  const submissions: Submission[] = [
    {
      id: 1,
      studentName: "Sarah Chen",
      studentEmail: "sarah.chen@student.edu",
      submittedAt: "2024-12-06T14:30:00Z",
      status: "graded",
      grade: {
        score: "85%",
        rubricLevel: "proficient",
        feedback: "Excellent understanding of the core concepts. Your analysis shows deep thinking and good application of the principles. Consider expanding on the implementation details in future responses.",
        gradedAt: "2024-12-06T16:45:00Z",
        gradedBy: "Dr. Johnson"
      },
      answers: [
        {
          questionId: "1",
          questionText: "Explain the key principles of sustainable design",
          answer: "Sustainable design focuses on three main principles: environmental responsibility, resource efficiency, and long-term viability. It involves creating solutions that minimize negative environmental impact while meeting human needs..."
        },
        {
          questionId: "2", 
          questionText: "How would you implement these principles in a real project?",
          answer: "In my project, I would start by conducting a thorough environmental impact assessment. Then I would focus on selecting renewable materials and energy-efficient processes..."
        }
      ]
    },
    {
      id: 2,
      studentName: "Marcus Rodriguez",
      studentEmail: "marcus.r@student.edu", 
      submittedAt: "2024-12-06T15:45:00Z",
      status: "graded",
      grade: {
        score: "92%",
        rubricLevel: "applying",
        feedback: "Outstanding work! You've not only demonstrated mastery of the concepts but also shown innovative thinking in your approach. The real-world applications you provided are particularly impressive.",
        gradedAt: "2024-12-06T17:20:00Z",
        gradedBy: "Dr. Johnson"
      },
      answers: [
        {
          questionId: "1",
          questionText: "Explain the key principles of sustainable design",
          answer: "Sustainable design is built on the foundation of circular economy principles, biomimicry, and systems thinking. It requires us to think holistically about the entire lifecycle..."
        },
        {
          questionId: "2",
          questionText: "How would you implement these principles in a real project?", 
          answer: "I would implement a comprehensive sustainability framework starting with stakeholder analysis, followed by cradle-to-cradle design methodology..."
        }
      ]
    },
    {
      id: 3,
      studentName: "Emma Thompson",
      studentEmail: "emma.t@student.edu",
      submittedAt: "2024-12-06T18:20:00Z", 
      status: "pending",
      answers: [
        {
          questionId: "1",
          questionText: "Explain the key principles of sustainable design",
          answer: "Sustainable design involves creating environmentally friendly solutions. The main principles include reducing waste, using renewable resources, and considering the environmental impact..."
        },
        {
          questionId: "2",
          questionText: "How would you implement these principles in a real project?",
          answer: "I would start by researching sustainable materials and energy sources. Then I would create a plan that incorporates these elements while staying within budget constraints..."
        }
      ]
    },
    {
      id: 4,
      studentName: "David Kim",
      studentEmail: "david.kim@student.edu",
      submittedAt: "2024-12-07T09:15:00Z",
      status: "late",
      answers: [
        {
          questionId: "1", 
          questionText: "Explain the key principles of sustainable design",
          answer: "The principles of sustainable design include environmental consciousness, economic viability, and social responsibility. These form the triple bottom line approach..."
        },
        {
          questionId: "2",
          questionText: "How would you implement these principles in a real project?",
          answer: "Implementation would involve conducting environmental impact assessments, stakeholder consultations, and developing measurable sustainability metrics..."
        }
      ]
    }
  ];

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
    total: submissions.length,
    graded: submissions.filter(s => s.status === 'graded').length,
    pending: submissions.filter(s => s.status === 'pending').length,
    late: submissions.filter(s => s.status === 'late').length
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
            {submissions.map((submission) => (
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
                      {getStatusIcon(submission.status)}
                      {getStatusBadge(submission.status)}
                      <div className="text-sm text-gray-500">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}
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

                  {/* Student Answers */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Student Responses:</h4>
                    {submission.answers.map((answer, index) => (
                      <div key={answer.questionId} className="border border-gray-200 rounded-lg p-4">
                        <div className="font-medium text-gray-900 mb-2">
                          Q{index + 1}: {answer.questionText}
                        </div>
                        <div className="text-gray-700 text-sm leading-relaxed">
                          {answer.answer}
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
            ))}
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