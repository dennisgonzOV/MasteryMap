import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpen, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function EnterCode() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  // Only students can use this page
  if (user?.role !== 'student') {
    setLocation("/");
    return null;
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast({
        title: "Code required",
        description: "Please enter a 5-letter assessment code.",
        variant: "destructive",
      });
      return;
    }

    if (code.length !== 5) {
      toast({
        title: "Invalid code format",
        description: "Assessment codes must be exactly 5 letters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/assessments/by-code/${code.toUpperCase()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Assessment not found",
            description: "Please check the code and try again.",
            variant: "destructive",
          });
        } else if (response.status === 410) {
          toast({
            title: "Code expired",
            description: "This assessment code has expired. Please get a new code from your teacher.",
            variant: "destructive",
          });
        } else {
          throw new Error('Failed to access assessment');
        }
        return;
      }

      const assessment = await response.json();
      
      // Redirect to the assessment
      setLocation(`/student/assessments/${assessment.id}`);
      
      toast({
        title: "Assessment found!",
        description: `You can now take "${assessment.title}".`,
      });
    } catch (error) {
      console.error("Error accessing assessment:", error);
      toast({
        title: "Error",
        description: "Failed to access assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (value.length <= 5) {
      setCode(value);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto pt-20">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Enter Assessment Code</CardTitle>
            <CardDescription className="text-gray-600">
              Enter the 5-letter code provided by your teacher to access the assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium text-gray-700">
                  Assessment Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="ABCDE"
                  className="text-center text-2xl font-mono tracking-widest uppercase h-14"
                  maxLength={5}
                  autoFocus
                />
                <p className="text-xs text-gray-500 text-center">
                  Enter exactly 5 letters (A-Z only)
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 h-12"
                disabled={isLoading || code.length !== 5}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accessing Assessment...
                  </>
                ) : (
                  <>
                    Access Assessment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Need help? Contact your teacher for the correct assessment code.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}