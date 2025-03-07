// KeySetup.tsx
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { KeyRound, UserCircle } from 'lucide-react';
import { generateKeyPair, exportPublicKey } from '../utils/crypto';
import { useStore } from '../store';

export function KeySetup() {
  const [name, setName] = useState('');
  const [publicKeyQR, setPublicKeyQR] = useState('');
  const setUser = useStore((state) => state.setUser);

  const handleGenerateKeys = async () => {
    const keyPair = await generateKeyPair();
    const exportedPublicKey = await exportPublicKey(keyPair.publicKey);
    setPublicKeyQR(exportedPublicKey);
    
    // Generate a random user ID
    const userId = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
    
    setUser({
      id: userId,
      name,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    });
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <div className="flex items-center space-x-4 mb-6">
        <KeyRound className="h-12 w-12 text-blue-500" />
        <h2 className="text-2xl font-bold text-gray-800">Setup Your Identity</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Your Name (optional)
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <UserCircle className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your name"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateKeys}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Generate New Key Pair
        </button>

        {publicKeyQR && (
          <div className="mt-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Public Key QR Code</h3>
            <div className="inline-block p-4 bg-white rounded-lg shadow-lg">
              <QRCodeSVG value={publicKeyQR} size={200} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
