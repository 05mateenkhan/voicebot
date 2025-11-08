
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="p-4 text-center border-b border-green-500/30 bg-gray-900 sticky top-0 z-10">
      <h1 className="text-2xl md:text-3xl font-bold text-green-400">
        Agribot
      </h1>
      <p className="text-sm text-gray-400">
        Your AI Agriculture Advisor
      </p>
    </header>
  );
};

export default Header;
