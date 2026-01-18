
import React from 'react';
import { ArrowRight } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section id="home" className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none opacity-50 blur-[100px]" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent leading-tight">
          Simple Extensions.<br />Real Results.
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
          Crafted by an indie developer who believes software should solve problems, not create them. Tools that respect your time and privacy.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a 
            href="#products"
            className="group px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center transition-all duration-200"
          >
            Explore Extensions
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a 
            href="#about"
            className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg font-semibold border border-zinc-800 transition-colors"
          >
            Our Mission
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
