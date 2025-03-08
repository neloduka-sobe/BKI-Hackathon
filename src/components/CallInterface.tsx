import React, { useEffect, useState } from 'react';
import { PhoneOff, Shield, ShieldOff, Phone, X } from 'lucide-react';
import { useStore } from '../store';
import { SecureConnection } from '../utils/webrtc';
import { Contact } from '../types';
import { sendSignal, startListening, stopListening } from '../utils/signaling';

export function CallInterface() {
  const [connection, setConnection] = useState<SecureConnection | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [incomingCall, setIncomingCall] = useState<{contact: Contact, signalData: string} | null>(null);
  
  const user = useStore((state) => state.user);
  const { contact, isActive, verificationFailed } = useStore((state) => state.callState);
  const contacts = useStore((state) => state.contacts);
  const setCallState = useStore((state) => state.setCallState);

  // Set up signaling listener
  useEffect(() => {
    if (!user) return;
    
    // Start listening for incoming signals
    startListening(user.id, (message) => {
      console.log("Received signal:", message);
      
      if (message.type === 'offer') {
        // Find the contact who sent this offer
        const callingContact = contacts.find(c => c.id === message.from);
        
        if (callingContact) {
          console.log(`Incoming call from ${callingContact.name}`);
          setIncomingCall({
            contact: callingContact,
            signalData: message.data
          });
        } else {
          console.warn("Received call from unknown contact ID:", message.from);
        }
      } else if (message.type === 'answer' && connection && contact && contact.id === message.from) {
        // Handle incoming answer
        console.log("Received answer, processing...");
        connection.receiveAnswer(message.data)
          .catch(error => {
            console.error("Error receiving answer:", error);
            setCallState({ verificationFailed: true });
            setCallStatus('failed');
          });
      }
    });
    
    return () => {
      if (user) {
        stopListening(user.id);
      }
    };
  }, [user, contacts, connection, contact]);

  // Handle outgoing calls
  useEffect(() => {
    if (!isActive || !contact || !user) return;
    
    // Only create a new connection if we're initiating a call
    if (connection === null) {
      console.log(`Initiating call to ${contact.name}`);
      const conn = new SecureConnection(
        true, // initiator
        contact,
        user.privateKey,
        () => {
          console.error("Verification failed");
          setCallState({ verificationFailed: true });
        },
        () => {}, // No longer needed as we handle incoming calls via signaling
        () => {
          console.log("Connection established");
          setCallStatus('connected');
        }
      );
      
      conn.createOffer()
        .then(offerData => {
          // Send the offer via our signaling service
          console.log("Sending offer...");
          sendSignal(user.id, contact.id, 'offer', offerData);
          setCallStatus('connecting');
        })
        .catch(err => {
          console.error('Failed to create offer:', err);
          setCallStatus('failed');
        });
      
      setConnection(conn);
    }
    
    return () => {
      if (connection) {
        connection.destroy();
        setConnection(null);
      }
    };
  }, [isActive, contact, user]);

  const acceptIncomingCall = async () => {
    if (!incomingCall || !user) return;
    
    console.log(`Accepting call from ${incomingCall.contact.name}`);
    
    const conn = new SecureConnection(
      false, // not initiator
      incomingCall.contact,
      user.privateKey,
      () => {
        console.error("Verification failed");
        setCallState({ verificationFailed: true });
      },
      () => {}, // No longer needed as we handle incoming calls via signaling
      () => {
        console.log("Connection established");
        setCallStatus('connected');
      }
    );
    
    try {
      // Process the offer and generate an answer
      const answer = await conn.receiveOffer(incomingCall.signalData);
      
      // Send the answer via our signaling service
      console.log("Sending answer...");
      sendSignal(user.id, incomingCall.contact.id, 'answer', answer);
      
      setConnection(conn);
      setCallState({ isActive: true, contact: incomingCall.contact });
      setIncomingCall(null);
      setCallStatus('connecting');
    } catch (error) {
      console.error("Error accepting call:", error);
      conn.destroy();
      setCallStatus('failed');
    }
  };

  const rejectIncomingCall = () => {
    console.log("Call rejected");
    setIncomingCall(null);
  };

  const endCall = () => {
    console.log("Ending call");
    if (connection) {
      connection.destroy();
      setConnection(null);
    }
    setCallState({ isActive: false, contact: undefined, verificationFailed: false });
    setCallStatus('idle');
  };

  // Render incoming call popup
  if (incomingCall) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="text-center mb-8">
            <h3 className="text-lg font-medium text-gray-900">
              Incoming Call
            </h3>
            <p className="mt-2 text-gray-600">
              {incomingCall.contact.name} is calling you
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
                {callStatus === 'connected' ? 'Secure Connection' : callStatus === 'failed' ? 'Connection Failed' : 'Connecting...'}
              </span>
            </div>
          )}
        </div>

        {callStatus === 'connecting' && (
          <div className="text-center mb-6 text-gray-600">
            <p>Establishing connection...</p>
            <p className="text-sm mt-2">Please wait while we connect you securely</p>
          </div>
        )}

        {callStatus === 'connected' && (
          <div className="text-center mb-6 text-gray-600">
            <p>Call in progress</p>
            <p className="text-sm mt-2">This call is end-to-end encrypted</p>
          </div>
        )}

        {callStatus === 'failed' && (
          <div className="text-center mb-6 text-red-600">
            <p>Call connection failed</p>
            <p className="text-sm mt-2">Please try again later</p>
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
