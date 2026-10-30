import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CommunityPost } from "./catalog.ts";
import { emptyCase, moduleFromCatalog, optimizeSystem, packRows, rackModuleFromDesign, uid } from "./engine.ts";
import type { LocalComment, ModuleDesign, OptimizeMode, RackModule, SystemProject, SystemProposal, TierId } from "./types.ts";

interface Snapshot {
  designs: ModuleDesign[];
  draft: ModuleDesign | null;
  systems: SystemProject[];
  activeSystemId: string;
  wishlist: string[];
  favorites: string[];
  likes: string[];
  savedPosts: string[];
  comments: LocalComment[];
  buildLog: { id: string; systemId: string; name: string; cost: number; at: string }[];
  profileName: string;
}

function freshSystem(name = "BENCH 01"): SystemProject {
  const now = new Date().toISOString();
  return {
    id: uid("sys"),
    name,
    case: emptyCase(name),
    rows: [[], []],
    allowances: [],
    createdAt: now,
    updatedAt: now,
    builtAt: null,
  };
}

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

interface LuxState extends Snapshot {
  hydrated: boolean;
  setDraft: (design: ModuleDesign) => void;
  selectTier: (tier: TierId) => void;
  setLevers: (ids: string[], target: number | null) => void;
  addDraftToSystem: () => { overflow: boolean } | null;
  removeModule: (instanceId: string) => void;
  duplicateModule: (instanceId: string) => void;
  moveModule: (instanceId: string, direction: -1 | 1) => void;
  moveModuleRow: (instanceId: string, direction: -1 | 1) => void;
  reorderDrag: (instanceId: string, targetId: string) => void;
  renameModule: (instanceId: string, name: string) => void;
  updateCase: (patch: Partial<SystemProject["case"]>) => void;
  renameSystem: (name: string) => void;
  newSystem: () => void;
  deleteSystem: (id: string) => void;
  activateSystem: (id: string) => void;
  loadProposal: (proposal: SystemProposal, name?: string) => void;
  loadPost: (post: CommunityPost) => void;
  applyOptimization: (mode: OptimizeMode) => { title: string; detail: string }[];
  markBuilt: () => void;
  toggleWish: (id: string) => void;
  toggleFavorite: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSavePost: (id: string) => void;
  addComment: (postId: string, text: string) => void;
  setProfileName: (name: string) => void;
  exportJSON: () => string;
  importJSON: (raw: string) => { ok: boolean; error?: string };
}

function touch(system: SystemProject, patch: Partial<SystemProject>): SystemProject {
  return { ...system, ...patch, updatedAt: new Date().toISOString() };
}

function mapActive(state: LuxState, mapper: (system: SystemProject) => SystemProject): Partial<LuxState> {
  return {
    systems: state.systems.map((system) => (system.id === state.activeSystemId ? mapper(system) : system)),
  };
}

function locate(system: SystemProject, instanceId: string) {
  for (let row = 0; row < system.rows.length; row += 1) {
    const index = system.rows[row]!.findIndex((mod) => mod.instanceId === instanceId);
    if (index >= 0) return { row, index };
  }
  return null;
}

