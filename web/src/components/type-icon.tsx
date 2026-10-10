import { AppWindow, KeyRound, Palette, Zap, type LucideProps } from "lucide-react";
import type { IntegrationType } from "@/lib/types";

const icons = { app: AppWindow, provider: KeyRound, theme: Palette, action: Zap };

export function TypeIcon({ type, ...props }: { type: IntegrationType } & LucideProps) {
  const Icon = icons[type];
  return <Icon {...props} />;
}
