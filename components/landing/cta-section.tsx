"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { useAuthAction } from "@/hooks/use-auth-action";
import { useRouter } from "next/navigation";

export function CtaSection() {
  const { performAction, isLoaded } = useAuthAction();
  const router = useRouter();

  const handleGetStarted = () => {
    performAction(() => {
      router.push('/dashboard');
    });
  };

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-36">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-indigo-700" />

          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float" />
            <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float-reverse" />
            <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-grid opacity-10" />
          </div>

          <div className="relative z-10 px-6 py-16 text-center sm:px-12 sm:py-24">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm border border-white/10">
              <Zap className="h-3.5 w-3.5" />
              Start in under 2 minutes
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Start screening candidates
              <br />
              <span className="text-white/80">today — for free</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
              Join hundreds of recruiting teams who have already transformed
              their hiring process with AI-powered screening.
            </p>

            {/* Email Form */}
            <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                placeholder="Enter your work email"
                className="h-13 rounded-xl border-white/15 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30 backdrop-blur-sm"
              />
              <Button
                size="lg"
                onClick={handleGetStarted}
                disabled={!isLoaded}
                className="h-13 shrink-0 gap-2 rounded-xl bg-white font-bold text-primary shadow-xl shadow-black/20 transition-all duration-300 hover:bg-white/90 hover:scale-105 hover:shadow-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <p className="mt-5 flex items-center justify-center gap-4 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                No credit card required
              </span>
              <span>·</span>
              <span>Free for up to 50 candidates</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
