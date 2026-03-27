"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessagePublic, ChatSessionPublic, QuickReplyChip } from "@/lib/chat-types";
import {
  apiChatHistory,
  apiChatNewSession,
  apiChatSendMessage,
  apiChatUpdateEntities,
  apiChatUseMyInfo,
} from "@/lib/chat-api";
import { useRerouteSession } from "@/components/reroute-session-provider";

export function useChat() {
  const { user } = useRerouteSession();
  const [messages, setMessages] = useState<ChatMessagePublic[]>([]);
  const [session, setSession] = useState<ChatSessionPublic | null>(null);
  const [entities, setEntities] = useState<Record<string, unknown>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [readyToSave, setReadyToSave] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReplyChip[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const _applyReply = useCallback(
    (reply: {
      session: ChatSessionPublic;
      entities: Record<string, unknown>;
      missing_fields: string[];
      ready_to_save: boolean;
      quick_replies: QuickReplyChip[];
    }) => {
      setSession(reply.session);
      setEntities(reply.entities);
      setMissingFields(reply.missing_fields);
      setReadyToSave(reply.ready_to_save);
      setQuickReplies(reply.quick_replies);
    },
    [],
  );

  // Load history on mount
  useEffect(() => {
    if (!user || initializedRef.current) return;
    initializedRef.current = true;
    setLoading(true);
    apiChatHistory()
      .then((res) => {
        setSession(res.session);
        setMessages(res.messages);
        setEntities(res.session.entities);
        setQuickReplies(res.quick_replies ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load chat");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!user || sending) return;
      setSending(true);
      setError(null);
      setQuickReplies([]);

      const optimisticMsg: ChatMessagePublic = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: text,
        extracted_entities: null,
        card_type: null,
        card_data: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const reply = await apiChatSendMessage(text, session?.id);
        _applyReply(reply);

        // If agent ran and produced options, sync to workspace sessionStorage
        // so the trip workspace auto-loads the proposal when user navigates there
        if (reply.reply.card_type === "options" && reply.reply.card_data && reply.session.trip_id) {
          const tripId = reply.session.trip_id;
          const proposalData = reply.reply.card_data as Record<string, unknown>;
          const workspaceProposal = {
            proposal_id: proposalData.proposal_id,
            phase: "await_confirm",
            requires_user_review: false,
            disruption_summary: proposalData.disruption_summary,
            ranked_options: (proposalData.options as unknown[]) || [],
            tool_trace_summary: [],
            cascade_preview: proposalData.cascade_preview || null,
            compensation_draft: proposalData.compensation_draft || null,
            notification_status: null,
            search_meta: null,
          };
          try {
            sessionStorage.setItem(`reroute.proposal.v1:${tripId}`, JSON.stringify(workspaceProposal));
            if (proposalData.cascade_preview) {
              sessionStorage.setItem(`reroute.cascade.v1:${tripId}`, JSON.stringify(proposalData.cascade_preview));
            }
            if (proposalData.compensation_draft) {
              sessionStorage.setItem(`reroute.compensation.v1:${tripId}`, JSON.stringify(proposalData.compensation_draft));
            }
          } catch { /* sessionStorage full or unavailable */ }
        }

        setMessages((prev) => {
          const withoutOptimistic = prev.filter((m) => m.id !== optimisticMsg.id);
          return [
            ...withoutOptimistic,
            { ...optimisticMsg, id: `user-${Date.now()}` },
            reply.reply,
          ];
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send message");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      } finally {
        setSending(false);
      }
    },
    [user, sending, session?.id, _applyReply],
  );

  const updateEntities = useCallback(
    async (newEntities: Record<string, unknown>) => {
      if (!user || !session) return;
      setSending(true);
      setError(null);
      try {
        const reply = await apiChatUpdateEntities(session.id, newEntities);
        _applyReply(reply);
        setMessages((prev) => [...prev, reply.reply]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update entities");
      } finally {
        setSending(false);
      }
    },
    [user, session, _applyReply],
  );

  const useMyInfo = useCallback(async () => {
    if (!user || !session) return;
    setSending(true);
    setError(null);
    try {
      const reply = await apiChatUseMyInfo(session.id);
      _applyReply(reply);
      setMessages((prev) => [...prev, reply.reply]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to use your info");
    } finally {
      setSending(false);
    }
  }, [user, session, _applyReply]);

  const startNewSession = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const newSession = await apiChatNewSession();
      setSession(newSession);
      setMessages([]);
      setEntities({});
      setMissingFields([]);
      setReadyToSave(false);
      setQuickReplies([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start new session");
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    messages,
    session,
    entities,
    missingFields,
    readyToSave,
    quickReplies,
    sending,
    loading,
    error,
    sendMessage,
    updateEntities,
    useMyInfo,
    startNewSession,
  };
}
