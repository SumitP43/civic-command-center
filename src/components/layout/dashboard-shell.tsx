import { Sidebar } from '@/components/layout/sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { getCurrentUser } from '@/services/auth.service';
import { redirect } from 'next/navigation';
import type { NavItem } from '@/types';

interface DashboardShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  title: string;
  subtitle?: string;
  requiredRole: string;
}

export async function DashboardShell({
  children,
  navItems,
  title,
  subtitle,
  requiredRole,
}: DashboardShellProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Super admin can access everything
  if (user.role !== requiredRole && user.role !== 'super_admin') {
    redirect(`/${user.role === 'department_admin' ? 'department' : user.role}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar items={navItems} title={title} subtitle={subtitle} />
      <div className="pl-64 transition-all duration-300">
        <TopNav user={user} />
        <main className="p-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
