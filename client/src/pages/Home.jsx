import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import EditorMockup from '../components/landing/EditorMockup';
import Logos from '../components/landing/Logos';
import Workflow from '../components/landing/Workflow';
import Features from '../components/landing/Features';
import CallToAction from '../components/landing/CallToAction';
import Footer from '../components/landing/Footer';

function Home() {
  return (
    <>
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
    </>
  );
}

export default Home;
