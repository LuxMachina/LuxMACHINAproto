import { cn } from "@/lib/cn";
import type { RackModule } from "@/lib/lux/types";

export function ModuleFace({
  mod,
  unit = 12,
  selected = false,
  compact = false,
  onSelect,
}: {
  mod: RackModule;
  unit?: number;
  selected?: boolean;
  compact?: boolean;
  onSelect?: () => void;
}) {
  const knobs = mod.controls.slice(0, compact ? 2 : mod.hp <= 4 ? 1 : mod.hp <= 6 ? 3 : 5);
  const jacks = [...mod.inputs.slice(0, compact ? 1 : 3), ...mod.outputs.slice(0, compact ? 1 : 3)];
  const Tag = onSelect ? "button" : "div";
  return (
    <Tag
      type={onSelect ? "button" : undefined}
      onClick={onSelect}
      aria-pressed={onSelect ? selected : undefined}
      aria-label={`${mod.name}, ${mod.hp} HP, ${mod.functionLabel}`}
      className={cn(
        "module-face relative flex h-72 shrink-0 flex-col items-center border-r border-line px-1 py-2 text-center md:h-96",
        compact && "h-40 md:h-40",
        selected && "outline outline-2 outline-offset-[-2px] outline-accent",
      )}
      data-tone={mod.tone}
      style={{ width: Math.max(compact ? 28 : 36, mod.hp * unit) }}
    >
      <span className="absolute top-1.5 left-1.5 size-1.5 rounded-full border border-current opacity-70" />
      <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full border border-current opacity-70" />
      <span className="absolute bottom-1.5 left-1.5 size-1.5 rounded-full border border-current opacity-70" />
      <span className="absolute right-1.5 bottom-1.5 size-1.5 rounded-full border border-current opacity-70" />
      <span className="mt-2 font-mono text-xs leading-tight tracking-wider uppercase">{mod.name}</span>
      <span className="mt-1 font-mono text-xs opacity-70">{mod.hp}HP</span>
      <div className="mt-3 flex w-full flex-1 flex-col items-center gap-2 overflow-hidden">
        {knobs.map((label) => (
          <span key={label} className="flex flex-col items-center gap-1">
            <span className={cn("knob relative", compact ? "size-4" : "size-7")}>
              <span className="absolute top-0.5 left-1/2 h-1/3 w-px -translate-x-1/2 bg-accent" />
            </span>
            {!compact ? <span className="max-w-full truncate font-mono text-xs opacity-80">{label}</span> : null}
          </span>
        ))}
      </div>
      <div className="mb-3 grid w-full grid-cols-2 gap-1">
        {jacks.slice(0, compact ? 2 : 4).map((label, index) => (
          <span key={`${label}-${index}`} className="flex flex-col items-center gap-1">
            <span className={cn("jack", compact ? "size-2.5" : "size-3.5")} />
            {!compact ? <span className="max-w-full truncate font-mono text-xs opacity-75">{label}</span> : null}
          </span>
        ))}
      </div>
    </Tag>
  );
}
