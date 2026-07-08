import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

function StatBlock({ label, value, sub, icon, accent = "rgba(255,255,255,0.8)" }) {
  return (
    <div className="p-4 relative overflow-hidden group"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: "800", color: accent, lineHeight: 1, marginBottom: "4px" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {sub}
        </div>
      )}
      <div className="absolute right-3 bottom-3 opacity-[0.04] text-white text-4xl select-none pointer-events-none">
        {icon}
      </div>
    </div>
  );
}

export default function EditorMockup() {
  const container = useRef(null);

  useGSAP(() => {
    gsap.from('.editor-window', {
      scrollTrigger: {
        trigger: container.current,
        start: 'top 85%',
      },
      y: 100,
      opacity: 0,
      scale: 0.95,
      duration: 1.2,
      ease: 'power3.out'
    });

    gsap.from('.mockup-element', {
      scrollTrigger: {
        trigger: container.current,
        start: 'top 75%',
      },
      y: 20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power2.out',
      delay: 0.3
    });
  }, { scope: container });

  return (
    <section ref={container} className="w-full px-6 flex justify-center mb-32 perspective-[1200px]">
      <div className="editor-window w-full max-w-5xl border border-white/10 rounded-xl overflow-hidden bg-[#050508] shadow-[0_0_80px_rgba(255,255,255,0.03)] backdrop-blur-xl">
        
        {/* Window Header */}
        <div className="h-12 border-b border-white/5 flex items-center justify-between px-5 bg-gradient-to-r from-white/[0.03] to-transparent">
          <div className="flex gap-2.5">
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/30 tracking-[0.2em]">REPOLENS_V2_INTELLIGENCE</span>
          </div>
          <div className="w-16"></div> {/* Spacer */}
        </div>

        {/* Dashboard Body */}
        <div className="p-6 md:p-8 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/[0.02] via-transparent to-transparent flex flex-col gap-4">
          
          {/* Header */}
          <div className="mockup-element" style={{ padding: "14px 18px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>
                  REPOLENS V2 // INTELLIGENCE DASHBOARD
                </div>
                <h1 style={{ fontFamily: "monospace", fontSize: "15px", fontWeight: "800", color: "#fff", letterSpacing: "0.03em", margin: 0 }}>
                  Your Repository Intelligence
                </h1>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: "bold", color: "#000", background: "#fff", border: "1px solid #fff", padding: "8px 16px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  + Manual Analysis
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mockup-element flex flex-col gap-[1px] bg-white/[0.04] overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px]">
              <StatBlock label="Repositories" value="24" sub="connected" icon="📁" />
              <StatBlock label="Total Scans" value="142" sub="138 completed" icon="⚡" />
              <StatBlock label="Files Analyzed" value="12,450" sub="across all scans" icon="📄" />
              <StatBlock label="Functions Found" value="38,204" sub="4,102 components" icon="ƒ" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px]">
              <StatBlock label="Avg. Health" value="84" sub="Good shape" accent="#fff" icon="♥" />
              <StatBlock label="Security Issues" value="12" sub="2 critical, 5 high" accent="#fff" icon="🔒" />
              <StatBlock label="Largest Repo" value="frontend-core" sub="4,200 files" icon="🏗" />
              <StatBlock label="Most Complex" value="legacy-api" sub="health 45" accent="#fff" icon="⚙" />
            </div>
          </div>

          {/* Main Grid */}
          <div className="mockup-element grid grid-cols-1 md:grid-cols-[1fr_320px] gap-3">
            
            {/* Table */}
            <div style={{ padding: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <h2 style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.18em", margin: 0 }}>
                  Recently Scanned
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table style={{ width: "100%", minWidth: "400px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>REPOSITORY</th>
                      <th style={{ textAlign: "left", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>FILES</th>
                      <th style={{ textAlign: "right", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>HEALTH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { n: "payment-gateway", f: "142", h: 92, c: "#fff" },
                      { n: "frontend-core", f: "4,200", h: 78, c: "#ccc" },
                      { n: "legacy-api", f: "850", h: 45, c: "#888" },
                    ].map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: "12px 0", borderBottom: i !== 2 ? "1px solid rgba(255,255,255,0.02)" : "none" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "10px" }}>&lt;/&gt;</span>
                            <span style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.8)", fontWeight: "bold" }}>{r.n}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 0", borderBottom: i !== 2 ? "1px solid rgba(255,255,255,0.02)" : "none", fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>{r.f}</td>
                        <td style={{ padding: "12px 0", borderBottom: i !== 2 ? "1px solid rgba(255,255,255,0.02)" : "none", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "8px", fontWeight: "bold", color: r.c, border: `1px solid ${r.c}44`, background: `${r.c}0f`, padding: "2px 6px", textTransform: "uppercase" }}>
                              {r.h >= 80 ? "HEALTHY" : r.h >= 60 ? "FAIR" : "AT RISK"}
                            </span>
                            <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "800", color: r.c }}>{r.h}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-3">
              <div style={{ padding: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
                <h2 style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.18em", margin: "0 0 14px" }}>
                  Security Overview
                </h2>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ width: "50px", height: "50px", borderRadius: "50%", border: "4px solid #fff", borderRightColor: "#aaa", borderBottomColor: "#555", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: "12px", color: "#fff", fontWeight: "bold" }}>12</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", justifyContent: "center" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.5)" }}><span>CRITICAL</span> <span style={{ color: "#fff" }}>2</span></div>
                    <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}><div style={{ width: "25%", height: "100%", background: "#fff", borderRadius: "2px" }}></div></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.5)" }}><span>HIGH</span> <span style={{ color: "#aaa" }}>5</span></div>
                    <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}><div style={{ width: "60%", height: "100%", background: "#aaa", borderRadius: "2px" }}></div></div>
                  </div>
                </div>
              </div>

              <div style={{ padding: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
                <h2 style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.18em", margin: "0 0 14px" }}>
                  Health Trend
                </h2>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "20px", fontWeight: "800", color: "#fff" }}>84</span>
                  <span style={{ fontFamily: "monospace", fontSize: "9px", fontWeight: "bold", color: "#fff" }}>↑12</span>
                </div>
                <div style={{ height: "30px", borderBottom: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "flex-end", gap: "4px" }}>
                  {[45, 52, 58, 62, 70, 72, 84].map((v, i) => (
                    <div key={i} style={{ flex: 1, height: `${v}%`, background: "#fff", opacity: i === 6 ? 1 : 0.3, borderRadius: "2px 2px 0 0" }}></div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
