// types.ts
export interface Contact {
  id: string;
  name: string;
  publicKey: CryptoKey;
}

export interface User {
  id: string;
  name: string;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface CallState {
  isActive: boolean;
  contact?: Contact;
  verificationFailed: boolean;
  incomingCallFrom?: Contact;
}

// store.ts
import { create } from 'zustand';
import { User, Contact, CallState } from './types';

interface StoreState {
  user: User | null;
  contacts: Contact[];
  callState: CallState;
  setUser: (user: User) => void;
  addContact: (contact: Contact) => void;
  removeContact: (id: string) => void;
  setCallState: (update: Partial<CallState>) => void;
}

export const useStore = create<StoreState>((set) => ({
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
  removeContact: (id) => set((state) => ({
    contacts: state.contacts.filter(contact => contact.id !== id)
  })),
  setCallState: (update) => set((state) => ({
    callState: { ...state.callState, ...update }
  }))
}));
