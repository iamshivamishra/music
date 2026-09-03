"use client";

import { useState, useCallback, useMemo } from "react";
import { Copy, Check, Code2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildEmbedSnippet,
  type EmbedSnippetKind,
} from "@/features/beats/embed-snippet";
import type { EmbedSize, EmbedTheme } from "@/lib/serializers/embed-types";

interface EmbedCodeGeneratorProps {
  beatId?: string;
  beatTitle: string;
  username?: string;
  triggerLabel?: string;
  triggerClassName?: string;
}

export default function EmbedCodeGenerator({
  beatId,
  beatTitle,
  username,
  triggerLabel = "Embed",
  triggerClassName,
}: EmbedCodeGeneratorProps) {
  const hasBeat = Boolean(beatId);
  const hasCatalog = Boolean(username);
  const [size, setSize] = useState<EmbedSize>("full");
  const [theme, setTheme] = useState<EmbedTheme>("dark");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<EmbedSnippetKind>(
    !hasBeat && hasCatalog ? "catalog" : "beat"
  );

  const kind: EmbedSnippetKind = tab === "catalog" && hasCatalog ? "catalog" : "beat";

  const snippet = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildEmbedSnippet({
      origin,
      beatId,
      username,
      theme,
      size,
      kind,
    });
  }, [beatId, username, theme, size, kind]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }, [snippet.html]);

  if (!hasBeat && !hasCatalog) return null;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5", triggerClassName)}
          />
        }
      >
        <Code2 className="h-4 w-4" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Embed Player</DialogTitle>
          <DialogDescription>
            Copy the embed code to place this player on your website or YouTube
            description.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasBeat && hasCatalog && (
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {(["beat", "catalog"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTab(option)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    tab === option
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option === "beat" ? "Single Beat" : "Full Catalog"}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <OptionToggle
              label="Theme"
              value={theme}
              options={["dark", "light"]}
              onChange={setTheme}
            />
            {kind === "beat" && (
              <OptionToggle
                label="Size"
                value={size}
                options={["compact", "full"]}
                onChange={setSize}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
            <div className="overflow-hidden rounded-lg border border-border bg-muted/30 p-2">
              <iframe
                src={snippet.url}
                width={snippet.width}
                height={snippet.height}
                className="max-w-full rounded-lg"
                style={{ border: "none" }}
                title={`Embed preview for ${beatTitle}`}
                allow="autoplay; encrypted-media"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Embed Code</p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-xs leading-relaxed">
                <code>{snippet.html}</code>
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-2 top-2 rounded-md bg-background/80 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Copy embed code"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success-text" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OptionToggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-1 rounded-lg bg-muted p-0.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
              value === option
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
