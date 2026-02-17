import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/navigation';
import {
    Users,
    Search,
    Plus,
    Trash2,
    Key,
    GraduationCap,
    School,
    MoreVertical,
    AlertTriangle
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock user type until we import or define strictly
type User = {
    id: number;
    username: string;
    role: 'student' | 'teacher' | 'admin';
    schoolId: number;
};

const createUserSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['student', 'teacher'], { required_error: "Role is required" }),
    grade: z.enum(['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']).optional(),
}).superRefine((data, ctx) => {
    if (data.role === 'student' && !data.grade) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['grade'],
            message: 'Grade is required for students',
        });
    }
});

const gradeOptions = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const resetPasswordSchema = z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function AdminUsers() {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'student' | 'teacher'>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);

    // Fetch users
    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ['/api/admin/users'],
        staleTime: 5 * 60 * 1000,
    });

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: async (data: CreateUserFormValues) => {
            const res = await apiRequest('/api/admin/users', 'POST', data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
            setIsCreateOpen(false);
            toast({
                title: "Success",
                description: "User created successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create user",
                variant: "destructive",
            });
        },
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async (userId: number) => {
            await apiRequest(`/api/admin/users/${userId}`, 'DELETE');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
            setUserToDelete(null);
            toast({
                title: "Success",
                description: "User deleted successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete user",
                variant: "destructive",
            });
        },
    });

    // Reset password mutation
    const resetPasswordMutation = useMutation({
        mutationFn: async (data: { userId: number, newPassword: string }) => {
            await apiRequest(`/api/admin/users/${data.userId}/password`, 'POST', { newPassword: data.newPassword });
        },
        onSuccess: () => {
            setUserToResetPassword(null);
            toast({
                title: "Success",
                description: "Password reset successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to reset password",
                variant: "destructive",
            });
        },
    });

    // Filter users
    const filteredUsers = users?.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = userTypeFilter === 'all' || user.role === String(userTypeFilter);
        return matchesSearch && matchesType;
    }) || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
            <Navigation />

            <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                User Management
                            </h1>
                            <p className="text-gray-600">
                                Manage students and teachers in your organization.
                            </p>
                        </div>
                        <div className="flex space-x-2">
                            <Button
                                onClick={() => setIsBulkCreateOpen(true)}
                                variant="outline"
                                className="bg-white hover:bg-gray-50 text-blue-600 border-blue-200"
                            >
                                <Users className="h-4 w-4 mr-2" />
                                Bulk Create
                            </Button>
                            <Button
                                onClick={() => setIsCreateOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add User
                            </Button>
                        </div>
                    </div>

                    {/* Filters and Search */}
                    <Card className="mb-6 border-0 shadow-md">
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search users by username..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Tabs value={userTypeFilter} onValueChange={(v) => setUserTypeFilter(v as any)} className="w-full md:w-auto">
                                    <TabsList>
                                        <TabsTrigger value="all">All</TabsTrigger>
                                        <TabsTrigger value="student">Students</TabsTrigger>
                                        <TabsTrigger value="teacher">Teachers</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Users Grid */}
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No users found</h3>
                            <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredUsers.map((user) => (
                                <Card key={user.id} className="border border-gray-100 hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-lg ${(user.role as string) === 'teacher' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                                {(user.role as string) === 'teacher' ? (
                                                    <School className={`h-5 w-5 ${user.role === 'teacher' ? 'text-purple-600' : 'text-blue-600'}`} />
                                                ) : (
                                                    <GraduationCap className={`h-5 w-5 ${user.role === 'teacher' ? 'text-purple-600' : 'text-blue-600'}`} />
                                                )}
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-semibold">{user.username}</CardTitle>
                                                <CardDescription className="capitalize flex items-center mt-1">
                                                    <Badge variant={user.role === 'teacher' ? 'secondary' : 'outline'} className="text-xs">
                                                        {user.role}
                                                    </Badge>
                                                </CardDescription>
                                            </div>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => setUserToResetPassword(user)}>
                                                    <Key className="h-4 w-4 mr-2" />
                                                    Reset Password
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => setUserToDelete(user)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create User Dialog */}
            <CreateUserDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSubmit={(data) => createUserMutation.mutate(data)}
                isPending={createUserMutation.isPending}
            />

            <BulkCreateUserDialog
                open={isBulkCreateOpen}
                onOpenChange={setIsBulkCreateOpen}
                isPending={false} // Managed internally by the dialog's mutation
            />

            {/* Delete User Alert */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open: boolean) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            Delete User
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete user <span className="font-semibold text-gray-900">{userToDelete?.username}</span>?
                            This action cannot be undone and will remove all their data permanently.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reset Password Dialog */}
            <ResetPasswordDialog
                user={userToResetPassword}
                onOpenChange={(open: boolean) => !open && setUserToResetPassword(null)}
                onSubmit={(password) => userToResetPassword && resetPasswordMutation.mutate({ userId: userToResetPassword.id, newPassword: password })}
                isPending={resetPasswordMutation.isPending}
            />
        </div>
    );
}

