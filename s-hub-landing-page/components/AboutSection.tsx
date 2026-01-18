
import React from 'react';
import { Globe } from 'lucide-react';

const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-24 px-6 bg-[#111111]/30 scroll-mt-24">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Built by an Indie Developer</h2>
          <div className="space-y-6 text-zinc-400 text-lg leading-relaxed">
            <p>
              I'm an independent developer based in Japan, dedicated to building digital tools that improve life without adding noise.
            </p>
            <p>
              In an era of bloatware and data harvesting, S-Hub stands for <strong>privacy first</strong> and <strong>utility always</strong>. No complex accounts, no hidden tracking—just solutions that work from the moment you click "Add to Chrome".
            </p>
            <p>
              Every extension is maintained with care and updated based on real user feedback. My goal is to make the web a more intentional place, one tool at a time.
            </p>
          </div>
          
          <div className="mt-10 flex items-center justify-center md:justify-start">
            <div className="flex items-center space-x-3 text-zinc-300 bg-zinc-800/40 px-5 py-2.5 rounded-full border border-zinc-700/50">
              <Globe className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium">Japan</span>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/3 flex justify-center">
          <div className="relative">
             <div className="w-52 h-52 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 p-1 shadow-2xl shadow-blue-500/20">
                <div className="w-full h-full rounded-[22px] bg-[#0a0a0a] flex items-center justify-center overflow-hidden border border-white/5">
                   <span className="text-6xl font-bold opacity-10 select-none">S-HUB</span>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                      <div className="text-4xl font-black text-white">S-H</div>
                   </div>
                </div>
             </div>
             {/* Decorative small boxes */}
             <div className="absolute -top-4 -right-4 w-12 h-12 rounded-lg bg-[#1a1a1a] border border-zinc-800 shadow-xl flex items-center justify-center">
               <div className="w-6 h-1 bg-blue-500 rounded-full"></div>
             </div>
             <div className="absolute -bottom-4 -left-4 w-12 h-12 rounded-lg bg-[#1a1a1a] border border-zinc-800 shadow-xl flex items-center justify-center">
               <div className="w-4 h-4 rounded-full border-2 border-green-500"></div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
