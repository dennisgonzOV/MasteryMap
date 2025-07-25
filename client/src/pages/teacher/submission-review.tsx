import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Star,
  FileText,
  Brain,
  Send
} from "lucide-react";
import { format } from "date-fns";
import Navigation from "@/components/navigation";
import { getCompetencyInfo } from "@/lib/competencyUtils";

interface Question {
  id: string;
  text: string;
  type: 'open-ended' | 'multiple-choice' | 'short-answer';
  options?: string[];
  rubricCriteria?: string;
  sampleAnswer?: string;
}

interface Assessment {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  questions: Question[];
  componentSkillIds: number[];
}

interface Submission {
  id: number;
  assessmentId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  responses: Record<string, string>;
  grade?: number;
  feedback?: string;
  isLate: boolean;
}

interface ComponentSkill {
  id: number;
  name: string;
  competency: {
    name: string;
    learnerOutcome: {
      name: string;
    };
  };
}

export default function SubmissionReview() {
  const { assessmentId, submissionId } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [grade, setGrade] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch assessment data
  const { data: assessment, isLoading: assessmentLoading } = useQuery({
    queryKey: [`/api/assessments/${assessmentId}`],
    enabled: !!assessmentId,
  });

  // Fetch submission data
  const { data: submission, isLoading: submissionLoading, error: submissionError } = useQuery({
    queryKey: [`/api/submissions/${submissionId}`],
    enabled: !!submissionId,
  });

  

  // Fetch component skills for context
  const { data: componentSkills = [] } = useQuery({
    queryKey: ["/api/component-skills/details"],
    enabled: !!assessment?.componentSkillIds?.length,
  });

  // Set initial values when submission loads
  useEffect(() => {
    if (submission) {
      setGrade(submission.grade !== undefined ? submission.grade.toString() : "");
      setFeedback(submission.feedback || "");
    }
  }, [submission]);

  

  const handleSubmitGrade = async () => {
    const gradeValue = parseFloat(grade);
    
    if (grade === "" || isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
      toast({
        title: "Invalid Grade",
        description: "Please enter a valid grade between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grade: gradeValue,
          feedback: feedback.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to grade submission');
      }

      toast({
        title: "Success",
        description: "Submission graded successfully",
      });
      
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", submissionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments", assessmentId, "submissions"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to grade submission",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate AI feedback for overall submission
  const generateAIFeedback = async () => {
    setIsSubmitting(true);
    try {
      // Call the existing grading endpoint with generateAiFeedback flag
      const response = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grade: parseFloat(grade) || 0,
          feedback: feedback.trim(),
          generateAiFeedback: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI feedback');
      }

      const data = await response.json();
      setFeedback(data.feedback);
      
      toast({
        title: "AI Feedback Generated",
        description: "You can review and edit the feedback before final submission.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (assessmentLoading || submissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">Loading submission...</span>
        </div>
      </div>
    );
  }

  if (!assessment || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Submission Not Found</h2>
            <p className="text-gray-600 mb-4">
              The submission you're looking for doesn't exist.
            </p>
            <Button onClick={() => setLocation('/teacher/assessments')}>
              Back to Assessments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  

  const relevantSkills = componentSkills?.filter(skill => 
    assessment.componentSkillIds?.includes(skill.id)
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation(`/teacher/assessments/${assessmentId}/submissions`)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Submissions</span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant={submission.isLate ? "destructive" : "default"}>
              {submission.isLate ? "Late Submission" : "On Time"}
            </Badge>
            {submission.grade !== undefined && (
              <Badge variant="secondary">
                Graded: {submission.grade}%
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Assessment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>{assessment.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{assessment.description}</p>
                
                {/* Component Skills */}
                {getCompetencyInfo(assessment, componentSkills).length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Component Skills Being Assessed:</h4>
                    <div className="space-y-3">
                      {getCompetencyInfo(assessment, componentSkills).map((competency: any, index: number) => (
                        <div key={index} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                          <div className="mb-2">
                            <span className="font-medium text-blue-900 text-sm">
                              {competency.learnerOutcomeName}
                            </span>
                            <span className="text-gray-400 mx-2">→</span>
                            <span className="text-gray-700 text-sm">{competency.competencyName}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {competency.skills.map((skill: any) => (
                              <span key={skill.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {skill.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student Responses */}
            <Card>
              <CardHeader>
                <CardTitle>Student Responses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {assessment.questions.map((question, index) => (
                  <div key={question.id} className="border-l-4 border-blue-200 pl-4">
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Question {index + 1}: {question.text}
                      </h4>
                      {question.type === 'multiple-choice' && question.options && (
                        <div className="text-sm text-gray-600 mb-2">
                          Options: {question.options.join(", ")}
                        </div>
                      )}
                      {question.rubricCriteria && (
                        <div className="text-sm text-blue-600 mb-2">
                          Rubric: {question.rubricCriteria}
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Student Answer:
                      </Label>
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {submission.responses[question.id] || "No answer provided"}
                      </p>
                    </div>
                    
                    {question.sampleAnswer && (
                      <div className="mt-3 bg-green-50 p-3 rounded-lg">
                        <Label className="text-sm font-medium text-green-800 mb-1 block">
                          Sample Answer:
                        </Label>
                        <p className="text-sm text-green-700">{question.sampleAnswer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Student Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-600" />
                  <span>Student Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Name</Label>
                    <p className="text-gray-900">{submission.studentName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <p className="text-gray-900">{submission.studentEmail}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Submitted</Label>
                    <p className="text-gray-900 flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{format(new Date(submission.submittedAt), "MMM d, yyyy")}</span>
                    </p>
                    <p className="text-gray-600 flex items-center space-x-2 mt-1">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{format(new Date(submission.submittedAt), "h:mm a")}</span>
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Due Date</Label>
                    <p className="text-gray-900">{format(new Date(assessment.dueDate), "MMM d, yyyy h:mm a")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grading Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span>Grading</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="grade" className="text-sm font-medium text-gray-700">
                    Grade (0-100)
                  </Label>
                  <Input
                    id="grade"
                    type="number"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Enter grade"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="feedback" className="text-sm font-medium text-gray-700">
                    Feedback
                  </Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback to the student..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div className="flex flex-col space-y-2">
                  <Button
                    onClick={handleSubmitGrade}
                    disabled={isSubmitting || grade === "" || isNaN(parseFloat(grade))}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Grade
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={generateAIFeedback}
                    className="w-full"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Generate AI Feedback
                  </Button>
                </div>

                {submission.grade !== undefined && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Previously Graded: {submission.grade}%
                      </span>
                    </div>
                    {submission.feedback && (
                      <p className="text-sm text-green-700 mt-2">{submission.feedback}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}