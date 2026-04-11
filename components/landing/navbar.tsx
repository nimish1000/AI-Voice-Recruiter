"use client";

import { Button } from "@/components/ui/button";
import { Bot, Menu, X, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useAuthAction } from "@/hooks/use-auth-action";
import { useRouter } from "next/navigation";
import Link from "next/link";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Stats", href: "#stats" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { performAction, isLoaded, isSignedIn } = useAuthAction();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDashboardClick = () => {
    performAction(() => {
      router.push('/dashboard');
    });
  };

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "border-b border-border/50 bg-background/70 shadow-lg shadow-black/10 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#" className="group flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25 transition-all duration-300 group-hover:shadow-primary/40 group-hover:scale-105">
            <Bot className="h-5 w-5 text-primary-foreground" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            AI <span className="text-gradient">Recruiter</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:bg-accent/50"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={handleDashboardClick}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>

          {isLoaded && isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10 border-2 border-primary/50 hover:border-primary transition-all",
                  userButtonPopoverCard: "bg-gray-800 border border-gray-700",
                  userButtonText: "text-white",
                },
              }}
            />
          ) : (
            <>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground cursor-pointer">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button
                  size="sm"
                  className="relative gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-105 cursor-pointer"
                >
                  Get Started Free
                </Button>
              </SignUpButton>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      <div
        className={`overflow-hidden transition-all duration-300 md:hidden ${
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="glass border-t border-border/40 px-4 pb-4 pt-2">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2 cursor-pointer"
                onClick={() => {
                  setMobileOpen(false);
                  handleDashboardClick();
                }}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>

              {isLoaded && isSignedIn ? (
                <div className="flex justify-center px-3 py-2">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8 border-2 border-primary/50",
                        userButtonPopoverCard: "bg-gray-800 border border-gray-700",
                        userButtonText: "text-white",
                      },
                    }}
                  />
                </div>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <Button variant="outline" size="sm" className="w-full cursor-pointer">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 cursor-pointer"
                    >
                      Get Started Free
                    </Button>
                  </SignUpButton>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
