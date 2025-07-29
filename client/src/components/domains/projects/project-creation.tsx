// Project Creation Component - Extracted from project-creation-modal-new.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Target,
  Brain,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ComponentSkill {
  id: number;
  name: string;
  competencyName: string;
  learnerOutcomeName: string;
  rubricLevels: any;
}

interface ProjectCreationProps {
  onSubmit: (projectData: any) => void;
  onCancel: () => void;
  componentSkills: ComponentSkill[];
  isCreating?: boolean;
}

export function ProjectCreation({ 
  onSubmit, 
  onCancel, 
  componentSkills,
  isCreating = false 
}: ProjectCreationProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedComponentSkills, setSelectedComponentSkills] = useState<number[]>([]);
  const [generateMilestones, setGenerateMilestones] = useState(true);
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<string>>(new Set());
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<string>>(new Set());

  // Group component skills by learner outcome and competency
  const skillsHierarchy = componentSkills.reduce((acc, skill) => {
    if (!acc[skill.learnerOutcomeName]) {
      acc[skill.learnerOutcomeName] = {};
    }
    if (!acc[skill.learnerOutcomeName][skill.competencyName]) {
      acc[skill.learnerOutcomeName][skill.competencyName] = [];
    }
    acc[skill.learnerOutcomeName][skill.competencyName].push(skill);
    return acc;
  }, {} as Record<string, Record<string, ComponentSkill[]>>);

  const toggleComponentSkill = (skillId: number) => {
    setSelectedComponentSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const toggleOutcome = (outcomeName: string) => {
    setExpandedOutcomes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(outcomeName)) {
        newSet.delete(outcomeName);
      } else {
        newSet.add(outcomeName);
      }
      return newSet;
    });
  };

  const toggleCompetency = (competencyName: string) => {
    setExpandedCompetencies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(competencyName)) {
        newSet.delete(competencyName);
      } else {
        newSet.add(competencyName);
      }
      return newSet;
    });
  };

  const selectAllSkillsInCompetency = (competencySkills: ComponentSkill[]) => {
    const skillIds = competencySkills.map(skill => skill.id);
    const allSelected = skillIds.every(id => selectedComponentSkills.includes(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedComponentSkills(prev => prev.filter(id => !skillIds.includes(id)));
    } else {
      // Select all
      setSelectedComponentSkills(prev => [...new Set([...prev, ...skillIds])]);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !description.trim() || !dueDate || selectedComponentSkills.length === 0) {
      alert('Please fill in all required fields: title, description, due date, and at least one component skill.');
      return;
    }

    const projectData = {
      title: title.trim(),
      description: description.trim(),
      dueDate,
      componentSkillIds: selectedComponentSkills,
      status: 'draft',
      generateMilestones
    };

    onSubmit(projectData);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Create New Project</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Project Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter project title"
              />
            </div>
            <div>
              <Label htmlFor="description">Project Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the project goals, activities, and expected outcomes"
                rows={4}
              />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Select due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Component Skills Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Learning Outcomes & Component Skills *
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select the component skills students will develop through this project
            </p>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {Object.entries(skillsHierarchy).map(([outcomeName, competencies]) => (
                <div key={outcomeName} className="border rounded-lg p-3">
                  <button
                    onClick={() => toggleOutcome(outcomeName)}
                    className="flex items-center gap-2 w-full text-left font-semibold text-lg hover:text-blue-600 transition-colors"
                  >
                    {expandedOutcomes.has(outcomeName) ? 
                      <ChevronDown className="h-5 w-5" /> : 
                      <ChevronRight className="h-5 w-5" />
                    }
                    {outcomeName}
                  </button>
                  
                  {expandedOutcomes.has(outcomeName) && (
                    <div className="mt-3 ml-7 space-y-3">
                      {Object.entries(competencies).map(([competencyName, skills]) => (
                        <div key={competencyName} className="border-l-2 border-blue-200 pl-4">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => toggleCompetency(competencyName)}
                              className="flex items-center gap-2 text-blue-700 font-medium hover:text-blue-800 transition-colors"
                            >
                              {expandedCompetencies.has(competencyName) ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                              }
                              {competencyName}
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => selectAllSkillsInCompetency(skills)}
                              className="text-xs"
                            >
                              {skills.every(skill => selectedComponentSkills.includes(skill.id)) 
                                ? 'Deselect All' 
                                : 'Select All'
                              }
                            </Button>
                          </div>
                          
                          {expandedCompetencies.has(competencyName) && (
                            <div className="mt-2 space-y-2">
                              {skills.map((skill) => (
                                <div key={skill.id} className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50">
                                  <Checkbox
                                    id={`skill-${skill.id}`}
                                    checked={selectedComponentSkills.includes(skill.id)}
                                    onCheckedChange={() => toggleComponentSkill(skill.id)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <Label 
                                      htmlFor={`skill-${skill.id}`} 
                                      className="text-sm font-medium cursor-pointer"
                                    >
                                      {skill.name}
                                    </Label>
                                    {skill.rubricLevels && (
                                      <div className="mt-1">
                                        <p className="text-xs text-muted-foreground">
                                          Rubric levels: Emerging → Developing → Proficient → Applying
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">
                {selectedComponentSkills.length} component skill{selectedComponentSkills.length !== 1 ? 's' : ''} selected
              </Badge>
              {selectedComponentSkills.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedComponentSkills([])}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Project Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generate-milestones"
                  checked={generateMilestones}
                  onCheckedChange={setGenerateMilestones}
                />
                <Label htmlFor="generate-milestones" className="text-sm">
                  Automatically generate project milestones and assessments using AI
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                AI will create suggested milestones based on the selected component skills and project timeline. 
                You can review and modify these after project creation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {(title || description || dueDate || selectedComponentSkills.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Project Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {title && (
                <div>
                  <span className="text-sm font-medium">Title: </span>
                  <span className="text-sm">{title}</span>
                </div>
              )}
              {dueDate && (
                <div>
                  <span className="text-sm font-medium">Due Date: </span>
                  <span className="text-sm">{format(dueDate, "PPP")}</span>
                </div>
              )}
              {selectedComponentSkills.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Component Skills: </span>
                  <span className="text-sm">{selectedComponentSkills.length} selected</span>
                </div>
              )}
              <div>
                <span className="text-sm font-medium">AI Generation: </span>
                <span className="text-sm">
                  {generateMilestones ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}