import { ChevronLeft } from "lucide-react";
import {
  TALK_PANEL_HEADER,
  TALK_PANEL_TITLE,
} from "@/components/chat/chat-shell.helpers";

type Props = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
};

export function SidebarPanelHeader({ title, onBack, backLabel = "Volver" }: Props) {
  return (
    <div className={TALK_PANEL_HEADER}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--talk-border)] bg-[var(--talk-hover)] px-2 text-xs text-[var(--talk-text)] transition hover:bg-violet-500/10"
          aria-label={backLabel}
        >
          <ChevronLeft className="size-3.5" />
          <span>{backLabel}</span>
        </button>
      ) : null}
      <p className={TALK_PANEL_TITLE}>{title}</p>
    </div>
  );
}
