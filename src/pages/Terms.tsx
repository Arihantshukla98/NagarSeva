import React from 'react';
import { motion } from 'motion/react';
import { FileText, Shield, UserCheck, AlertCircle, Award, Compass, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-[#0ea5e9] transition-all group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>BACK TO LANDING</span>
          </Link>
        </div>

        {/* Header Section */}
        <div className="text-center mb-12 border-b border-white/5 pb-8">
          <div className="inline-flex p-3 rounded-2xl bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 text-[#0ea5e9] mb-4">
            <FileText size={28} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white mb-3">
            Terms of Service & Civic Charter
          </h1>
          <p className="text-xs font-mono text-[#0ea5e9] uppercase tracking-widest">
            NAGARSEVA MUNICIPAL ENGAGEMENT PROTOCOL • LAST UPDATED: JUNE 2026
          </p>
        </div>

        {/* Content Cards */}
        <div className="space-y-8">
          
          {/* Section 1: Introduction */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/15 transition-all"
          >
            <div className="flex items-center gap-3 mb-4 text-[#0ea5e9]">
              <Compass size={20} />
              <h2 className="text-lg font-semibold text-white">1. Civic Cooperation Agreement</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Welcome to NagarSeva, a collaborative civic-tech workspace built to bridge the gap between residents and local municipal administration. By accessing this platform, creating reports, and participating in civic verification, you agree to comply with this Civic Charter and all local municipal regulations.
            </p>
          </motion.div>

          {/* Section 2: Reporter Code of Conduct */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/15 transition-all"
          >
            <div className="flex items-center gap-3 mb-4 text-[#0ea5e9]">
              <UserCheck size={20} />
              <h2 className="text-lg font-semibold text-white">2. Resident Code of Conduct</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              Our community thrives on truth and mutual respect. Users submitting reports agree to:
            </p>
            <ul className="space-y-2.5 text-xs text-slate-400 pl-4 list-disc">
              <li>Submit only genuine public grievance reports with real geolocations.</li>
              <li>Provide clear, unedited, and relevant imagery of physical infrastructure issues.</li>
              <li>Refrain from submitting duplicates, private property disputes, or defamatory claims against individuals.</li>
              <li>Avoid utilizing coordinates or pictures that violate individual privacy.</li>
            </ul>
          </motion.div>

          {/* Section 3: Gamification & Point System */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/15 transition-all"
          >
            <div className="flex items-center gap-3 mb-4 text-[#0ea5e9]">
              <Award size={20} />
              <h2 className="text-lg font-semibold text-white">3. Gamification, Points & Badges</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              NagarSeva encourages resident contribution through points, upvotes, and honorary civic badges (e.g., Pioneer Citizen, Civic Champion). Points have no monetary cash value and cannot be transferred, but serve as verified proof of positive social impact and community service. Abuse or artificial inflation of points will result in immediate profile suspension.
            </p>
          </motion.div>

          {/* Section 4: AI & Gemini Integration */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/15 transition-all"
          >
            <div className="flex items-center gap-3 mb-4 text-[#0ea5e9]">
              <Shield size={20} />
              <h2 className="text-lg font-semibold text-white">4. AI Analysis & Image Processing</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              NagarSeva leverages Google Cloud Vertex AI and Gemini models to analyze reported issues, automatically verify images, cross-reference categories, and generate visual mockups. By uploading images to the platform, you grant NagarSeva and local municipal bodies a non-exclusive license to process, analyze, and publish the media to coordinate public works.
            </p>
          </motion.div>

          {/* Section 5: Limitation of Liability */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/15 transition-all animate-pulse-slow"
          >
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <AlertCircle size={20} />
              <h2 className="text-lg font-semibold text-white">5. Service Disclaimers</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              NagarSeva serves as an advisory and reporting tool. While municipal officials actively monitor reported issues, the platform does not guarantee instant remediation of reported issues or make legal commitments on behalf of local government authorities regarding specific budget allocations.
            </p>
          </motion.div>

        </div>

        {/* Footer info */}
        <div className="text-center mt-12 pt-8 border-t border-white/5 text-xs text-slate-500">
          <p>© 2026 NagarSeva Municipal Project. All rights reserved.</p>
          <p className="mt-2 text-[10px]">
            In partnership with Ward Administration, City Development Authorities, and Civic Action Committees.
          </p>
        </div>

      </div>
    </div>
  );
}
