export function guestSignupHref(email?: string): string {
  if (!email) return "/signup";
  const params = new URLSearchParams({
    email,
    next: "/profile/library",
  });
  return `/signup?${params.toString()}`;
}
