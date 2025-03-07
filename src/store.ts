import create from 'zustand';
import { Contact } from './types';

interface User {
  id: string; // Added ID field for signaling
  name: string;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

interface CallState {
  isActive: boolean;
  contact?: Contact;
  verificationFailed: boolean;
}

interface State {
  user: User | null;
  contacts: Contact[];
  callState: CallState;
  setUser: (user: User) => void;
  addContact: (contact: Contact) => void;
  setCallState: (state: Partial<CallState>) => void;
}

export const useStore = create<State>((set) => ({
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
  setCallState: (newState) => set((state) => ({ 
    callState: { ...state.callState, ...newState } 
  }))
}));
