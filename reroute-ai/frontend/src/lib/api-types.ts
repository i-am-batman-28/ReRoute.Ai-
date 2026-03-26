/** Mirrors backend Pydantic schemas (JSON over the wire). */

export type UserPublic = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  avatar_url: string | null;
  google_account_linked: boolean;
};

export type RefreshSessionPublic = {
  id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  remember_me: boolean;
};

export type TripPublic = {
  id: string;
  user_id: string;
  title: string | null;
  snapshot: Record<string, unknown>;
  itinerary_revision: number;
  created_at: string;
  updated_at: string;
};

export type TripLegPublic = {
  id: string;
  trip_id: string;
  segment_order: number;
  mode: string;
  origin_code: string;
  destination_code: string;
  flight_number: string | null;
  travel_date: string | null;
  extra: Record<string, unknown> | null;
  created_at: string;
};

export type ItinerarySegmentPublic = {
  id: string;
  trip_id: string;
  segment_order: number;
  kind: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type TripDetailPublic = {
  trip: TripPublic;
  legs: TripLegPublic[];
  segments: ItinerarySegmentPublic[];
};

export type RankedOptionDTO = {
  option_id: string;
  score: number;
  summary: string;
  legs: Record<string, unknown>[];
  modality?: string;
};

export type AgentProposeResponse = {
  proposal_id: string;
  phase: string;
  ranked_options: RankedOptionDTO[];
  tool_trace_summary: string[];
  cascade_preview: Record<string, unknown> | null;
  compensation_draft: Record<string, unknown> | null;
  notification_status: Record<string, unknown> | null;
};

export type AgentConfirmResponse = {
  applied: boolean;
  itinerary_revision: number | null;
  message: string;
  duffel_order_id: string | null;
  email_sent: boolean | null;
  email_queued?: boolean | null;
};

export type AgentProposeJobAccepted = {
  task_id: string;
  state: "queued";
  poll_path: string;
};

export type AgentProposeJobStatus = {
  task_id: string;
  state: string;
  result: AgentProposeResponse | null;
  error: string | null;
};

export type DisruptionEventPublic = {
  id: string;
  trip_id: string;
  kind: string;
  disruption_type: string | null;
  proposal_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type MonitorTripSummary = {
  trip_id: string;
  title: string | null;
  itinerary_revision: number;
  pending_proposal_count: number;
  last_disruption_kind: string | null;
  last_disruption_at: string | null;
};

export type MonitorStatusResponse = {
  generated_at: string;
  trip_count: number;
  trips_shown: number;
  total_pending_proposals: number;
  trips: MonitorTripSummary[];
};
