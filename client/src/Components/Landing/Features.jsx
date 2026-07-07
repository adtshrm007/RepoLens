import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export default function Features() {
  const container = useRef(null);

  useGSAP(() => {
    gsap.from('.feature-card', {
      scrollTrigger: {
        trigger: container.current,
        start: 'top 80%',
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out'
    });
  }, { scope: container });

  const features = [
    {
      icon: "🕸️",
      title: "INTERACTIVE DEPENDENCY GRAPHS",
      description: "VISUALLY MAP HOW YOUR FILES AND MODULES CONNECT. SEARCH, FILTER, AND EXPORT ARCHITECTURE DIAGRAMS INSTANTLY."
    },
    {
      icon: "🤖",
      title: "AI REPOSITORY ASSISTANT",
      description: "CHAT DIRECTLY WITH AN AI THAT HAS FULL CONTEXT OF YOUR LATEST SCAN TO EXPLAIN ARCHITECTURE OR DEBUG SECURITY FINDINGS."
    },
    {
      icon: "📈",
      title: "EXPLAINABLE HEALTH SCORING",
      description: "TRANSPARENT 0-100 SCORES FOR MAINTAINABILITY, SECURITY, AND ARCHITECTURE SO YOU KNOW EXACTLY WHERE TO IMPROVE."
    },
    {
      icon: "⚖️",
      title: "SIDE-BY-SIDE COMPARISONS",
      description: "COMPARE TWO HISTORICAL SCANS TO TRACK METRIC REGRESSIONS, VULNERABILITY RESOLUTIONS, AND ARCHITECTURE DRIFT."
    },
    {
      icon: "🛡️",
      title: "SECURITY POSTURE PANEL",
      description: "GROUPED VULNERABILITY ANALYSIS FEATURING SEVERITY CHARTS TO QUICKLY IDENTIFY CRITICAL RISKS IN YOUR CODEBASE."
    },
    {
      icon: "🔍",
      title: "UNIVERSAL COMMAND PALETTE",
      description: "PRESS ⌘K TO INSTANTLY SEARCH ACROSS REPOSITORIES, HISTORICAL SCANS, SECURITY FINDINGS, AND INDIVIDUAL FILES."
    }
  ];

  return (
    <section ref={container} className="w-full max-w-7xl mx-auto px-6 py-24">
      <div className="mb-16 border-l-2 border-white pl-6">
        <h2 className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-white mb-4 uppercase">
          KNOW YOUR CODE INSIDE OUT.
        </h2>
        <p className="text-xs font-mono text-white/50 tracking-widest uppercase">
          EVERYTHING YOU NEED TO AUDIT, IMPROVE, AND DOCUMENT YOUR REPOSITORIES.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-white/10">
        {features.map((feature, index) => (
          <div 
            key={index} 
            className="feature-card p-10 border border-white/10 hover:bg-white/[0.02] transition-colors duration-300 group"
          >
            <div className="w-10 h-10 border border-white/20 mb-8 flex items-center justify-center text-white/70 group-hover:text-white transition-colors">
              {feature.icon}
            </div>
            <h3 className="font-mono text-sm font-bold text-white mb-4 tracking-widest uppercase">
              {feature.title}
            </h3>
            <p className="font-mono text-[10px] text-white/50 leading-relaxed tracking-wider uppercase">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
