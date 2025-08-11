/**
 * Example modal component implementations using BaseModal
 * This demonstrates how to eliminate modal duplication across components
 */

import React, { useState } from 'react';
import { BaseModal, ConfirmationModal, FormModal, AlertModal } from '../client/src/components/base/BaseModal';
import { Button } from '../client/src/components/ui/button';
import { Input } from '../client/src/components/ui/input';
import { Label } from '../client/src/components/ui/label';
import { Textarea } from '../client/src/components/ui/textarea';

/**
 * DELETE CONFIRMATION MODAL
 * Before: 40+ lines of repeated modal boilerplate
 * After: 8 lines using ConfirmationModal
 */

// OLD WAY (repeated across 10+ components):
/*
function DeleteProjectModalOld({ open, onOpenChange, project, onDelete }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-red-600" />
            Confirm Delete
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the project.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p>Are you sure you want to delete "{project.title}"?</p>
        </div>

        <DialogFooter>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                onDelete(project.id);
                onOpenChange(false);
              }}
            >
              Delete Project
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
*/

// NEW WAY (using ConfirmationModal):
function DeleteProjectModal({ open, onOpenChange, project, onDelete, isDeleting }) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm Delete"
      description="This action cannot be undone. This will permanently delete the project."
      onConfirm={() => onDelete(project.id)}
      confirmText="Delete Project"
      variant="destructive"
      isLoading={isDeleting}
    >
      <p>Are you sure you want to delete "<strong>{project.title}</strong>"?</p>
    </ConfirmationModal>
  );
}

/**
 * PROJECT CREATION MODAL
 * Before: 80+ lines of form modal boilerplate
 * After: 25 lines using FormModal
 */

// NEW WAY (using FormModal):
function CreateProjectModal({ open, onOpenChange, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: ''
  });

  const [isValid, setIsValid] = useState(false);

  React.useEffect(() => {
    setIsValid(formData.title.trim().length > 0);
  }, [formData]);

  const handleSubmit = (data) => {
    onSubmit(formData);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Project"
      description="Create a new project-based learning experience for your students."
      onSubmit={handleSubmit}
      submitText="Create Project"
      isSubmitting={isSubmitting}
      isValid={isValid}
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Project Title *</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter project title"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the project goals and requirements"
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
          />
        </div>
      </div>
    </FormModal>
  );
}

/**
 * SUCCESS/ERROR NOTIFICATION MODAL
 * Before: 30+ lines per notification type
 * After: 5 lines using AlertModal
 */

function SuccessModal({ open, onOpenChange, message }) {
  return (
    <AlertModal
      open={open}
      onOpenChange={onOpenChange}
      title="Success"
      message={message}
      type="success"
    />
  );
}

function ErrorModal({ open, onOpenChange, message }) {
  return (
    <AlertModal
      open={open}
      onOpenChange={onOpenChange}
      title="Error"
      message={message}
      type="error"
    />
  );
}

/**
 * CUSTOM MODAL USING BaseModal
 * For unique cases that don't fit standard patterns
 */
function CustomAIFeedbackModal({ open, onOpenChange, feedback, studentName }) {
  const footer = (
    <div className="flex justify-between w-full">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Close
      </Button>
      <Button onClick={() => {
        // Copy feedback to clipboard
        navigator.clipboard.writeText(feedback);
        onOpenChange(false);
      }}>
        Copy Feedback
      </Button>
    </div>
  );

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={`AI Feedback for ${studentName}`}
      description="Review the AI-generated feedback for this student's submission."
      footer={footer}
      size="xl"
    >
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Feedback Summary</h4>
          <p className="text-blue-800 whitespace-pre-wrap">{feedback}</p>
        </div>
        
        <div className="text-sm text-gray-600">
          <p>This feedback was generated by AI and should be reviewed before sharing with the student.</p>
        </div>
      </div>
    </BaseModal>
  );
}

/**
 * Usage Example Component
 */
export function ModalExamples() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  
  const sampleProject = { id: 1, title: "Sample Project" };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Modal Component Examples</h2>
      
      <div className="space-x-4">
        <Button 
          variant="destructive"
          onClick={() => setDeleteModalOpen(true)}
        >
          Delete Project (Confirmation)
        </Button>
        
        <Button onClick={() => setCreateModalOpen(true)}>
          Create Project (Form)
        </Button>
        
        <Button 
          variant="outline"
          onClick={() => setSuccessModalOpen(true)}
        >
          Show Success (Alert)
        </Button>
      </div>

      <DeleteProjectModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        project={sampleProject}
        onDelete={(id) => console.log('Deleting project:', id)}
        isDeleting={false}
      />

      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={(data) => console.log('Creating project:', data)}
        isSubmitting={false}
      />

      <SuccessModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        message="Project created successfully! Students can now access the project."
      />
    </div>
  );
}

/**
 * COMPARISON SUMMARY:
 * 
 * Duplication Eliminated:
 * - Modal structure boilerplate: 40+ lines → 5-15 lines per modal
 * - Button handling: 10+ lines → automatic
 * - State management: 15+ lines → automatic
 * - Error handling: 8+ lines → automatic
 * 
 * Total Reduction: 200+ lines eliminated across 8 modal components
 * 
 * Benefits:
 * - Consistent modal behavior across the app
 * - Reduced bugs from copy-paste errors
 * - Easier maintenance and updates
 * - Better accessibility and keyboard handling
 * - Standardized animations and styling
 */