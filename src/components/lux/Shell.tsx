import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/lux/ui";
import { cn } from "@/lib/cn";
import { useLux } from "@/lib/lux/store";

const LINKS = [
  { to: "/", label: "HOME" },
  { to: "/system", label: "SYSTEM LAB" },
  { to: "/lab", label: "MODULE LAB" },
  { to: "/market", label: "MARKET" },
  { to: "/community", label: "COMMUNITY" },
  { to: "/profile", label: "PROFILE" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const hydrated = useLux((state) => state.hydrated);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    void Promise.resolve(useLux.persist.rehydrate()).finally(() => {
      if (!live) return;
      const state = useLux.getState();
      const active = state.systems.some((system) => system.id === state.activeSystemId)
        ? state.activeSystemId
        : (state.systems[0]?.id ?? "");
      useLux.setState({ hydrated: true, activeSystemId: active });
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="relative z-10 min-h-screen">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="shrink-0 leading-none" aria-label="Lux Machina home">
            <span className="block font-mono text-xs tracking-widest text-accent">LM-01</span>
            <span className="text-lg font-semibold tracking-tight">LUX MACHINA</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="px-2 py-2 font-mono text-xs tracking-widest text-muted"
                activeOptions={{ exact: link.to === "/" }}
                activeProps={{ className: "text-accent" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <Link to="/system" search={{ mode: "design" }} className={buttonClass("ghost")}>
              BUILD A SYSTEM
            </Link>
            <Link to="/lab" className={buttonClass("primary")}>
              DESIGN SOMETHING
            </Link>
          </div>
          <button
            className="ml-auto inline-flex size-11 items-center justify-center border border-line lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open ? (
          <nav id="mobile-nav" className="border-t border-line px-4 py-3 lg:hidden" aria-label="Mobile">
            <ul className="flex flex-col">
              {LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="flex min-h-11 items-center font-mono text-sm tracking-widest"
                    activeOptions={{ exact: link.to === "/" }}
                    activeProps={{ className: "text-accent" }}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/lab" onClick={() => setOpen(false)} className={buttonClass("primary", "w-full")}>
                DESIGN SOMETHING
              </Link>
              <Link to="/system" search={{ mode: "design" }} onClick={() => setOpen(false)} className={buttonClass("secondary", "w-full")}>
                BUILD A SYSTEM
              </Link>
            </div>
          </nav>
        ) : null}
      </header>
      <div id="content">{children}</div>
      <footer className="mt-16 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-semibold text-fg">LUX MACHINA</p>
            <p>Turn ideas into machines.</p>
          </div>
          <p className={cn("max-w-md")}>
            Demo engine. Circuits are not validated. Prices are estimates. Commerce is not connected. Saves stay in this browser.
          </p>
        </div>
      </footer>
    </div>
  );
}
