import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button, Index, money, Plate, TextInput, buttonClass } from "@/components/lux/ui";
import { COMMUNITY_POSTS, getModule, LISTINGS } from "@/lib/lux/catalog";
import { activeSystem, useLux } from "@/lib/lux/store";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const profileName = useLux((state) => state.profileName);
  const setProfileName = useLux((state) => state.setProfileName);
  const designs = useLux((state) => state.designs);
  const systems = useLux((state) => state.systems);
  const buildLog = useLux((state) => state.buildLog);
  const favorites = useLux((state) => state.favorites);
  const wishlist = useLux((state) => state.wishlist);
  const savedPosts = useLux((state) => state.savedPosts);
  const comments = useLux((state) => state.comments);
  const activateSystem = useLux((state) => state.activateSystem);
  const deleteSystem = useLux((state) => state.deleteSystem);
  const exportJSON = useLux((state) => state.exportJSON);
  const importJSON = useLux((state) => state.importJSON);
  const active = useLux((state) => activeSystem(state));
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  const designedSystems = systems.filter((system) => system.rows.some((row) => row.length));
  const value = systems.reduce((sum, system) => sum + system.rows.flat().reduce((inner, mod) => inner + mod.cost, 0), 0);

  function download() {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lux-machina-project.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Project JSON exported. It is a local file, not a cloud backup.");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Index n="PROFILE" label="THIS DEVICE" />
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your bench, stored locally.</h1>
      <p className="mt-3 max-w-2xl text-muted">
        No account. Nothing here is synced. Clear the browser and the bench is gone — export JSON if you want to keep it.
      </p>
      <label className="mt-6 block max-w-sm">
        <span className="font-mono text-xs tracking-widest text-muted">NAME</span>
        <TextInput className="mt-2" value={profileName} onChange={(event) => setProfileName(event.target.value)} />
      </label>

      <dl className="mt-8 grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
        <Stat k="SYSTEMS DESIGNED" v={String(designedSystems.length)} />
        <Stat k="MODULES DESIGNED" v={String(designs.length)} />
        <Stat k="SYSTEMS BUILT" v={String(buildLog.length)} />
        <Stat k="TOTAL ESTIMATED HARDWARE VALUE" v={money(value)} />
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="primary" onClick={download}>
          EXPORT PROJECT JSON
        </Button>
        <Button onClick={() => fileRef.current?.click()}>IMPORT PROJECT JSON</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void file.text().then((raw) => {
              const result = importJSON(raw);
              setMessage(result.ok ? "Project imported on this device." : (result.error ?? "Import failed."));
            });
          }}
        />
      </div>
      {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}

      <section className="mt-10">
        <Index n="01" label="SAVED SYSTEMS" />
        {!designedSystems.length ? <Empty text="No system with modules yet. The empty bench does not count." /> : null}
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {systems.map((system) => {
            const count = system.rows.flat().length;
            const cost = system.rows.flat().reduce((sum, mod) => sum + mod.cost, 0);
            return (
              <li key={system.id} className="border border-line bg-surface p-4">
                <h2 className="text-xl font-semibold">{system.name}</h2>
                <p className="text-sm text-muted">
                  {count} modules · {money(cost)} · {system.builtAt ? "Marked built" : "Not logged as built"}
                  {active?.id === system.id ? " · Active" : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      activateSystem(system.id);
                      setMessage(`${system.name} is the active rack.`);
                    }}
                  >
                    OPEN
                  </Button>
                  <Button onClick={() => deleteSystem(system.id)}>DELETE</Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10">
        <Index n="02" label="DESIGNED MODULES" />
        {!designs.length ? <Empty text="Generate a design in Module Lab and it will be listed here." /> : null}
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {designs.map((design) => (
            <li key={design.id} className="border border-line p-4">
              <p className="font-mono text-xs text-accent">{design.selectedTier}</p>
              <h2 className="text-xl font-semibold">{design.name}</h2>
              <p className="text-sm text-muted">{design.spec.functionLabel} · {design.spec.hp}HP</p>
              <p className="mt-2 line-clamp-3 text-sm">{design.prompt}</p>
              <Link to="/lab" className={buttonClass("secondary", "mt-3")}>
                OPEN LAB
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Plate className="p-4">
          <Index n="03" label="BUILD HISTORY" />
          {!buildLog.length ? <Empty text="Log a build from the build sheet when you actually make one. This does not place an order." /> : null}
          <ul className="mt-3 space-y-2">
            {buildLog.map((entry) => (
              <li key={entry.id} className="border-b border-line pb-2 text-sm">
                {entry.name} · {money(entry.cost)} · {entry.at.slice(0, 10)}
              </li>
            ))}
          </ul>
        </Plate>
        <Plate className="p-4">
          <Index n="04" label="NOTES" />
          {!comments.length ? <Empty text="Notes you add on sample posts show up here. They are not published." /> : null}
          <ul className="mt-3 space-y-2 text-sm">
            {comments.map((comment) => (
              <li key={comment.id}>{comment.text}</li>
            ))}
          </ul>
        </Plate>
        <Plate className="p-4">
          <Index n="05" label="FAVORITE MODULES" />
          {!favorites.length ? <Empty text="Favorite a demo module from the market." /> : null}
          <ul className="mt-3 space-y-2 text-sm">
            {favorites.map((id) => (
              <li key={id}>{getModule(id)?.name ?? id}</li>
            ))}
          </ul>
        </Plate>
        <Plate className="p-4">
          <Index n="06" label="WISHLIST" />
          {!wishlist.length ? <Empty text="Wishlist items are demo listings. They cannot be purchased." /> : null}
          <ul className="mt-3 space-y-2 text-sm">
            {wishlist.map((id) => (
              <li key={id}>{LISTINGS.find((item) => item.id === id)?.name ?? id}</li>
            ))}
          </ul>
        </Plate>
      </section>

      <section className="mt-10">
        <Index n="07" label="SAVED SAMPLE POSTS" />
        {!savedPosts.length ? <Empty text="Save a sample system from Community if you want it listed here." /> : null}
        <ul className="mt-3 space-y-2">
          {savedPosts.map((id) => (
            <li key={id}>{COMMUNITY_POSTS.find((post) => post.id === id)?.title ?? id}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-surface p-4">
      <dt className="font-mono text-xs tracking-wider text-muted">{k}</dt>
      <dd className="mt-2 font-mono text-2xl tabular-nums">{v}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-3 text-sm text-muted">{text}</p>;
}
