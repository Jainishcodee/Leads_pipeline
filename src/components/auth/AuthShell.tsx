import type { ReactNode } from "react";
import { Coffee } from "lucide-react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-mocha-50 via-background to-gold-100">
      <div className="absolute -top-16 -right-20 h-72 w-72 rounded-full bg-gold-200/50 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-mocha-200/60 blur-3xl" />
      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        <div className="hidden lg:flex flex-col justify-between px-12 py-16 text-foreground">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl gradient-mocha flex items-center justify-center shadow-lg">
              <Coffee className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Mocha Leads</p>
              <h2 className="text-2xl font-semibold">Pipeline that feels personal.</h2>
            </div>
          </div>
          <div className="space-y-4 max-w-sm">
            <p className="text-lg font-medium">
              Keep every follow-up warm, every lead organized, and every deal brewing.
            </p>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-mocha-500" />
                Unified lead tracking and daily focus cues.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gold-400" />
                A calm workspace for high-touch sales teams.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-mocha-300" />
                Secure sign-in for every rep and manager.
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Crafted for Mocha Cafe teams</p>
        </div>

        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="card-premium p-6 md:p-8">
              <div className="mb-6 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-mocha flex items-center justify-center shadow-md">
                    <Coffee className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">{title}</h1>
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  </div>
                </div>
              </div>
              {children}
            </div>
            {footer ? <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
