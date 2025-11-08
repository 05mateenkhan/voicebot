
import React from 'react';
import { ConnectionState } from '../types';
import MicIcon from './icons/MicIcon';
import StopIcon from './icons/StopIcon';

interface ControlsProps {
  connectionState: ConnectionState;
  onStart: () => void;
  onStop: () => void;
}

const Controls: React.FC<ControlsProps> = ({ connectionState, onStart, onStop }) => {
  const isConnecting = connectionState === ConnectionState.CONNECTING;
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isIdle = !isConnecting && !isConnected;

  const getButtonState = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTING:
        return { text: 'Connecting...', icon: <MicIcon />, disabled: true, action: () => {}, bg: 'bg-yellow-500' };
      case ConnectionState.CONNECTED:
        return { text: 'Stop', icon: <StopIcon />, disabled: false, action: onStop, bg: 'bg-red-600 hover:bg-red-700' };
      default: // IDLE, DISCONNECTED, ERROR
        return { text: 'Start', icon: <MicIcon />, disabled: false, action: onStart, bg: 'bg-green-600 hover:bg-green-700' };
    }
  };

  const { text, icon, disabled, action, bg } = getButtonState();

  return (
    <div className="flex flex-col items-center justify-center">
      <button
        onClick={action}
        disabled={disabled}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out text-white shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 ${bg} ${disabled ? 'cursor-not-allowed opacity-70' : ''} ${isConnected ? 'focus:ring-red-400' : 'focus:ring-green-400'}`}
      >
        {isConnecting && <span className="absolute h-full w-full rounded-full bg-yellow-400 animate-ping opacity-75"></span>}
        {isConnected && <span className="absolute h-full w-full rounded-full bg-red-500 animate-ping opacity-50"></span>}
        <span className="relative z-10">{icon}</span>
      </button>
      <span className="mt-2 text-sm text-gray-300 font-medium">
          {connectionState === ConnectionState.CONNECTED ? 'Listening...' : text}
      </span>
    </div>
  );
};

export default Controls;
