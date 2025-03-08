// ProfileDisplay.tsx
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { KeyRound, Copy, Check } from 'lucide-react';
import { useStore } from '../store';
import { exportPublicKey } from '../utils/crypto';

export function ProfileDisplay() {
  const user = useStore((state) => state.user);
  const [publicKeyString, setPublicKeyString] = useState('');
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function getPublicKey() {
      if (user?.publicKey) {
        const exportedKey = await exportPublicKey(user.publicKey);
        setPublicKeyString(exportedKey);
        
        // Create a JSON object with both ID and public key
        const qrData = {
          id: user.id,
          publicKey: exportedKey
        };
        
        setQrCodeValue(JSON.stringify(qrData));
      }
    }
    
    getPublicKey();
  }, [user]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrCodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="bg-[#343944] shadow px-4 py-5 sm:rounded-lg sm:p-6">
      <div className="flex items-center space-x-4 mb-6">
        <KeyRound className="h-6 w-6 text-blue-500" />
        <h2 className="text-xl font-bold text-gray-800">Your Profile</h2>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Your Contact Info</h3>
          <p className="text-sm text-gray-500 mb-2">Share this with your contacts so they can add you</p>
          
          <div className="relative">
            <textarea
              readOnly
              value={qrCodeValue}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
              rows={4}
            />
            <button
              onClick={copyToClipboard}
              className="absolute right-2 top-2 p-1 rounded-md hover:bg-gray-100"
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-gray-500" />}
            </button>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Your QR Code</h3>
          <div className="inline-block p-4 bg-white rounded-lg border border-gray-200">
            {qrCodeValue && <QRCodeSVG value={qrCodeValue} size={200} />}
          </div>
          <p className="text-sm text-gray-500 mt-2">Let your contacts scan this to add you</p>
        </div>
      </div>
    </div>
  );
}
