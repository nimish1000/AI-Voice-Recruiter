"use client";

import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthAction } from "@/hooks/use-auth-action";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Perfect for small teams getting started with AI screening.",
    features: [
      "Up to 50 candidates/month",
      "Basic AI phone screening",
      "Standard scorecards",
      "Email support",
      "1 team member",
    ],
    cta: "Start Free",
    popular: false,
    gradient: "from-violet-500/10 to-indigo-500/5",
    border: "border-border/30",
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "For growing teams that need advanced screening capabilities.",
    features: [
      "Up to 500 candidates/month",
      "Advanced natural AI conversations",
      "Custom question templates",
      "Analytics dashboard",
      "Calendar integration",
      "ATS integrations",
      "5 team members",
      "Priority support",
    ],
    cta: "Start 14-Day Trial",
    popular: true,
    gradient: "from-primary/20 to-primary/5",
    border: "border-primary/40",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with custom requirements.",
    features: [
      "Unlimited candidates",
      "White-label AI voice",
      "Custom AI personality tuning",
      "Advanced analytics & API",
      "SSO & SAML",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    popular: false,
    gradient: "from-blue-500/10 to-cyan-500/5",
    border: "border-border/30",
  },
];

function PricingCard({ plan, index }: { plan: typeof plans[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { performAction, isLoaded } = useAuthAction();
  const router = useRouter();

  const handlePlanClick = () => {
    performAction(() => {
      router.push('/dashboard');
    });
  };

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
      <div
        className={`group relative h-full rounded-2xl ${plan.border} bg-gradient-to-b ${plan.gradient} p-px transition-all duration-500 hover:-translate-y-2 ${
          plan.popular ? "shadow-xl shadow-primary/10" : "hover:shadow-xl hover:shadow-primary/5"
        }`}
      >
        {/* Popular badge */}
        {plan.popular && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/25">
              <Sparkles className="h-3 w-3" />
              Most Popular
            </div>
          </div>
        )}

        <div className="relative h-full rounded-2xl bg-card/80 p-6 backdrop-blur-sm sm:p-8">
          {/* Plan name */}
          <h3 className="text-lg font-bold">{plan.name}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{plan.description}</p>

          {/* Price */}
          <div className="mt-6 flex items-baseline gap-1">
            <span className={`text-4xl font-black tracking-tight ${plan.popular ? "text-gradient" : ""}`}>
              {plan.price}
            </span>
            {plan.period && (
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            )}
          </div>

          {/* CTA */}
          <Button
            onClick={handlePlanClick}
            disabled={!isLoaded}
            className={`mt-6 w-full gap-2 font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              plan.popular
                ? "bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]"
                : "hover:scale-[1.02]"
            }`}
            variant={plan.popular ? "default" : "outline"}
            size="lg"
          >
            {plan.cta}
            <ArrowRight className="h-4 w-4" />
          </Button>

          {/* Features */}
          <ul className="mt-8 space-y-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-muted/20" />
        <div className="absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-36">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            Pricing
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Simple,{" "}
            <span className="text-gradient">transparent pricing</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan, i) => (
            <PricingCard key={plan.name} plan={plan} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
