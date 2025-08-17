
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/navigation';
import { Shield, Key, Search, Users, GraduationCap } from 'lucide-react';

interface PasswordResetForm {
  newPassword: string;
  confirmPassword: string;
}

export default function AdminPasswordReset() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userType, setUserType] = useState<'students' | 'teachers'>('students');

  // Fetch users from admin's school for selection
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/admin/school-users'],
    staleTime: 5 * 60 * 1000,
  });

  // Filter users based on search term and user type
  const filteredUsers = users?.filter((user: any) => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = userType === 'students' 
      ? user.role === 'student' 
      : user.role === 'teacher';
    
    return matchesSearch && matchesType;
  }) || [];

  const form = useForm<PasswordResetForm>({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { userId: number; newPassword: string }) => {
      return await apiRequest('/api/auth/admin-reset-password', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password reset successfully',
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PasswordResetForm) => {
    if (!selectedUser) {
      toast({
        title: 'Error',
        description: 'Please select a user first',
        variant: 'destructive',
      });
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    resetPasswordMutation.mutate({
      userId: selectedUser.id,
      newPassword: data.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading users...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Admin Password Reset</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Reset passwords for users in your organization
            </p>
          </div>

          {/* User Type Toggle */}
          <div className="mb-6">
            <Tabs value={userType} onValueChange={(value) => setUserType(value as 'students' | 'teachers')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="students" className="flex items-center space-x-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>Students</span>
                </TabsTrigger>
                <TabsTrigger value="teachers" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Teachers</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
                              placeholder={`Search ${userType} by username...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Users List */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{userType}</CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {filteredUsers.map((user: any) => (
                      <div
                        key={user.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedUser?.id === user.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {user.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {user.username}
                            </h4>
                            <p className="text-xs text-gray-600">{user.role}</p>
                            {user.grade && (
                              <p className="text-xs text-gray-500">Grade {user.grade}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        {searchTerm ? `No ${userType} match your search` : `No ${userType} found`}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Password Reset Form */}
            <div className="lg:col-span-2">
              {selectedUser ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Key className="h-5 w-5 text-blue-600" />
                      <span>Reset Password</span>
                    </CardTitle>
                    <div className="flex items-center space-x-4 pt-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-lg">
                          {selectedUser.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-xl font-bold">
                          {selectedUser.username}
                        </h2>
                        <p className="text-gray-600">{selectedUser.role}</p>
                        <p className="text-sm text-gray-500 capitalize">{selectedUser.role}</p>
                        {selectedUser.grade && (
                          <p className="text-sm text-gray-500">Grade {selectedUser.grade}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Enter new password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Confirm new password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={resetPasswordMutation.isPending}
                        >
                          {resetPasswordMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Resetting Password...
                            </>
                          ) : (
                            <>
                              <Key className="h-4 w-4 mr-2" />
                              Reset Password
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center p-12">
                    <div className="text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a User</h3>
                      <p className="text-gray-600">Choose a user from the list to reset their password</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
