"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getApiBase } from "@/lib/api-base";
import { useRerouteSession } from "@/components/reroute-session-provider";

export type NotificationEvent = {
  type: "disruption_alert" | "auto_rebook" | "agent_propose" | "connected" | "pong" | "keepalive";
  data: {
    trip_id?: string;
    disruption_type?: string;
    message?: string;
    proposal_id?: string;
    options_count?: number;
    option_summary?: string;
    duffel_order_id?: string;
    user_id?: string;
  };
};

export function useNotifications() {
  const { user } = useRerouteSession();
  const [connected, setConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState<NotificationEvent | null>(null);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;

    const base = getApiBase().replace(/^http/, "ws");
    const ws = new WebSocket(`${base}/ws/notifications`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send auth token (from cookie — we'll read it or use a stored token)
      const token = typeof document !== "undefined"
        ? document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("reroute_access="))?.split("=")[1] || ""
        : "";
      ws.send(JSON.stringify({ token }));
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as NotificationEvent;
        if (event.type === "connected") {
          setConnected(true);
          return;
        }
        if (event.type === "pong" || event.type === "keepalive") return;

        setLatestEvent(event);
        setEvents((prev) => [event, ...prev].slice(0, 50));
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Auto-reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [user]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const dismissLatest = useCallback(() => setLatestEvent(null), []);

  return { connected, latestEvent, events, dismissLatest };
}
