
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ExtensionList from './components/ExtensionList';
import Footer from './components/Footer';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('home');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      setCurrentPage(hash);
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="min-h-screen theme-transition overflow-x-hidden bg-[#F0F0F0] text-black selection:bg-pink-500 selection:text-white">
      <Header />

      <main>
        {currentPage === 'home' && (
          <>
            <Hero />
            <ExtensionList />
          </>
        )}

        {currentPage !== 'home' && (
          <div className="container mx-auto px-6 py-32 max-w-4xl min-h-[60vh]">
             <h1 className="text-6xl md:text-8xl mb-12 font-vivid text-black drop-shadow-[4px_4px_0px_#00FF00]">
                {currentPage.toUpperCase().replace('-', ' ')}
             </h1>
             <div className="prose prose-lg max-w-none font-bold text-gray-800 leading-relaxed bg-white p-8 border-4 border-black rounded-[20px] shadow-[8px_8px_0px_#000]">
                <p className="mb-6">This is a legal document page template for {currentPage}. In a real production environment, this would contain the specific details for S-Hub's {currentPage}.</p>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
             </div>
             <a href="#" className="mt-12 inline-block font-vivid text-pink-500 text-xl hover:scale-110 transition-transform">← Back to Home</a>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;
