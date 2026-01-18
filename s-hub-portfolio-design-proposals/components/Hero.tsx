
import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden min-h-[80vh] flex items-center bg-[#F0F0F0]">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-50">
          <div className="absolute top-10 left-10 w-64 h-64 bg-pink-400 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-green-300 rounded-full blur-[100px]"></div>
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-yellow-300 rounded-full blur-[50px]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl">
          <h1 className="mb-8 leading-none tracking-tight text-6xl md:text-[10rem] font-vivid text-black drop-shadow-[10px_10px_0px_#00FF00]">
            <span className="text-pink-500">S-HUB</span>
            <br />
            EXTEND IT!
          </h1>
          
          <p className="mb-12 text-xl md:text-2xl font-bold text-black bg-white inline-block p-6 border-4 border-black rotate-[-1deg] shadow-[6px_6px_0px_#000]">
            Simple tools that do one thing perfectly. <br className="hidden md:block" /> Reclaim your focus and boost your workflow.
          </p>

          <div className="flex flex-wrap gap-6">
            <button className="px-10 py-5 bg-black text-white font-vivid text-2xl border-4 border-black shadow-[8px_8px_0px_#FF00FF] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px] transition-all active:scale-95">
              EXPLORE TOOLS
            </button>
            <button className="px-10 py-5 bg-white text-black font-vivid text-2xl border-4 border-black hover:bg-yellow-300 transition-all shadow-[4px_4px_0px_#000]">
              ABOUT ME
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
