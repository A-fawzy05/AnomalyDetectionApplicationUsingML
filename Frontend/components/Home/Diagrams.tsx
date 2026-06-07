

"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Activity, Cpu, BarChart2, FileText, ShoppingCart, Package, CreditCard, AlertTriangle, Layers, ShieldAlert } from 'lucide-react';

export const P2PFlowDiagram: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  
  const steps = [
    { id: 0, label: 'Requisition', icon: FileText, color: 'bg-blue-500' },
    { id: 1, label: 'Purchase Order', icon: ShoppingCart, color: 'bg-indigo-500' },
    { id: 2, label: 'Goods Receipt', icon: Package, color: 'bg-purple-500' },
    { id: 3, label: 'Invoice', icon: FileText, color: 'bg-pink-500' },
    { id: 4, label: 'Payment', icon: CreditCard, color: 'bg-green-500' },
  ];

  return (
    <div className="flex flex-col items-center p-8 bg-bg-secondary rounded-xl shadow-sm border border-border-primary my-8">
      <h3 className="font-serif text-xl mb-4 text-text-primary">Object-Centric P2P Lifecycle</h3>
      <p className="text-sm text-text-secondary mb-6 text-center max-w-md">
        Hover over the process steps to see how objects interact across the procurement lifecycle.
      </p>
      
      <div className="relative w-full max-w-md h-64 flex items-center justify-between px-4">
         {}
         <div className="absolute inset-x-12 top-1/2 h-0.5 bg-border-primary -translate-y-1/2 z-0">
            <motion.div 
              className="h-full bg-nobel-gold"
              initial={{ width: 0 }}
              animate={{ width: activeStep !== null ? `${(activeStep / 4) * 100}%` : '100%' }}
              transition={{ duration: 0.5 }}
            />
         </div>

         {steps.map((step, idx) => (
            <div 
              key={step.id}
              className="relative z-10 flex flex-col items-center gap-3"
              onMouseEnter={() => setActiveStep(idx)}
              onMouseLeave={() => setActiveStep(null)}
            >
                <motion.div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-colors duration-300 ${activeStep === idx ? step.color : 'bg-text-secondary'}`}
                  whileHover={{ scale: 1.2 }}
                >
                  <step.icon size={20} />
                </motion.div>
                <span className={`text-[10px] font-bold uppercase tracking-tighter transition-colors ${activeStep === idx ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {step.label}
                </span>
                
                {activeStep === idx && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-16 w-32 p-2 bg-bg-primary border border-border-primary rounded shadow-xl text-[9px] text-center z-20"
                  >
                    {idx === 0 && "User requests items. Budget check triggered."}
                    {idx === 1 && "PO sent to supplier. Terms finalized."}
                    {idx === 2 && "Warehouse confirms receipt. Inventory updated."}
                    {idx === 3 && "Invoice received. 3-way match validation."}
                    {idx === 4 && "Payment released. Ledger updated."}
                  </motion.div>
                )}
            </div>
         ))}
      </div>

      <div className="mt-12 flex items-center gap-4 text-xs font-mono text-text-secondary">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-nobel-gold"></div> Active Path</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-text-secondary"></div> Object Node</div>
      </div>
    </div>
  );
};

