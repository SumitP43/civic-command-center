'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const labelMap: Record<string, string> = {
  citizen: 'Citizen',
  officer: 'Officer',
  department: 'Department',
  admin: 'Admin',
  dashboard: 'Dashboard',
  complaints: 'Complaints',
  report: 'Report Issue',
  profile: 'Profile',
  map: 'Map View',
  analytics: 'Analytics',
  officers: 'Officers',
  departments: 'Departments',
  'ai-insights': 'AI Insights',
  users: 'User Management',
  settings: 'Settings',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
      <Link href="/" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;
        const label = labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <span key={href} className="flex items-center">
            <ChevronRight className="h-3.5 w-3.5 mx-1.5" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
