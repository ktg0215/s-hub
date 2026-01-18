
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 theme-transition bg-white/80 backdrop-blur-md border-b-4 border-black">
      <div className="container mx-auto flex justify-between items-center">
        <a href="#" className="text-3xl tracking-tighter font-vivid text-pink-500 stroke-black stroke-1 drop-shadow-[2px_2px_0px_#000]">
          S-HUB
        </a>
        <nav className="hidden md:flex items-center space-x-8">
          {['Home', 'Products', 'Legal'].map((item) => (
            <a 
              key={item}
              href={item === 'Home' ? '#' : `#${item.toLowerCase()}`}
              className="text-sm uppercase tracking-widest font-vivid hover:text-green-500 transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>
        <button className="md:hidden flex flex-col gap-1.5 p-2 bg-black rounded-lg">
            <div className="w-6 h-1 bg-pink-500"></div>
            <div className="w-4 h-1 bg-green-500"></div>
            <div className="w-6 h-1 bg-cyan-400"></div>
        </button>
      </div>
    </header>
  );
};

export default Header;
