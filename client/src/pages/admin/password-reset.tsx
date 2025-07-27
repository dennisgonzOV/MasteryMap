
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/navigation';
import { Shield, Key } from 'lucide-react';

interface PasswordResetForm {
  userId: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AdminPasswordReset() {
  const { toast } = useToast();

  // Fetch users for selection
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<PasswordResetForm>({
    defaultValues: {
      userId: '',
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
    if (data.newPassword !== data.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    resetPasswordMutation.mutate({
      userId: parseInt(data.userId),
      newPassword: data.newPassword,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-2xl font-bold">Admin Password Reset</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Reset passwords for users in your organization
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select User</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a user to reset password" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.map((user: any) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.firstName} {user.lastName} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
        </div>
      </main>
    </div>
  );
}
