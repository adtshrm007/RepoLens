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
      title: "AI STATIC ANALYSIS",
      description: "GET LINE-BY-LINE FEEDBACK ON MAINTAINABILITY, STRUCTURE, AND BEST PRACTICES DIRECTLY FROM AN EXPERT AI."
    },
    {
      icon: "🛡️",
      title: "SECURITY AUDITING",
      description: "AUTOMATICALLY DETECT VULNERABILITIES, UNSAFE OPERATIONS, AND BAD SECURITY PRACTICES IN YOUR SOURCE CODE."
    },
    {
      icon: "📄",
      title: "AUTO-DOCUMENTATION",
      description: "REPOLENS BUILDS A KNOWLEDGE BASE OF YOUR FILE PURPOSES TO GENERATE COMPREHENSIVE REPO DOCUMENTATION."
    },
    {
      icon: "🔍",
      title: "MANUAL CODE EXPLORER",
      description: "DON'T WANT TO CONNECT GITHUB? PASTE YOUR CODE DIRECTLY INTO THE EXPLORER FOR INSTANT LINE-BY-LINE ANALYSIS."
    },
    {
      icon: "📈",
      title: "HEALTH SCORING",
      description: "GET AN INSTANT 0-100 HEALTH AND MAINTAINABILITY SCORE FOR ANY SELECTION OF FILES TO TRACK TECHNICAL DEBT."
    },
    {
      icon: "🏗️",
      title: "ARCHITECTURE INSIGHTS",
      description: "DISCOVER TIGHT COUPLING, SEPARATION OF CONCERNS VIOLATIONS, AND RECEIVE CONCRETE RESTRUCTURING ADVICE."
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
