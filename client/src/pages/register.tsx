import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import ContactModal from "@/components/contact-modal";
import { registerSchema, UserRole } from '@shared/schema';
import type { z } from 'zod';

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [accountType, setAccountType] = useState<'individual' | 'school'>('school');
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      schoolName: '',
      role: UserRole.TEACHER, // Default role (will correspond to free tier for individual)
      schoolId: undefined,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      // If individual, ensure schoolId is undefined
      const payload = {
        ...data,
        schoolId: accountType === 'individual' ? undefined : data.schoolId
      };

      // If individual and schoolId was set (e.g. from previous switching), remove it
      if (accountType === 'individual') {
        delete payload.schoolId;
      }

      return await apiRequest('/api/auth/register', 'POST', payload);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Account created successfully',
      });
      // Invalidate auth query to refetch user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      // Check if user is free tier for correct redirect
      if (accountType === 'individual') {
        setLocation('/teacher/projects');
      } else {
        setLocation('/');
      }
    },
    onError: (error) => {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-y-auto py-8">
      <Card className="w-full max-w-md my-8">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Sign up to get started with MasteryMap
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <div className="space-y-3 mb-4">
                <Label>Account Type</Label>
                <RadioGroup
                  defaultValue="school"
                  value={accountType}
                  onValueChange={(val) => setAccountType(val as 'individual' | 'school')}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="school" id="school" className="peer sr-only" />
                    <Label
                      htmlFor="school"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span>School</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="individual" id="individual" className="peer sr-only" />
                    <Label
                      htmlFor="individual"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <span>Individual (Free)</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {accountType === 'school' ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <p className="mb-2 font-semibold">School Implementation</p>
                    <p>
                      MasteryMap for schools requires a custom setup to ensure seamless integration with your existing systems.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => setContactModalOpen(true)}
                  >
                    Contact Sales to Get Started
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Lincoln High School" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Choose a username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Choose a password (min 8 characters)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full mt-6"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </>
              )}
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <ContactModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        title="Get MasteryMap for Your School"
        description="Contact our team to set up a school-wide implementation."
      />
    </div>
  );
}