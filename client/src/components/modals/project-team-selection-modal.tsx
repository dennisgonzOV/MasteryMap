import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, User, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProjectTeamSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  schoolId?: number;
  onTeamCreated: () => void;
}

interface Student {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export default function ProjectTeamSelectionModal({
  open,
  onOpenChange,
  projectId,
  schoolId,
  onTeamCreated
}: ProjectTeamSelectionModalProps) {
  const [teamName, setTeamName] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Fetch students from the same school
  const { data: students, isLoading } = useQuery({
    queryKey: ['/api/schools', schoolId, 'students'],
    enabled: !!schoolId && open,
  });

  const studentsArray = Array.isArray(students) ? students : [];

  const handleStudentToggle = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a team name',
        variant: 'destructive',
      });
      return;
    }

    if (selectedStudents.length === 0) {
      toast({
        title: 'Error', 
        description: 'Please select at least one student',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      // Create team
      const teamResponse = await fetch('/api/project-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: teamName,
          description: `Team of ${selectedStudents.length} students`
        })
      });

      if (!teamResponse.ok) throw new Error('Failed to create team');
      const team = await teamResponse.json();

      // Add team members
      for (const studentId of selectedStudents) {
        await fetch('/api/project-team-members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: team.id,
            studentId,
            role: 'member'
          })
        });
      }

      // Assign all milestones to team members
      const milestonesResponse = await fetch(`/api/projects/${projectId}/milestones`);
      if (milestonesResponse.ok) {
        const milestones = await milestonesResponse.json();
        
        for (const milestone of milestones) {
          for (const studentId of selectedStudents) {
            await fetch('/api/project-assignments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                studentId,
                teamId: team.id
              })
            });
          }
        }
      }

      toast({
        title: 'Success',
        description: `Team "${teamName}" created with ${selectedStudents.length} members`,
      });

      onTeamCreated();
      onOpenChange(false);
      setTeamName('');
      setSelectedStudents([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getSelectedStudentNames = () => {
    return studentsArray
      .filter((student: Student) => selectedStudents.includes(student.id))
      .map((student: Student) => `${student.firstName} ${student.lastName}`)
      .join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Create Project Team</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Team Name Input */}
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              placeholder="Enter team name (e.g., Team A, Green Team)"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          {/* Student Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Select Students</h3>
              <Badge variant="secondary">
                {selectedStudents.length} selected
              </Badge>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading students...
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-4 space-y-3">
                  {studentsArray.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No students found in this school</p>
                    </div>
                  ) : (
                    studentsArray.map((student: Student) => (
                      <div
                        key={student.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleStudentToggle(student.id)}
                      >
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleStudentToggle(student.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {student.email}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected Students Summary */}
          {selectedStudents.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {getSelectedStudentNames()}
                </p>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTeam}
              disabled={isCreating || !teamName.trim() || selectedStudents.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? (
                <>
                  <Plus className="h-4 w-4 mr-2 animate-spin" />
                  Creating Team...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}