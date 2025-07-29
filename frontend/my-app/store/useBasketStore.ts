import { create } from 'zustand';

type BasketStore = {
  boardMac: string | null;
  setBoardMac: (mac: string) => void;
};

export const useBasketStore = create<BasketStore>(set => ({
  boardMac: null,
  setBoardMac: (mac) => set({ boardMac: mac }),
}));