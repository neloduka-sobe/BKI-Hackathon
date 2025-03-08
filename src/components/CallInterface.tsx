import React, { useEffect, useState, useRef } from 'react';
import { PhoneOff, Shield, ShieldAlert, Phone, X } from 'lucide-react';
import { useStore } from '../store';
import { SecureConnection } from '../utils/webrtc';
import { Contact } from '../types';
import { sendSignal, startListening, stopListening } from '../utils/signaling';

export function CallInterface() {
  const [connection, setConnection] = useState<SecureConnection | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'connecting' | 'connected' | 'failed'>('idle');
  const [incomingCall, setIncomingCall] = useState<{ contact: Contact; signalData: string } | null>(null);
  const [securityStatus, setSecurityStatus] = useState<'unknown' | 'secure' | 'compromised'>('unknown');
  const [showRejectionNotice, setShowRejectionNotice] = useState<boolean>(false);
  const previousCallersRef = useRef<Map<string, string>>(new Map()); // Store contactId -> publicKey pairs

  const user = useStore((state) => state.user);
  const { contact, isActive, verificationFailed } = useStore((state) => state.callState);
  const contacts = useStore((state) => state.contacts);
  const setCallState = useStore((state) => state.setCallState);

  // Determine security status based on contacts list and previous interactions
  const getSecurityStatus = (contactToCheck: Contact, signalData?: string) => {
    // Check if contact is in contacts list
    const isKnownContact = contacts.some(c => c.id === contactToCheck.id);
    
    if (!isKnownContact) {
      return 'compromised'; // Not in contacts = security risk
    }
    
    // Check if we've seen this contact before with a different public key
    const previousKey = previousCallersRef.current.get(contactToCheck.id);
    if (previousKey && contactToCheck.publicKey && previousKey !== contactToCheck.publicKey) {
      console.warn('Key mismatch detected for contact:', contactToCheck.id);
      return 'compromised'; // Key mismatch indicates potential identity spoofing
    }
    
    return 'secure'; // All other contacts in the contact list are secure
  };

  // Set up signaling listener
  useEffect(() => {
    if (!user) return;

    // Start listening for incoming signals
    startListening(user.id, (message) => {
      console.log('Received signal:', message);

      if (message.type === 'offer') {
        // Find the contact who sent this offer
        const callingContact = contacts.find((c) => c.id === message.from);
        
        // Allow calls from contacts not in our list to demonstrate security features
        let contactToUse = callingContact || {
          id: message.from,
          name: `Unknown (${message.from.slice(0, 5)}...)`,
          publicKey: message.publicKey || null // Extract public key from signal if available
        };

        console.log(`Incoming call from ${contactToUse.name}`);
        
        // Check security status for this caller
        const initialSecurityStatus = getSecurityStatus(contactToUse, message.data);
        
        setIncomingCall({
          contact: contactToUse,
          signalData: message.data,
        });
        setSecurityStatus(initialSecurityStatus);
        setCallStatus('ringing');
      } else if (message.type === 'answer' && connection && contact && contact.id === message.from) {
        // Handle incoming answer
        console.log('Received answer, processing...');
        try {
          connection.receiveAnswer(message.data).catch((error) => {
            console.error('Error receiving answer:', error);
            setCallState({ verificationFailed: true });
            setCallStatus('failed');
          });
        } catch (error) {
          console.error('Error processing answer:', error);
        }
      } else if (message.type === 'disconnect' && isActive) {
        // Remote party ended the call
        console.log('Remote party ended the call');
        endCall();
      } else if (message.type === 'reject') {
        // Call was rejected by the other party
        console.log('Call was rejected');
        
        // If the rejection included a security warning, show it
        if (message.data && message.data.includes('identity')) {
          console.log('Identity verification failed');
          setShowRejectionNotice(true);
          
          // Automatically end call after 3 seconds
          setTimeout(() => {
            endCall();
            setShowRejectionNotice(false);
          }, 3000);
        } else {
          // Regular rejection, just end the call
          endCall();
        }
      }
    });

    return () => {
      if (user) {
        stopListening(user.id);
      }
    };
  }, [user, contacts, connection, contact, callStatus, incomingCall, isActive]);

  // Handle outgoing calls
  useEffect(() => {
    if (!isActive || !contact || !user) return;

    // Only create a new connection if we're initiating a call and there's no connection yet
    if (connection === null) {
      console.log(`Initiating call to ${contact.name}`);
      const conn = new SecureConnection(
        true, // initiator
        contact,
        user.privateKey,
        () => {
          console.error('Verification failed');
          setCallState({ verificationFailed: true });
          setSecurityStatus('compromised');
        },
        () => {}, // No longer needed as we handle incoming calls via signaling
        () => {
          console.log('Connection established');
          setCallStatus('connected');
          
          // Store the contact's public key for future reference
          if (contact.publicKey) {
            previousCallersRef.current.set(contact.id, contact.publicKey);
          }
          
          // Set security status based on verification
          setSecurityStatus(getSecurityStatus(contact));
        }
      );

      try {
        conn
          .createOffer()
          .then((offerData) => {
            // Send the offer via our signaling service
            console.log('Sending offer...');
            sendSignal(user.id, contact.id, 'offer', offerData);
            setCallStatus('ringing'); // Set status to ringing when initiating a call
          })
          .catch((err) => {
            console.error('Failed to create offer:', err);
            setCallStatus('failed');
          });
      } catch (error) {
        console.error('Error creating offer:', error);
        setCallStatus('failed');
      }

      setConnection(conn);
    }

    return () => {
      if (connection) {
        try {
          if (typeof connection.close === 'function') {
            connection.close();
          }
        } catch (e) {
          console.error("Error closing connection:", e);
        }
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
        console.error('Verification failed');
        setCallState({ verificationFailed: true });
        setSecurityStatus('compromised');
      },
      () => {}, // No longer needed as we handle incoming calls via signaling
      () => {
        console.log('Connection established');
        setCallStatus('connected');
        
        // Store the contact's public key for future reference
        if (incomingCall.contact.publicKey) {
          previousCallersRef.current.set(incomingCall.contact.id, incomingCall.contact.publicKey);
        }
        
        // Set final security status based on verification
        setSecurityStatus(getSecurityStatus(incomingCall.contact));
      }
    );

    try {
      // Process the offer and generate an answer
      const answer = await conn.receiveOffer(incomingCall.signalData);

      // Send the answer via our signaling service
      console.log('Sending answer...');
      sendSignal(user.id, incomingCall.contact.id, 'answer', answer);

      setConnection(conn);
      setCallState({ isActive: true, contact: incomingCall.contact });
      setIncomingCall(null);
      setCallStatus('connecting');

      // Simulate connection establishment after a short delay
      setTimeout(() => {
        if (callStatus === 'connecting') {
          setCallStatus('connected');
        }
      }, 1500);
    } catch (error) {
      console.error('Error accepting call:', error);
      // Safely clean up connection
      try {
        if (typeof conn.close === 'function') {
          conn.close();
        }
      } catch (e) {
        console.error("Error cleaning up connection:", e);
      }
      setCallStatus('failed');
    }
  };

  const rejectIncomingCall = () => {
    console.log('Call rejected');
    
    // Send reject signal if there's a contact
    if (incomingCall && incomingCall.contact && user) {
      try {
        // Send identity warning message if the caller's identity verification failed
        const rejectMessage = securityStatus === 'compromised' ? 
          'Potential identity spoofing detected!' : '';
        sendSignal(user.id, incomingCall.contact.id, 'reject', rejectMessage);
      } catch (e) {
        console.error("Error sending reject signal:", e);
      }
    }
    
    setIncomingCall(null);
    setCallStatus('idle');
    setSecurityStatus('unknown');
  };

  const endCall = () => {
    console.log('Ending call');
    
    // Send disconnect signal to other party
    if (contact && user) {
      try {
        console.log(`Sending disconnect signal to ${contact.id}`);
        sendSignal(user.id, contact.id, 'disconnect', '');
      } catch (e) {
        console.error("Error sending disconnect signal:", e);
      }
    }
    
    // Clean up the connection
    if (connection) {
      try {
        // Try different possible cleanup methods
        if (typeof connection.close === 'function') {
          connection.close();
        } else if (typeof connection.disconnect === 'function') {
          connection.disconnect();
        } else {
          console.log("No connection cleanup method found, releasing reference");
        }
      } catch (err) {
        console.error("Error cleaning up connection:", err);
      }
      
      setConnection(null);
    }
    
    // Reset all states
    setCallStatus('idle');
    setSecurityStatus('unknown');
    setShowRejectionNotice(false);
    
    // Important: This line needs to be last as it might trigger re-renders
    setCallState({ 
      isActive: false, 
      contact: null, 
      verificationFailed: false 
    });
  };

  // Simulate proper connection establishment timing
  useEffect(() => {
    if (isActive && contact && callStatus === 'connecting') {
      // Simulate connection establishment after a short delay
      const timer = setTimeout(() => {
        setCallStatus('connected');
        setSecurityStatus(getSecurityStatus(contact));
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isActive, contact, callStatus]);

  // Render rejection notice for caller
  if (showRejectionNotice) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium text-red-700">Connection Rejected</h3>
            <p className="mt-2 text-red-600">Potential identity spoofing was detected and blocked!</p>
            <p className="mt-2 text-gray-600 text-sm">This connection will automatically close.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render incoming call popup
  if (incomingCall && callStatus === 'ringing') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="text-center mb-8">
            <h3 className="text-lg font-medium text-gray-900">Incoming Call</h3>
            <p className="mt-2 text-gray-600">{incomingCall.contact.name} is calling you</p>
            
            {securityStatus === 'compromised' ? (
              <div className="mt-2 flex items-center justify-center text-red-600">
                <ShieldAlert className="h-5 w-5 mr-2" />
                <span>Warning: Possible Identity Spoofing!</span>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-center text-yellow-600">
                <Shield className="h-5 w-5 mr-2" />
                <span>Connection not verified yet</span>
              </div>
            )}
            
            {securityStatus === 'compromised' && previousCallersRef.current.has(incomingCall.contact.id) && (
              <div className="mt-2 text-red-600 text-sm">
                This caller's identity doesn't match previous calls
              </div>
            )}
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={rejectIncomingCall}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <X className="h-4 w-4 mr-2" />
              {securityStatus === 'compromised' ? 'Block Spoofing Attempt' : 'Reject'}
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
  if (isActive && contact) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center mb-8">
            <h3 className="text-lg font-medium text-gray-900">Call with {contact.name}</h3>

            {callStatus === 'connected' ? (
              securityStatus === 'compromised' ? (
                <div className="mt-2 flex items-center justify-center text-red-600">
                  <ShieldAlert className="h-5 w-5 mr-2" />
                  <span>Security Verification Failed!</span>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-center text-green-600">
                  <Shield className="h-5 w-5 mr-2" />
                  <span>Secure Connection Established</span>
                </div>
              )
            ) : (
              <div className="mt-2 flex items-center justify-center text-yellow-600">
                <Shield className="h-5 w-5 mr-2" />
                <span>Establishing connection...</span>
              </div>
            )}
            
            {callStatus === 'connected' && securityStatus === 'compromised' && previousCallersRef.current.has(contact.id) && (
              <div className="mt-2 text-red-600 text-sm">
                This caller's identity has changed since your last call
              </div>
            )}
          </div>

          {callStatus === 'ringing' && (
            <div className="text-center mb-6 text-gray-600">
              <p>Ringing...</p>
              <p className="text-sm mt-2">Waiting for the other user to answer</p>
            </div>
          )}

          {callStatus === 'connecting' && (
            <div className="text-center mb-6 text-gray-600">
              <p>Connecting...</p>
              <p className="text-sm mt-2">Establishing secure connection</p>
            </div>
          )}

          {callStatus === 'connected' && (
            <div className="text-center mb-6 text-gray-600">
              <p>Call in progress</p>
              <p className="text-sm mt-2">
                {securityStatus === 'secure' 
                  ? "This call is end-to-end encrypted" 
                  : "Warning: This connection may not be secure"}
              </p>
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
              aria-label="End call"
              type="button"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              End Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null; // Return null if no call is active and no incoming call
}
