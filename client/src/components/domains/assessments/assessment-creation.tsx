// Assessment Creation Component - Extracted from create-assessment-modal.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  Sparkles, 
  ChevronDown, 
  ChevronRight,
  Target,
  Brain
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  text: string;
  type: 'open-ended' | 'multiple-choice' | 'short-answer';
  options?: string[];
  rubricCriteria?: string;
  sampleAnswer?: string;
}

interface ComponentSkill {
  id: number;
  name: string;
  competencyName: string;
  learnerOutcomeName: string;
  rubricLevels: any;
}

interface AssessmentCreationProps {
  onSubmit: (assessmentData: any) => void;
  onCancel: () => void;
  componentSkills: ComponentSkill[];
  isCreating?: boolean;
}

export function AssessmentCreation({ 
  onSubmit, 
  onCancel, 
  componentSkills,
  isCreating = false
}: AssessmentCreationProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedComponentSkills, setSelectedComponentSkills] = useState<number[]>([]);
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<string>>(new Set());
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<string>>(new Set());
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);

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

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: '',
      type: 'open-ended',
      options: []
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    ));
  };

  const addOption = (questionId: string) => {
    updateQuestion(questionId, {
      options: [...(questions.find(q => q.id === questionId)?.options || []), '']
    });
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.options) {
      const newOptions = [...question.options];
      newOptions[optionIndex] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.options) {
      const newOptions = question.options.filter((_, index) => index !== optionIndex);
      updateQuestion(questionId, { options: newOptions });
    }
  };

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

  const generateQuestionsWithAI = async () => {
    if (selectedComponentSkills.length === 0) {
      alert('Please select at least one component skill before generating questions.');
      return;
    }

    setIsGeneratingWithAI(true);
    try {
      const response = await fetch('/api/ai/generate-assessment-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentSkillIds: selectedComponentSkills,
          title,
          description
        })
      });

      if (response.ok) {
        const { questions: aiQuestions } = await response.json();
        setQuestions(aiQuestions.map((q: any) => ({
          ...q,
          id: Date.now().toString() + Math.random()
        })));
      }
    } catch (error) {
      console.error('Error generating AI questions:', error);
    } finally {
      setIsGeneratingWithAI(false);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !dueDate || questions.length === 0 || selectedComponentSkills.length === 0) {
      alert('Please fill in all required fields: title, due date, at least one question, and at least one component skill.');
      return;
    }

    const assessmentData = {
      title: title.trim(),
      description: description.trim(),
      dueDate,
      questions,
      componentSkillIds: selectedComponentSkills,
      milestoneId: null // Standalone assessment
    };

    onSubmit(assessmentData);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Create Assessment</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Assessment'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Assessment Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter assessment title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter assessment description"
                rows={3}
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
              Component Skills Selection *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {Object.entries(skillsHierarchy).map(([outcomeName, competencies]) => (
                <div key={outcomeName} className="border rounded p-2">
                  <button
                    onClick={() => toggleOutcome(outcomeName)}
                    className="flex items-center gap-2 w-full text-left font-medium"
                  >
                    {expandedOutcomes.has(outcomeName) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                    {outcomeName}
                  </button>
                  
                  {expandedOutcomes.has(outcomeName) && (
                    <div className="mt-2 ml-6 space-y-2">
                      {Object.entries(competencies).map(([competencyName, skills]) => (
                        <div key={competencyName}>
                          <button
                            onClick={() => toggleCompetency(competencyName)}
                            className="flex items-center gap-2 text-sm font-medium text-blue-600"
                          >
                            {expandedCompetencies.has(competencyName) ? 
                              <ChevronDown className="h-3 w-3" /> : 
                              <ChevronRight className="h-3 w-3" />
                            }
                            {competencyName}
                          </button>
                          
                          {expandedCompetencies.has(competencyName) && (
                            <div className="mt-1 ml-5 space-y-1">
                              {skills.map((skill) => (
                                <div key={skill.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`skill-${skill.id}`}
                                    checked={selectedComponentSkills.includes(skill.id)}
                                    onCheckedChange={() => toggleComponentSkill(skill.id)}
                                  />
                                  <Label htmlFor={`skill-${skill.id}`} className="text-sm">
                                    {skill.name}
                                  </Label>
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
            <div className="mt-4">
              <Badge variant="outline">
                {selectedComponentSkills.length} component skill{selectedComponentSkills.length !== 1 ? 's' : ''} selected
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Questions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Questions *</span>
              <div className="flex space-x-2">
                <Button
                  onClick={generateQuestionsWithAI}
                  disabled={isGeneratingWithAI || selectedComponentSkills.length === 0}
                  variant="outline"
                  size="sm"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {isGeneratingWithAI ? 'Generating...' : 'AI Generate'}
                </Button>
                <Button onClick={addQuestion} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No questions added yet. Click "Add Question" or "AI Generate" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="border rounded p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Question {index + 1}</Label>
                      <Button
                        onClick={() => removeQuestion(question.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Textarea
                      value={question.text}
                      onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                      placeholder="Enter question text"
                      rows={2}
                    />
                    
                    <div className="flex items-center space-x-4">
                      <Label className="text-sm">Question Type:</Label>
                      <RadioGroup
                        value={question.type}
                        onValueChange={(value) => updateQuestion(question.id, { type: value as any })}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="open-ended" id={`open-${question.id}`} />
                          <Label htmlFor={`open-${question.id}`} className="text-sm">Open-ended</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="multiple-choice" id={`mc-${question.id}`} />
                          <Label htmlFor={`mc-${question.id}`} className="text-sm">Multiple Choice</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="short-answer" id={`short-${question.id}`} />
                          <Label htmlFor={`short-${question.id}`} className="text-sm">Short Answer</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {question.type === 'multiple-choice' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Options:</Label>
                          <Button
                            onClick={() => addOption(question.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Option
                          </Button>
                        </div>
                        {question.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <Input
                              value={option}
                              onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                              placeholder={`Option ${optionIndex + 1}`}
                              className="flex-1"
                            />
                            <Button
                              onClick={() => removeOption(question.id, optionIndex)}
                              variant="ghost"
                              size="sm"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}