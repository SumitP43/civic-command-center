'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { updateProfile } from '@/services/auth.service';
import { getInitials } from '@/lib/utils';
import { Sidebar } from '@/components/layout/sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { CITIZEN_NAV } from '@/types';
import type { Profile } from '@/types';

export default function CitizenProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Noida');
  const [state, setState] = useState('Uttar Pradesh');
  const [pincode, setPincode] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login?redirectTo=/citizen/profile');
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data);
          setFullName(data.full_name || '');
          setPhone(data.phone || '');
          setAddress(data.address || '');
          setCity(data.city || 'Noida');
          setState(data.state || 'Uttar Pradesh');
          setPincode(data.pincode || '');
        }
      } catch (err: any) {
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await updateProfile({
          full_name: fullName,
          phone: phone || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          pincode: pincode || undefined,
        });

        if (res.error) {
          setErrorMsg(res.error);
          toast.error(res.error);
        } else {
          setSuccessMsg('Profile updated successfully!');
          toast.success('Profile details updated successfully');
          if (profile) {
            setProfile({
              ...profile,
              full_name: fullName,
              phone,
              address,
              city,
              state,
              pincode,
            });
          }
        }
      } catch (err: any) {
        const msg = err.message || 'An error occurred while saving profile';
        setErrorMsg(msg);
        toast.error(msg);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar items={CITIZEN_NAV} title="Citizen Civic Portal" subtitle="Personal Profile" />
      <div className="pl-64 transition-all duration-300">
        <TopNav user={profile} />
        <main className="p-6 max-w-5xl space-y-6">
          <Breadcrumbs />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Citizen Profile</h1>
              <p className="text-sm text-muted-foreground">
                Manage your contact information and municipal residence records
              </p>
            </div>
            <Badge variant="outline" className="w-fit gap-1.5 px-3 py-1 bg-primary/10 text-primary border-primary/20">
              <Shield className="w-3.5 h-3.5" />
              <span>Verified Citizen Account</span>
            </Badge>
          </div>

          {/* Status Alerts */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {/* Profile Overview Card */}
            <Card className="border-border/60 shadow-sm md:col-span-1 h-fit">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-3 relative">
                  <Avatar className="w-20 h-20 ring-4 ring-primary/10">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                      {profile ? getInitials(profile.full_name) : 'C'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-lg">{profile?.full_name || 'Citizen User'}</CardTitle>
                <CardDescription className="text-xs truncate">{profile?.email}</CardDescription>
                <div className="pt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Role: Citizen
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-xs border-t border-border/40">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </span>
                  <span className="font-medium text-foreground truncate max-w-[140px]">{profile?.email}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" /> City
                  </span>
                  <span className="font-medium text-foreground">{profile?.city || 'Noida'}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Registered
                  </span>
                  <span className="font-medium text-foreground">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Profile Form Card */}
            <Card className="border-border/60 shadow-sm md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Edit Personal Details</CardTitle>
                <CardDescription>
                  Keep your phone and address updated for faster complaint verification and resolution notifications.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input
                          id="full_name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Rahul Sharma"
                          className="pl-9"
                          required
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address (Read-Only)</Label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input
                          id="email"
                          value={profile?.email || ''}
                          className="pl-9 bg-muted/50 cursor-not-allowed"
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 9876543210"
                          className="pl-9"
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="201301"
                        maxLength={6}
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address / Sector</Label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Flat 402, Tower B, Sector 62"
                        className="pl-9"
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Noida"
                        disabled={isPending}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="Uttar Pradesh"
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-end gap-3 pt-4 border-t border-border/40">
                  <Button type="submit" disabled={isPending} className="gap-2">
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
