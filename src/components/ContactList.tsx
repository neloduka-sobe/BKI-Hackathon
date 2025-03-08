import React from 'react';
import { Phone } from 'lucide-react';
import { useStore } from '../store';

export function ContactList() {
  const contacts = useStore((state) => state.contacts);
  const setCallState = useStore((state) => state.setCallState);

  const initiateCall = (contact: Contact) => {
    setCallState({ isActive: true, contact });
  };

  return (
    <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Contacts</h2>
      
      {contacts.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No contacts yet. Add contacts to start calling!
        </p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {contacts.map((contact) => (
            <li key={contact.id} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{contact.name}</h3>
                </div>
                <button
                  onClick={() => initiateCall(contact)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}