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
