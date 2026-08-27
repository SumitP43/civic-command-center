'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { loginSchema, registerSchema, updateProfileSchema } from '@/lib/validators/auth';
import type { LoginFormData, RegisterFormData, UpdateProfileFormData } from '@/lib/validators/auth';

export type AuthResult = {
  error?: string;
  success?: boolean;
};

export async function login(formData: LoginFormData): Promise<AuthResult> {
  const validated = loginSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || 'Invalid login details' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Get user profile to determine redirect
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Authentication failed' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const roleRouteMap: Record<string, string> = {
    citizen: '/citizen/dashboard',
    officer: '/officer/dashboard',
    department_admin: '/department/dashboard',
    super_admin: '/admin/dashboard',
  };

  const redirectTo = profile ? roleRouteMap[profile.role] || '/citizen/dashboard' : '/citizen/dashboard';
  redirect(redirectTo);
}

export async function register(formData: RegisterFormData): Promise<AuthResult> {
  const validated = registerSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || 'Invalid registration details' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: {
        full_name: validated.data.full_name,
        phone: validated.data.phone,
        role: 'citizen',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

export async function updateProfile(formData: UpdateProfileFormData): Promise<AuthResult> {
  const validated = updateProfileSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || 'Invalid profile data' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: validated.data.full_name,
      phone: validated.data.phone || null,
      address: validated.data.address || null,
      city: validated.data.city || null,
      state: validated.data.state || null,
      pincode: validated.data.pincode || null,
    })
    .eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
