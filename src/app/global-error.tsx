"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="mt-2 text-muted-foreground">
            A critical error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/80"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
