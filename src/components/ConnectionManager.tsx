import React, { useEffect, useState } from 'react';
import { PhoneOff, Shield, ShieldOff, Phone, X } from 'lucide-react';
import { useStore } from '../store';
import { SecureConnection } from '../utils/webrtc';
import { Contact } from '../types';

export function ConnectionManager() {
  const [connection, setConnection] = useState<SecureConnection | null>(null);
  const [signalData, setSignalData] = useState<string>('');
  const [remoteSignalData, setRemoteSignalData] = useState<string>('');
  const [incomingCall, setIncomingCall] = useState<Contact | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  
  const user = useStore((state) => state.user);
  const { contact, isActive, verificationFailed } = useStore((state) => state.callState);
  const setCallState = useStore((state) => state.setCallState);

  // Handle outgoing calls
  useEffect(() => {
    if (!isActive || !contact || !user) return;
    
    // Only create a new connection if we're initiating a call
    if (connection === null) {
      const conn = new SecureConnection(
        true, // initiator
        contact,
        user.privateKey,
        () => setCallState({ verificationFailed: true }),
        (incomingContact) => setIncomingCall(incomingContact),
        () => setCallStatus('connected')
      );
      
      conn.createOffer().then(setSignalData);
      setConnection(conn);
      setCallStatus('connecting');
    }
    
    return () => {
      if (connection) {
        connection.destroy();
        setConnection(null);
      }
    };
  }, [isActive, contact, user]);

  // Handle remote signal data
  useEffect(() => {
    if (!connection || !remoteSignalData) return;
    
    connection.receiveAnswer(remoteSignalData)
      .catch(error => {
        console.error("Error receiving answer:", error);
        setCallState({ verificationFailed: true });
      });
  }, [remoteSignalData, connection]);

  // Process incoming calls
  const handleIncomingCall = (from: Contact) => {
    setIncomingCall(from);
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall || !user) return;
    
    const conn = new SecureConnection(
      false, // not initiator
      incomingCall,
      user.privateKey,
      () => setCallState({ verificationFailed: true }),
      () => {}, // No need to handle incoming calls as we're already handling one
      () => setCallStatus('connected')
    );
    
    const success = await conn.acceptCall();
    if (success) {
      // Process the offer and generate an answer
      try {
        const answer = await conn.receiveOffer(signalData);
        setRemoteSignalData(answer);
        setConnection(conn);
        setCallState({ isActive: true, contact: incomingCall });
        setIncomingCall(null);
        setCallStatus('connecting');
      } catch (error) {
        console.error("Error accepting call:", error);
        conn.destroy();
      }
    }
  };

  const rejectIncomingCall = () => {
    setIncomingCall(null);
  };

  const endCall = () => {
    if (connection) {
      connection.destroy();
      setConnection(null);
    }
    setCallState({ isActive: false, contact: undefined, verificationFailed: false });
    setCallStatus('idle');
    setSignalData('');
    setRemoteSignalData('');
  };

  // Render incoming call popup
  if (incomingCall) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in">
          <div className="text-center mb-8">
            <h3 className="text-lg font-medium text-gray-900">
              Incoming Call
            </h3>
            <p className="mt-2 text-gray-600">
              {incomingCall.name} is calling you
            </p>
          </div>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={rejectIncomingCall}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </button>
            <button
              onClick={acceptIncomingCall}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Phone className="h-4 w-4 mr-2" />
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render active call interface
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
              <span>
                {callStatus === 'connected' ? 'Secure Connection' : 'Connecting...'}
              </span>
            </div>
          )}
        </div>

        {callStatus === 'connecting' && (
          <>
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
                value={remoteSignalData}
                onChange={(e) => setRemoteSignalData(e.target.value)}
              />
            </div>
          </>
        )}

        {callStatus === 'connected' && (
          <div className="text-center mb-6 text-gray-600">
            <p>Call in progress</p>
            <p className="text-sm mt-2">This call is end-to-end encrypted</p>
          </div>
        )}

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
