export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container grid min-h-[calc(100vh-8rem)] items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:py-14">
      <section className="hidden space-y-5 lg:block">
        <p className="inline-flex rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          Built for artists and producers
        </p>
        <h1 className="max-w-lg text-4xl font-semibold leading-tight">
          License production-ready beats with a clean, fast workflow.
        </h1>
        <p className="max-w-lg text-base text-muted-foreground">
          Sign in to buy instantly, manage your catalog, and track performance from a single workspace.
        </p>
      </section>
      <section className="flex items-center justify-center">
        {children}
      </section>
    </div>
  );
}
