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
      icon: "🤖",
      title: "AI CODE REVIEW",
      description: "CONTEXT-AWARE PR ANALYSIS THAT UNDERSTANDS ARCHITECTURE, INTENT, AND CROSS-FILE DEPENDENCIES."
    },
    {
      icon: "🛡️",
      title: "SECURITY INTELLIGENCE",
      description: "SECURE STATIC ANALYSIS, ZERO-DAY VULNERABILITY SCANNING, AND SECRET LEAK PREVENTION."
    },
    {
      icon: "📊",
      title: "REPOSITORY ANALYSIS",
      description: "FULL CONTEXT CODEBASE MAPPING. UNDERSTAND HOW DATA FLOWS BETWEEN YOUR MICROSERVICES."
    },
    {
      icon: "📄",
      title: "DOC GENERATOR",
      description: "AUTOMATED SYNCHRONIZATION BETWEEN YOUR SOURCE CODE AND DOCUMENTATION. ALWAYS UP TO DATE."
    },
    {
      icon: "🕸️",
      title: "ARCHITECTURE VISUALIZATION",
      description: "AUTO-GENERATED DEPENDENCY GRAPHS THAT REVEAL BOTTLENECKS AND CIRCULAR DEPENDENCIES INSTANTLY."
    },
    {
      icon: "📈",
      title: "HEALTH ANALYTICS",
      description: "CODE QUALITY ENGINEERING METRICS. TRACK DORA METRICS AND TECHNICAL DEBT OVER TIME."
    }
  ];

  return (
    <section ref={container} className="w-full max-w-7xl mx-auto px-6 py-24">
      <div className="mb-16 border-l-2 border-white pl-6">
        <h2 className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-white mb-4 uppercase">
          ENGINEERED FOR IMPACT.
        </h2>
        <p className="text-xs font-mono text-white/50 tracking-widest uppercase">
          PROFESSIONAL GRADE TOOLS FOR REPOSITORY MASTERY.
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
