
import React, { useState, useEffect } from 'react';
import { Github, MessageSquare, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'Products', href: '#products' },
    { name: 'About', href: '#about' },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#27272a] py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">S</div>
          <span className="text-xl font-bold tracking-tighter text-white">S-HUB</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <a 
              key={item.name} 
              href={item.href}
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              {item.name}
            </a>
          ))}
        </nav>

        {/* Social Icons & Mobile Toggle */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-3">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white" title="GitHub">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://bsky.app" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white" title="Bluesky">
              <svg viewBox="0 0 512 512" className="w-5 h-5 fill-current"><path d="M111.8 62.2C170.2 105.9 233 194.7 256 242.4c23-47.6 85.8-136.4 144.2-180.2c42.1-31.6 110.3-56 110.3 21.8c0 15.5-8.9 130.5-14.1 149.2C478.1 304.9 380 300.1 305 285.4c59.9 68.9 105.1 168.3 45.6 212.7c-52.3 39-111.4-10.4-111.4-10.4s-59.1 49.4-111.4 10.4c-59.5-44.4-14.3-143.8 45.6-212.7c-75 14.7-173.1 19.5-191.4-52.2c-5.2-18.7-14.1-133.7-14.1-149.2c0-77.7 68.2-53.4 110.3-21.8z"/></svg>
            </a>
          </div>
          <button 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#111111] border-b border-[#27272a] p-6 flex flex-col space-y-4">
          {navItems.map((item) => (
            <a 
              key={item.name} 
              href={item.href}
              className="text-lg font-medium text-zinc-400"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.name}
            </a>
          ))}
          <div className="flex space-x-4 pt-4 border-t border-[#27272a]">
            <a href="https://github.com" className="text-zinc-400"><Github /></a>
            <a href="https://bsky.app" className="text-zinc-400">
               <svg viewBox="0 0 512 512" className="w-5 h-5 fill-current"><path d="M111.8 62.2C170.2 105.9 233 194.7 256 242.4c23-47.6 85.8-136.4 144.2-180.2c42.1-31.6 110.3-56 110.3 21.8c0 15.5-8.9 130.5-14.1 149.2C478.1 304.9 380 300.1 305 285.4c59.9 68.9 105.1 168.3 45.6 212.7c-52.3 39-111.4-10.4-111.4-10.4s-59.1 49.4-111.4 10.4c-59.5-44.4-14.3-143.8 45.6-212.7c-75 14.7-173.1 19.5-191.4-52.2c-5.2-18.7-14.1-133.7-14.1-149.2c0-77.7 68.2-53.4 110.3-21.8z"/></svg>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
