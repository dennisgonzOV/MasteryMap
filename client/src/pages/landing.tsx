import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BookOpen, 
  Users, 
  Target, 
  Award, 
  ArrowRight,
  CheckCircle,
  Sparkles
} from "lucide-react";

export default function Landing() {
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
              <Button 
                onClick={() => window.location.href = '/register'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full btn-primary"
              >
                Get Started
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in" style={{ animationDelay: "0.4s" }}>
            <Button 
              onClick={() => window.location.href = '/register'}
              className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-3 rounded-full font-semibold btn-primary"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline"
              className="border-2 border-white text-blue-600 bg-white hover:bg-gray-50 hover:text-blue-700 px-8 py-3 rounded-full font-semibold"
            >
              Learn More
            </Button>
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
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of educators revolutionizing learning with project-based education
          </p>
          <Button 
            onClick={() => window.location.href = '/register'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold btn-primary text-lg"
          >
            Get Started Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">MasteryMap</h3>
            <p className="text-sm text-gray-600">
              Empowering project-based learning through innovative technology and AI-driven insights.
            </p>
            <div className="mt-4 text-xs text-gray-500">
              © 2024 MasteryMap. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
