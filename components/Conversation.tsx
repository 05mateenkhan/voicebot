import React, { useEffect, useRef } from 'react';
import { Turn, Role } from '../types';
import LeafIcon from './icons/LeafIcon';
import WeatherCard from './WeatherCard';

const UserIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0012 11z" clipRule="evenodd" />
    </svg>
);

interface ConversationProps {
  conversation: Turn[];
}

const Conversation: React.FC<ConversationProps> = ({ conversation }) => {
  const endOfMessagesRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  return (
    <div className="space-y-6">
      {conversation.map((turn, index) => (
        <div key={index} className={`flex items-start gap-4 ${turn.role === Role.USER ? 'flex-row-reverse' : ''}`}>
          <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center`}>
            {turn.role === Role.MODEL ? <LeafIcon /> : <UserIcon />}
          </div>
          <>
            {turn.text && (
              <div className={`p-4 rounded-lg max-w-lg ${turn.role === Role.USER ? 'bg-green-600' : 'bg-gray-800'} ${!turn.isFinal ? 'opacity-70' : ''}`}>
                <p className="whitespace-pre-wrap">{turn.text}</p>
              </div>
            )}
            {turn.weather && <WeatherCard data={turn.weather} />}
          </>
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default Conversation;
