import { create } from 'zustand';
import { User, Contact, CallState } from '../types';

interface AppState {
  user: User | null;
  contacts: Contact[];
  callState: CallState;
  setUser: (user: User) => void;
  addContact: (contact: Contact) => void;
  setCallState: (state: Partial<CallState>) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  contacts: [],
  callState: {
    isActive: false,
    verificationFailed: false
  },
  setUser: (user) => set({ user }),
  addContact: (contact) => set((state) => ({
    contacts: [...state.contacts, contact]
  })),
  setCallState: (state) => set((prev) => ({
    callState: { ...prev.callState, ...state }
  }))
}));