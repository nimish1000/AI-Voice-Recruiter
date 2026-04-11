"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Upload,
  Phone,
  BrainCircuit,
  CalendarCheck,
  Sparkles,
  Play,
  CheckCircle2,
  Zap,
  LayoutDashboard,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthAction } from "@/hooks/use-auth-action";
import { useRouter } from "next/navigation";

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

const floatingOrbs = [
  { size: "w-72 h-72", color: "from-primary/20 to-primary/5", top: "-10%", left: "10%", delay: "0s" },
  { size: "w-96 h-96", color: "from-primary/10 to-transparent", top: "20%", right: "-10%", delay: "2s" },
  { size: "w-64 h-64", color: "from-violet-500/15 to-transparent", bottom: "10%", left: "-5%", delay: "4s" },
  { size: "w-48 h-48", color: "from-indigo-500/10 to-transparent", top: "50%", right: "15%", delay: "1s" },
];

const workflowSteps = [
  {
    icon: Upload,
    title: "Import",
    subtitle: "CSV, ATS, or Manual",
    color: "from-violet-500 to-indigo-600",
  },
  {
    icon: Phone,
    title: "AI Calls",
    subtitle: "Auto Screening",
    color: "from-indigo-500 to-blue-600",
  },
  {
    icon: BrainCircuit,
    title: "Score",
    subtitle: "Smart Evaluation",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: CalendarCheck,
    title: "Schedule",
    subtitle: "Book Interviews",
    color: "from-cyan-500 to-emerald-600",
  },
];

export function Hero() {
  const { performAction, isLoaded } = useAuthAction();
  const router = useRouter();

  const handleImportCandidates = () => {
    performAction(() => {
      router.push('/dashboard');
    });
  };

  const handleWatchDemo = () => {
    performAction(() => {
      router.push('/dashboard');
    });
  };

  return (
    <section className="relative min-h-screen overflow-hidden pt-18">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Animated gradient orbs */}
        {floatingOrbs.map((orb, i) => (
          <div
            key={i}
            className={`absolute ${orb.size} rounded-full bg-gradient-to-r ${orb.color} blur-3xl ${
              i % 2 === 0 ? "animate-float" : "animate-float-reverse"
            }`}
            style={{
              top: orb.top,
              left: orb.left,
              right: orb.right,
              bottom: orb.bottom,
              animationDelay: orb.delay,
            }}
          />
        ))}
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-40" />
        {/* Radial fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8 lg:pb-32 lg:pt-28">
        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="mb-8 flex justify-center animate-slide-up">
            <Badge
              variant="secondary"
              className="gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2 text-sm font-medium text-primary hover:bg-primary/15 transition-all duration-300"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Recruitment Platform
              <ArrowRight className="h-3 w-3" />
            </Badge>
          </div>

          {/* Headline */}
          <h1 className="animate-slide-up text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl" style={{ animationDelay: "0.1s" }}>
            Hire Smarter.
            <br />
            <span className="text-gradient">
              Let AI Screen
            </span>
            <br />
            <span className="text-muted-foreground">
              Your Candidates.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Import your candidates, and our AI agent automatically calls each
            one, conducts initial screening interviews, scores their responses,
            and schedules the next round —{" "}
            <span className="text-foreground font-medium">all on autopilot</span>.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Button
              size="lg"
              onClick={handleImportCandidates}
              disabled={!isLoaded}
              className="group relative h-13 gap-2 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-8 text-base font-semibold shadow-xl shadow-primary/25 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LayoutDashboard className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              Go to Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleWatchDemo}
              disabled={!isLoaded}
              className="group h-13 gap-2 rounded-xl border-border/60 px-8 text-base font-semibold backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Play className="h-3 w-3 text-primary ml-0.5" />
              </div>
              Watch Demo
            </Button>
          </div>

          {/* Social proof mini */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              Setup in 2 minutes
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              50 free calls
            </div>
          </div>
        </div>

        {/* Visual: Workflow Preview Card */}
        <div className="mx-auto mt-20 max-w-4xl animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="relative rounded-2xl p-px bg-gradient-to-b from-primary/30 via-border/50 to-border/20">
            <div className="rounded-2xl bg-card/80 p-8 backdrop-blur-xl sm:p-10">
              {/* Top bar decoration */}
              <div className="mb-8 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <div className="ml-4 h-5 flex-1 rounded-md bg-muted/30" />
              </div>

              {/* Workflow Steps */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                {workflowSteps.map((step, i) => (
                  <div key={step.title} className="group relative">
                    <div className="flex flex-col items-center gap-4 rounded-xl border border-border/40 bg-muted/20 p-5 text-center transition-all duration-500 hover:border-primary/30 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                      {/* Step number */}
                      <span className="absolute -top-2.5 left-3 rounded-full bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground/60 border border-border/40">
                        0{i + 1}
                      </span>

                      {/* Icon */}
                      <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}>
                        <step.icon className="h-6 w-6 text-white" />
                      </div>

                      {/* Text */}
                      <div>
                        <p className="text-sm font-bold">{step.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {step.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Connector arrow (hidden on mobile and last item) */}
                    {i < workflowSteps.length - 1 && (
                      <div className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 sm:block z-10">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Live stats bar */}
              <div className="mt-8 grid grid-cols-3 gap-4 rounded-xl border border-border/30 bg-muted/10 p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gradient">
                    <AnimatedCounter value={2847} />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Candidates Today</p>
                </div>
                <div className="text-center border-x border-border/30">
                  <p className="text-2xl font-bold text-emerald-400">
                    <AnimatedCounter value={94} suffix="%" />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Accuracy Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    <AnimatedCounter value={12} suffix="min" />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Avg. Screen Time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Glow effect under the card */}
          <div className="mx-auto -mt-20 h-40 w-3/4 rounded-full bg-primary/10 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
