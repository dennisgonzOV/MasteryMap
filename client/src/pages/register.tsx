import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Registration is disabled
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Registration Disabled</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Account creation is currently disabled
          </p>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Registration is currently disabled. Please contact your administrator for account access.
            </p>
            <Button 
              onClick={() => setLocation('/login')}
              className="w-full"
            >
              Go to Sign In
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );


}