import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, User, Search, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { api } from '@/lib/api';
import type { ProjectTeamDTO, ProjectTeamMemberDTO, StudentSummaryDTO } from '@shared/contracts/api';

interface TeamEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: ProjectTeamDTO | null;
  schoolId?: number;
  onTeamUpdated: () => void;
}

export default function TeamEditModal({ open, onOpenChange, team, schoolId, onTeamUpdated }: TeamEditModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch students from the school
  const { data: allStudents = [], isLoading: studentsLoading } = useQuery<StudentSummaryDTO[]>({
    queryKey: [`/api/schools/${schoolId}/students`],
    queryFn: () => api.getSchoolStudents(Number(schoolId)),
    enabled: open && !!schoolId,
  });

  // Fetch current team members
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery<ProjectTeamMemberDTO[]>({
    queryKey: [`/api/project-teams/${team?.id}/members`],
    queryFn: () => api.getProjectTeamMembers(Number(team?.id)),
    enabled: open && !!team?.id,
  });

  // Mutation to add team member
  const addMemberMutation = useMutation({
    mutationFn: (studentId: number) =>
      api.createProjectTeamMember({
        teamId: team!.id,
        studentId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/project-teams/${team?.id}/members`] });
      onTeamUpdated();
      toast({
        title: "Success",
        description: "Student added to team successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add student to team",
        variant: "destructive",
      });
    },
  });

  // Mutation to remove team member
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: number) => api.deleteProjectTeamMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/project-teams/${team?.id}/members`] });
      onTeamUpdated();
      toast({
        title: "Success",
        description: "Student removed from team successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove student from team",
        variant: "destructive",
      });
    },
  });

  const currentMemberIds = teamMembers.map((member) => member.studentId);
  const availableStudents = allStudents.filter((student) =>
    !currentMemberIds.includes(student.id) &&
    student.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddStudent = (studentId: number) => {
    addMemberMutation.mutate(studentId);
  };

  const handleRemoveStudent = (memberId: number) => {
    removeMemberMutation.mutate(memberId);
  };

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Edit Team: {team.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Current Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Current Members
                </span>
                <Badge variant="secondary">
                  {teamMembers.length} members
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {membersLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading members...</div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No members in this team yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.student?.username || member.studentName || 'Unknown Student'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {member.student?.username || 'No username available'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStudent(member.id)}
                          disabled={removeMemberMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Available Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Add Students
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {studentsLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading students...</div>
                ) : availableStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">
                      {searchQuery ? 'No students match your search' : 'All students are already in teams'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {student.username}
                            </p>
                            <p className="text-sm text-gray-500">{student.username}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddStudent(student.id)}
                          disabled={addMemberMutation.isPending}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
