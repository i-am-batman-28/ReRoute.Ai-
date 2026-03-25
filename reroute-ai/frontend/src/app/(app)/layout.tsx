import { AppShell } from "@/components/app-shell";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppShell>{children}</AppShell>
    </div>
  );
}
