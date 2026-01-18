
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-20 px-6 bg-black text-white border-t-8 border-green-400">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-12 mb-16">
          <div className="text-5xl font-vivid text-pink-500 drop-shadow-[4px_4px_0px_#00FFFF]">
            S-HUB
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {['Privacy', 'Terms', 'Legal'].map(link => (
              <a 
                key={link}
                href={`#${link.toLowerCase()}`}
                className="uppercase tracking-widest text-lg font-vivid hover:text-green-400 transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
        <div className="text-center pt-12 border-t border-white/20 text-sm font-bold tracking-widest opacity-60">
           &copy; {new Date().getFullYear()} S-HUB. ALL RIGHTS RESERVED. <br />
           STAY VIVID. STAY PRODUCTIVE.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
