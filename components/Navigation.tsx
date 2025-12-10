"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Overview" },
    { href: "/analytics", label: "Analytics" },
    { href: "/strategy", label: "Strategy" },
  ];

  return (
    <nav className="bg-dark-card border-b border-dark-border sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="text-xl font-bold text-primary hover:text-primary/80 transition-colors"
          >
            SBUX: Alpha
          </Link>

          <div className="flex space-x-1 md:space-x-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm md:text-base font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-primary/20 text-primary"
                    : "text-gray-300 hover:bg-dark-border hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
