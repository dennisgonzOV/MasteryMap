// Project Management Component - Extracted from project-management-modal.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar,
  Users,
  Target,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Plus,
  UserPlus,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  dueDate: string;
  componentSkillIds: number[];
  createdAt: string;
}

interface Milestone {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  order: number;
  aiGenerated: boolean;
  completed?: boolean;
}

interface TeamMember {
  id: number;
  studentId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface ProjectTeam {
  id: number;
  name: string;
  description: string;
  members: TeamMember[];
}

interface ProjectManagementProps {
  project: Project;
  milestones: Milestone[];
  teams: ProjectTeam[];
  onUpdateProject: (projectId: number, updates: Partial<Project>) => void;
  onCreateMilestone: (milestoneData: any) => void;
  onUpdateMilestone: (milestoneId: number, updates: Partial<Milestone>) => void;
  onDeleteMilestone: (milestoneId: number) => void;
  onCreateTeam: (teamData: any) => void;
  onUpdateTeam: (teamId: number, updates: any) => void;
  onDeleteTeam: (teamId: number) => void;
}

export function ProjectManagement({
  project,
  milestones,
  teams,
  onUpdateProject,
  onCreateMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam
}: ProjectManagementProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingProject, setEditingProject] = useState(false);
  const [projectUpdates, setProjectUpdates] = useState({
    title: project.title,
    description: project.description,
    dueDate: project.dueDate
  });

  // Calculate project progress
  const completedMilestones = milestones.filter(m => m.completed).length;
  const totalMilestones = milestones.length;
  const progressPercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  const handleSaveProject = () => {
    onUpdateProject(project.id, projectUpdates);
    setEditingProject(false);
  };

  const handleCancelEdit = () => {
    setProjectUpdates({
      title: project.title,
      description: project.description,
      dueDate: project.dueDate
    });
    setEditingProject(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                {editingProject ? (
                  <Input
                    value={projectUpdates.title}
                    onChange={(e) => setProjectUpdates(prev => ({ ...prev, title: e.target.value }))}
                    className="text-xl font-bold"
                  />
                ) : (
                  <CardTitle className="text-xl">{project.title}</CardTitle>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Created {formatDate(project.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {editingProject ? (
                <>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProject}>
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditingProject(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {editingProject ? (
            <Textarea
              value={projectUpdates.description}
              onChange={(e) => setProjectUpdates(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          ) : (
            <p className="text-muted-foreground">{project.description}</p>
          )}
          
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Due {formatDate(project.dueDate)}
                {getDaysUntilDue(project.dueDate) > 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({getDaysUntilDue(project.dueDate)} days remaining)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {teams.reduce((total, team) => total + team.members.length, 0)} students in {teams.length} team(s)
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Project Progress</Label>
              <span className="text-sm text-muted-foreground">
                {completedMilestones}/{totalMilestones} milestones completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Milestones</span>
                  <span className="text-sm font-medium">
                    {completedMilestones}/{totalMilestones}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Team Members</span>
                  <span className="text-sm font-medium">
                    {teams.reduce((total, team) => total + team.members.length, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Component Skills</span>
                  <span className="text-sm font-medium">
                    {project.componentSkillIds.length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Milestone "Research Phase" completed</span>
                    <span className="text-muted-foreground">2 days ago</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-blue-500" />
                    <span>3 new students added to Team Alpha</span>
                    <span className="text-muted-foreground">5 days ago</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span>Assessment created for Milestone 2</span>
                    <span className="text-muted-foreground">1 week ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Project Milestones</h3>
            <Button onClick={() => onCreateMilestone({ projectId: project.id })}>
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>

          <div className="space-y-3">
            {milestones.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No milestones created yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add milestones to track project progress
                  </p>
                </CardContent>
              </Card>
            ) : (
              milestones.map((milestone, index) => (
                <Card key={milestone.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          milestone.completed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{milestone.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Due {formatDate(milestone.dueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {milestone.aiGenerated && (
                          <Badge variant="outline" className="text-xs">
                            AI Generated
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUpdateMilestone(milestone.id, { completed: !milestone.completed })}
                        >
                          {milestone.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteMilestone(milestone.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-muted-foreground mt-2 ml-11">
                        {milestone.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Project Teams</h3>
            <Button onClick={() => onCreateTeam({ projectId: project.id })}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </div>

          <div className="grid gap-4">
            {teams.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No teams created yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create teams and assign students to collaborate on this project
                  </p>
                </CardContent>
              </Card>
            ) : (
              teams.map((team) => (
                <Card key={team.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {team.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUpdateTeam(team.id, {})}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {team.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No members assigned</p>
                      ) : (
                        team.members.map((member) => (
                          <div key={member.id} className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {member.firstName[0]}{member.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {member.email}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {member.role}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}