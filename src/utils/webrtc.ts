import SimplePeer from 'simple-peer';
import { Contact } from '../types';
import { signData, verifySignature } from './crypto';

export class SecureConnection {
  private peer: SimplePeer.Instance;
  private stream: MediaStream | null = null;
  private contact: Contact;
  private localPrivateKey: CryptoKey;
  private onVerificationFailed: () => void;

  constructor(
    initiator: boolean,
    contact: Contact,
    localPrivateKey: CryptoKey,
    onVerificationFailed: () => void
  ) {
    this.contact = contact;
    this.localPrivateKey = localPrivateKey;
    this.onVerificationFailed = onVerificationFailed;

    this.peer = new SimplePeer({
      initiator,
      trickle: false
    });

    this.setupPeerListeners();
  }

  private async setupPeerListeners() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.stream.getTracks().forEach(track => this.peer.addTrack(track, this.stream!));
    } catch (error) {
      console.error('Failed to get audio stream:', error);
    }

    this.peer.on('track', (track, stream) => {
      const audio = new Audio();
      audio.srcObject = stream;
      audio.play();
    });

    this.peer.on('data', async (data) => {
      try {
        const { audioData, signature } = JSON.parse(data.toString());
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
  }

  public async sendAudioChunk(chunk: ArrayBuffer) {
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

  public getSignal(): Promise<string> {
    return new Promise((resolve) => {
      this.peer.on('signal', data => {
        resolve(JSON.stringify(data));
      });
    });
  }

  public connect(signalData: string) {
    this.peer.signal(JSON.parse(signalData));
  }

  public destroy() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.peer.destroy();
  }
}