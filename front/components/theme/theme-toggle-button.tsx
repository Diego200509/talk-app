"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggleButton({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const { theme, toggleTheme } = useTheme();
  const dim = size === "sm" ? "size-8" : "size-9";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-[var(--talk-border)] bg-[var(--talk-hover)] text-[var(--talk-muted)] transition-colors hover:border-violet-500/45 hover:bg-violet-500/15 hover:text-violet-600 dark:hover:text-violet-200",
        dim,
        className
      )}
      aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
