"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  Loader2, Camera, User, AtSign, FileText, Music,
  Globe, ExternalLink, X, MessageCircle, Bell, Landmark,
} from "lucide-react";
import { GENRE_OPTIONS } from "@/lib/validators/beat";
import { normalizeWhatsAppNumber } from "@/lib/utils/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { IUser } from "@/types";

interface EditProfileFormProps {
  user: IUser;
}

export default function EditProfileForm({ user }: EditProfileFormProps) {
  const router = useRouter();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const [displayName, setDisplayName] = useState(user.displayName || user.name);
  const [username, setUsername] = useState(user.username || "");
  const [bio, setBio] = useState(user.bio || "");
  const [genres, setGenres] = useState<string[]>(user.genres || []);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || user.image || "");
  const [coverImageUrl, setCoverImageUrl] = useState(user.coverImageUrl || "");

  const [instagram, setInstagram] = useState(user.socialLinks?.instagram || "");
  const [youtube, setYoutube] = useState(user.socialLinks?.youtube || "");
  const [twitter, setTwitter] = useState(user.socialLinks?.twitter || "");
  const [website, setWebsite] = useState(user.socialLinks?.website || "");
  const [spotify, setSpotify] = useState(user.socialLinks?.spotify || "");
  const [soundcloud, setSoundcloud] = useState(user.socialLinks?.soundcloud || "");
  const [whatsappNumber, setWhatsappNumber] = useState(user.socialLinks?.whatsappNumber || "");
  const [whatsappError, setWhatsappError] = useState("");

  const [saleWhatsApp, setSaleWhatsApp] = useState(user.notificationPrefs?.saleWhatsApp ?? false);
  const [dropWhatsApp, setDropWhatsApp] = useState(user.notificationPrefs?.dropWhatsApp ?? false);
  const [saleEmail, setSaleEmail] = useState(user.notificationPrefs?.saleEmail ?? true);

  const isProducer = user.role === "producer" || user.role === "admin";
  const [gstin, setGstin] = useState(user.taxProfile?.gstin || "");
  const [pan, setPan] = useState(user.taxProfile?.pan || "");
  const [legalName, setLegalName] = useState(user.taxProfile?.legalName || "");
  const [stateCode, setStateCode] = useState(user.taxProfile?.stateCode || "");
  const [isComposition, setIsComposition] = useState(user.taxProfile?.isComposition ?? false);
  const [taxError, setTaxError] = useState("");

  const initials = (displayName || user.name)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleImageUpload = async (file: File, type: "avatar" | "cover") => {
    const setter = type === "avatar" ? setAvatarUploading : setCoverUploading;
    setter(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/user/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Upload failed");
        return;
      }

      const { url } = await res.json();
      if (type === "avatar") setAvatarUrl(url);
      else setCoverImageUrl(url);

      toast.success(`${type === "avatar" ? "Avatar" : "Cover image"} updated`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setter(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length >= 5
          ? prev
          : [...prev, genre]
    );
  };

  const handleSave = async () => {
    setSaving(true);

    const trimmedWhatsapp = whatsappNumber.trim();
    if (trimmedWhatsapp) {
      const normalized = normalizeWhatsAppNumber(trimmedWhatsapp);
      if (normalized === null) {
        setWhatsappError("Enter a 10-digit Indian mobile number");
        setSaving(false);
        document.getElementById("whatsapp")?.focus();
        return;
      }
    } else {
      setWhatsappError("");
    }

    const effectiveSaleWA = trimmedWhatsapp ? saleWhatsApp : false;
    const effectiveDropWA = trimmedWhatsapp ? dropWhatsApp : false;

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName || undefined,
          username: username || undefined,
          bio: bio || undefined,
          genres: genres.length > 0 ? genres : undefined,
          socialLinks: {
            instagram,
            youtube,
            twitter,
            website,
            spotify,
            soundcloud,
            whatsappNumber: trimmedWhatsapp,
          },
          notificationPrefs: {
            saleWhatsApp: isFeatureEnabled("whatsappSaleAlerts")
              ? effectiveSaleWA
              : false,
            dropWhatsApp: effectiveDropWA,
            saleEmail,
          },
          ...(isProducer && isFeatureEnabled("producerTaxPack")
            ? {
                taxProfile: {
                  gstin,
                  pan,
                  legalName,
                  stateCode,
                  isComposition,
                },
              }
            : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        const fieldError =
          err.details?.["socialLinks.whatsappNumber"]?.[0] ??
          err.details?.["taxProfile.gstin"]?.[0] ??
          err.details?.["taxProfile.pan"]?.[0] ??
          err.details?.["taxProfile.stateCode"]?.[0];
        if (typeof err.details?.["socialLinks.whatsappNumber"]?.[0] === "string") {
          setWhatsappError(err.details["socialLinks.whatsappNumber"][0]);
          document.getElementById("whatsapp")?.focus();
        } else if (typeof fieldError === "string") {
          setTaxError(fieldError);
          document.getElementById("gstin")?.focus();
        }
        toast.error(err.error || "Failed to save profile");
        return;
      }

      toast.success("Profile updated");
      router.refresh();
      if (username) {
        router.push(`/producer/${username}`);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Profile</h1>
        <p className="text-sm text-muted-foreground">
          Customize your public producer profile
        </p>
      </div>

      {/* Cover Image */}
      <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <div className="relative h-40 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-background sm:h-48">
          {coverImageUrl && (
            <Image
              src={coverImageUrl}
              alt="Cover"
              fill
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, "cover");
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => coverRef.current?.click()}
              disabled={coverUploading}
            >
              {coverUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {coverImageUrl ? "Change Cover" : "Upload Cover"}
            </Button>
          </div>
        </div>

        {/* Avatar overlay */}
        <div className="relative -mt-12 px-6 pb-6">
          <div className="relative inline-block">
            <Avatar className="h-24 w-24 border-4 border-card">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, "avatar");
              }}
            />
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground transition-colors hover:bg-primary/80"
              aria-label="Upload avatar"
            >
              {avatarUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Basic Info */}
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Basic Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-1">
                <AtSign className="h-3.5 w-3.5" />
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                }
                placeholder="your-username"
                maxLength={30}
              />
              {username && (
                <p className="text-xs text-muted-foreground">
                  trishulbeats.com/producer/{username}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio" className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the world about your sound..."
              maxLength={500}
              rows={3}
            />
            <p className="text-right text-xs text-muted-foreground">
              {bio.length}/500
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Genres */}
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="h-5 w-5 text-primary" />
            Genres
          </CardTitle>
          <CardDescription>Select up to 5 genres you produce</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.map((genre) => {
              const selected = genres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {genre}
                  {selected && <X className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
          {genres.length >= 5 && (
            <p className="mt-2 text-xs text-muted-foreground">Maximum 5 genres selected</p>
          )}
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Social Links
          </CardTitle>
          <CardDescription>Connect your social profiles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { icon: ExternalLink, label: "Instagram", value: instagram, set: setInstagram, placeholder: "https://instagram.com/you" },
            { icon: ExternalLink, label: "YouTube", value: youtube, set: setYoutube, placeholder: "https://youtube.com/@you" },
            { icon: ExternalLink, label: "Twitter / X", value: twitter, set: setTwitter, placeholder: "https://x.com/you" },
            { icon: Globe, label: "Website", value: website, set: setWebsite, placeholder: "https://yoursite.com" },
            { icon: Music, label: "Spotify", value: spotify, set: setSpotify, placeholder: "https://open.spotify.com/artist/..." },
            { icon: Music, label: "SoundCloud", value: soundcloud, set: setSoundcloud, placeholder: "https://soundcloud.com/you" },
          ].map(({ icon: Icon, label, value, set, placeholder }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="flex-1"
              />
            </div>
          ))}
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="whatsapp" className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Label>
            <Input
              id="whatsapp"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={whatsappNumber}
              onChange={(e) => {
                const val = e.target.value;
                setWhatsappNumber(val);
                if (whatsappError) setWhatsappError("");
                if (!val.trim()) {
                  setSaleWhatsApp(false);
                  setDropWhatsApp(false);
                }
              }}
              onBlur={() => {
                const trimmed = whatsappNumber.trim();
                if (!trimmed) {
                  setWhatsappError("");
                  return;
                }
                if (normalizeWhatsAppNumber(trimmed) === null) {
                  setWhatsappError("Enter a 10-digit Indian mobile number");
                }
              }}
              placeholder="98765 43210"
              aria-invalid={!!whatsappError}
              aria-describedby={whatsappError ? "whatsapp-error" : "whatsapp-help"}
              className="flex-1"
            />
            {whatsappError ? (
              <p id="whatsapp-error" role="alert" className="text-xs text-destructive">
                {whatsappError}
              </p>
            ) : (
              <p id="whatsapp-help" className="text-xs text-muted-foreground">
                Optional. Buyers can message you on WhatsApp. Your number is never shown as text.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {isProducer && isFeatureEnabled("producerTaxPack") && (
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Landmark className="h-5 w-5 text-primary" />
              Tax details
            </CardTitle>
            <CardDescription>
              Optional, for your CA. Never shown on your public profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={gstin}
                  onChange={(e) => {
                    setGstin(e.target.value.toUpperCase());
                    if (taxError) setTaxError("");
                  }}
                  placeholder="27AAAAA0000A1Z5"
                  maxLength={15}
                  autoComplete="off"
                  aria-invalid={!!taxError}
                  aria-describedby={taxError ? "tax-error" : "gstin-help"}
                />
                <p id="gstin-help" className="text-xs text-muted-foreground">
                  15-character GSTIN if you are registered.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  value={pan}
                  onChange={(e) => {
                    setPan(e.target.value.toUpperCase());
                    if (taxError) setTaxError("");
                  }}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  autoComplete="off"
                  aria-describedby="pan-help"
                />
                <p id="pan-help" className="text-xs text-muted-foreground">
                  Masked after save. Leave the masked value to keep the current PAN, or clear to remove it.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal name</Label>
                <Input
                  id="legalName"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="As on PAN / GST certificate"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stateCode">GST state code</Label>
                <Input
                  id="stateCode"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  placeholder="27"
                  maxLength={2}
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="composition" className="text-sm font-medium">
                  Composition scheme
                </Label>
                <p className="text-xs text-muted-foreground">
                  You file GST under the composition scheme.
                </p>
              </div>
              <Switch
                id="composition"
                checked={isComposition}
                onCheckedChange={setIsComposition}
              />
            </div>
            {taxError ? (
              <p id="tax-error" role="alert" className="text-sm text-destructive">
                {taxError}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Notification Preferences (producers only) */}
      {isProducer && (
      <Card id="notifications" className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFeatureEnabled("whatsappSaleAlerts") && (
            <>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="sale-whatsapp" className="text-sm font-medium">
                WhatsApp sale alerts
              </Label>
              <p className="text-xs text-muted-foreground">
                Text me on WhatsApp when I make a sale
              </p>
            </div>
            <Switch
              id="sale-whatsapp"
              checked={saleWhatsApp}
              onCheckedChange={(checked) => setSaleWhatsApp(checked)}
              disabled={!whatsappNumber.trim()}
              aria-describedby="sale-whatsapp-help"
            />
          </div>
          {!whatsappNumber.trim() && (
            <p id="sale-whatsapp-help" className="text-xs text-muted-foreground">
              Add your WhatsApp number above to enable WhatsApp notifications.
            </p>
          )}
          {whatsappNumber.trim() && saleWhatsApp && (
            <p className="text-xs text-muted-foreground">
              We send one message per sale. You can turn this off anytime.
            </p>
          )}

          <Separator />
            </>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="sale-email" className="text-sm font-medium">
                Email sale notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive an email when someone purchases your beat
              </p>
            </div>
            <Switch
              id="sale-email"
              checked={saleEmail}
              onCheckedChange={(checked) => setSaleEmail(checked)}
            />
          </div>
        </CardContent>
      </Card>
      )}

      <Separator />

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}
