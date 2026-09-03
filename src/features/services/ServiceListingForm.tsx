"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SERVICE_TYPE_LABELS,
  type StudioServiceListingDto,
} from "@/lib/serializers/service-listing";
import type { ServiceListingStatus, ServiceListingType } from "@/types";
import { ServiceExtrasFields, type ExtraDraft } from "./ServiceExtrasFields";

interface Props {
  existing?: StudioServiceListingDto;
}

const TYPES = Object.keys(SERVICE_TYPE_LABELS) as ServiceListingType[];

export default function ServiceListingForm({ existing }: Props) {
  const router = useRouter();
  const isEdit = !!existing;

  const [type, setType] = useState<ServiceListingType>(existing?.type ?? "custom_beat");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [startingPrice, setStartingPrice] = useState(
    existing?.startingPrice?.toString() ?? ""
  );
  const [depositPercent, setDepositPercent] = useState<string>(
    String(existing?.depositPercent ?? 50)
  );
  const [turnaroundDays, setTurnaroundDays] = useState(
    existing?.turnaroundDays?.toString() ?? "7"
  );
  const [status, setStatus] = useState<ServiceListingStatus>(existing?.status ?? "draft");
  const [extras, setExtras] = useState<ExtraDraft[]>(
    existing?.extras?.map((extra) => ({
      name: extra.name,
      price: extra.price.toString(),
    })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addExtra = () => {
    if (extras.length >= 5) return;
    setExtras((prev) => [...prev, { name: "", price: "" }]);
  };

  const updateExtra = (index: number, field: keyof ExtraDraft, value: string) => {
    setExtras((prev) =>
      prev.map((extra, i) => (i === index ? { ...extra, [field]: value } : extra))
    );
  };

  const removeExtra = (index: number) => {
    setExtras((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const parsedExtras = extras
      .filter((extra) => extra.name.trim())
      .map((extra) => ({
        name: extra.name.trim(),
        price: Number(extra.price),
      }));

    const body = {
      type,
      title: title.trim(),
      description: description.trim(),
      startingPrice: Number(startingPrice),
      depositPercent: Number(depositPercent),
      turnaroundDays: Number(turnaroundDays),
      extras: parsedExtras,
      status,
    };

    try {
      const url = isEdit ? `/api/services/${existing.id}` : "/api/services";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.details && typeof data.details === "object") {
          const next: Record<string, string> = {};
          for (const [key, messages] of Object.entries(data.details)) {
            if (Array.isArray(messages) && messages[0]) next[key] = String(messages[0]);
          }
          setErrors(next);
        }
        toast.error(data?.error || "Failed to save service");
        return;
      }
      toast.success(isEdit ? "Service updated" : "Service created");
      router.push("/studio/services");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormField label="Type" htmlFor="type" error={errors.type}>
        <Select value={type} onValueChange={(value) => setType(value as ServiceListingType)}>
          <SelectTrigger id="type" aria-required="true">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {SERVICE_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Title" htmlFor="title" error={errors.title}>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          aria-required="true"
          aria-invalid={!!errors.title}
          autoFocus
        />
      </FormField>

      <FormField
        label="Description"
        htmlFor="description"
        error={errors.description}
        description="What the buyer gets, typical turnaround, and what you need in the brief."
      >
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={2000}
          required
          aria-required="true"
          aria-invalid={!!errors.description}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          label="Starting price (₹)"
          htmlFor="startingPrice"
          error={errors.startingPrice}
        >
          <Input
            id="startingPrice"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            required
            aria-required="true"
          />
        </FormField>
        <FormField label="Deposit" htmlFor="depositPercent" error={errors.depositPercent}>
          <Select
            value={depositPercent}
            onValueChange={(value) => {
              if (value) setDepositPercent(value);
            }}
          >
            <SelectTrigger id="depositPercent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20%</SelectItem>
              <SelectItem value="50">50%</SelectItem>
              <SelectItem value="100">100% (full pay)</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Turnaround (days)"
          htmlFor="turnaroundDays"
          error={errors.turnaroundDays}
        >
          <Input
            id="turnaroundDays"
            type="number"
            min={1}
            max={90}
            value={turnaroundDays}
            onChange={(e) => setTurnaroundDays(e.target.value)}
            required
            aria-required="true"
          />
        </FormField>
      </div>

      <ServiceExtrasFields
        extras={extras}
        onAdd={addExtra}
        onUpdate={updateExtra}
        onRemove={removeExtra}
      />

      <FormField label="Status" htmlFor="status" error={errors.status}>
        <Select value={status} onValueChange={(value) => setStatus(value as ServiceListingStatus)}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create service"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/studio/services")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
