/** Types for the AI chat widget — mirrors backend chat schemas. */

export type QuickReplyChip = {
  label: string;
  value: string;
  icon: string | null;
};

export type ChatMessagePublic = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  extracted_entities: Record<string, unknown> | null;
  card_type: "options" | "entity_summary" | "booking_confirmed" | "agent_progress" | null;
  card_data: Record<string, unknown> | null;
  created_at: string;
};

export type ChatSessionPublic = {
  id: string;
  phase: "collecting" | "ready_to_save" | "trip_created" | "agent_running" | "agent_complete" | "done";
  entities: Record<string, unknown>;
  trip_id: string | null;
  proposal_id: string | null;
  created_at: string;
};

export type ChatReply = {
  session: ChatSessionPublic;
  reply: ChatMessagePublic;
  entities: Record<string, unknown>;
  missing_fields: string[];
  ready_to_save: boolean;
  quick_replies: QuickReplyChip[];
};

export type ChatHistoryResponse = {
  session: ChatSessionPublic;
  messages: ChatMessagePublic[];
  quick_replies: QuickReplyChip[];
};

export type OptionCardData = {
  proposal_id: string;
  disruption_summary: string | null;
  options: {
    index: number;
    option_id: string;
    score: number;
    summary: string;
    legs: { origin: string; destination: string; departing_at: string; arriving_at: string }[];
    modality: string;
  }[];
  cascade_preview: Record<string, unknown> | null;
  compensation_draft: Record<string, unknown> | null;
};

export type BookingConfirmedData = {
  duffel_order_id: string | null;
  itinerary_revision: number | null;
  option_summary: string;
};
