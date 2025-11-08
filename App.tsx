
import React from 'react';
import { useAgribot } from './hooks/useAgribot';
import Header from './components/Header';
import Conversation from './components/Conversation';
import Controls from './components/Controls';
import { ConnectionState } from './types';

function App() {
  const { connectionState, conversation, error, startConversation, stopConversation } = useAgribot();

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <Conversation conversation={conversation} />
        {error && <div className="text-center text-red-400 mt-4">{error}</div>}
      </main>
      <footer className="p-4 bg-gray-900/80 backdrop-blur-sm sticky bottom-0">
        <Controls
          connectionState={connectionState}
          onStart={startConversation}
          onStop={stopConversation}
        />
        {connectionState === ConnectionState.IDLE && (
            <p className="text-center text-xs text-gray-400 mt-2">
                Click the mic to start a conversation with Agribot.
            </p>
        )}
      </footer>
    </div>
  );
}

export default App;