export const AnomalyDetectionDiagram: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
        setStep(s => (s + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center p-8 bg-bg-primary rounded-xl border border-border-primary my-8">
      <h3 className="font-serif text-xl mb-4 text-text-primary">AI Detection Pipeline</h3>
      <p className="text-sm text-text-secondary mb-6 text-center max-w-md">
        Real-time event logs are processed through an ensemble of Isolation Forest and LSTM Autoencoders.
      </p>

      <div className="relative w-full max-w-lg h-56 bg-bg-secondary rounded-lg shadow-inner overflow-hidden mb-6 border border-border-primary flex items-center justify-center gap-6 p-4">
        
        {}
        <div className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-colors duration-500 ${step === 0 ? 'border-nobel-gold bg-nobel-gold/10' : 'border-border-primary bg-bg-primary'}`}>
                <Activity size={20} className={step === 0 ? 'text-nobel-gold' : 'text-text-secondary'} />
            </div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-text-secondary">Raw Events</span>
        </div>

        <motion.div animate={{ opacity: step >= 1 ? 1 : 0.3 }}>→</motion.div>

        {}
        <div className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-colors duration-500 ${step === 1 ? 'border-nobel-gold bg-nobel-gold/10' : 'border-border-primary bg-bg-primary'}`}>
                <Layers size={20} className={step === 1 ? 'text-nobel-gold' : 'text-text-secondary'} />
            </div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-text-secondary">Feature Eng</span>
        </div>

        <motion.div animate={{ opacity: step >= 2 ? 1 : 0.3 }}>→</motion.div>

        {}
        <div className="flex flex-col items-center gap-2">
             <div className={`w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-colors duration-500 relative overflow-hidden ${step === 2 ? 'border-text-primary bg-text-primary text-bg-primary' : 'border-border-primary bg-bg-primary'}`}>
                <Cpu size={24} className={step === 2 ? 'text-nobel-gold animate-pulse' : 'text-text-secondary'} />
                {step === 2 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-[1px] bg-nobel-gold absolute top-1/3 animate-ping"></div>
                        <div className="w-full h-[1px] bg-nobel-gold absolute top-2/3 animate-ping delay-75"></div>
                    </div>
                )}
             </div>
             <span className="text-[9px] uppercase font-bold tracking-wider text-text-secondary">Ensemble ML</span>
        </div>

        <motion.div animate={{ opacity: step >= 3 ? 1 : 0.3 }}>→</motion.div>

        {}
        <div className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-colors duration-500 ${step === 3 ? 'border-red-500 bg-red-500/10' : 'border-border-primary bg-bg-primary'}`}>
                {step === 3 ? (
                    <AlertTriangle size={20} className="text-red-500 animate-bounce" />
                ) : (
                    <ShieldAlert size={20} className="text-text-secondary" />
                )}
            </div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-text-secondary">Alert</span>
        </div>

      </div>

      <div className="flex gap-2">
          {[0, 1, 2, 3].map(s => (
              <div key={s} className={`h-1 rounded-full transition-all duration-300 ${step === s ? 'w-8 bg-nobel-gold' : 'w-2 bg-border-primary'}`}></div>
          ))}
      </div>
    </div>
  );
};

export const DetectionAccuracyDiagram: React.FC = () => {
    const [model, setModel] = useState<'Standard' | 'Ensemble' | 'DeepLearning'>('Ensemble');
    
    const data = {
        'Standard': { accuracy: 78, recall: 65 },
        'Ensemble': { accuracy: 95, recall: 92 },
        'DeepLearning': { accuracy: 98, recall: 96 } 
    };

    const currentData = data[model];
    const maxVal = 100;
    
    return (
        <div className="flex flex-col md:flex-row gap-8 items-center p-8 bg-nobel-dark text-stone-100 rounded-xl my-8 border border-stone-800 shadow-lg">
            <div className="flex-1 min-w-[240px]">
                <h3 className="font-serif text-xl mb-2 text-nobel-gold">Detection Benchmarks</h3>
                <p className="text-stone-400 text-sm mb-4 leading-relaxed">
                    Our ensemble and deep learning models significantly outperform traditional rule-based procurement monitoring.
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                    {(['Standard', 'Ensemble', 'DeepLearning'] as const).map((m) => (
                        <button 
                            key={m}
                            onClick={() => setModel(m)} 
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-200 border ${model === m ? 'bg-nobel-gold text-stone-900 border-nobel-gold' : 'bg-transparent text-stone-400 border-stone-700 hover:border-stone-500 hover:text-stone-200'}`}
                        >
                            {m === 'DeepLearning' ? 'LSTM Autoencoder' : m}
                        </button>
                    ))}
                </div>
                <div className="mt-6 font-mono text-[10px] text-stone-500 flex items-center gap-2">
                    <BarChart2 size={14} className="text-nobel-gold" /> 
                    <span>METRIC SCORE (HIGHER IS BETTER)</span>
                </div>
            </div>
            
            <div className="relative w-64 h-72 bg-stone-800/50 rounded-xl border border-stone-700/50 p-6 flex justify-around items-end">
                <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none opacity-10">
                   {[...Array(5)].map((_, i) => <div key={i} className="w-full h-[1px] bg-stone-400"></div>)}
                </div>

                {}
                <div className="w-20 flex flex-col justify-end items-center h-full z-10">
                    <div className="flex-1 w-full flex items-end justify-center relative mb-3">
                        <div className="absolute -top-5 w-full text-center text-xs font-mono text-stone-400 font-bold bg-stone-900/90 py-1 px-2 rounded backdrop-blur-sm border border-stone-700/50 shadow-sm">{currentData.accuracy}%</div>
                        <motion.div 
                            className="w-full bg-stone-600 rounded-t-md border-t border-x border-stone-500/30"
                            initial={{ height: 0 }}
                            animate={{ height: `${(currentData.accuracy / maxVal) * 100}%` }}
                            transition={{ type: "spring", stiffness: 80, damping: 15 }}
                        />
                    </div>
                    <div className="h-6 flex items-center text-[10px] font-bold text-stone-500 uppercase tracking-wider">Accuracy</div>
                </div>

                {}
                <div className="w-20 flex flex-col justify-end items-center h-full z-10">
                     <div className="flex-1 w-full flex items-end justify-center relative mb-3">
                        <div className="absolute -top-5 w-full text-center text-xs font-mono text-nobel-gold font-bold bg-stone-900/90 py-1 px-2 rounded backdrop-blur-sm border border-nobel-gold/30 shadow-sm">{currentData.recall}%</div>
                        <motion.div 
                            className="w-full bg-nobel-gold rounded-t-md shadow-[0_0_20px_rgba(197,160,89,0.25)] relative overflow-hidden"
                            initial={{ height: 0 }}
                            animate={{ height: `${(currentData.recall / maxVal) * 100}%` }}
                            transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.1 }}
                        >
                           <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20"></div>
                        </motion.div>
                    </div>
                     <div className="h-6 flex items-center text-[10px] font-bold text-nobel-gold uppercase tracking-wider">Recall</div>
                </div>
            </div>
        </div>
    )
}
