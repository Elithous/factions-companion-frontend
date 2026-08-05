"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/stats", label: "Stats" },
  { href: "/config", label: "Config" },
  { href: "/calculator", label: "Calculator" },
  { href: "/playerStats", label: "Player Stats" },
];

export default function Navbar() {
  const [isOpen, setOpen] = useState(false);
  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 border-b border-border bg-brown-500 px-3 shadow-sm">
        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
          onClick={toggleOpen}
          className="flex h-9 w-9 items-center justify-center rounded-md text-brown-900 transition-transform hover:scale-110"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className="font-pixel truncate text-xl font-bold text-brown-100 sm:text-2xl">
          <a
            href="https://www.factions-online.com/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-brown-100/50 underline-offset-2 hover:decoration-brown-100"
          >
            Factions
          </a>{" "}
          Companion
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <nav
        className={cn(
          "fixed left-0 top-14 z-40 grid h-[calc(100vh-3.5rem)] w-[30vw] min-w-[260px] max-w-[50vw] auto-rows-min gap-2 bg-brown-500 p-4 shadow-xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className="rounded-sm border border-brown-900 bg-brown-800 p-4 text-brown-100 transition-all hover:translate-x-1 hover:bg-brown-900 hover:shadow-md active:translate-x-0"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
