export default function EditorMockup() {
  return (
    <section className="w-full px-6 flex justify-center mb-24">
      <div className="w-full max-w-6xl border border-white/10 rounded-lg overflow-hidden bg-[#0d0d0f] shadow-2xl shadow-white/5">
        
        {/* Editor Header */}
        <div className="h-10 border-b border-white/10 flex items-center px-4 bg-[#0a0a0c]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
          </div>
          <div className="mx-auto flex items-center gap-2 text-[10px] font-mono text-white/40">
            <span>REPOLENS_INSIGHT_PANEL.TSX</span>
          </div>
          <div className="text-[10px] font-mono text-white/40">
            v 1.0.0
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex flex-col md:flex-row h-[500px]">
          
          {/* Sidebar */}
          <div className="hidden md:block w-64 border-r border-white/10 p-4">
            <div className="text-[10px] font-mono text-white/50 mb-4 tracking-widest">FILE STRUCTURE</div>
            <div className="space-y-2 text-xs font-mono text-white/70">
              <div className="flex items-center gap-2"><span className="text-white/30">📁</span> SRC</div>
              <div className="flex items-center gap-2 pl-4"><span className="text-white/30">📁</span> COMPONENTS</div>
              <div className="flex items-center gap-2 pl-8 text-white bg-white/5 px-2 py-1 rounded"><span className="text-white/30">📄</span> REPOLENS_PANEL.TS</div>
              <div className="flex items-center gap-2 pl-4"><span className="text-white/30">📁</span> MIDDLEWARE</div>
              <div className="flex items-center gap-2 pl-4"><span className="text-white/30">⚙️</span> CONFIG.JSON</div>
            </div>
          </div>

          {/* Main Code Area */}
          <div className="flex-1 p-6 relative overflow-hidden flex flex-col font-mono text-xs md:text-sm">
            <div className="text-white/50">1</div>
            <div className="absolute top-6 left-12 text-white/80 space-y-1">
              <div><span className="text-[#a78bfa]">import</span> React, {'{'} useState {'}'} <span className="text-[#a78bfa]">from</span> <span className="text-[#34d399]">'react'</span>;</div>
              <br />
              <div><span className="text-[#a78bfa]">export</span> <span className="text-[#a78bfa]">async</span> <span className="text-[#60a5fa]">function</span> <span className="text-[#fcd34d]">RepoPanel</span>(props: any) {'{'}</div>
              <div className="pl-4"><span className="text-[#a78bfa]">const</span> [score] = useState(props.healthScore);</div>
              <div className="pl-4 text-white/40">// Fetching repository metrics...</div>
              <div className="pl-4"><span className="text-[#a78bfa]">await</span> AnalyzeRepo.run(score);</div>
              <div className="pl-4"><span className="text-[#a78bfa]">return</span> (</div>
              <div className="pl-8 text-white/60">{'<div className="panel">'}</div>
              <div className="pl-12">...</div>
            </div>

            {/* AI Highlight Tooltip */}
            <div className="absolute bottom-16 right-16 border border-white/20 bg-[#121214] p-4 max-w-xs shadow-xl">
              <div className="text-[10px] text-white/50 mb-2 font-mono tracking-widest border-b border-white/10 pb-2">AI CODE REVIEW</div>
              <div className="text-xs text-white/90 font-mono leading-relaxed">
                MEMORY LEAK DETECTED. ASYNC OPERATION WITHIN USEEFFECT LACKS CLEANUP. RECOMMENDED: ABORTCONTROLLER().
              </div>
            </div>
          </div>

          {/* Right Sidebar - Insights */}
          <div className="hidden lg:block w-72 border-l border-white/10 p-4">
            <div className="text-[10px] font-mono text-white/50 mb-6 tracking-widest text-center">HEALTH SCORE</div>
            
            <div className="flex items-end justify-center gap-2 mb-8 border-b border-white/10 pb-8">
              <span className="text-6xl font-mono text-white">9.8</span>
              <span className="text-xs text-[#34d399] font-mono pb-2">+0.42</span>
            </div>

            <div className="text-[10px] font-mono text-white/50 mb-4 tracking-widest text-center">CODE SCORES</div>
            
            {/* Fake bar chart */}
            <div className="flex items-end justify-center gap-3 h-24 mb-8">
              <div className="w-8 bg-white/10 h-[40%]"></div>
              <div className="w-8 bg-white/20 h-[60%]"></div>
              <div className="w-8 bg-white/30 h-[30%]"></div>
              <div className="w-8 bg-white h-[90%]"></div>
            </div>

            <div className="border border-white/10 p-3 bg-white/5">
              <div className="text-[10px] font-mono text-white/50 mb-2 tracking-widest border-b border-white/10 pb-2 text-center">AI INSIGHTS</div>
              <ul className="text-[10px] font-mono text-white/70 space-y-2 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#a78bfa] mt-0.5">↑</span>
                  <span>DEPENDENCIES: SECURE</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#34d399] mt-0.5">↓</span>
                  <span>TECH DEBT REDUCED</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
