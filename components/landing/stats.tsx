"use client";

import { useEffect, useRef, useState } from "react";

const stats = [
  {
    value: 10000,
    suffix: "+",
    label: "Candidates Screened",
    description: "Across hundreds of companies",
    gradient: "from-violet-500 to-indigo-500",
  },
  {
    value: 85,
    suffix: "%",
    label: "Time Saved",
    description: "On initial screening process",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    value: 3,
    suffix: "x",
    label: "Faster Hiring",
    description: "Compared to traditional methods",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    value: 95,
    suffix: "%",
    label: "Satisfaction Rate",
    description: "From recruiters using our platform",
    gradient: "from-cyan-500 to-emerald-500",
  },
];

function AnimatedStat({ stat, index }: { stat: typeof stats[0]; index: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
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
            setCount(Math.floor(eased * stat.value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [stat.value]);

  return (
    <div
      ref={ref}
      className="group relative text-center"
    >
      {/* Glow effect */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/5 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative rounded-2xl border border-border/30 bg-card/30 p-8 backdrop-blur-sm transition-all duration-500 hover:border-primary/20 hover:-translate-y-1">
        {/* Value */}
        <p className={`bg-gradient-to-r ${stat.gradient} bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl`}>
          {count.toLocaleString()}{stat.suffix}
        </p>

        {/* Label */}
        <p className="mt-3 text-sm font-bold">{stat.label}</p>

        {/* Description */}
        <p className="mt-1.5 text-xs text-muted-foreground">
          {stat.description}
        </p>
      </div>
    </div>
  );
}

export function Stats() {
  return (
    <section id="stats" className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-muted/20" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-36">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            By The Numbers
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Trusted by recruiting teams{" "}
            <span className="text-gradient">everywhere</span>
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
          {stats.map((stat, i) => (
            <AnimatedStat key={stat.label} stat={stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