function CreateUserDialog({ open, onOpenChange, onSubmit, isPending }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: CreateUserFormValues) => void;
    isPending: boolean;
}) {
    const form = useForm<CreateUserFormValues>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            username: '',
            password: '',
            role: 'student',
            grade: undefined,
        }
    });
    const selectedRole = form.watch('role');

    useEffect(() => {
        if (selectedRole !== 'student') {
            form.setValue('grade', undefined, { shouldValidate: true });
        }
    }, [selectedRole, form]);

    const handleSubmit = (data: CreateUserFormValues) => {
        onSubmit(data);
        // Only reset if successful? Parent handles success logic
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                        Create a new student or teacher account.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" {...form.register('username')} />
                        {form.formState.errors.username && (
                            <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" {...form.register('password')} />
                        {form.formState.errors.password && (
                            <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <div className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    id="student"
                                    value="student"
                                    {...form.register('role')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <Label htmlFor="student" className="font-normal">Student</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    id="teacher"
                                    value="teacher"
                                    {...form.register('role')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <Label htmlFor="teacher" className="font-normal">Teacher</Label>
                            </div>
                        </div>
                        {form.formState.errors.role && (
                            <p className="text-sm text-red-500">{form.formState.errors.role.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="grade">Grade {selectedRole === 'student' ? '*' : '(optional)'}</Label>
                        <Select
                            value={form.watch('grade')}
                            onValueChange={(value) => form.setValue('grade', value as CreateUserFormValues['grade'], { shouldValidate: true })}
                            disabled={selectedRole !== 'student'}
                        >
                            <SelectTrigger id="grade">
                                <SelectValue placeholder={selectedRole === 'student' ? 'Select grade' : 'Not required for teachers'} />
                            </SelectTrigger>
                            <SelectContent>
                                {gradeOptions.map((grade) => (
                                    <SelectItem key={grade} value={grade}>
                                        {grade === 'K' ? 'Kindergarten' : `Grade ${grade}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.formState.errors.grade && (
                            <p className="text-sm text-red-500">{form.formState.errors.grade.message}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Creating..." : "Create User"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ResetPasswordDialog({ user, onOpenChange, onSubmit, isPending }: {
    user: User | null;
    onOpenChange: (open: boolean) => void;
    onSubmit: (password: string) => void;
    isPending: boolean;
}) {
    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            newPassword: '',
            confirmPassword: '',
        }
    });

    if (!user) return null;

    return (
        <Dialog open={!!user} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                        Set a new password for <span className="font-semibold">{user.username}</span>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit((data) => onSubmit(data.newPassword))} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" type="password" {...form.register('newPassword')} />
                        {form.formState.errors.newPassword && (
                            <p className="text-sm text-red-500">{form.formState.errors.newPassword.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input id="confirmPassword" type="password" {...form.register('confirmPassword')} />
                        {form.formState.errors.confirmPassword && (
                            <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Resetting..." : "Reset Password"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function BulkCreateUserDialog({ open, onOpenChange, isPending }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isPending: boolean;
}) {
    const [csvContent, setCsvContent] = useState('');
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const bulkCreateMutation = useMutation({
        mutationFn: async (users: any[]) => {
            const res = await apiRequest('/api/admin/users/bulk', 'POST', users);
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });

            const successCount = data.created.length;
            const failCount = data.failed.length;

            if (failCount === 0) {
                toast({
                    title: "Success",
                    description: `Successfully created ${successCount} users.`,
                });
                onOpenChange(false);
                setCsvContent('');
            } else {
                toast({
                    title: "Partial Success",
                    description: `Created ${successCount} users. Failed to create ${failCount} users. Check console for details.`,
                    // variant: "default",
                });
                console.error("Failed users:", data.failed);
                // Keep dialog open to let user fix failed ones if we were advanced, 
                // but for now creating simple feedback is okay.
                // Maybe clear valid ones? 
                // Let's just close for now to keep it simple as per plan.
            }
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to bulk create users",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = () => {
        // Parse CSV
        const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const users = [];
        const errors = [];
        const validGrades = new Set(gradeOptions);

        for (let i = 0; i < lines.length; i++) {
            const parts = lines[i].split(',').map(p => p.trim());
            if (parts.length < 3) {
                errors.push(`Line ${i + 1}: Invalid format (expected username,password,role,grade)`);
                continue;
            }

            const [username, password, roleRaw, gradeRaw = ''] = parts;
            const role = roleRaw.toLowerCase();
            const normalizedGrade = gradeRaw.toUpperCase();

            // Basic validation
            if (!['student', 'teacher'].includes(role)) {
                errors.push(`Line ${i + 1}: Invalid role '${roleRaw}' (expected student or teacher)`);
                continue;
            }

            if (role === 'student' && !normalizedGrade) {
                errors.push(`Line ${i + 1}: Grade is required for student users`);
                continue;
            }

            if (normalizedGrade && !validGrades.has(normalizedGrade as typeof gradeOptions[number])) {
                errors.push(`Line ${i + 1}: Invalid grade '${gradeRaw}' (expected K or 1-12)`);
                continue;
            }

            users.push({
                username,
                password,
                role,
                grade: role === 'student' ? normalizedGrade : undefined,
            });
        }

        if (errors.length > 0) {
            toast({
                title: "Validation Error",
                description: `Found ${errors.length} errors. First error: ${errors[0]}`,
                variant: "destructive",
            });
            return;
        }

        if (users.length === 0) {
            toast({
                title: "Warning",
                description: "No valid users found to create",
                variant: 'destructive',
            });
            return;
        }

        bulkCreateMutation.mutate(users);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Bulk Create Users</DialogTitle>
                    <DialogDescription>
                        Enter users in CSV format: <code>username, password, role, grade</code> (one per line).<br />
                        Grade is required for students and optional for teachers. Valid grades: K, 1-12.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <textarea
                        className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder={`student1,password123,student,9\nteacher1,password123,teacher,`}
                        value={csvContent}
                        onChange={(e) => setCsvContent(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        Max 50 users at a time.
                    </p>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="button" onClick={handleSubmit} disabled={isPending || bulkCreateMutation.isPending}>
                        {bulkCreateMutation.isPending ? "Creating..." : "Create Users"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
