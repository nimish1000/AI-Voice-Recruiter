"use client";

import { Upload, Phone, CalendarCheck, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Import Candidates",
    description:
      "Upload a CSV, connect your ATS, or add candidates manually. Our system instantly processes and organizes your candidate pipeline.",
    gradient: "from-violet-500 to-indigo-600",
    accent: "violet",
  },
  {
    step: "02",
    icon: Phone,
    title: "AI Calls & Screens",
    description:
      "Our AI agent automatically calls each candidate, conducts a natural screening conversation, asks role-specific questions, and evaluates responses in real-time.",
    gradient: "from-indigo-500 to-blue-600",
    accent: "indigo",
  },
  {
    step: "03",
    icon: CalendarCheck,
    title: "Review & Schedule",
    description:
      "Get detailed scorecards for every candidate. Top performers are automatically invited to schedule their next interview — no manual follow-up needed.",
    gradient: "from-blue-500 to-cyan-600",
    accent: "blue",
  },
];

function StepCard({ item, index }: { item: typeof steps[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`group relative transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
      style={{ transitionDelay: `${index * 200}ms` }}
    >
      {/* Connector line - hidden on last item and mobile */}
      {index < steps.length - 1 && (
        <div className="absolute -right-6 top-16 hidden h-0.5 w-12 md:block">
          <div className="h-full w-full bg-gradient-to-r from-border to-border/0">
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 transition-all duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
              <ArrowRight className="h-4 w-4 text-primary/40" />
            </div>
          </div>
        </div>
      )}

      <div className="relative flex flex-col items-center text-center md:items-start md:text-left">
        {/* Large step number watermark */}
        <span className="absolute -top-4 right-0 text-8xl font-black text-primary/[0.04] select-none md:-right-2">
          {item.step}
        </span>

        {/* Step badge */}
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary tracking-wider">
            STEP {item.step}
          </span>
        </div>

        {/* Icon */}
        <div
          className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:shadow-2xl group-hover:-rotate-3`}
        >
          <item.icon className="h-7 w-7 text-white" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold">{item.title}</h3>
        <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-muted/20" />
        <div className="absolute left-0 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-36">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            Simple Process
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Three steps to{" "}
            <span className="text-gradient">faster hiring</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            From import to interview — fully automated in minutes, not weeks.
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-12 md:grid-cols-3 md:gap-16">
          {steps.map((item, i) => (
            <StepCard key={item.step} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
