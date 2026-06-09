import React from 'react';
import Navbar from './Components/Landing/Navbar';
import Hero from './Components/Landing/Hero';
import EditorMockup from './Components/Landing/EditorMockup';
import Logos from './Components/Landing/Logos';
import Workflow from './Components/Landing/Workflow';
import Features from './Components/Landing/Features';
import CallToAction from './Components/Landing/CallToAction';
import Footer from './Components/Landing/Footer';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-white/30">
      <Navbar />
      <main>
        <Hero />
        <EditorMockup />
        <Logos />
        <Workflow />
        <Features />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}

export default App;
