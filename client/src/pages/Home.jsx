import Navbar from "../Components/common/Navbar";
import Hero from "../Components/Landing/Hero";
import EditorMockup from "../Components/Landing/EditorMockup";
import Logos from "../Components/Landing/Logos";
import Workflow from "../Components/Landing/Workflow";
import Features from "../Components/Landing/Features";
import CallToAction from "../Components/Landing/CallToAction";
import Footer from "../Components/Landing/Footer";

function Home() {
  return (
    <>
      <div className="min-h-screen bg-black text-white selection:bg-white/30 relative overflow-hidden">
        {/* Animated Background Top Gradient */}
        <div className="absolute top-0 left-0 w-full h-[150vh] bg-linear-to-b from-[#111] via-[#0a0a0a] to-black animate-gradient pointer-events-none"></div>

        <div className="relative z-10">
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
      </div>
    </>
  );
}

export default Home;
