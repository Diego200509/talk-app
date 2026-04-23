import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
};

export function SidebarPanelHeader({ title, onBack, backLabel = "Volver" }: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs text-zinc-300 transition hover:bg-white/[0.1] hover:text-zinc-100"
          aria-label={backLabel}
        >
          <ChevronLeft className="size-3.5" />
          <span>{backLabel}</span>
        </button>
      ) : null}
      <p className="text-sm font-semibold text-zinc-100">{title}</p>
    </div>
  );
}
