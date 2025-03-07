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
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return await window.crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    privateKey,
    hash
  );
}

export async function verifySignature(
  data: ArrayBuffer,
  signature: ArrayBuffer,
  publicKey: CryptoKey
): Promise<boolean> {
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return await window.crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    publicKey,
    signature,
    hash
  );
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