import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Users, 
  Target, 
  Award, 
  ArrowRight,
  CheckCircle,
  Sparkles,
  Send,
  Loader2
} from "lucide-react";

export default function Landing() {
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    website: "" // honeypot field
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Message Sent",
          description: data.message
        });
        setContactModalOpen(false);
        setFormData({ name: "", email: "", message: "", website: "" });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send message",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">MasteryMap</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => window.location.href = '/login'}
                variant="outline"
                className="px-6 py-2 rounded-full"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="gradient-hero pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 fade-in text-balance">
            Transform Learning Through
            <span className="block">Project-Based Education</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 fade-in text-balance" style={{ animationDelay: "0.2s" }}>
            Empower educators and students with AI-driven project management, 
            competency-based assessments, and digital portfolio creation.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              See How MasteryMap Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Watch a quick overview of how we're transforming the classroom experience
            </p>
          </div>
          
          <div className="relative aspect-video rounded-2xl overflow-hidden apple-shadow bg-gray-900 flex items-center justify-center group cursor-pointer">
            {/* Placeholder Image/Background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 mix-blend-overlay" />
            
            {/* Play Button UI */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl">
                  <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-blue-600 border-b-[12px] border-b-transparent ml-1" />
                </div>
              </div>
              <p className="mt-6 text-white font-semibold text-lg drop-shadow-md">Watch Demo Video</p>
            </div>

            {/* Hint for the user */}
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white/70 text-xs px-3 py-1.5 rounded-full border border-white/10">
              Placeholder Video Player
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Project-Based Learning
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Streamline project management, assessment, and portfolio creation with AI-powered tools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI-Powered Features */}
            <Card className="card-hover apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 ml-4">AI Milestone Generation</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Automatically generate project milestones aligned with XQ competencies using advanced AI technology.
                </p>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>Powered by OpenAI</span>
                </div>
              </CardContent>
            </Card>

            {/* Project Management */}
            <Card className="card-hover apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 ml-4">Project Management</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Create, assign, and track projects with comprehensive milestone management and progress tracking.
                </p>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>Full project lifecycle</span>
                </div>
              </CardContent>
            </Card>

            {/* Assessment Tools */}
            <Card className="card-hover apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 ml-4">Smart Assessments</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Generate competency-based assessments with AI-powered feedback and rubric-aligned grading.
                </p>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>XQ competency aligned</span>
                </div>
              </CardContent>
            </Card>

            {/* Collaboration */}
            <Card className="card-hover apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 ml-4">Team Collaboration</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Foster student collaboration with group project assignments and peer feedback systems.
                </p>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>Real-time collaboration</span>
                </div>
              </CardContent>
            </Card>

            {/* Digital Portfolios */}
            <Card className="card-hover apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-pink-100 rounded-full">
                    <BookOpen className="h-6 w-6 text-pink-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 ml-4">Digital Portfolios</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Automatically curate student work into beautiful digital portfolios with QR code sharing.
                </p>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>QR code sharing</span>
                </div>
              </CardContent>
            </Card>

            {/* Credential System */}
            <Card className="card-hover apple-shadow border-0">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Award className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 ml-4">Micro-Credentials</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Award stickers, badges, and plaques to recognize student achievements and competency mastery.
                </p>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>Automated recognition</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Classroom?
          </h2>
          <Button 
            variant="outline"
            className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-full font-semibold text-lg"
            onClick={() => setContactModalOpen(true)}
            data-testid="button-contact-admin"
          >
            Bring MasteryMap to your school
          </Button>
        </div>
      </section>

      {/* Contact Modal */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bring MasteryMap to your school</DialogTitle>
            <DialogDescription>
              Send a message to get started with MasteryMap for your school.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                data-testid="input-contact-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Tell us about your school and how we can help..."
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                required
                rows={4}
                data-testid="input-contact-message"
              />
            </div>
            {/* Honeypot field - hidden from users, visible to bots */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
              data-testid="button-submit-contact"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">MasteryMap</h3>
            <p className="text-sm text-gray-600">
              Empowering project-based learning through innovative technology and AI-driven insights.
            </p>
            <div className="mt-4 text-xs text-gray-500">
              MasteryMap © 2025 True Aim LLC. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
