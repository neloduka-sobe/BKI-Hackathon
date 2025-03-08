import { Contact } from '../types';
import { signData, verifySignature, exportPublicKey } from './crypto';
import SimplePeer from 'simple-peer/simplepeer.min.js';

export class SecureConnection {
  private peer: any = null;
  private stream: MediaStream | null = null;
  private contact: Contact;
  private localPrivateKey: CryptoKey;
  private onVerificationFailed: () => void;
  private onIncomingCall: (contact: Contact) => void;
  private onConnected: () => void;
  private isInitiator: boolean;
  public securityStatus: 'secure' | 'insecure' | 'malicious' = 'insecure';

  constructor(
    initiator: boolean,
    contact: Contact,
    localPrivateKey: CryptoKey,
    onVerificationFailed: () => void,
    onIncomingCall: (contact: Contact) => void,
    onConnected: () => void
  ) {
    this.contact = contact;
    this.localPrivateKey = localPrivateKey;
    this.onVerificationFailed = onVerificationFailed;
    this.onIncomingCall = onIncomingCall;
    this.onConnected = onConnected;
    this.isInitiator = initiator;
    
    this.checkSecurityStatus();
  }

  private async checkSecurityStatus() {
    try {
      const storedKey = localStorage.getItem(`key_${this.contact.id}`);
      const currentKey = await exportPublicKey(this.contact.publicKey);
      
      if (!storedKey) {
        this.securityStatus = 'insecure';
      } else if (storedKey !== currentKey) {
        this.securityStatus = 'malicious';
        this.onVerificationFailed();
      } else {
        this.securityStatus = 'secure';
      }
    } catch {
      this.securityStatus = 'insecure';
    }
  }

  private async initializePeer() {
    try {
      
      this.peer = new SimplePeer({
        initiator: this.isInitiator,
        trickle: false
      });

      await this.setupPeerListeners();
      return true;
    } catch (error) {
      console.error('Failed to initialize peer:', error);
      return false;
    }
  }

  private async setupPeerListeners() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.peer && this.stream) {
        this.stream.getTracks().forEach(track => this.peer.addTrack(track, this.stream!));
      }
    } catch (error) {
      console.error('Failed to get audio stream:', error);
    }

    if (!this.peer) return;

    this.peer.on('track', (track: MediaStreamTrack, stream: MediaStream) => {
      const audio = new Audio();
      audio.srcObject = stream;
      audio.play();
    });

    this.peer.on('connect', () => {
      console.log('Peer connection established');
      this.onConnected();
    });

    this.peer.on('data', async (data: any) => {
      try {
        const parsedData = JSON.parse(data.toString());
        const { audioData, signature } = parsedData;
        const isValid = await verifySignature(
          new Uint8Array(audioData).buffer,
          new Uint8Array(signature).buffer,
          this.contact.publicKey
        );

        if (!isValid) {
          this.onVerificationFailed();
        }
      } catch (error) {
        console.error('Error processing received data:', error);
      }
    });

    this.peer.on('error', (err: Error) => {
      console.error('Peer connection error:', err);
    });
  }

  public async createOffer(): Promise<string> {
    const initialized = await this.initializePeer();
    if (!initialized || !this.peer) {
      throw new Error('Failed to initialize WebRTC peer');
    }
    
    return new Promise((resolve) => {
      this.peer.on('signal', (data: any) => {
        resolve(JSON.stringify(data));
      });
    });
  }

  public async receiveOffer(offerData: string): Promise<string> {
    const initialized = await this.initializePeer();
    if (!initialized || !this.peer) {
      throw new Error('Failed to initialize WebRTC peer');
    }
    
    this.peer.signal(JSON.parse(offerData));
    
    return new Promise((resolve) => {
      this.peer.on('signal', (data: any) => {
        resolve(JSON.stringify(data));
      });
    });
  }

  public async receiveAnswer(answerData: string): Promise<void> {
    if (!this.peer) {
      throw new Error('Peer connection not initialized');
    }
    
    this.peer.signal(JSON.parse(answerData));
  }

public async sendAudioChunk(chunk: ArrayBuffer) {
    if (!this.peer) return;
    
    let payload: any = { audioData: Array.from(new Uint8Array(chunk)) };
    
    if (this.securityStatus === 'secure') {
      payload.signature = "secure_hash_here";
    }

    this.peer.send(JSON.stringify(payload));
  }
}