export const useLux = create<LuxState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      designs: [],
      draft: null,
      systems: [freshSystem()],
      activeSystemId: "",
      wishlist: [],
      favorites: [],
      likes: [],
      savedPosts: [],
      comments: [],
      buildLog: [],
      profileName: "BUILDER",
      setDraft: (design) =>
        set((state) => ({
          draft: design,
          designs: [design, ...state.designs.filter((item) => item.id !== design.id)].slice(0, 24),
        })),
      selectTier: (tier) => {
        const draft = get().draft;
        if (!draft) return;
        get().setDraft({ ...draft, selectedTier: tier });
      },
      setLevers: (ids, target) => {
        const draft = get().draft;
        if (!draft) return;
        get().setDraft({ ...draft, leverIds: ids, costTarget: target });
      },
      addDraftToSystem: () => {
        const draft = get().draft;
        if (!draft) return null;
        const mod = rackModuleFromDesign(draft);
        let overflow = false;
        set((state) => {
          const current = state.systems.find((system) => system.id === state.activeSystemId) ?? state.systems[0];
          if (!current) return {};
          const rows = current.rows.map((row) => [...row]);
          while (rows.length < current.case.rows) rows.push([]);
          let placed = false;
          for (let i = 0; i < rows.length; i += 1) {
            const used = rows[i]!.reduce((sum, item) => sum + item.hp, 0);
            if (used + mod.hp <= current.case.hpPerRow) {
              rows[i]!.push(mod);
              placed = true;
              break;
            }
          }
          if (!placed) {
            rows[rows.length - 1]!.push(mod);
            overflow = true;
          }
          return mapActive({ ...state, activeSystemId: current.id }, () => touch(current, { rows }));
        });
        return { overflow };
      },
      removeModule: (instanceId) =>
        set((state) =>
          mapActive(state, (system) =>
            touch(system, {
              rows: system.rows.map((row) => row.filter((mod) => mod.instanceId !== instanceId)),
            }),
          ),
        ),
      duplicateModule: (instanceId) =>
        set((state) =>
          mapActive(state, (system) => {
            const rows = system.rows.map((row) => [...row]);
            const spot = locate(system, instanceId);
            if (!spot) return system;
            const source = rows[spot.row]![spot.index]!;
            const copy: RackModule = { ...source, instanceId: uid("mod"), name: source.name };
            rows[spot.row]!.splice(spot.index + 1, 0, copy);
            return touch(system, { rows });
          }),
        ),
      moveModule: (instanceId, direction) =>
        set((state) =>
          mapActive(state, (system) => {
            const rows = system.rows.map((row) => [...row]);
            const spot = locate(system, instanceId);
            if (!spot) return system;
            const next = spot.index + direction;
            const row = rows[spot.row]!;
            if (next < 0 || next >= row.length) return system;
            const [item] = row.splice(spot.index, 1);
            row.splice(next, 0, item!);
            return touch(system, { rows });
          }),
        ),
      moveModuleRow: (instanceId, direction) =>
        set((state) =>
          mapActive(state, (system) => {
            const rows = system.rows.map((row) => [...row]);
            const spot = locate(system, instanceId);
            if (!spot) return system;
            const target = spot.row + direction;
            if (target < 0 || target >= rows.length) return system;
            const [item] = rows[spot.row]!.splice(spot.index, 1);
            rows[target]!.push(item!);
            return touch(system, { rows });
          }),
        ),
      reorderDrag: (instanceId, targetId) =>
        set((state) =>
          mapActive(state, (system) => {
            if (instanceId === targetId) return system;
            const rows = system.rows.map((row) => [...row]);
            const from = locate({ ...system, rows }, instanceId);
            const to = locate({ ...system, rows }, targetId);
            if (!from || !to) return system;
            const [item] = rows[from.row]!.splice(from.index, 1);
            const insertAt = from.row === to.row && from.index < to.index ? to.index - 1 : to.index;
            rows[to.row]!.splice(insertAt, 0, item!);
            return touch(system, { rows });
          }),
        ),
      renameModule: (instanceId, name) =>
        set((state) =>
          mapActive(state, (system) =>
            touch(system, {
              rows: system.rows.map((row) => row.map((mod) => (mod.instanceId === instanceId ? { ...mod, name } : mod))),
            }),
          ),
        ),
      updateCase: (patch) =>
        set((state) =>
          mapActive(state, (system) => {
            const nextCase = { ...system.case, ...patch };
            let rows = system.rows.map((row) => [...row]);
            if (nextCase.rows < rows.length) {
              const extra = rows.slice(nextCase.rows).flat();
              rows = rows.slice(0, nextCase.rows);
              rows[rows.length - 1]!.push(...extra);
            }
            while (rows.length < nextCase.rows) rows.push([]);
            return touch(system, { case: nextCase, rows });
          }),
        ),
      renameSystem: (name) =>
        set((state) => mapActive(state, (system) => touch(system, { name, case: { ...system.case, name } }))),
      newSystem: () =>
        set((state) => {
          const system = freshSystem(`BENCH ${String(state.systems.length + 1).padStart(2, "0")}`);
          return { systems: [...state.systems, system].slice(-12), activeSystemId: system.id };
        }),
      deleteSystem: (id) =>
        set((state) => {
          const systems = state.systems.filter((system) => system.id !== id);
          if (!systems.length) {
            const system = freshSystem();
            return { systems: [system], activeSystemId: system.id };
          }
          return {
            systems,
            activeSystemId: state.activeSystemId === id ? systems[0]!.id : state.activeSystemId,
          };
        }),
      activateSystem: (id) => set({ activeSystemId: id }),
      loadProposal: (proposal, name) =>
        set((state) => {
          const current = state.systems.find((system) => system.id === state.activeSystemId) ?? state.systems[0];
          if (!current) return {};
          const rowCount = proposal.rows.length || current.case.rows;
          return mapActive(state, (system) =>
            touch(system, {
              name: name ?? proposal.title,
              rows: proposal.rows,
              allowances: proposal.allowances,
              case: {
                ...system.case,
                name: name ?? proposal.title,
                rows: rowCount,
                hpPerRow: proposal.hpCapacity / Math.max(1, rowCount),
                budget: Math.max(system.case.budget, proposal.cost),
                powerP12: proposal.powerCapacity.p12,
                powerN12: proposal.powerCapacity.n12,
                powerP5: proposal.powerCapacity.p5,
              },
            }),
          );
        }),
      loadPost: (post) => {
        const modules = post.items
          .map((item) => moduleFromCatalog(item.moduleId, item.tier))
          .filter((mod): mod is RackModule => Boolean(mod));
        const proposal: SystemProposal = {
          title: post.title,
          style: "custom",
          items: post.items,
          modules,
          rows: packRows(modules, post.rows, post.hpPerRow),
          cost: modules.reduce((sum, mod) => sum + mod.cost, 0),
          hp: modules.reduce((sum, mod) => sum + mod.hp, 0),
          hpCapacity: post.rows * post.hpPerRow,
          power: modules.reduce(
            (total, mod) => ({
              p12: total.p12 + mod.power.p12,
              n12: total.n12 + mod.power.n12,
              p5: total.p5 + mod.power.p5,
            }),
            { p12: 0, n12: 0, p5: 0 },
          ),
          powerCapacity: { p12: 2000, n12: 2000, p5: 500 },
          difficulty: "INTERMEDIATE",
          withinPower: true,
          withinHp: true,
          withinBudget: true,
          allowances: [],
          whatYouGet: [],
          why: [],
          sacrifice: [],
          upgrade: [],
          changes: [],
          purpose: post.body,
          caseName: post.title,
        };
        set((state) => {
          const system = freshSystem(post.title);
          system.case = {
            ...system.case,
            rows: post.rows,
            hpPerRow: post.hpPerRow,
            budget: Math.max(post.budget, proposal.cost),
          };
          system.rows = proposal.rows;
          return { systems: [...state.systems, system].slice(-12), activeSystemId: system.id };
        });
      },
      applyOptimization: (mode) => {
        const current = get().systems.find((system) => system.id === get().activeSystemId);
        if (!current) return [];
        const result = optimizeSystem(current, mode);
        set((state) =>
          mapActive(state, (system) => touch(system, { rows: result.rows, allowances: result.allowances })),
        );
        return result.changes;
      },
      markBuilt: () =>
        set((state) => {
          const current = state.systems.find((system) => system.id === state.activeSystemId);
          if (!current) return {};
          const cost = current.rows.flat().reduce((sum, mod) => sum + mod.cost, 0);
          return {
            ...mapActive(state, (system) => touch(system, { builtAt: new Date().toISOString() })),
            buildLog: [
              { id: uid("build"), systemId: current.id, name: current.name, cost, at: new Date().toISOString() },
              ...state.buildLog,
            ].slice(0, 24),
          };
        }),
      toggleWish: (id) =>
        set((state) => ({
          wishlist: state.wishlist.includes(id) ? state.wishlist.filter((item) => item !== id) : [...state.wishlist, id],
        })),
      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id) ? state.favorites.filter((item) => item !== id) : [...state.favorites, id],
        })),
      toggleLike: (id) =>
        set((state) => ({
          likes: state.likes.includes(id) ? state.likes.filter((item) => item !== id) : [...state.likes, id],
        })),
      toggleSavePost: (id) =>
        set((state) => ({
          savedPosts: state.savedPosts.includes(id) ? state.savedPosts.filter((item) => item !== id) : [...state.savedPosts, id],
        })),
      addComment: (postId, text) =>
        set((state) => ({
          comments: [{ id: uid("note"), postId, text: text.trim(), at: new Date().toISOString() }, ...state.comments].slice(0, 40),
        })),
      setProfileName: (name) => set({ profileName: name.slice(0, 32) }),
      exportJSON: () => {
        const state = get();
        const snapshot: Snapshot = {
          designs: state.designs,
          draft: state.draft,
          systems: state.systems,
          activeSystemId: state.activeSystemId,
          wishlist: state.wishlist,
          favorites: state.favorites,
          likes: state.likes,
          savedPosts: state.savedPosts,
          comments: state.comments,
          buildLog: state.buildLog,
          profileName: state.profileName,
        };
        return JSON.stringify({ luxMachina: 1, exportedAt: new Date().toISOString(), ...snapshot }, null, 2);
      },
      importJSON: (raw) => {
        try {
          const data = JSON.parse(raw) as Partial<Snapshot> & { luxMachina?: number };
          if (!data || data.luxMachina !== 1 || !Array.isArray(data.systems)) {
            return { ok: false, error: "That file is not a Lux Machina project." };
          }
          set({
            designs: data.designs ?? [],
            draft: data.draft ?? null,
            systems: data.systems.length ? data.systems : [freshSystem()],
            activeSystemId: data.activeSystemId || data.systems[0]?.id || "",
            wishlist: data.wishlist ?? [],
            favorites: data.favorites ?? [],
            likes: data.likes ?? [],
            savedPosts: data.savedPosts ?? [],
            comments: data.comments ?? [],
            buildLog: data.buildLog ?? [],
            profileName: data.profileName || "BUILDER",
          });
          return { ok: true };
        } catch {
          return { ok: false, error: "Could not read that JSON." };
        }
      },
    }),
    {
      name: "lux-machina-v1",
      skipHydration: true,
      storage: createJSONStorage(() => (typeof window === "undefined" ? memoryStorage : localStorage)),
      partialize: (state) => ({
        designs: state.designs,
        draft: state.draft,
        systems: state.systems,
        activeSystemId: state.activeSystemId,
        wishlist: state.wishlist,
        favorites: state.favorites,
        likes: state.likes,
        savedPosts: state.savedPosts,
        comments: state.comments,
        buildLog: state.buildLog,
        profileName: state.profileName,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.systems.length) {
          const system = freshSystem();
          state.systems = [system];
          state.activeSystemId = system.id;
        } else if (!state.systems.some((system) => system.id === state.activeSystemId)) {
          state.activeSystemId = state.systems[0]!.id;
        }
      },
    },
  ),
);

export function activeSystem(state: { systems: SystemProject[]; activeSystemId: string }) {
  return state.systems.find((system) => system.id === state.activeSystemId) ?? state.systems[0] ?? null;
}
