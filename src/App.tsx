import React from 'react';
import { KeySetup } from './components/KeySetup';
import { CallInterface } from './components/CallInterface';
import { ContactList } from './components/ContactList';
import { AddContact } from './components/AddContact';
import { ProfileDisplay } from './components/ProfileDisplay';
import { useStore } from './store';

function App() {
  const user = useStore((state) => state.user);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Secure P2P Audio
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {!user ? (
          <KeySetup />
        ) : (
          <div className="space-y-6">
            <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
              <div className="text-center">
                <p className="text-xl font-medium text-gray-900">
                  Welcome, {user.name || 'Anonymous'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Your secure identity has been created
                </p>
              </div>
            </div>

            <ProfileDisplay />

            <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Add Contacts
              </h2>
              <AddContact />
            </div>

            <ContactList />
            <CallInterface />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
