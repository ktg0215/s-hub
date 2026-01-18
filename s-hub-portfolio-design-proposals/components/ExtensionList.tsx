
import React from 'react';
import { Extension } from '../types';
import { EXTENSIONS } from '../constants';

const ExtensionList: React.FC = () => {
  return (
    <section className="py-24 px-6 bg-white border-t-8 border-black">
      <div className="container mx-auto">
        <div className="flex flex-col items-center mb-20">
          <h2 className="text-5xl md:text-8xl font-vivid text-black text-center mb-4">
            COLLECTION
          </h2>
          <div className="w-24 h-2 bg-pink-500 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
          {EXTENSIONS.map((ext) => (
            <ExtensionCard key={ext.id} ext={ext} />
          ))}
        </div>
      </div>
    </section>
  );
};

const ExtensionCard: React.FC<{ ext: Extension }> = ({ ext }) => {
  return (
    <div className="group relative transition-all duration-300 h-full bg-white p-10 border-4 border-black rounded-[40px] shadow-[15px_15px_0px_#000] hover:shadow-none hover:translate-x-[15px] hover:translate-y-[15px] flex flex-col">
      <div className="mb-6 text-sm uppercase tracking-widest inline-block px-4 py-1.5 bg-green-400 text-black font-bold border-2 border-black rounded-full w-fit">
        {ext.category}
      </div>

      <div className="flex justify-between items-start mb-6">
        <h3 className="text-4xl leading-none font-vivid text-black group-hover:text-pink-500 transition-colors">
          {ext.name}
        </h3>
        <span className="font-vivid text-xl text-pink-500 bg-black text-white px-3 py-1 rotate-3">
          {ext.price}
        </span>
      </div>

      <p className="mb-10 flex-grow font-bold text-gray-700 text-lg leading-relaxed">
        {ext.description}
      </p>

      <div className="flex justify-end mt-auto">
        <a 
          href={ext.storeUrl}
          className="flex items-center gap-3 font-vivid text-xl text-black bg-cyan-400 px-8 py-3 border-4 border-black shadow-[6px_6px_0px_#000] hover:bg-black hover:text-white transition-all active:scale-95"
        >
          INSTALL
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </a>
      </div>
    </div>
  );
};

export default ExtensionList;
