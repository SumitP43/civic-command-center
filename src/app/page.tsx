import Link from 'next/link';
import {
  Shield,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  BarChart3,
  Building2,
  Users,
  CheckCircle2,
  Layers,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-base sm:text-lg">AI Civic Command Center</span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                Live Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/admin/dashboard">
              <Button size="sm" className="gap-1.5 shadow-sm">
                Launch Command Center
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:py-24 border-b border-border/40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        
        <div className="container mx-auto px-4 max-w-5xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span>Powered by Gemini 2.5 Flash & OpenStreetMap</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Real-Time AI Intelligence for <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              Modern Civic Governance
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            Automating the lifecycle of municipal complaints: citizen intake, instant AI categorization & priority calculation, 
            smart department dispatch, live Leaflet geospatial heatmaps, and automated SLA escalations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/admin/dashboard">
              <Button size="lg" className="h-12 px-6 gap-2 shadow-lg hover:shadow-primary/20 transition-all">
                <Shield className="w-5 h-5" />
                Executive Command Center
              </Button>
            </Link>

            <Link href="/admin/map">
              <Button size="lg" variant="outline" className="h-12 px-6 gap-2 border-border/80 hover:bg-muted">
                <MapPin className="w-5 h-5 text-primary" />
                Interactive Incident Map
              </Button>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-primary text-xs font-medium mb-1">
                <Zap className="w-4 h-4" />
                <span>AI Processing</span>
              </div>
              <p className="text-2xl font-bold">&lt; 1.2s</p>
              <p className="text-xs text-muted-foreground">Automated classification & scoring</p>
            </div>

            <div className="p-4 rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-blue-500 text-xs font-medium mb-1">
                <Building2 className="w-4 h-4" />
                <span>Departments</span>
              </div>
              <p className="text-2xl font-bold">8 Master Depts</p>
              <p className="text-xs text-muted-foreground">PWD, Water, Electricity & more</p>
            </div>

            <div className="p-4 rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-amber-500 text-xs font-medium mb-1">
                <Clock className="w-4 h-4" />
                <span>SLA Deadlines</span>
              </div>
              <p className="text-2xl font-bold">1h - 72h</p>
              <p className="text-xs text-muted-foreground">Automated multi-tier escalation</p>
            </div>

            <div className="p-4 rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-emerald-500 text-xs font-medium mb-1">
                <Layers className="w-4 h-4" />
                <span>Spatial Radar</span>
              </div>
              <p className="text-2xl font-bold">OpenStreetMap</p>
              <p className="text-xs text-muted-foreground">Priority heatmaps & clustering</p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Navigation Showcase */}
      <section className="py-16 bg-muted/20 border-b border-border/40">
        <div className="container mx-auto px-4 max-w-6xl space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Explore Command Portals</h2>
            <p className="text-sm text-muted-foreground">Direct access to role-tailored dashboards and operational views</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Super Admin */}
            <Card className="border-border/60 bg-card/80 hover:border-primary/50 transition-all shadow-md group">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <Shield className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg">Super Admin Command Center</CardTitle>
                <CardDescription>City-wide real-time analytics, SLA alerts, and officer dispatch radar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Real-time KPI metric cards & activity feed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>AI Review Queue for low-confidence tickets</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>SLA Escalation table with multi-tier triggers</span>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Link href="/admin/dashboard">
                  <Button className="w-full justify-between group-hover:bg-primary/90" size="sm">
                    Open Admin View
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Department Admin */}
            <Card className="border-border/60 bg-card/80 hover:border-blue-500/50 transition-all shadow-md group">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2">
                  <Building2 className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg">Department Management</CardTitle>
                <CardDescription>Departmental workload distribution, officer reassignment & analytics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Smart Officer assignment with workload scoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Departmental SLA compliance monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Interactive officer directory & active queue</span>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Link href="/department/dashboard">
                  <Button variant="outline" className="w-full justify-between border-blue-500/30 hover:bg-blue-500/10 text-blue-500" size="sm">
                    Open Department View
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Field Officer */}
            <Card className="border-border/60 bg-card/80 hover:border-amber-500/50 transition-all shadow-md group">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                  <Sparkles className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg">Officer Workspace</CardTitle>
                <CardDescription>Priority-sorted complaint queue, evidence upload & one-tap status updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Status action bar (Accept $\rightarrow$ In Progress $\rightarrow$ Resolve)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Resolution evidence photo upload to Supabase</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Live SLA countdown badges</span>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Link href="/officer/dashboard">
                  <Button variant="outline" className="w-full justify-between border-amber-500/30 hover:bg-amber-500/10 text-amber-500" size="sm">
                    Open Officer Queue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/40 py-8 bg-background">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">AI Civic Command Center</span>
            <span>— Civic Intelligence & Resolution Architecture</span>
          </div>
          <div>Built with Next.js 16, Supabase, Gemini 2.5 Flash & Leaflet</div>
        </div>
      </footer>
    </div>
  );
}
