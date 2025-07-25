
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageCircle, 
  Plus, 
  Pin, 
  Lock, 
  Heart, 
  Reply, 
  CheckCircle, 
  Calendar,
  User,
  FileText,
  HelpCircle,
  Target,
  MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';

interface DiscussionForumProps {
  projectId: number;
  milestones?: Array<{ id: number; title: string; }>;
}

interface DiscussionThread {
  id: number;
  title: string;
  description: string;
  category: 'general' | 'resources' | 'help' | 'milestone';
  milestoneId?: number;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  lastActivityAt: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
  postCount: number;
}

interface DiscussionPost {
  id: number;
  content: string;
  attachments?: string[];
  isAnswer: boolean;
  likeCount: number;
  replyToId?: number;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  authorId: number;
  authorName: string;
  authorRole: string;
  hasLiked: boolean;
}

export default function DiscussionForum({ projectId, milestones = [] }: DiscussionForumProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMilestone, setSelectedMilestone] = useState('all');
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [newThreadData, setNewThreadData] = useState({
    title: '',
    description: '',
    category: 'general' as const,
    milestoneId: undefined as number | undefined,
  });
  const [newPostContent, setNewPostContent] = useState('');
  const [replyToPost, setReplyToPost] = useState<number | null>(null);

  // Fetch discussion threads
  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'discussions', selectedCategory, selectedMilestone],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedMilestone && selectedMilestone !== 'all') params.append('milestone', selectedMilestone);
      
      const response = await fetch(`/api/projects/${projectId}/discussions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch threads');
      return response.json();
    },
  });

  // Fetch thread posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['/api/discussions', selectedThread, 'posts'],
    queryFn: async () => {
      if (!selectedThread) return [];
      const response = await fetch(`/api/discussions/${selectedThread}/posts`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
    enabled: !!selectedThread,
  });

  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: async (data: typeof newThreadData) => {
      const response = await fetch(`/api/projects/${projectId}/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create thread');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'discussions'] });
      setShowCreateThread(false);
      setNewThreadData({ title: '', description: '', category: 'general', milestoneId: undefined });
      toast({ title: 'Success', description: 'Discussion thread created successfully!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create discussion thread', variant: 'destructive' });
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: { content: string; replyToId?: number }) => {
      const response = await fetch(`/api/discussions/${selectedThread}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discussions', selectedThread, 'posts'] });
      setNewPostContent('');
      setReplyToPost(null);
      toast({ title: 'Success', description: 'Post created successfully!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
    },
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await fetch(`/api/discussions/posts/${postId}/like`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to toggle like');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discussions', selectedThread, 'posts'] });
    },
  });

  // Mark as answer mutation
  const markAnswerMutation = useMutation({
    mutationFn: async ({ postId, isAnswer }: { postId: number; isAnswer: boolean }) => {
      const response = await fetch(`/api/discussions/posts/${postId}/answer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAnswer }),
      });
      if (!response.ok) throw new Error('Failed to mark answer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discussions', selectedThread, 'posts'] });
      toast({ title: 'Success', description: 'Answer status updated successfully!' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update answer status', variant: 'destructive' });
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'resources': return <FileText className="h-4 w-4" />;
      case 'help': return <HelpCircle className="h-4 w-4" />;
      case 'milestone': return <Target className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'resources': return 'bg-green-100 text-green-800';
      case 'help': return 'bg-red-100 text-red-800';
      case 'milestone': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedThread) {
    return (
      <div className="space-y-6">
        {/* Thread Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => setSelectedThread(null)}
            className="flex items-center space-x-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Back to Discussions</span>
          </Button>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {postsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading posts...</span>
            </div>
          ) : (
            posts.map((post: DiscussionPost) => (
              <Card key={post.id} className="apple-shadow border-0">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{post.authorName}</span>
                          <Badge variant="outline" className="text-xs">
                            {post.authorRole}
                          </Badge>
                          {post.isAnswer && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Answer
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(post.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{post.content}</p>
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => likePostMutation.mutate(post.id)}
                          className={`flex items-center space-x-1 ${post.hasLiked ? 'text-red-600' : 'text-gray-500'}`}
                        >
                          <Heart className={`h-4 w-4 ${post.hasLiked ? 'fill-current' : ''}`} />
                          <span>{post.likeCount}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyToPost(post.id)}
                          className="flex items-center space-x-1 text-gray-500"
                        >
                          <Reply className="h-4 w-4" />
                          <span>Reply</span>
                        </Button>
                        {(user?.role === 'teacher' || user?.role === 'admin') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAnswerMutation.mutate({ postId: post.id, isAnswer: !post.isAnswer })}
                            disabled={markAnswerMutation.isPending}
                            className={`flex items-center space-x-1 ${post.isAnswer ? 'text-green-600' : 'text-gray-500'}`}
                          >
                            <CheckCircle className={`h-4 w-4 ${post.isAnswer ? 'fill-current' : ''}`} />
                            <span>{post.isAnswer ? 'Unmark Answer' : 'Mark Answer'}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* New Post Form */}
        <Card className="apple-shadow border-0">
          <CardContent className="p-4">
            <div className="space-y-4">
              {replyToPost && (
                <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
                  <span className="text-sm text-blue-700">Replying to post</span>
                  <Button variant="ghost" size="sm" onClick={() => setReplyToPost(null)}>
                    ×
                  </Button>
                </div>
              )}
              <Textarea
                placeholder="Write your response..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={() => createPostMutation.mutate({ 
                    content: newPostContent, 
                    replyToId: replyToPost || undefined 
                  })}
                  disabled={!newPostContent.trim() || createPostMutation.isPending}
                >
                  {createPostMutation.isPending ? 'Posting...' : 'Post Reply'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Discussion</h2>
          <p className="text-gray-600">Share ideas, ask questions, and collaborate with your team</p>
        </div>
        <Button onClick={() => setShowCreateThread(true)} className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Thread
        </Button>
      </div>

      {/* Filters */}
      <Card className="apple-shadow border-0">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="resources">Resources</SelectItem>
                <SelectItem value="help">Help & Questions</SelectItem>
                <SelectItem value="milestone">Milestone Discussion</SelectItem>
              </SelectContent>
            </Select>
            {milestones.length > 0 && (
              <Select value={selectedMilestone} onValueChange={setSelectedMilestone}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="Filter by milestone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Milestones</SelectItem>
                  {milestones.map((milestone) => (
                    <SelectItem key={milestone.id} value={milestone.id.toString()}>
                      {milestone.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Threads List */}
      <div className="space-y-4">
        {threadsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading discussions...</span>
          </div>
        ) : threads.length === 0 ? (
          <Card className="apple-shadow border-0">
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No discussions yet</h3>
              <p className="text-gray-600 mb-4">Start the conversation by creating the first discussion thread.</p>
              <Button onClick={() => setShowCreateThread(true)} className="btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create First Thread
              </Button>
            </CardContent>
          </Card>
        ) : (
          threads.map((thread: DiscussionThread) => (
            <Card 
              key={thread.id} 
              className="apple-shadow border-0 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelectedThread(thread.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {thread.isPinned && <Pin className="h-4 w-4 text-blue-600" />}
                      {thread.isLocked && <Lock className="h-4 w-4 text-gray-600" />}
                      <Badge className={getCategoryColor(thread.category)}>
                        {getCategoryIcon(thread.category)}
                        <span className="ml-1 capitalize">{thread.category}</span>
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{thread.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{thread.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>By {thread.authorName}</span>
                      <span>{thread.postCount} replies</span>
                      <span>{thread.viewCount} views</span>
                      <span>Last activity {format(new Date(thread.lastActivityAt), 'MMM d')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Thread Modal */}
      {showCreateThread && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md apple-shadow border-0">
            <CardHeader>
              <CardTitle>Create New Discussion Thread</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <Input
                  value={newThreadData.title}
                  onChange={(e) => setNewThreadData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter thread title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Textarea
                  value={newThreadData.description}
                  onChange={(e) => setNewThreadData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the topic..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <Select 
                  value={newThreadData.category} 
                  onValueChange={(value: any) => setNewThreadData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Discussion</SelectItem>
                    <SelectItem value="resources">Resources</SelectItem>
                    <SelectItem value="help">Help & Questions</SelectItem>
                    <SelectItem value="milestone">Milestone Discussion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newThreadData.category === 'milestone' && milestones.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Milestone</label>
                  <Select 
                    value={newThreadData.milestoneId?.toString() || 'none'} 
                    onValueChange={(value) => setNewThreadData(prev => ({ 
                      ...prev, 
                      milestoneId: value !== 'none' ? parseInt(value) : undefined 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a milestone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No milestone</SelectItem>
                      {milestones.map((milestone) => (
                        <SelectItem key={milestone.id} value={milestone.id.toString()}>
                          {milestone.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateThread(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createThreadMutation.mutate(newThreadData)}
                  disabled={!newThreadData.title.trim() || !newThreadData.description.trim() || createThreadMutation.isPending}
                  className="btn-primary"
                >
                  {createThreadMutation.isPending ? 'Creating...' : 'Create Thread'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
