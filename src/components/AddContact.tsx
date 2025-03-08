import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, QrCode, X, Upload } from 'lucide-react';
import { useStore } from '../store';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { importPublicKey } from '../utils/crypto';

export function AddContact() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [publicKeyString, setPublicKeyString] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const qrScannerRef = useRef<HTMLDivElement>(null);
  const scannerInstanceRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const addContact = useStore((state) => state.addContact);

  useEffect(() => {
    return () => {
      // Clean up scanner when component unmounts
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear();
      }
    };
  }, []);

  const startQrScanner = () => {
    if (!qrScannerRef.current) return;
    
    setIsScanning(true);
    setError('');
    
    try {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: 250 },
        false
      );
      
      scanner.render(
        (decodedText) => {
          // QR code scanned successfully
          setPublicKeyString(decodedText);
          scanner.clear();
          setIsScanning(false);
        },
        (errorMessage) => {
          // Handle scan error
          console.error(errorMessage);
        }
      );
      
      scannerInstanceRef.current = scanner;
    } catch (error) {
      console.error('Failed to initialize QR scanner:', error);
      setError('Failed to initialize QR scanner. Try uploading an image instead.');
      setIsScanning(false);
    }
  };

  const stopQrScanner = () => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear();
      scannerInstanceRef.current = null;
    }
    setIsScanning(false);
  };

  const handleAddContact = async () => {
    if (!name.trim()) {
      setError('Please enter a contact name');
      return;
    }
    
    if (!publicKeyString.trim()) {
      setError('Public key is required');
      return;
    }
    
    try {
      let contactData: { id?: string, publicKey: string };
      
      try {
        // Try to parse as a JSON object that might contain ID
        contactData = JSON.parse(publicKeyString);
      } catch {
        // If not valid JSON, assume it's just the public key
        contactData = { publicKey: publicKeyString };
      }
      
      // Import the public key
      const publicKey = await importPublicKey(
        typeof contactData.publicKey === 'string' 
          ? contactData.publicKey 
          : publicKeyString
      );
      
      // Store key in localStorage
      localStorage.setItem(`key_${contactData.id || Math.random().toString(36).substring(2, 15)}`, publicKeyString);
      
      // Add to contacts with an ID from the data or generate one
      addContact({
        id: contactData.id || Math.random().toString(36).substring(2, 15),
        name: name.trim(),
        publicKey
      });
      
      // Reset and close
      setName('');
      setPublicKeyString('');
      setIsOpen(false);
      setError('');
    } catch (err) {
      console.error('Failed to import public key:', err);
      setError('Invalid public key format');
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      
      // Load the image
      const imageUrl = URL.createObjectURL(file);
      const image = new Image();
      
      image.onload = async () => {
        try {
          // Create a canvas to process the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            setError('Failed to process image');
            return;
          }
          
          canvas.width = image.width;
          canvas.height = image.height;
          ctx.drawImage(image, 0, 0);
          
          // Use a dynamically imported QR code reader
          const jsQR = (await import('jsqr')).default;
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            setPublicKeyString(code.data);
          } else {
            setError('No QR code found in the image');
          }
          
          // Clean up
          URL.revokeObjectURL(imageUrl);
        } catch (error) {
          console.error('QR processing error:', error);
          setError('Failed to process QR code');
        }
      };
      
      image.onerror = () => {
        setError('Failed to load image');
        URL.revokeObjectURL(imageUrl);
      };
      
      image.src = imageUrl;
    } catch (error) {
      console.error('File upload error:', error);
      setError('Failed to process the uploaded file');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <UserPlus className="h-5 w-5 mr-2" />
        Add New Contact
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div style={{ backgroundColor: '#343944' }} className="shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Contact</h3>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  stopQrScanner();
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter contact name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact's Public Key
                </label>
                <textarea
                  value={publicKeyString}
                  onChange={(e) => setPublicKeyString(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Paste public key or scan QR code"
                />
              </div>
              
              <div className="flex space-x-2">
                {!isScanning ? (
                  <button
                    onClick={startQrScanner}
                    className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    Scan QR Code
                  </button>
                ) : (
                  <button
                    onClick={stopQrScanner}
                    className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <X className="h-5 w-5 mr-2" />
                    Stop Scanning
                  </button>
                )}
                
                <button
                  onClick={triggerFileUpload}
                  className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload QR Image
                </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              
              {isScanning && (
                <div ref={qrScannerRef} id="qr-reader" className="w-full"></div>
              )}
              
              <button
                onClick={handleAddContact}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
