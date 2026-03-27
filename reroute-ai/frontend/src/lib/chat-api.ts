/** API client for the chat endpoints. */

import { getApiBase } from "@/lib/api-base";
import { authFetch } from "@/lib/auth-fetch";
import { apiErrorMessage } from "@/lib/reroute-api";
import type { ChatHistoryResponse, ChatReply, ChatSessionPublic } from "@/lib/chat-types";

const jsonHeaders: HeadersInit = { "Content-Type": "application/json" };

export async function apiChatSendMessage(
  message: string,
  sessionId?: string | null,
): Promise<ChatReply> {
  const res = await authFetch(`${getApiBase()}/chat/message`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ message, session_id: sessionId ?? null }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<ChatReply>;
}

export async function apiChatHistory(sessionId?: string | null): Promise<ChatHistoryResponse> {
  const params = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
  const res = await authFetch(`${getApiBase()}/chat/history${params}`, { headers: jsonHeaders });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<ChatHistoryResponse>;
}

export async function apiChatNewSession(): Promise<ChatSessionPublic> {
  const res = await authFetch(`${getApiBase()}/chat/new`, {
    method: "POST",
    headers: jsonHeaders,
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<ChatSessionPublic>;
}

export async function apiChatUpdateEntities(
  sessionId: string,
  entities: Record<string, unknown>,
): Promise<ChatReply> {
  const res = await authFetch(`${getApiBase()}/chat/update-entities`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ session_id: sessionId, entities }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<ChatReply>;
}

export async function apiChatUseMyInfo(sessionId: string): Promise<ChatReply> {
  const res = await authFetch(`${getApiBase()}/chat/use-my-info`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json() as Promise<ChatReply>;
}
