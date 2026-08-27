'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Sparkles, Building2, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        if (data.user) {
          // Fetch profile to redirect based on role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          const roleRouteMap: Record<string, string> = {
            citizen: '/citizen/dashboard',
            officer: '/officer/dashboard',
            department_admin: '/department/dashboard',
            super_admin: '/admin/dashboard',
          };

          const target = profile?.role ? roleRouteMap[profile.role] || redirectTo : redirectTo;
          router.push(target);
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      }
    });
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo@123456');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-2 shadow-sm border border-primary/20">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Civic Command Center</h1>
          <p className="text-sm text-muted-foreground">Sign in to access your civic management portal</p>
        </div>

        <Card className="border-border/60 shadow-xl backdrop-blur-md bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Account Login</CardTitle>
            <CardDescription>Enter your credentials or choose a quick demo persona below</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs font-medium text-destructive bg-destructive/10 rounded-lg flex items-center gap-2 border border-destructive/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@city.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Demo Accounts</span>
              </div>
            </div>

            {/* Quick Demo Personas */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-auto py-2"
                onClick={() => handleDemoLogin('superadmin@demo.com')}
              >
                <Shield className="w-3.5 h-3.5 text-primary" />
                <div className="text-left truncate">
                  <p className="font-semibold truncate">Super Admin</p>
                  <p className="text-[10px] text-muted-foreground truncate">Command Center</p>
                </div>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-auto py-2"
                onClick={() => handleDemoLogin('deptadmin1@demo.com')}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <div className="text-left truncate">
                  <p className="font-semibold truncate">Dept Admin</p>
                  <p className="text-[10px] text-muted-foreground truncate">PWD Dispatch</p>
                </div>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-auto py-2"
                onClick={() => handleDemoLogin('officer1@demo.com')}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <div className="text-left truncate">
                  <p className="font-semibold truncate">Field Officer</p>
                  <p className="text-[10px] text-muted-foreground truncate">Task Queue</p>
                </div>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-auto py-2"
                onClick={() => handleDemoLogin('citizen1@demo.com')}
              >
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <div className="text-left truncate">
                  <p className="font-semibold truncate">Citizen</p>
                  <p className="text-[10px] text-muted-foreground truncate">Public Portal</p>
                </div>
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-0 border-t border-border/40 text-center text-xs text-muted-foreground">
            <div className="pt-3">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Create an account
              </Link>
            </div>
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              ← Return to Home
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
