import { create } from 'zustand';

export const useLogStore = create((set) => ({
  logs: [],
  currentNetwork: '',
  addLog: (message) => set((state) => ({ 
    logs: [...state.logs, message] 
  })),
  setCurrentNetwork: (network) => set({ currentNetwork: network }),
  clearLogs: () => set({ logs: [] }),
}));
