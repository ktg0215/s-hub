
import React from 'react';
import { TRUST_STATS } from '../constants';

const TrustBar: React.FC = () => {
  return (
    <div className="bg-[#111111]/50 border-y border-[#27272a] py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {TRUST_STATS.map((stat, idx) => (
            <div key={idx} className="flex items-center space-x-3 text-zinc-400 hover:text-zinc-200 transition-colors">
              {stat.icon}
              <span className="text-sm font-medium whitespace-nowrap">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustBar;
