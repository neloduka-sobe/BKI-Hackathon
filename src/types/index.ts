export interface User {
  name: string;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface Contact {
  id: string;
  name: string;
  publicKey: CryptoKey;
}

export interface AudioChunk {
  data: ArrayBuffer;
  hash: ArrayBuffer;
  signature: ArrayBuffer;
}

export interface CallState {
  isActive: boolean;
  contact?: Contact;
  verificationFailed: boolean;
}