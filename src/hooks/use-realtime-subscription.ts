'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface RealtimeSubscriptionOptions<T = any> {
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  channelName?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: { old: T }) => void;
  onChange?: (payload: any) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription<T = any>({
  table,
  schema = 'public',
  event = '*',
  filter,
  channelName,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: RealtimeSubscriptionOptions<T>) {
  const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Keep callback refs stable to prevent unneeded re-subscriptions
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onInsertRef.current = onInsert;
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
    onChangeRef.current = onChange;
  });

  const setupSubscription = useCallback(() => {
    if (!enabled) return;

    const supabase = createClient();
    const uniqueChannel = channelName || `${table}_${filter || 'all'}_${Date.now()}`;

    setStatus('CONNECTING');

    const channel = supabase.channel(uniqueChannel);

    channel
      .on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          filter,
        },
        (payload: any) => {
          setLastEventTime(new Date());

          if (payload.eventType === 'INSERT' && onInsertRef.current) {
            onInsertRef.current(payload.new);
          } else if (payload.eventType === 'UPDATE' && onUpdateRef.current) {
            onUpdateRef.current(payload.new);
          } else if (payload.eventType === 'DELETE' && onDeleteRef.current) {
            onDeleteRef.current(payload);
          }

          if (onChangeRef.current) {
            onChangeRef.current(payload);
          }
        }
      )
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === 'SUBSCRIBED') {
          setStatus('CONNECTED');
        } else if (subscribeStatus === 'CHANNEL_ERROR') {
          setStatus('ERROR');
        } else if (subscribeStatus === 'CLOSED' || subscribeStatus === 'TIMED_OUT') {
          setStatus('DISCONNECTED');
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setStatus('DISCONNECTED');
    };
  }, [table, schema, event, filter, channelName, enabled]);

  useEffect(() => {
    const cleanup = setupSubscription();
    return () => {
      if (cleanup) cleanup();
    };
  }, [setupSubscription]);

  return {
    status,
    isConnected: status === 'CONNECTED',
    lastEventTime,
  };
}
