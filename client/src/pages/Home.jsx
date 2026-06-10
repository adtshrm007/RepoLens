import Navbar from "../Components/common/Navbar";
import Hero from "../components/landing/Hero";
import EditorMockup from "../components/landing/EditorMockup";
import Logos from "../components/landing/Logos";
import Workflow from "../components/landing/Workflow";
import Features from "../components/landing/Features";
import CallToAction from "../components/landing/CallToAction";
import Footer from "../components/landing/Footer";

function Home() {
  return (
    <>
      <div className="min-h-screen bg-black text-white selection:bg-white/30 relative overflow-hidden">
        {/* Animated Background Top Gradient */}
        <div className="absolute top-0 left-0 w-full h-[150vh] bg-gradient-to-b from-[#1a1a24] via-[#0a0a0c] to-black animate-gradient pointer-events-none"></div>

        {/* Animated Background Blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-blob animation-delay-4000"></div>

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
