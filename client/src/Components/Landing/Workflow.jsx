import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export default function Workflow() {
  const container = useRef(null);

  useGSAP(() => {
    gsap.from('.workflow-step', {
      scrollTrigger: {
        trigger: container.current,
        start: 'top 75%',
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: 'back.out(1.7)'
    });
  }, { scope: container });

  const steps = [
    {
      number: "01",
      title: "CONNECT",
      description: "LINK YOUR REPOSITORIES WITH SECURE OAUTH LOGINS."
    },
    {
      number: "02",
      title: "SCAN",
      description: "AUTOMATED PARSING OF FILES AND DEPENDENCIES."
    },
    {
      number: "03",
      title: "ANALYZE",
      description: "NEURAL MODELS EXTRACT LOGIC AND ARCHITECTURE."
    },
    {
      number: "04",
      title: "INSIGHTS",
      description: "DISPLAY METRICS AND ACTIONABLE FIXES."
    }
  ];

  return (
    <section ref={container} className="w-full py-32 px-6 flex flex-col items-center">
      <div className="text-center mb-20">
        <h2 className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-white mb-4 uppercase">
          UNIFIED INTELLIGENCE WORKFLOW.
        </h2>
        <p className="text-xs font-mono text-white/50 tracking-widest uppercase">
          FROM CONNECTION TO ACTIONABLE INSIGHTS IN UNDER 2 MINUTES.
        </p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4 relative">
        {/* Connecting Line - desktop only */}
        <div className="hidden md:block absolute top-12 left-0 w-full h-[1px] bg-white/10 z-0"></div>

        {steps.map((step, index) => (
          <div key={index} className="workflow-step flex flex-col items-center text-center relative z-10 group">
            <div className="w-24 h-24 mb-6 border border-white/20 bg-[#0a0a0c] flex items-center justify-center group-hover:border-white/50 transition-colors duration-300">
              <span className="font-mono text-xl text-white">{step.number}</span>
            </div>
            <h3 className="font-mono text-sm font-bold text-white mb-3 tracking-widest uppercase">
              {step.title}
            </h3>
            <p className="font-mono text-[10px] text-white/50 leading-relaxed tracking-wider max-w-[200px] uppercase">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
