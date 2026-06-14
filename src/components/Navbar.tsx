"use client";

import Link from "next/link";
import { useState } from "react";
import { JWTPayload } from "@/types";

export default function Navbar({ user }: { user: JWTPayload | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className="flex items-center justify-between pl-8 pr-6 h-16 bg-[rgba(10,10,15,0.95)] backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-[1000]">
        {/* Logo */}
        <Link
          href="/"
          onClick={closeMenu}
          className="text-xl font-bold text-[#7c5cff] no-underline whitespace-nowrap ml-4"
          style={{ marginLeft: "15px" }}
        >
          Trishul Beats
        </Link>

        {/* Hamburger Button */}
        <button
          className="md:hidden flex flex-col justify-between w-7 h-[22px] bg-transparent border-none cursor-pointer p-0 mr-4"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle Menu"
          style={{ marginRight: "15px" }}
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

        {/* Desktop Nav */}
        <div style={{ marginRight: "18px" }} className="hidden md:flex items-center gap-8 mr-4">
          <Link
            href="/music"
            className="px-[14px] py-2 rounded-lg text-[#b3b3b3] no-underline transition-all duration-200 hover:text-white hover:bg-white/[0.08]"
          >
            Music
          </Link>

          <Link
            href="/about"
            className="px-[14px] py-2 rounded-lg text-[#b3b3b3] no-underline transition-all duration-200 hover:text-white hover:bg-white/[0.08]"
          >
            About
          </Link>

          <Link
            href="/contact"
            className="px-[14px] py-2 rounded-lg text-[#b3b3b3] no-underline transition-all duration-200 hover:text-white hover:bg-white/[0.08]"
          >
            Contact
          </Link>

          {user ? (
            <>
              <Link
                href="/profile"
                className="px-[14px] py-2 rounded-lg text-[#b3b3b3] no-underline transition-all duration-200 hover:text-white hover:bg-white/[0.08]"
              >
                Profile
              </Link>

              {user.role === "admin" && (
                <>
                  <Link
                    href="/upload"
                    className="px-[14px] py-2 rounded-lg text-[#b3b3b3] no-underline transition-all duration-200 hover:text-white hover:bg-white/[0.08]"
                  >
                    Upload
                  </Link>

                  <Link
                    href="/upload/playlist"
                    className="px-[14px] py-2 rounded-lg text-[#b3b3b3] no-underline transition-all duration-200 hover:text-white hover:bg-white/[0.08]"
                  >
                    📁 Create Folder
                  </Link>
                </>
              )}

              <button
                onClick={handleLogout}
                className="px-[14px] py-2 border-none bg-transparent text-[#b3b3b3] rounded-lg cursor-pointer transition-all duration-200 hover:text-[#ff5a5a] hover:bg-[rgba(255,90,90,0.1)]"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-[14px] py-2 rounded-lg text-[#b3b3b3] no-underline transition-all duration-200 hover:text-white hover:bg-white/[0.08]"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="px-4 py-2 rounded-lg bg-[#7c5cff] text-white no-underline font-semibold transition-all duration-200 hover:bg-[#6b4cf4]"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu - Top Slide Animation */}
        <div
          className={`
            md:hidden
            absolute top-16 left-0 w-full
            bg-[#0f0f14]
            border-t border-white/[0.08]
            shadow-xl
            transition-all duration-300 ease-in-out
            overflow-hidden
            ${
              menuOpen
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-6 pointer-events-none"
            }
          `}
        >
          <div className="flex flex-col p-6 gap-3">
            <Link
              href="/music"
              onClick={closeMenu}
              className="px-4 py-3 rounded-lg text-[#b3b3b3] text-center no-underline hover:bg-white/[0.08] hover:text-white transition-all"
            >
              Music
            </Link>

            <Link
              href="/about"
              onClick={closeMenu}
              className="px-4 py-3 rounded-lg text-[#b3b3b3] text-center no-underline hover:bg-white/[0.08] hover:text-white transition-all"
            >
              About
            </Link>

            <Link
              href="/contact"
              onClick={closeMenu}
              className="px-4 py-3 rounded-lg text-[#b3b3b3] text-center no-underline hover:bg-white/[0.08] hover:text-white transition-all"
            >
              Contact
            </Link>

            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="px-4 py-3 rounded-lg text-[#b3b3b3] text-center no-underline hover:bg-white/[0.08] hover:text-white transition-all"
                >
                  Profile
                </Link>

                {user.role === "admin" && (
                  <>
                    <Link
                      href="/upload"
                      onClick={closeMenu}
                      className="px-4 py-3 rounded-lg text-[#b3b3b3] text-center no-underline hover:bg-white/[0.08] hover:text-white transition-all"
                    >
                      Upload
                    </Link>

                    <Link
                      href="/upload/playlist"
                      onClick={closeMenu}
                      className="px-4 py-3 rounded-lg text-[#b3b3b3] text-center no-underline hover:bg-white/[0.08] hover:text-white transition-all"
                    >
                      📁 Create Folder
                    </Link>
                  </>
                )}

                <button
                  onClick={() => {
                    closeMenu();
                    handleLogout();
                  }}
                  className="w-full px-4 py-3 rounded-lg text-[#ff7a7a] hover:bg-[rgba(255,90,90,0.1)] transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="px-4 py-3 rounded-lg text-[#b3b3b3] text-center no-underline hover:bg-white/[0.08] hover:text-white transition-all"
                >
                  Login
                </Link>

                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="px-4 py-3 rounded-lg bg-[#7c5cff] text-white text-center no-underline font-semibold hover:bg-[#6b4cf4] transition-all"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}