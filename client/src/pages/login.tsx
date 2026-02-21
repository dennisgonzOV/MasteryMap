import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { loginSchema } from '@shared/schema';
import { apiWithRetry } from '@/lib/apiHelpers';
import { apiRequest, isApiError, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import type { z } from 'zod';

type LoginForm = z.infer<typeof loginSchema>;
const LOGIN_REQUEST_TIMEOUT_MS = 15_000;
const LOGIN_MAX_RETRIES = 2;

async function withRequestTimeout<T>(
  requestFn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await requestFn(controller.signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      setStatusMessage('Signing in...');

      return apiWithRetry(
        () =>
          withRequestTimeout(
            (signal) => apiRequest('/api/auth/login', 'POST', data, { signal }),
            LOGIN_REQUEST_TIMEOUT_MS,
          ),
        {
          maxRetries: LOGIN_MAX_RETRIES,
          retryDelay: 700,
          jitterMs: 200,
          shouldRetry: (error) => {
            if (isApiError(error)) {
              return [502, 503, 504].includes(error.status);
            }

            return /timeout|fetch failed|network|connection|socket/i.test(error.message);
          },
          onRetry: (attemptNumber) => {
            setStatusMessage(`Retrying login request (${attemptNumber}/${LOGIN_MAX_RETRIES})...`);
          },
        },
      );
    },
    onSuccess: () => {
      setStatusMessage(null);
      toast({
        title: 'Success',
        description: 'Logged in successfully',
      });
      // Invalidate auth query to refetch user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setLocation('/');
    },
    onError: (error) => {
      // Show user-friendly error message
      setStatusMessage(null);
      const message = (() => {
        if (isApiError(error) && error.status === 503) {
          return 'Your database is waking up. Please try again in a few seconds.';
        }

        if (error instanceof Error && /timeout/i.test(error.message)) {
          return 'Login timed out while waiting for the database. Please try again.';
        }

        if (error instanceof Error && error.message.includes('Invalid credentials')) {
          return 'Invalid username or password. Please try again.';
        }

        return 'Failed to log in. Please try again.';
      })();
      
      toast({
        title: 'Login Failed',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Enter your username and password to access your account
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter your username"
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
                        placeholder="Enter your password"
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
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
              </Button>
              {loginMutation.isPending && statusMessage ? (
                <p className="text-xs text-muted-foreground text-center">{statusMessage}</p>
              ) : null}
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            <p className="text-gray-600">
              Need an account? Contact your administrator for access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
