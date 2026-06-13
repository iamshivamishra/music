"use server";

import { redirect } from "next/navigation";
import { clearAuthCookie } from "@/lib/auth";

export async function logoutAction() {
  await clearAuthCookie();
  redirect("/");
}