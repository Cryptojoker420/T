import { create } from 'zustand';

interface AppState {
  activeChainId: number;
  setActiveChainId: (id: number) => void;
  isPrivateTx: boolean;
  togglePrivateTx: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeChainId: 1,
  setActiveChainId: (id) => set({ activeChainId: id }),
  isPrivateTx: true,
  togglePrivateTx: () => set((state) => ({ isPrivateTx: !state.isPrivateTx })),
}));
