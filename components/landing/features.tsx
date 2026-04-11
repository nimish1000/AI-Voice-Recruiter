"use client";

import { Card } from "@/components/ui/card";
import {
  Phone,
  BarChart3,
  CalendarCheck,
  LineChart,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const features = [
  {
    icon: Phone,
    title: "Automated Phone Screening",
    description:
      "AI agent calls candidates with natural, human-like conversation. Asks tailored questions based on the role and evaluates answers instantly.",
    gradient: "from-violet-500 to-indigo-600",
    glow: "group-hover:shadow-violet-500/20",
  },
  {
    icon: BarChart3,
    title: "Smart Scoring",
    description:
      "Every candidate receives a detailed scorecard based on their responses, communication skills, and role fit — ranked and ready for review.",
    gradient: "from-indigo-500 to-blue-600",
    glow: "group-hover:shadow-indigo-500/20",
  },
  {
    icon: CalendarCheck,
    title: "Interview Scheduling",
    description:
      "Top candidates are automatically sent scheduling links. Syncs with your calendar so interviews book themselves.",
    gradient: "from-blue-500 to-cyan-600",
    glow: "group-hover:shadow-blue-500/20",
  },
  {
    icon: LineChart,
    title: "Analytics Dashboard",
    description:
      "Track your hiring pipeline, conversion rates, candidate quality metrics, and time-to-hire — all in real-time.",
    gradient: "from-cyan-500 to-teal-600",
    glow: "group-hover:shadow-cyan-500/20",
  },
  {
    icon: Link2,
    title: "ATS Integration",
    description:
      "Seamlessly import candidates from your existing applicant tracking system. Works with Greenhouse, Lever, Workday, and more.",
    gradient: "from-teal-500 to-emerald-600",
    glow: "group-hover:shadow-teal-500/20",
  },
  {
    icon: ShieldCheck,
    title: "Compliant & Secure",
    description:
      "GDPR-ready with end-to-end encryption. All call recordings and data are stored securely with full audit trails.",
    gradient: "from-emerald-500 to-green-600",
    glow: "group-hover:shadow-emerald-500/20",
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
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
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <Card
        className={`group relative h-full overflow-hidden border-border/30 bg-card/50 p-6 backdrop-blur-sm transition-all duration-500 hover:border-primary/20 hover:-translate-y-2 hover:shadow-2xl ${feature.glow}`}
      >
        {/* Subtle gradient overlay on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative z-10">
          {/* Icon */}
          <div
            className={`mb-5 flex h-13 w-13 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl`}
          >
            <feature.icon className="h-6 w-6 text-white" />
          </div>

          {/* Content */}
          <h3 className="text-lg font-bold">{feature.title}</h3>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            {feature.description}
          </p>
        </div>

        {/* Decorative corner accent */}
        <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-2xl transition-all duration-500 group-hover:from-primary/10" />
      </Card>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-36">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Powerful Features
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Everything you need to{" "}
            <span className="text-gradient">hire faster</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Powerful AI tools that handle the heavy lifting so your team can
            focus on the best candidates.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
