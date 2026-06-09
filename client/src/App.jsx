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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a1a24] via-[#0a0a0c] to-[#050505] text-white selection:bg-white/30 relative overflow-hidden">
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
