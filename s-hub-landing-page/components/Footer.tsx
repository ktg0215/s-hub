
import React from 'react';
import { Github } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer id="footer" className="bg-[#0a0a0a] border-t border-[#27272a] pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-xl">S</div>
              <span className="text-2xl font-black tracking-tighter text-white">S-HUB</span>
            </div>
            <p className="text-zinc-500 max-w-sm mb-8 leading-relaxed">
              Empowering your Chrome experience with lightweight, focused tools. Built with privacy and speed in mind.
            </p>
            <div className="flex space-x-6 items-center">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors" title="GitHub">
                <Github className="w-6 h-6" />
              </a>
              <a href="https://bsky.app" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors" title="Bluesky">
                <svg viewBox="0 0 512 512" className="w-6 h-6 fill-current"><path d="M111.8 62.2C170.2 105.9 233 194.7 256 242.4c23-47.6 85.8-136.4 144.2-180.2c42.1-31.6 110.3-56 110.3 21.8c0 15.5-8.9 130.5-14.1 149.2C478.1 304.9 380 300.1 305 285.4c59.9 68.9 105.1 168.3 45.6 212.7c-52.3 39-111.4-10.4-111.4-10.4s-59.1 49.4-111.4 10.4c-59.5-44.4-14.3-143.8 45.6-212.7c-75 14.7-173.1 19.5-191.4-52.2c-5.2-18.7-14.1-133.7-14.1-149.2c0-77.7 68.2-53.4 110.3-21.8z"/></svg>
              </a>
              <a href="https://producthunt.com" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-[#da552f] transition-colors" title="Product Hunt">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12.2 24C18.8274 24 24.2 18.6274 24.2 12C24.2 5.37258 18.8274 0 12.2 0C5.57258 0 0.200012 5.37258 0.200012 12C0.200012 18.6274 5.57258 24 12.2 24ZM11.1304 6.78261H13.6087C15.8203 6.78261 17.6148 8.57713 17.6148 10.7887C17.6148 13.0003 15.8203 14.7948 13.6087 14.7948H11.1304V17.2174H8.71306V6.78261H11.1304ZM11.1304 12.4313H13.6087C14.5159 12.4313 15.2513 11.6959 15.2513 10.7887C15.2513 9.88148 14.5159 9.14609 13.6087 9.14609H11.1304V12.4313Z"/></svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-8">Products</h4>
            <ul className="space-y-4">
              <li><a href="#products" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">Wellbeing Tools</a></li>
              <li><a href="#products" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">Productivity</a></li>
              <li><a href="#products" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">E-Commerce</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-8">Legal</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">Privacy Policy</a></li>
              <li><a href="#" className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-[#27272a] flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="text-zinc-600 text-xs font-medium">
            © 2025 S-Hub. All rights reserved. Japan.
          </p>
          <div className="flex items-center space-x-6">
             <span className="text-zinc-700 text-[10px] font-bold tracking-widest uppercase">Verified Indie Dev</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
