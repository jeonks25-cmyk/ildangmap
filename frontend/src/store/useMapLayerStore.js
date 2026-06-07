import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_EXPERIENCE_MAP_LAYERS, DEFAULT_LIFE_MAP_LAYERS } from "../constants/mapItemTypes";

const DEFAULT_EXPERIENCE_LAYER_SET = new Set(DEFAULT_EXPERIENCE_MAP_LAYERS);

function createDefaultVisibleLayers() {
  return DEFAULT_LIFE_MAP_LAYERS.reduce((acc, layer) => {
    acc[layer] = DEFAULT_EXPERIENCE_LAYER_SET.has(layer);
    return acc;
  }, {});
}

export const useMapLayerStore = create(
  persist(
    (set, get) => ({
      visibleLayers: createDefaultVisibleLayers(),
      toggleLayer: (layer) =>
        set((state) => ({
          visibleLayers: {
            ...state.visibleLayers,
            [layer]: state.visibleLayers?.[layer] === false,
          },
        })),
      setLayerVisible: (layer, visible) =>
        set((state) => ({
          visibleLayers: {
            ...state.visibleLayers,
            [layer]: Boolean(visible),
          },
        })),
      setLayersVisible: (layers, visible) =>
        set((state) => {
          const next = { ...state.visibleLayers };
          (Array.isArray(layers) ? layers : []).forEach((layer) => {
            next[layer] = Boolean(visible);
          });
          return { visibleLayers: next };
        }),
      toggleCategoryLayers: (layers) =>
        set((state) => {
          const next = { ...state.visibleLayers };
          (Array.isArray(layers) ? layers : []).forEach((layer) => {
            next[layer] = next[layer] === false;
          });
          return { visibleLayers: next };
        }),
      resetLayers: () => set(() => ({ visibleLayers: createDefaultVisibleLayers() })),
      getVisibleLayerKeys: () => {
        const visible = get().visibleLayers || {};
        return DEFAULT_LIFE_MAP_LAYERS.filter((key) => visible[key] !== false);
      },
    }),
    {
      name: "ildangmap_life_map_layers_v1",
      version: 5,
      migrate: () => ({ visibleLayers: createDefaultVisibleLayers() }),
    }
  )
);
