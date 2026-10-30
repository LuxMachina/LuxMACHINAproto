import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { Confidence } from "@/lib/lux/types";

export function money(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function moneyExact(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buttonClass(variant: "primary" | "secondary" | "ghost" = "secondary", className?: string) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 px-4 font-mono text-xs tracking-widest uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40",
    variant === "primary" && "bg-accent text-accent-fg hover:bg-accent/90",
    variant === "secondary" && "border border-line bg-surface text-fg hover:border-accent",
    variant === "ghost" && "text-muted hover:text-fg",
    className,
  );
}

export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-mono text-xs tracking-widest text-muted uppercase">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const control =
  "min-h-11 w-full border border-line bg-bg px-3 text-base text-fg outline-none placeholder:text-muted";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-36 py-3 leading-relaxed")} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, "appearance-none")} {...props} />;
}

export function Plate({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("border border-line bg-surface", className)}>
      {children}
    </section>
  );
}

export function Index({ n, label }: { n: string; label: string }) {
  return (
    <p className="font-mono text-xs tracking-widest text-accent uppercase">
      {n} — {label}
    </p>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center border px-2 font-mono text-xs tracking-wider uppercase",
        tone === "accent" ? "border-accent text-accent" : "border-line text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function ConfidenceMark({ value }: { value: Confidence }) {
  const strong = value === "HIGH" || value === "VERIFIED" || value === "USER-SUPPLIED";
  return <Pill tone={strong ? "accent" : "muted"}>{value}</Pill>;
}

export function WarningStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-stretch gap-3 border border-accent" role="status">
      <div className="hazard w-3 shrink-0" aria-hidden />
      <p className="py-3 pr-3 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

export function Trace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 72" className={cn("h-16 w-full text-accent", className)} aria-hidden>
      <path
        className="trace"
        d="M0 40 H24 L48 12 L72 60 L96 28 L120 58 L150 8 L184 64 L214 22 L250 48 L280 10 L310 62 L348 26 L390 54 L420 16 L460 66 L500 30 L540 50 L580 18 L640 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-2 flex justify-between gap-3 font-mono text-xs tracking-wider uppercase">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 border border-line bg-bg" aria-hidden>
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
