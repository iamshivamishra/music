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
      <body className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="mt-2 text-zinc-400">
            A critical error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-md bg-violet-600 px-6 py-2 font-medium text-white hover:bg-violet-700"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
