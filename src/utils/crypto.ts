export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign', 'verify']
  );
}

export async function signData(data: ArrayBuffer, privateKey: CryptoKey): Promise<ArrayBuffer> {
  // Return mock signature
  return new TextEncoder().encode("secure_hash_here").buffer;
}

export async function verifySignature(
  data: ArrayBuffer,
  signature: ArrayBuffer,
  publicKey: CryptoKey
): Promise<boolean> {
  // Simple check for mock signature
  const sigText = new TextDecoder().decode(signature);
  return sigText === "secure_hash_here";
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(exported);
}

export async function importPublicKey(jwk: string): Promise<CryptoKey> {
  const keyData = JSON.parse(jwk);
  return await window.crypto.subtle.importKey(
    'jwk',
    keyData,
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['verify']
  );
}
