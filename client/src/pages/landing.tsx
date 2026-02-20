import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ContactModal from "@/components/contact-modal";
import {
  BookOpen,
  Users,
  Target,
  Award,
  CheckCircle,
  Sparkles,
  Menu,
  X
} from "lucide-react";
import introVideo from "@assets/MasteryMap_Intro_1767756337009.mp4";

export default function Landing() {
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const currentYear = new Date().getFullYear();

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">MasteryMap</span>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <Button asChild variant="ghost" className="px-4">
                <Link href="/explore">Explore Projects</Link>
              </Button>
              <Button asChild variant="ghost" className="px-4">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="px-6 py-2 rounded-full">
                <Link href="/register">Register</Link>
              </Button>
            </div>

            <div className="md:hidden">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div id="mobile-nav" className="md:hidden border-t border-gray-200 py-3 space-y-2">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/explore" onClick={closeMobileMenu}>Explore Projects</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href="/login" onClick={closeMobileMenu}>Sign In</Link>
              </Button>
              <Button asChild className="w-full justify-start">
                <Link href="/register" onClick={closeMobileMenu}>Register</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setContactModalOpen(true);
                  closeMobileMenu();
                }}
              >
                Contact Sales
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="gradient-hero pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 fade-in text-balance">
            Transform Learning Through
            <span className="block">Project-Based Education</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 fade-in text-balance" style={{ animationDelay: "0.2s" }}>
            Empower educators and students with AI-driven project management,
            competency-based assessments, and digital portfolio creation.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 fade-in" style={{ animationDelay: "0.3s" }}>
            <Button asChild className="bg-white text-blue-700 hover:bg-blue-50 font-semibold">
              <Link href="/register">Get Started Free</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white/15 hover:text-white font-semibold"
            >
              <Link href="/explore">Explore Projects</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white font-semibold"
              onClick={() => setContactModalOpen(true)}
            >
              Bring to My School
            </Button>
          </div>
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

          <div className="relative aspect-video rounded-2xl overflow-hidden apple-shadow bg-gray-900">
            {videoReady ? (
              <video
                className="w-full h-full object-cover"
                controls
                preload="none"
                poster="/default-project-thumbnail.svg"
                data-testid="intro-video"
              >
                <source src={introVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-gray-950 text-white p-6">
                <Button
                  type="button"
                  className="font-semibold"
                  onClick={() => setVideoReady(true)}
                >
                  Watch Product Walkthrough
                </Button>
              </div>
            )}
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
      <ContactModal open={contactModalOpen} onOpenChange={setContactModalOpen} />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">MasteryMap</h3>
            <p className="text-sm text-gray-600">
              Empowering project-based learning through innovative technology and AI-driven insights.
            </p>
            <div className="mt-4 text-xs text-gray-500">
              MasteryMap © {currentYear} True Aim LLC. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
