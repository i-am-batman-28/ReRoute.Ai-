"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Briefcase,
  Calendar,
  CheckCircle,
  Cloud,
  ExternalLink,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Pencil,
  Phone,
  Plane,
  Plus,
  Radar,
  AlertTriangle,
  UserCheck,
  Users,
  Armchair,
  Check,
} from "lucide-react";

import type { QuickReplyChip } from "@/lib/chat-types";

const ICON_MAP: Record<string, React.ReactNode> = {
  plane: <Plane className="h-3 w-3" />,
  "map-pin": <MapPin className="h-3 w-3" />,
  calendar: <Calendar className="h-3 w-3" />,
  users: <Users className="h-3 w-3" />,
  "user-check": <UserCheck className="h-3 w-3" />,
  phone: <Phone className="h-3 w-3" />,
  armchair: <Armchair className="h-3 w-3" />,
  briefcase: <Briefcase className="h-3 w-3" />,
  check: <Check className="h-3 w-3" />,
  pencil: <Pencil className="h-3 w-3" />,
  radar: <Radar className="h-3 w-3" />,
  "alert-triangle": <AlertTriangle className="h-3 w-3" />,
  "check-circle": <CheckCircle className="h-3 w-3" />,
  "external-link": <ExternalLink className="h-3 w-3" />,
  plus: <Plus className="h-3 w-3" />,
  cloud: <Cloud className="h-3 w-3" />,
};

// Voice input hook using Web Speech API
function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SR =
      typeof window !== "undefined"
        ? (window as unknown as {
            SpeechRecognition?: new () => SpeechRecognition;
            webkitSpeechRecognition?: new () => SpeechRecognition;
          })
        : null;
    const SpeechRec = SR?.SpeechRecognition || SR?.webkitSpeechRecognition;
    if (SpeechRec) {
      setSupported(true);
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) onResult(transcript);
        setListening(false);
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
    }
  }, [onResult]);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }, [listening]);

  return { listening, supported, toggle };
}

export function ChatInput({
  onSend,
  onChipAction,
  sending,
  disabled,
  quickReplies,
}: {
  onSend: (text: string) => void;
  onChipAction: (value: string) => void;
  sending: boolean;
  disabled?: boolean;
  quickReplies: QuickReplyChip[];
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleVoiceResult = useCallback(
    (transcript: string) => {
      setValue((prev) => (prev ? prev + " " + transcript : transcript));
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [],
  );

  const voice = useVoiceInput(handleVoiceResult);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || sending || disabled) return;
    onSend(text);
    setValue("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [value, sending, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleChipClick = (chip: QuickReplyChip) => {
    if (chip.value.startsWith("__")) {
      onChipAction(chip.value);
      return;
    }
    if (chip.value.endsWith(" ")) {
      setValue(chip.value);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      onSend(chip.value);
    }
  };

  return (
    <div className="border-t border-[color:var(--stroke)] bg-[color:var(--bg)] px-3 py-2.5">
      {/* Quick Reply Chips */}
      {quickReplies.length > 0 && !sending && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {quickReplies.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleChipClick(chip)}
              disabled={sending || disabled}
              className="group inline-flex items-center gap-1.5 rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface-0)] px-3 py-1.5 text-[11px] font-medium text-[color:var(--fg)] transition-all hover:border-[color:var(--primary)] hover:bg-[color:var(--primary-soft)] hover:text-[color:var(--primary)] active:scale-95 disabled:opacity-40"
            >
              {chip.icon && ICON_MAP[chip.icon] && (
                <span className="text-[color:var(--subtle)] group-hover:text-[color:var(--primary)] transition-colors">
                  {ICON_MAP[chip.icon]}
                </span>
              )}
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Text Input + Voice */}
      <div className="flex items-end gap-2 rounded-xl bg-[color:var(--surface-1)] ring-1 ring-[color:var(--stroke)] focus-within:ring-[color:var(--primary)] transition-colors">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={voice.listening ? "Listening..." : "Tell me about your flight..."}
          disabled={sending || disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent px-3 py-2.5 text-[13px] text-[color:var(--fg)] placeholder:text-[color:var(--subtle)] outline-none disabled:opacity-50 max-h-24 scrollbar-thin"
          style={{ minHeight: "38px" }}
        />

        {/* Voice button */}
        {voice.supported && (
          <button
            type="button"
            onClick={voice.toggle}
            disabled={sending || disabled}
            className={`mb-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
              voice.listening
                ? "bg-red-500 text-white animate-pulse"
                : "text-[color:var(--subtle)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--fg)]"
            } disabled:opacity-30`}
            title={voice.listening ? "Stop listening" : "Voice input"}
          >
            {voice.listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Send button */}
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || sending || disabled}
          className="mb-1.5 mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--primary)] text-white transition-all hover:bg-[color:var(--primary-strong)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowUp className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <p className="mt-1 text-center text-[10px] text-[color:var(--subtle)]">
        Powered by GPT-4o &middot; ReRoute AI
      </p>
    </div>
  );
}
