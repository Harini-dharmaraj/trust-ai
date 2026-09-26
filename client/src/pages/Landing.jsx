import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiShield, FiCpu, FiTrendingUp, FiCheckSquare } from 'react-icons/fi';

function Landing() {
  const navigate = useNavigate();

  const features = [
    { icon: <FiShield className="text-cyan-300" size={24} />, title: 'SHA-256 Ledger Audit', desc: 'Immutable, cryptographically chained records for maximum financial accountability.' },
    { icon: <FiCpu className="text-cyan-300" size={24} />, title: 'Real-time AI Insights', desc: 'Dynamic categorizations, budget recommendations, and automated OCR scanning.' },
    { icon: <FiCheckSquare className="text-cyan-300" size={24} />, title: 'Multi-Sig Governance', desc: 'Configurable approval voting rules to ensure democratic budget releases.' },
    { icon: <FiTrendingUp className="text-cyan-300" size={24} />, title: 'Real-time Sync Workspace', desc: 'Instant messaging chat, notifications, and balance aggregates from MongoDB.' },
  ];

  const stats = [
    { number: '15,000+', label: 'Active Communities', color: 'from-blue-400 to-blue-600' },
    { number: '₹14.2Cr+', label: 'Volume Transacted', color: 'from-cyan-400 to-cyan-600' },
    { number: '99.99%', label: 'Ledger Integrity', color: 'from-purple-400 to-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 left-1/4 h-72 w-72 rounded-full bg-purple-400/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px',
              animation: 'moveGrid 20s linear infinite',
            }}
          />
        </div>

        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-white/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(-50px) translateX(30px); opacity: 0.8; }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) translateX(0px); opacity: 0; }
        }
        @keyframes moveGrid {
          0% { transform: translateY(0px); }
          100% { transform: translateY(50px); }
        }
      `}</style>

      {/* Content Area */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-white/10 px-4 py-4 sm:px-6 lg:px-8 backdrop-blur-sm bg-blue-900/30">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white text-blue-900 flex items-center justify-center font-bold text-sm">
                T
              </div>
              <div className="text-xl font-bold text-white tracking-tight">TrustCircle AI</div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="rounded-lg border border-white/30 px-4 py-2 font-semibold text-white hover:bg-white/10 transition"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="rounded-lg bg-white px-5 py-2 font-semibold text-blue-900 transition hover:bg-blue-50 shadow-lg"
              >
                Create Account
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
              {/* Left Content */}
              <div className="flex flex-col justify-center">
                <div className="mb-6 inline-flex w-fit rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-blue-100 backdrop-blur border border-white/20">
                  ⚡ SECURE & IMMUTABLE LEDGER FOR SHARED MONEY
                </div>

                <h1 className="mb-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                  Manage Community Funds with
                  <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent block mt-2">
                    Transparency & AI.
                  </span>
                </h1>

                <p className="mb-8 text-base text-blue-100 sm:text-lg">
                  TrustCircle AI helps apartment associations, non-profits, SHGs, and events coordinate budget deposits, approve spending proposals democratically, and verify receipts using automated AI OCR checks.
                </p>

                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <button
                    onClick={() => navigate('/auth')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-3 font-semibold text-blue-900 transition hover:bg-blue-50 shadow-lg hover:shadow-xl"
                  >
                    Start Managing Free <FiArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#features-section"
                    className="inline-flex items-center justify-center rounded-lg border border-white/30 px-8 py-3 font-semibold text-white transition hover:bg-white/10 backdrop-blur hover:border-white/50"
                  >
                    Explore Features
                  </a>
                </div>

                {/* Core Commitments */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-200">Compliance & Safeguards:</p>
                  <div className="space-y-2">
                    {['100% Traceable SHA-256 Block hashes', 'Dynamic rule-based vote locks', 'Razorpay Payment Gateway Verification'].map(
                      (item) => (
                        <div key={item} className="flex items-center gap-3 text-blue-50">
                          <FiCheck className="h-5 w-5 flex-shrink-0 text-cyan-300" />
                          <span className="text-sm">{item}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Right Visual: Professional Platform Overview */}
              <div className="flex flex-col gap-6 sm:gap-8">
                <div className="rounded-2xl bg-white/10 p-6 backdrop-blur border border-white/20 sm:p-8 shadow-xl">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-100 mb-6">Financial Scale Metrics</p>
                  <div className="grid grid-cols-1 gap-4">
                    {stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl bg-gradient-to-r p-0.5 from-blue-400/20 to-cyan-400/20"
                      >
                        <div className="rounded-lg bg-blue-900/40 p-4 backdrop-blur">
                          <div className="text-3xl font-bold text-white">{stat.number}</div>
                          <div className="mt-1 text-xs text-blue-100 font-medium">{stat.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features Highlights */}
                <div id="features-section" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:bg-white/10"
                    >
                      <div className="mb-2">{feature.icon}</div>
                      <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                      <p className="mt-1 text-[11px] text-blue-100 leading-normal">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Organizations Trust Section */}
        <div className="border-t border-white/10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 backdrop-blur-sm bg-blue-900/20">
          <div className="mx-auto max-w-7xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-300 mb-2">Enterprise Grade Transparency</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">Trusted by Community Leadership</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-xl bg-white/5 p-6 border border-white/10">
                <p className="text-sm font-semibold text-white">Apartment Associations</p>
                <p className="text-xs text-blue-100 mt-2">Manage security fees, lift maintenance reserves, and monthly billing with real-time audit receipts.</p>
              </div>
              <div className="rounded-xl bg-white/5 p-6 border border-white/10">
                <p className="text-sm font-semibold text-white">NGOs & Charitable Circles</p>
                <p className="text-xs text-blue-100 mt-2">Publish ledger balance summaries to donor bases with unalterable SHA-256 block proofs.</p>
              </div>
              <div className="rounded-xl bg-white/5 p-6 border border-white/10">
                <p className="text-sm font-semibold text-white">Student & Travel Clubs</p>
                <p className="text-xs text-blue-100 mt-2">Lock contributions, approve transport proposals dynamically, and discuss expenses in real-time chat rooms.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ready Call-To-Action */}
        <div className="border-t border-white/10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 bg-gradient-to-b from-transparent to-blue-950/30 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">Ready to secure your community money?</h2>
            <p className="mb-8 text-sm text-blue-100 max-w-lg mx-auto">
              Join thousands of community administrators enforcing transparency, digital ledgers, and democratic multi-sig budgeting.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="rounded-lg bg-white px-8 py-3 font-semibold text-blue-900 transition hover:bg-blue-50 shadow-lg hover:shadow-xl"
              >
                Sign Up Now
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="rounded-lg border border-white/30 px-8 py-3 font-semibold text-white transition hover:bg-white/10 backdrop-blur hover:border-white/50"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;
