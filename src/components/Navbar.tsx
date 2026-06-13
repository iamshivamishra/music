"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { JWTPayload } from "@/types";

export default function Navbar({ user }: { user: JWTPayload | null }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      router.refresh();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="flex items-center justify-between pl-8 pr-6 h-16 bg-[rgba(10,10,15,0.95)] backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-[1000]">
      {/* Logo */}
      <Link
        href="/"
        onClick={closeMenu}
         style={{ marginLeft: '15px' }}
        className="text-xl font-bold text-[#7c5cff] no-underline whitespace-nowrap ml-2"
      >
        Trishul Beats
      </Link>

      {/* Hamburger Button */}
      <button
        className="md:hidden flex flex-col justify-between w-7 h-[22px] bg-transparent border-none cursor-pointer p-0"
        style={{ marginRight: '15px' }}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle Menu"
      >
        <span
          className={`block w-full h-[3px] bg-white rounded-full transition-all duration-300 ${
            menuOpen ? "translate-y-[9px] rotate-45" : ""
          }`}
        />
        <span
          className={`block w-full h-[3px] bg-white rounded-full transition-all duration-300 ${
            menuOpen ? "opacity-0" : "opacity-100"
          }`}
        />
        <span
          className={`block w-full h-[3px] bg-white rounded-full transition-all duration-300 ${
            menuOpen ? "-translate-y-[9px] -rotate-45" : ""
          }`}
        />
      </button>

      {/* Nav Links */}
     <div
  style={{ marginRight: '10px' }}
  className={`
    flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-8
    absolute md:static top-16 right-0 w-[280px] md:w-auto
    bg-[#0f0f14] md:bg-transparent
    px-6 py-6 md:p-0
    border-t border-l border-white/[0.08] md:border-none
    rounded-bl-xl md:rounded-none
    ${menuOpen ? "flex" : "hidden md:flex"}
  `}
>
        <Link
          href="/music"
          onClick={closeMenu}
          className="px-[14px] py-2 rounded-lg text-[#b3b3b3] no-underline text-center transition-all duration-200 hover:text-white hover:bg-white/[0.08]"
        >
          Music
        </Link>

        {user ? (
          <>
            <Link
              href="/profile"
              onClick={closeMenu}
              className="px-[14px] py-2 rounded-lg text-[#b3b3b3] no-underline text-center transition-all duration-200 hover:text-white hover:bg-white/[0.08]"
            >
              Profile
            </Link>

            {user.role === "admin" && (
              <Link
                href="/upload"
                onClick={closeMenu}
                className="px-[14px] py-2 rounded-lg text-[#b3b3b3] no-underline text-center transition-all duration-200 hover:text-white hover:bg-white/[0.08]"
              >
                Upload
              </Link>
            )}

            <button
              onClick={() => {
                closeMenu();
                handleLogout();
              }}
              className="w-full md:w-auto px-[14px] py-2 border-none bg-transparent text-[#b3b3b3] rounded-lg cursor-pointer text-[0.9rem] text-center transition-all duration-200 hover:text-[#ff5a5a] hover:bg-[rgba(255,90,90,0.1)]"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              onClick={closeMenu}
              className="px-[14px] py-2 rounded-lg text-[#b3b3b3] no-underline text-center transition-all duration-200 hover:text-white hover:bg-white/[0.08]"
            >
              Login
            </Link>

            <Link
              href="/signup"
              onClick={closeMenu}
              className="px-4 py-2 rounded-lg bg-[#7c5cff] text-white no-underline font-semibold text-center transition-all duration-200 hover:bg-[#6b4cf4]"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}