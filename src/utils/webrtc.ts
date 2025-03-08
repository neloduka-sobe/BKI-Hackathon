import { Contact } from '../types';
import { signData, verifySignature } from './crypto';
import SimplePeer from 'simple-peer/simplepeer.min.js';

export class SecureConnection {
  private peer: any = null;
  private stream: MediaStream | null = null;
  private contact: Contact;
  private localPrivateKey: CryptoKey;
  private localPublicKey: CryptoKey;
  private localUserId: string;
  private onVerificationFailed: () => void;
  private onIncomingCall: (contact: Contact) => void;
  private onConnected: () => void;
  private isInitiator: boolean;
  private identityVerified: boolean = false;

  constructor(
    initiator: boolean,
    contact: Contact,
    localPrivateKey: CryptoKey,
    localPublicKey: CryptoKey,
    localUserId: string,
    onVerificationFailed: () => void,
    onIncomingCall: (contact: Contact) => void,
    onConnected: () => void
  ) {
    this.contact = contact;
    this.localPrivateKey = localPrivateKey;
    this.localPublicKey = localPublicKey;
    this.localUserId = localUserId;
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
      if (!this.identityVerified) {
        console.warn("Received track before identity verification - ignoring");
        return;
      }
      
      const audio = new Audio();
      audio.srcObject = stream;
      audio.play();
    });

    this.peer.on('connect', () => {
      console.log('Peer connection established');
      
      if (this.isInitiator) {
        // Send identity verification challenge
        this.sendIdentityChallenge();
      }
      // We'll call onConnected only after identity verification
    });

    this.peer.on('data', async (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'identityChallenge') {
          await this.handleIdentityChallenge(message);
        } 
        else if (message.type === 'identityResponse') {
          await this.verifyIdentityResponse(message);
        }
        else if (message.type === 'audioChunk') {
          if (!this.identityVerified) {
            console.warn("Received audio before identity verification - ignoring");
            return;
          }
          
          const { audioData, signature } = message.payload;
          const isValid = await verifySignature(
            new Uint8Array(audioData).buffer,
            new Uint8Array(signature).buffer,
            this.contact.publicKey
          );

          if (!isValid) {
            this.onVerificationFailed();
          }
        }
      } catch (error) {
        console.error('Error processing received data:', error);
      }
    });

    this.peer.on('error', (err: Error) => {
      console.error('Peer connection error:', err);
    });
  }

  private async sendIdentityChallenge() {
    if (!this.peer) return;
    
    // Create a random challenge
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    
    // Sign the challenge with our private key
    const signature = await signData(challenge.buffer, this.localPrivateKey);
    
    // Send the challenge along with our user ID
    this.peer.send(JSON.stringify({
      type: 'identityChallenge',
      userId: this.localUserId,
      challenge: Array.from(challenge),
      signature: Array.from(new Uint8Array(signature))
    }));
  }
  
  private async handleIdentityChallenge(message: any) {
    if (!this.peer) return;
    
    const { userId, challenge, signature } = message;
    
    // Verify that the signature is valid for the challenge using the contact's public key
    const isValid = await verifySignature(
      new Uint8Array(challenge).buffer,
      new Uint8Array(signature).buffer,
      this.contact.publicKey
    );
    
    if (!isValid || userId !== this.contact.id) {
      console.error("Identity verification failed: Invalid signature or user ID");
      this.onVerificationFailed();
      return;
    }
    
    // Create our response with a new challenge
    const responseChallenge = new Uint8Array(32);
    window.crypto.getRandomValues(responseChallenge);
    
    // Sign the response challenge
    const responseSignature = await signData(responseChallenge.buffer, this.localPrivateKey);
    
    // Send the response
    this.peer.send(JSON.stringify({
      type: 'identityResponse',
      userId: this.localUserId,
      challenge: Array.from(responseChallenge),
      signature: Array.from(new Uint8Array(responseSignature))
    }));
  }
  
  private async verifyIdentityResponse(message: any) {
    const { userId, challenge, signature } = message;
    
    // Verify that the signature is valid using the contact's public key
    const isValid = await verifySignature(
      new Uint8Array(challenge).buffer,
      new Uint8Array(signature).buffer,
      this.contact.publicKey
    );
    
    if (!isValid || userId !== this.contact.id) {
      console.error("Identity verification failed: Invalid signature or user ID in response");
      this.onVerificationFailed();
      return;
    }
    
    // Identity verified!
    console.log("Identity verified successfully!");
    this.identityVerified = true;
    this.onConnected();
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
    if (!this.peer || !this.identityVerified) return;
    
    try {
      const signature = await signData(chunk, this.localPrivateKey);
      this.peer.send(JSON.stringify({
        type: 'audioChunk',
        payload: {
          audioData: Array.from(new Uint8Array(chunk)),
          signature: Array.from(new Uint8Array(signature))
        }
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
