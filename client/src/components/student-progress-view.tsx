import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Search, 
  Users, 
  Award, 
  BookOpen, 
  TrendingUp,
  GraduationCap,
  Star,
  Trophy,
  Medal
} from 'lucide-react';
import { CompetencyProgress } from "@/components/competency-progress";

interface StudentProgress {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  grade: string;
  projects: Array<{
    projectId: number;
    projectTitle: string;
    projectDescription: string;
    projectStatus: string;
    teacherName: string;
  }>;
  credentials: Array<{
    id: number;
    title: string;
    description: string;
    type: 'sticker' | 'badge' | 'plaque';
    awardedAt: string;
  }>;
  competencyProgress: Array<{
    competencyId: number;
    competencyName: string;
    componentSkillId: number;
    componentSkillName: string;
    averageScore: number;
    submissionCount: number;
  }>;
  totalCredentials: number;
  stickers: number;
  badges: number;
  plaques: number;
}

export default function StudentProgressView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);

  const { data: studentsProgress = [], isLoading } = useQuery({
    queryKey: ["/api/teacher/school-students-progress"],
    retry: false,
  });

  const filteredStudents = studentsProgress.filter((student: StudentProgress) =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCredentialIcon = (type: string) => {
    switch (type) {
      case 'sticker':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'badge':
        return <Medal className="h-4 w-4 text-blue-500" />;
      case 'plaque':
        return <Trophy className="h-4 w-4 text-purple-500" />;
      default:
        return <Award className="h-4 w-4 text-gray-500" />;
    }
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    if (score >= 60) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading student progress...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search students by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Students</CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {filteredStudents.map((student: StudentProgress) => (
                  <div
                    key={student.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStudent?.id === student.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {student.firstName[0]}{student.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {student.firstName} {student.lastName}
                        </h4>
                        <p className="text-xs text-gray-600">Grade {student.grade}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Badge variant="outline" className="text-xs">
                          {student.totalCredentials}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Details */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="competencies">Competencies</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Student Header */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-lg">
                          {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-xl font-bold">
                          {selectedStudent.firstName} {selectedStudent.lastName}
                        </h2>
                        <p className="text-gray-600">{selectedStudent.email}</p>
                        <p className="text-sm text-gray-500">Grade {selectedStudent.grade}</p>
                      </div>
                    </div>

                    {/* Credentials Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <Star className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-yellow-600">{selectedStudent.stickers}</div>
                        <div className="text-xs text-yellow-700">Stickers</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Medal className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-blue-600">{selectedStudent.badges}</div>
                        <div className="text-xs text-blue-700">Badges</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <Trophy className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-purple-600">{selectedStudent.plaques}</div>
                        <div className="text-xs text-purple-700">Plaques</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Credentials */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Credentials</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedStudent.credentials.slice(0, 5).map((credential) => (
                        <div key={credential.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                          {getCredentialIcon(credential.type)}
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{credential.title}</h4>
                            <p className="text-xs text-gray-600">{credential.description}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(credential.awardedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                      {selectedStudent.credentials.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No credentials earned yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projects" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assigned Projects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedStudent.projects.map((project) => (
                        <div key={project.projectId} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{project.projectTitle}</h4>
                            <Badge 
                              variant="default"
                              className={`text-xs ${
                                project.projectStatus === 'active' ? 'bg-green-100 text-green-800' :
                                project.projectStatus === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {project.projectStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{project.projectDescription}</p>
                          <div className="flex items-center text-xs text-gray-500">
                            <GraduationCap className="h-3 w-3 mr-1" />
                            <span>Teacher: {project.teacherName}</span>
                          </div>
                        </div>
                      ))}
                      {selectedStudent.projects.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No projects assigned</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="competencies" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Competency Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedStudent ? (
                          <CompetencyProgress studentId={selectedStudent.id} />
                        ) : (
                          <p className="text-gray-500 text-center py-4">Select a student to view competency data.</p>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-12">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Student</h3>
                  <p className="text-gray-600">Choose a student from the list to view their progress</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}