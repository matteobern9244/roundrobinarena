import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Variante visiva. "ghost" usa solo icona; "outlined" ha bordo (default). */
  variant?: "outlined" | "ghost";
};

/**
 * Pulsante quadrato 40×40 (touch target accessibile) che alterna light/dark.
 * Stile coerente col pulsante reset dell'header torneo.
 */
export function ThemeToggle({ className, variant = "outlined" }: Props) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      aria-pressed={isDark}
      title={isDark ? "Tema chiaro" : "Tema scuro"}
      className={cn(
        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:text-foreground",
        variant === "outlined" && "border border-border hover:border-foreground/40",
        className,
      )}
    >
      {/* Sun visibile in dark (per "passare a light"), Moon visibile in light */}
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
