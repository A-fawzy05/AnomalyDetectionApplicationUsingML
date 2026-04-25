"use client";
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import { HeroScene, DataFlowScene } from './../../components/Home/QuantamScene';
import { P2PFlowDiagram, AnomalyDetectionDiagram, DetectionAccuracyDiagram } from './../../components/Home/Diagrams';
import { ArrowDown, Menu, X, BookOpen, Sun, Moon, ShieldAlert, Zap, Layers, AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export interface Laureate {
  name: string;
  image: string; // placeholder url
  role: string;
  desc: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <h1 className="font-serif text-2xl text-stone-900 mb-4">Something went wrong</h1>
            <p className="text-stone-600 mb-6 leading-relaxed">
              We encountered an unexpected error while rendering the application. 
              Please try refreshing the page.
            </p>
            <div className="p-4 bg-red-50/50 rounded-lg text-left mb-6 overflow-auto max-h-40">
              <code className="text-xs text-red-700 font-mono">
                {this.state.error?.toString()}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AuthorCard = ({ name, role, delay }: { name: string, role: string, delay: string }) => {
  return (
    <div className="flex flex-col group animate-fade-in-up items-center p-8 bg-bg-secondary rounded-xl border border-border-primary shadow-sm hover:shadow-md transition-all duration-300 w-full max-w-xs hover:border-nobel-gold/50" style={{ animationDelay: delay }}>
      <h3 className="font-serif text-2xl text-text-primary text-center mb-3">{name}</h3>
      <div className="w-12 h-0.5 bg-nobel-gold mb-4 opacity-60"></div>
      <p className="text-xs text-text-secondary font-bold uppercase tracking-widest text-center leading-relaxed">{role}</p>
    </div>
  );
};

const App: React.FC = () => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const handleGetStarted = () => {
    router.push('/auth');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-nobel-gold selection:text-white transition-colors duration-300">
      
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-bg-primary/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 bg-nobel-gold rounded-full flex items-center justify-center text-white font-serif font-bold text-xl shadow-sm pb-1">P</div>
            <span className={`font-serif font-bold text-lg tracking-wide transition-opacity ${scrolled ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
              P2P INSIGHT <span className="font-normal text-text-secondary">2026</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide text-text-secondary">
            <a href="#overview" onClick={scrollToSection('overview')} className="hover:text-nobel-gold transition-colors cursor-pointer uppercase">Overview</a>
            <a href="#mining" onClick={scrollToSection('mining')} className="hover:text-nobel-gold transition-colors cursor-pointer uppercase">Process Mining</a>
            <a href="#anomaly" onClick={scrollToSection('anomaly')} className="hover:text-nobel-gold transition-colors cursor-pointer uppercase">Anomaly Detection</a>
            <a href="#authors" onClick={scrollToSection('authors')} className="hover:text-nobel-gold transition-colors cursor-pointer uppercase">Team</a>
            
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-bg-secondary transition-colors text-text-primary"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button 
              onClick={handleGetStarted}
              className="px-5 py-2 bg-text-primary text-bg-primary rounded-full hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              Get Started
            </button>
          </div>

          <div className="flex items-center gap-4 md:hidden">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-bg-secondary transition-colors text-text-primary"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="text-text-primary p-2" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-bg-primary flex flex-col items-center justify-center gap-8 text-xl font-serif animate-fade-in">
            <a href="#overview" onClick={scrollToSection('overview')} className="hover:text-nobel-gold transition-colors cursor-pointer uppercase">Overview</a>
            <a href="#mining" onClick={scrollToSection('mining')} className="hover:text-nobel-gold transition-colors cursor-pointer uppercase">Process Mining</a>
            <a href="#anomaly" onClick={scrollToSection('anomaly')} className="hover:text-nobel-gold transition-colors cursor-pointer uppercase">Anomaly Detection</a>
            <a href="#authors" onClick={scrollToSection('authors')} className="hover:text-nobel-gold transition-colors cursor-pointer uppercase">Team</a>
            <button 
              onClick={handleGetStarted}
              className="px-6 py-3 bg-text-primary text-bg-primary rounded-full shadow-lg cursor-pointer"
            >
              Get Started
            </button>
        </div>
      )}

      {/* Hero Section */}
      <header className="relative h-screen flex items-center justify-center overflow-hidden">
        <HeroScene />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,var(--bg-primary)_0%,transparent_100%)] opacity-80" />

        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="inline-block mb-4 px-3 py-1 border border-nobel-gold text-nobel-gold text-xs tracking-[0.2em] uppercase font-bold rounded-full backdrop-blur-sm bg-bg-secondary/30">
            Graduation Project • 2026
          </div>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-9xl font-medium leading-tight md:leading-[0.9] mb-8 text-text-primary drop-shadow-sm">
            P2P Insight <br/><span className="italic font-normal text-text-secondary text-3xl md:text-5xl block mt-4">Object-Centric Process Mining & AI</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-text-secondary font-light leading-relaxed mb-12">
            An enterprise platform for Purchase-to-Pay procurement analysis using object-centric process mining and ensemble ML/DL anomaly detection.
          </p>
          
          <div className="flex justify-center">
             <a href="#overview" onClick={scrollToSection('overview')} className="group flex flex-col items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
                <span>EXPLORE</span>
                <span className="p-2 border border-border-primary rounded-full group-hover:border-text-primary transition-colors bg-bg-secondary/50">
                    <ArrowDown size={16} />
                </span>
             </a>
          </div>
        </div>
      </header>

      <main>
        {/* Overview */}
        <section id="overview" className="py-24 bg-bg-secondary">
          <div className="container mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-4">
              <div className="inline-block mb-3 text-xs font-bold tracking-widest text-text-secondary uppercase">Project Overview</div>
              <h2 className="font-serif text-4xl mb-6 leading-tight text-text-primary">The Procurement Challenge</h2>
              <div className="w-16 h-1 bg-nobel-gold mb-6"></div>
            </div>
            <div className="md:col-span-8 text-lg text-text-secondary leading-relaxed space-y-6">
              <p>
                <span className="text-5xl float-left mr-3 mt-[-8px] font-serif text-nobel-gold">M</span>odern enterprise procurement is a complex web of interconnected objects: Requisitions, Purchase Orders, Goods Receipts, and Invoices. Traditional process mining often fails to capture the intricate many-to-many relationships between these entities.
              </p>
              <p>
                <strong>P2P Insight</strong> solves this by implementing <strong>Object-Centric Process Mining (OCPM)</strong>. We analyze the entire lifecycle from requisition to payment, identifying <strong>Maverick Buying</strong>, <strong>Three-Way Match Failures</strong>, and <strong>Compliance Deviations</strong> using advanced ML/DL ensembles.
              </p>
            </div>
          </div>
        </section>

        {/* Process Mining */}
        <section id="mining" className="py-24 bg-bg-primary border-t border-border-primary">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-bg-secondary text-text-secondary text-xs font-bold tracking-widest uppercase rounded-full mb-6 border border-border-primary">
                            <Layers size={14}/> THE ANALYSIS
                        </div>
                        <h2 className="font-serif text-4xl md:text-5xl mb-6 text-text-primary">Object-Centric Mining</h2>
                        <p className="text-lg text-text-secondary mb-6 leading-relaxed">
                           Powered by Django and PM4PY, our platform discovers the true underlying process models. We go beyond simple flowcharts to map the complex relationships between multiple procurement objects.
                        </p>
                        <ul className="space-y-4 text-text-secondary">
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-nobel-gold shrink-0" />
                                <span><strong>Discovery:</strong> Inductive Miner & Directly-Follows Graphs (DFG)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-nobel-gold shrink-0" />
                                <span><strong>Conformance:</strong> Fitness, Precision, and Alignment analysis</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-nobel-gold shrink-0" />
                                <span><strong>Performance:</strong> Cycle time and bottleneck identification</span>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <P2PFlowDiagram />
                    </div>
                </div>
            </div>
        </section>

        {/* Anomaly Detection */}
        <section id="anomaly" className="py-24 bg-nobel-dark text-stone-100 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="w-96 h-96 rounded-full bg-stone-600 blur-[100px] absolute top-[-100px] left-[-100px]"></div>
                <div className="w-96 h-96 rounded-full bg-nobel-gold blur-[100px] absolute bottom-[-100px] right-[-100px]"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                     <div className="order-2 lg:order-1">
                        <AnomalyDetectionDiagram />
                     </div>
                     <div className="order-1 lg:order-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-800 text-nobel-gold text-xs font-bold tracking-widest uppercase rounded-full mb-6 border border-stone-700">
                            AI & DEEP LEARNING
                        </div>
                        <h2 className="font-serif text-4xl md:text-5xl mb-6 text-white">Anomaly Detection</h2>
                        <p className="text-lg text-stone-400 mb-6 leading-relaxed">
                            Our primary innovation is a high-performance FastAPI service running an ensemble of <strong>Isolation Forest</strong> and <strong>LSTM Autoencoders</strong>.
                        </p>
                        <p className="text-lg text-stone-400 leading-relaxed">
                            By combining statistical anomaly detection with sequence-aware deep learning, we achieve 98% accuracy in detecting financial fraud and compliance deviations in real-time event streams.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            {['TensorFlow', 'PyTorch', 'Scikit-Learn', 'XGBoost'].map(tech => (
                                <span key={tech} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-xs font-mono text-stone-300">{tech}</span>
                            ))}
                        </div>
                     </div>
                </div>
            </div>
        </section>

        {/* Results */}
        <section className="py-24 bg-bg-primary">
            <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto text-center mb-12">
                    <h2 className="font-serif text-4xl md:text-5xl mb-6 text-text-primary">Proven Performance</h2>
                    <p className="text-lg text-text-secondary leading-relaxed">
                        Evaluated on the BPI Challenge 2019 dataset (1.5M events), P2P Insight demonstrates superior detection capabilities compared to traditional rule-based systems.
                    </p>
                </div>
                <div className="max-w-3xl mx-auto">
                    <DetectionAccuracyDiagram />
                </div>
            </div>
        </section>

        {/* Setup & Architecture */}
        <section id="setup" className="py-24 bg-bg-secondary border-t border-border-primary">
             <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12">
                <div className="md:col-span-5 relative">
                    <div className="aspect-square bg-bg-primary rounded-xl overflow-hidden relative border border-border-primary shadow-inner">
                        <DataFlowScene />
                        <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-text-secondary font-serif italic">Real-time Kafka Event Stream Visualization</div>
                    </div>
                </div>
                <div className="md:col-span-7 flex flex-col justify-center">
                    <div className="inline-block mb-3 text-xs font-bold tracking-widest text-text-secondary uppercase">ARCHITECTURE</div>
                    <h2 className="font-serif text-4xl mb-6 text-text-primary">Enterprise-Grade Stack</h2>
                    <p className="text-lg text-text-secondary mb-6 leading-relaxed">
                        A distributed microservices architecture built for scale. Next.js frontend communicates with a Node.js Gateway, which orchestrates Django for mining and FastAPI for AI analysis.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="p-4 bg-bg-primary border border-border-primary rounded-lg">
                            <Zap className="text-nobel-gold mb-2" size={20} />
                            <h4 className="font-bold text-sm mb-1">Real-Time</h4>
                            <p className="text-xs text-text-secondary">Kafka + Socket.io for live anomaly alerts.</p>
                        </div>
                        <div className="p-4 bg-bg-primary border border-border-primary rounded-lg">
                            <ShieldAlert className="text-nobel-gold mb-2" size={20} />
                            <h4 className="font-bold text-sm mb-1">Compliance</h4>
                            <p className="text-xs text-text-secondary">Automated n8n workflows for SAP extraction.</p>
                        </div>
                    </div>
                    
                    <div className="p-6 bg-bg-primary border border-border-primary rounded-lg border-l-4 border-l-nobel-gold">
                        <p className="font-serif italic text-xl text-text-primary mb-4">
                            "Our ensemble approach achieves 98% accuracy in financial fraud detection, bridging the gap between process mining and deep learning."
                        </p>
                        <span className="text-sm font-bold text-text-secondary tracking-wider uppercase">— Project Thesis (2026)</span>
                    </div>
                </div>
             </div>
        </section>

        {/* Authors */}
        <section id="authors" className="py-24 bg-bg-secondary border-t border-border-primary">
           <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <div className="inline-block mb-3 text-xs font-bold tracking-widest text-text-secondary uppercase">RESEARCH TEAM</div>
                    <h2 className="font-serif text-3xl md:text-5xl mb-4 text-text-primary">The Contributors</h2>
                    <p className="text-text-secondary max-w-2xl mx-auto">Graduation Project 2026 - Computer Science & Software Engineering.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8 justify-center items-center flex-wrap">
                    <AuthorCard 
                        name="Amr" 
                        role="Software Engineer" 
                        delay="0s" 
                    />
                    <AuthorCard 
                        name="Dr. Khaled Alsheshtawi" 
                        role="Project Supervisor" 
                        delay="0.1s" 
                    />
                </div>
           </div>
        </section>

      </main>

      <footer className="bg-nobel-dark text-stone-400 py-16">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
                <div className="text-white font-serif font-bold text-2xl mb-2">P2P Insight</div>
                <p className="text-sm">Object-Centric Process Mining & Anomaly Detection Platform</p>
            </div>
            <div className="flex gap-6 text-xs uppercase tracking-widest font-bold">
                <a href="#" className="hover:text-nobel-gold transition-colors">Documentation</a>
                <a href="#" className="hover:text-nobel-gold transition-colors">GitHub</a>
                <a href="#" className="hover:text-nobel-gold transition-colors">Contact</a>
            </div>
        </div>
        <div className="text-center mt-12 text-xs text-stone-600">
            &copy; 2026 Graduation Project. Built with Next.js, Django, and FastAPI.
        </div>
      </footer>
    </div>
    </ErrorBoundary>
  );
};

export default App;