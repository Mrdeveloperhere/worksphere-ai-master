import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidebarApp = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

type SidebarAppsState = {
  apps: SidebarApp[];
  addApp: (app: SidebarApp) => void;
  removeApp: (id: string) => void;
};

export const useSidebarAppsStore = create<SidebarAppsState>()(
  persist(
    (set) => ({
      apps: [],
      addApp: (app) =>
        set((s) => ({
          apps: [...s.apps.filter((a) => a.id !== app.id), app],
        })),
      removeApp: (id) =>
        set((s) => ({
          apps: s.apps.filter((a) => a.id !== id),
        })),
    }),
    {
      name: "worksphere-sidebar-apps-storage",
    }
  )
);
