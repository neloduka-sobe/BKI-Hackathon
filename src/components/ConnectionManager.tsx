import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { KeyRound, UserPlus, Copy, Check, Scan } from 'lucide-react';
import { useStore } from '../store';
import { exportPublicKey, importPublicKey } from '../utils/crypto';

export function ConnectionManager() {
  const [isScanning, setIsScanning] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [contactName, setContactName] = useState('');
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  
  const user = useStore((state) => state.user);
  const addContact = useStore((state) => state.addContact);

  useEffect(() => {
    return () => {
      scanner?.clear();
    };
  }, [scanner]);

  const handleScanStart = () => {
    const newScanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    newScanner.render(
      async (decodedText) => {
        try {
          const publicKey = await importPublicKey(decodedText);
          addContact({
            id: crypto.randomUUID(),
            name: contactName || 'Unknown Contact',
            publicKey
          });
          newScanner.clear();
          setIsScanning(false);
          setContactName('');
        } catch (error) {
          console.error('Failed to import key:', error);
        }
      },
      (error) => {
        console.warn(error);
      }
    );

    setScanner(newScanner);
    setIsScanning(true);
  };

  const handleManualImport = async () => {
    try {
      const publicKey = await importPublicKey(manualKey);
      addContact({
        id: crypto.randomUUID(),
        name: contactName || 'Unknown Contact',
        publicKey
      });
      setManualKey('');
      setContactName('');
    } catch (error) {
      console.error('Failed to import key:', error);
    }
  };

  const copyPublicKey = async () => {
    if (!user) return;
    
    try {
      const publicKeyString = await exportPublicKey(user.publicKey);
      await navigator.clipboard.writeText(publicKeyString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy key:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Share Your Key Section */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-blue-500" />
          Share Your Key
        </h2>
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <QRCodeSVG
                value={user ? exportPublicKey(user.publicKey) : ''}
                size={200}
              />
            </div>
          </div>
          <button
            onClick={copyPublicKey}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Public Key
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Contact Section */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-blue-500" />
          Add New Contact
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter contact name"
            />
          </div>

          {isScanning ? (
            <div>
              <div id="qr-reader" className="mb-4"></div>
              <button
                onClick={() => {
                  scanner?.clear();
                  setIsScanning(false);
                }}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Cancel Scanning
              </button>
            </div>
          ) : (
            <button
              onClick={handleScanStart}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Scan className="h-4 w-4" />
              Scan QR Code
            </button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste Public Key
            </label>
            <textarea
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Paste the public key here"
            />
          </div>

          <button
            onClick={handleManualImport}
            disabled={!manualKey}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Import Key
          </button>
        </div>
      </div>
    </div>
  );
}