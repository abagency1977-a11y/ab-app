
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('password');
  const [year, setYear] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);


  useEffect(() => {
    setYear(new Date().getFullYear());
    const savedLogo = localStorage.getItem('companyLogo');
    if (savedLogo) {
        setLogoUrl(savedLogo);
    }
    setIsMounted(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd have authentication logic here.
    // For this mock, we'll just redirect to the dashboard.
    router.push('/dashboard');
  };
  
  const Logo = () => {
    if (logoUrl) {
        return <img src={logoUrl} alt="Company Logo" className="h-16 mx-auto" data-ai-hint="logo" />;
    }
    return <Icons.logo className="h-12 w-12 text-primary" />;
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 flex items-center justify-center">
              <Logo />
            </div>
            <CardTitle className="text-3xl font-bold">AB AGENCY</CardTitle>
            <CardDescription>Welcome back! Please log in to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isMounted ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full text-lg">
                  Log In
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter>
            <p className="w-full text-center text-sm text-muted-foreground">
              &copy; {year} AB Agency. All rights reserved.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
