"use client";

import { Star, Quote } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "VP of Talent",
    company: "TechScale Inc.",
    avatar: "SC",
    content:
      "AI Recruiter cut our time-to-hire by 60%. The AI screening calls are so natural that candidates don't even realize they're speaking to an AI. Game-changing technology.",
    rating: 5,
    gradient: "from-violet-500 to-indigo-600",
  },
  {
    name: "Marcus Johnson",
    role: "Head of Recruiting",
    company: "GrowthPath",
    avatar: "MJ",
    content:
      "We screened 500 candidates in a single week — something that would have taken our team a full month. The quality of scoring is remarkably accurate.",
    rating: 5,
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    name: "Emily Rodriguez",
    role: "HR Director",
    company: "CloudVault Systems",
    avatar: "ER",
    content:
      "The integration with our ATS was seamless. Candidates flow in, get screened, scored, and the best ones show up on our calendar. It feels like magic.",
    rating: 5,
    gradient: "from-blue-500 to-cyan-600",
  },
];

function TestimonialCard({ testimonial, index }: { testimonial: typeof testimonials[0]; index: number }) {
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
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <div className="group relative h-full rounded-2xl border border-border/30 bg-card/30 p-6 backdrop-blur-sm transition-all duration-500 hover:border-primary/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 sm:p-8">
        {/* Quote icon */}
        <Quote className="absolute right-6 top-6 h-8 w-8 text-primary/10 transition-colors group-hover:text-primary/20" />

        {/* Stars */}
        <div className="mb-4 flex gap-1">
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star
              key={i}
              className="h-4 w-4 fill-amber-400 text-amber-400"
            />
          ))}
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          &ldquo;{testimonial.content}&rdquo;
        </p>

        {/* Author */}
        <div className="mt-6 flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${testimonial.gradient} text-sm font-bold text-white shadow-lg`}
          >
            {testimonial.avatar}
          </div>
          <div>
            <p className="text-sm font-bold">{testimonial.name}</p>
            <p className="text-xs text-muted-foreground">
              {testimonial.role}, {testimonial.company}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute left-0 bottom-1/4 h-72 w-72 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-36">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            Testimonials
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Loved by{" "}
            <span className="text-gradient">recruitment teams</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            See what hiring professionals say about transforming their workflow
            with AI-powered screening.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <TestimonialCard
              key={testimonial.name}
              testimonial={testimonial}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
