'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { LocationPickerMap } from '@/components/maps/location-picker-map';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  MapPin,
  Camera,
  UploadCloud,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Shield,
  FileText,
  Building2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { createComplaint } from '@/services/complaint.service';
import { CITIZEN_NAV, MAP_CONFIG, PRIORITY_RANGES } from '@/types';
import type { Profile } from '@/types';

interface CategoryOption {
  id: string;
  name: string;
  code: string;
  department_id: string;
}

interface AIAnalysisPreview {
  category?: string;
  subcategory?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority_score?: number;
  department_recommendation?: string;
  summary?: string;
  risk_factors?: string[];
  confidence_score?: number;
}

export default function CitizenReportPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number>(MAP_CONFIG.DEFAULT_CENTER.lat);
  const [longitude, setLongitude] = useState<number>(MAP_CONFIG.DEFAULT_CENTER.lng);
  const [affectedCount, setAffectedCount] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Image Upload State
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>('');

  // AI Classification State
  const [isClassifying, setIsClassifying] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisPreview | null>(null);

  // Load user profile & available categories
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (prof) setProfile(prof);
      }

      const { data: catData } = await supabase
        .from('complaint_categories')
        .select('id, name, code, department_id')
        .order('name');
      if (catData) {
        setCategories(catData);
      }
    }
    loadData();
  }, []);

  // Handle Map Pin Drag / Click
  const handleLocationChange = (coords: { lat: number; lng: number }) => {
    setLatitude(coords.lat);
    setLongitude(coords.lng);
  };

  // Trigger Gemini AI Classification
  const handleAiClassify = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Please enter at least a title and description before running AI analysis');
      return;
    }

    setIsClassifying(true);
    try {
      const res = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          location: address ? { address, latitude, longitude } : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('AI analysis service error');
      }

      const result = await res.json();
      setAiAnalysis(result);
      toast.success('Gemini AI analysis complete!');

      // Match AI suggested category to category dropdown
      if (result.category && categories.length > 0) {
        const match = categories.find(
          (c) =>
            c.name.toLowerCase().includes(result.category.toLowerCase()) ||
            result.category.toLowerCase().includes(c.name.toLowerCase())
        );
        if (match) {
          setSelectedCategory(match.id);
        }
      }
    } catch (err: any) {
      toast.error('AI classification failed. You can still select category manually.');
    } finally {
      setIsClassifying(false);
    }
  };

  // Image File Upload Preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setMediaPreview(result);
      setMediaUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Submit Complaint Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (title.length < 10) {
      toast.error('Title must be at least 10 characters');
      return;
    }
    if (description.length < 20) {
      toast.error('Description must be at least 20 characters');
      return;
    }
    if (!address.trim()) {
      toast.error('Please provide the street address or location name');
      return;
    }

    startTransition(async () => {
      try {
        const mediaUrls = mediaUrl ? [mediaUrl] : [];

        const res = await createComplaint(
          {
            title,
            description,
            address,
            landmark: landmark || undefined,
            latitude,
            longitude,
            affected_count: affectedCount,
          },
          mediaUrls
        );

        if (res.error) {
          toast.error(`Error: ${res.error}`);
          return;
        }

        if (res.data?.id) {
          toast.success(`Complaint #${res.data.complaint_number} submitted! Routing via AI...`);
          router.push(`/citizen/complaints/${res.data.id}`);
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to submit complaint');
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar items={CITIZEN_NAV} title="Citizen Civic Portal" subtitle="Report Issue" />
      <div className="pl-64 transition-all duration-300">
        <TopNav user={profile} />
        <main className="p-6 max-w-5xl space-y-6">
          <Breadcrumbs />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Report a Civic Issue</h1>
              <p className="text-sm text-muted-foreground">
                Submit an issue with photos and GPS pin. Gemini AI will analyze severity and dispatch the nearest officer.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAiClassify}
                disabled={isClassifying || !title || !description}
                className="gap-2 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary"
              >
                {isClassifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    AI Auto-Classify
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Gemini AI Live Prediction Card */}
          {aiAnalysis && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3 relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span>Gemini 2.5 Flash Classification Preview</span>
                </div>
                <Badge
                  variant="outline"
                  className="font-bold text-xs"
                  style={{
                    borderColor:
                      PRIORITY_RANGES[aiAnalysis.severity as keyof typeof PRIORITY_RANGES]?.color || '#3b82f6',
                    color:
                      PRIORITY_RANGES[aiAnalysis.severity as keyof typeof PRIORITY_RANGES]?.color || '#3b82f6',
                  }}
                >
                  {aiAnalysis.severity || 'MEDIUM'} SEVERITY (Score: {aiAnalysis.priority_score || 70}/100)
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">{aiAnalysis.summary}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Recommended Dept</p>
                  <p className="font-semibold text-foreground truncate">{aiAnalysis.department_recommendation || 'Public Works'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Detected Category</p>
                  <p className="font-semibold text-foreground truncate">{aiAnalysis.category || 'Road Maintenance'}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">AI Confidence</p>
                  <p className="font-semibold text-primary">{Math.round((aiAnalysis.confidence_score || 0.92) * 100)}%</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Left Column: Complaint Details */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">1. Issue Information</CardTitle>
                    <CardDescription>Describe what is broken or requiring municipal attention.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Issue Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Deep pothole causing bike accidents near Fortis Hospital"
                        required
                        disabled={isPending}
                      />
                      <p className="text-[11px] text-muted-foreground">Min. 10 characters</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Detailed Description *</Label>
                      <Textarea
                        id="description"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the exact location, how long it has been broken, danger level, or people affected..."
                        required
                        disabled={isPending}
                      />
                      <p className="text-[11px] text-muted-foreground">Min. 20 characters</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category (Optional - AI will auto-route)</Label>
                        <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val ?? '')} disabled={isPending}>
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Select or let AI detect" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="affected">Estimated Citizens Affected</Label>
                        <div className="relative">
                          <Users className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                          <Input
                            id="affected"
                            type="number"
                            min={1}
                            max={10000}
                            value={affectedCount}
                            onChange={(e) => setAffectedCount(parseInt(e.target.value) || 1)}
                            className="pl-9"
                            disabled={isPending}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location Card */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">2. Precise Location</CardTitle>
                    <CardDescription>Enter address and click on map to position the exact incident pin.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address">Street Address / Sector *</Label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                          <Input
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Sector 62, Main Road, Noida"
                            className="pl-9"
                            required
                            disabled={isPending}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="landmark">Landmark</Label>
                        <Input
                          id="landmark"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder="Near Gate 3 / Metro Pillar 42"
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Pinpoint on Leaflet Incident Radar:</span>
                        <span className="font-mono">
                          {latitude.toFixed(4)}, {longitude.toFixed(4)}
                        </span>
                      </div>
                      <LocationPickerMap
                        latitude={latitude}
                        longitude={longitude}
                        onLocationChange={handleLocationChange}
                        height="260px"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Evidence Photo & Submission Summary */}
              <div className="space-y-6">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Photo Evidence</CardTitle>
                    <CardDescription>Attach an image for fast officer verification.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mediaPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-border group aspect-video bg-muted flex items-center justify-center">
                        <img
                          src={mediaPreview}
                          alt="Complaint preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setMediaPreview(null);
                            setMediaUrl('');
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/20 hover:bg-muted/40">
                        <UploadCloud className="w-8 h-8 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Upload Photo</span>
                        <span className="text-[10px] text-muted-foreground text-center">
                          PNG, JPG up to 5MB
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={isPending}
                        />
                      </label>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Automatic SLA Guarantee
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-muted-foreground">
                    <p>• P1 Critical emergencies dispatched in &lt; 1 hour.</p>
                    <p>• High priority issues inspected within 6 hours.</p>
                    <p>• Real-time notifications on officer arrival & photo proof of resolution.</p>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button type="submit" disabled={isPending} className="w-full h-11 text-sm font-semibold shadow-lg gap-2">
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting & AI Processing...
                        </>
                      ) : (
                        <>
                          Submit Civic Complaint
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
