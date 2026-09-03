export function privateBeatUrl(beatId: string, token: string): string {
  const appUrl =
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000";
  return `${appUrl}/beats/${beatId}?t=${token}`;
}

export async function copyPrivateBeatLink(
  beatId: string,
  token: string
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(privateBeatUrl(beatId, token));
    return true;
  } catch {
    return false;
  }
}
