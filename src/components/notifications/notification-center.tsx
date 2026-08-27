'use client';

import { useState } from 'react';
import { Bell, Check, CheckCheck, Clock, ShieldAlert, Sparkles, UserCheck, MessageSquare, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Notification } from '@/types';

interface NotificationCenterProps {
  userId?: string;
  initialNotifications?: Notification[];
}

export function NotificationCenter({
  userId,
  initialNotifications = [],
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(() =>
    initialNotifications.filter((n) => !n.read).length
  );
  const [isOpen, setIsOpen] = useState(false);

  // Subscribe to real-time notifications for this user
  useRealtimeSubscription<Notification>({
    table: 'notifications',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: !!userId,
    onInsert: (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((c) => c + 1);

      // Toast alert
      if (newNotification.type === 'sla_warning' || (newNotification.type as string) === 'escalation') {
        toast.error(newNotification.title, {
          description: newNotification.message,
        });
      } else if (newNotification.type === 'status_changed') {
        toast.info(newNotification.title, {
          description: newNotification.message,
        });
      } else {
        toast.success(newNotification.title, {
          description: newNotification.message,
        });
      }
    },
    onUpdate: (updated) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n))
      );
      setUnreadCount((prev) =>
        notifications.filter((n) => (n.id === updated.id ? !updated.read : !n.read)).length
      );
    },
  });

  async function markAsRead(id: string) {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllAsRead() {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'sla_warning':
      case 'escalation':
        return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'complaint_assigned':
      case 'complaint_accepted':
        return <UserCheck className="h-4 w-4 text-primary" />;
      case 'status_changed':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger>
        <div className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] font-bold bg-destructive text-white border-2 border-background flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 max-h-[480px] overflow-hidden flex flex-col">
        <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] py-0 h-4">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-border/40">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              No notifications yet.
            </div>
          ) : (
            notifications.slice(0, 15).map((n) => (
              <div
                key={n.id}
                className={`p-3 text-xs transition-colors flex items-start gap-2.5 ${
                  n.read ? 'bg-background hover:bg-muted/30' : 'bg-primary/[0.03] hover:bg-primary/[0.06]'
                }`}
              >
                <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                <div className="flex-1 space-y-0.5 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`font-semibold text-xs truncate ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {n.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  {n.action_url && (
                    <div className="pt-1">
                      <Link
                        href={n.action_url}
                        onClick={() => {
                          if (!n.read) markAsRead(n.id);
                          setIsOpen(false);
                        }}
                        className="text-primary hover:underline text-[11px] font-medium inline-flex items-center gap-1"
                      >
                        View case
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  )}
                </div>
                {!n.read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
