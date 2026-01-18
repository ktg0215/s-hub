
import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import TrustBar from './components/TrustBar';
import ProductSection from './components/ProductSection';
import AboutSection from './components/AboutSection';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-600/30 selection:text-blue-200">
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <ProductSection />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
};

export default App;
