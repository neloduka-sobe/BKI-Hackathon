import React, { useEffect, useState } from 'react';
import { PhoneOff, Shield, ShieldOff } from 'lucide-react';
import { useStore } from '../store';
import { SecureConnection } from '../utils/webrtc';

export function CallInterface() {
  const [connection, setConnection] = useState<SecureConnection | null>(null);
  const [signalData, setSignalData] = useState<string>('');
  const user = useStore((state) => state.user);
  const { contact, isActive, verificationFailed } = useStore((state) => state.callState);
  const setCallState = useStore((state) => state.setCallState);

  useEffect(() => {
    if (!isActive || !contact || !user) return;

    const conn = new SecureConnection(
      true,
      contact,
      user.privateKey,
      () => setCallState({ verificationFailed: true })
    );

    conn.getSignal().then(setSignalData);
    setConnection(conn);

    return () => {
      conn.destroy();
    };
  }, [isActive, contact, user]);

  const endCall = () => {
    connection?.destroy();
    setConnection(null);
    setCallState({ isActive: false, contact: undefined, verificationFailed: false });
  };

  if (!isActive || !contact) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-8">
          <h3 className="text-lg font-medium text-gray-900">
            Call with {contact.name}
          </h3>
          {verificationFailed ? (
            <div className="mt-2 flex items-center justify-center text-red-600">
              <ShieldOff className="h-5 w-5 mr-2" />
              <span>Verification Failed!</span>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-center text-green-600">
              <Shield className="h-5 w-5 mr-2" />
              <span>Secure Connection</span>
            </div>
          )}
        </div>

        {signalData && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share this code with {contact.name}:
            </label>
            <textarea
              readOnly
              value={signalData}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              rows={4}
            />
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter {contact.name}'s code:
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            onChange={(e) => connection?.connect(e.target.value)}
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={endCall}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}
