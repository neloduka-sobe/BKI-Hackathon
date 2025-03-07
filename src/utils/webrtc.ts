import { Contact } from '../types';
import { signData, verifySignature } from './crypto';
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
    
    // We'll initialize the peer later to avoid module loading issues
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
    
    try {
      const signature = await signData(chunk, this.localPrivateKey);
      this.peer.send(JSON.stringify({
        audioData: Array.from(new Uint8Array(chunk)),
        signature: Array.from(new Uint8Array(signature))
      }));
    } catch (error) {
      console.error('Error sending audio chunk:', error);
    }
  }

  public async acceptCall(): Promise<boolean> {
    try {
      await this.initializePeer();
      return true;
    } catch (error) {
      console.error('Failed to accept call:', error);
      return false;
    }
  }

  public destroy() {
    this.stream?.getTracks().forEach(track => track.stop());
    if (this.peer) {
      this.peer.destroy();
    }
  }
}
