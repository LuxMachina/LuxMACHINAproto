import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ModuleFace } from "@/components/lux/ModuleFace";
import { Button, Index, money, WarningStrip } from "@/components/lux/ui";
import { COMMUNITY_POSTS } from "@/lib/lux/catalog";
import { moduleFromCatalog, sumPower } from "@/lib/lux/engine";
import { useLux } from "@/lib/lux/store";

export const Route = createFileRoute("/community")({ component: CommunityPage });

function CommunityPage() {
  const navigate = useNavigate();
  const likes = useLux((state) => state.likes);
  const saved = useLux((state) => state.savedPosts);
  const comments = useLux((state) => state.comments);
  const toggleLike = useLux((state) => state.toggleLike);
  const toggleSavePost = useLux((state) => state.toggleSavePost);
  const addComment = useLux((state) => state.addComment);
  const loadPost = useLux((state) => state.loadPost);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Index n="COMMUNITY" label="SAMPLE BENCH" />
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Systems worth copying.</h1>
      <p className="mt-3 max-w-2xl text-muted">
        These are editorial samples, not a live community and not other people's activity. Clone puts a copy on your bench. Your likes and notes stay on this device.
      </p>
      <div className="mt-4">
        <WarningStrip>SAMPLE POSTS — NOT LIVE COMMUNITY ACTIVITY. No reviews. No public audience.</WarningStrip>
      </div>
      {notice ? <p className="mt-4 font-mono text-sm text-accent">{notice}</p> : null}
      <ul className="mt-8 flex flex-col gap-6">
        {COMMUNITY_POSTS.map((post) => {
          const modules = post.items
            .map((item) => moduleFromCatalog(item.moduleId, item.tier))
            .filter((mod) => Boolean(mod));
          const list = modules.flatMap((mod) => (mod ? [mod] : []));
          const cost = list.reduce((sum, mod) => sum + mod.cost, 0);
          const hp = list.reduce((sum, mod) => sum + mod.hp, 0);
          const power = sumPower(list);
          const notes = comments.filter((comment) => comment.postId === post.id);
          return (
            <li key={post.id} className="border border-line bg-surface p-4">
              <p className="font-mono text-xs tracking-widest text-muted">
                {post.style} · {post.author} · SAMPLE
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{post.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed">{post.body}</p>
              <p className="mt-3 font-mono text-xs tabular-nums text-muted">
                {money(cost)} estimated · {hp}/{post.rows * post.hpPerRow} HP · +{power.p12}/−{power.n12} mA
              </p>
              <div className="mt-3 overflow-x-auto border border-line bg-bg">
                <div className="flex w-max">
                  {list.map((mod) => (
                    <ModuleFace key={mod.instanceId} mod={mod} unit={8} compact />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    loadPost(post);
                    setNotice(`CLONED — ${post.title} is a new system on your bench.`);
                    void navigate({ to: "/system" });
                  }}
                >
                  CLONE THIS SYSTEM
                </Button>
                <Button
                  onClick={() => {
                    loadPost(post);
                    setNotice(`REMIX — ${post.title} copied. Change tiers, HP, or run an optimizer.`);
                    void navigate({ to: "/system", hash: "optimize" });
                  }}
                >
                  REMIX
                </Button>
                <Button variant={saved.includes(post.id) ? "primary" : "secondary"} onClick={() => toggleSavePost(post.id)}>
                  {saved.includes(post.id) ? "SAVED" : "SAVE"}
                </Button>
                <Button variant={likes.includes(post.id) ? "primary" : "secondary"} onClick={() => toggleLike(post.id)}>
                  {likes.includes(post.id) ? "LIKED" : "LIKE"}
                </Button>
                <Button
                  onClick={() => {
                    const text = `${post.title}\n${post.body}\nEstimated ${money(cost)}. Demo system from Lux Machina.`;
                    void navigator.clipboard?.writeText(text).then(
                      () => setNotice("SHARE TEXT COPIED. There is no public feed."),
                      () => setNotice(text),
                    );
                  }}
                >
                  SHARE
                </Button>
              </div>
              <form
                className="mt-4 flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const text = drafts[post.id]?.trim();
                  if (!text) return;
                  addComment(post.id, text);
                  setDrafts((current) => ({ ...current, [post.id]: "" }));
                }}
              >
                <label className="sr-only" htmlFor={`note-${post.id}`}>
                  Note on {post.title}
                </label>
                <input
                  id={`note-${post.id}`}
                  className="min-h-11 flex-1 border border-line bg-bg px-3"
                  placeholder="A private note. It is not published."
                  value={drafts[post.id] ?? ""}
                  onChange={(event) => setDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                />
                <Button type="submit">COMMENT</Button>
              </form>
              {notes.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {notes.map((note) => (
                    <li key={note.id} className="border-t border-line pt-2">
                      <span className="text-muted">Your note · </span>
                      {note.text}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
