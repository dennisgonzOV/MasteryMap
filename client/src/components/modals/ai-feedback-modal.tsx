import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  Lightbulb,
  Target
} from "lucide-react";

interface AIFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: string;
  hasRiskyContent: boolean;
  skillName: string;
  selectedLevel: string;
  onContinue?: () => void;
  isLastSkill?: boolean;
}

export default function AIFeedbackModal({
  open,
  onOpenChange,
  feedback,
  hasRiskyContent,
  skillName,
  selectedLevel,
  onContinue,
  isLastSkill = false
}: AIFeedbackModalProps) {
  const handleContinue = () => {
    onOpenChange(false);
    if (onContinue) {
      onContinue();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center">
            <Brain className="mr-2 h-6 w-6 text-blue-600" />
            AI Feedback: {skillName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Safety Alert */}
          {hasRiskyContent && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Important:</strong> Your teacher has been notified about your response for additional support. 
                They will follow up with you soon.
              </AlertDescription>
            </Alert>
          )}

          {/* Current Assessment Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-blue-900 flex items-center">
                <Target className="mr-2 h-5 w-5" />
                Your Self-Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="capitalize text-blue-700 border-blue-300">
                  {selectedLevel} Level
                </Badge>
                <span className="text-blue-800 font-medium">{skillName}</span>
              </div>
            </CardContent>
          </Card>

          {/* AI Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 flex items-center">
                <Lightbulb className="mr-2 h-5 w-5 text-yellow-600" />
                Personalized Improvement Guidance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none text-gray-700">
                {feedback.split('\n').map((paragraph, index) => (
                  paragraph.trim() && (
                    <p key={index} className="mb-3 leading-relaxed">
                      {paragraph}
                    </p>
                  )
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Growth Mindset Message */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-green-800 font-medium mb-1">Growth Mindset Reminder</p>
                  <p className="text-green-700 text-sm">
                    Every expert was once a beginner. Your honest self-reflection is the first step toward mastery. 
                    Use this feedback to guide your learning journey and celebrate your progress along the way.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-purple-900 flex items-center">
                <CheckCircle className="mr-2 h-5 w-5" />
                What Happens Next?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-purple-800">
                <div className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2"></span>
                  <span className="text-sm">Your self-evaluation has been saved and shared with your teacher</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2"></span>
                  <span className="text-sm">Review this feedback regularly to track your improvement</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2"></span>
                  <span className="text-sm">Discuss specific goals with your teacher based on these insights</span>
                </div>
                {!isLastSkill && (
                  <div className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mt-2"></span>
                    <span className="text-sm">Continue to the next component skill when you're ready</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex items-center space-x-4 pt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Review Later
          </Button>
          <Button
            onClick={handleContinue}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLastSkill ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Assessment
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Continue to Next Skill
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}