import { useNavigate } from 'react-router-dom';
import { 
  FiArrowRight, FiCheck, FiShield, FiCpu, FiTrendingUp, FiCheckSquare,
  FiSmartphone, FiUsers, FiDollarSign, FiClock
} from 'react-icons/fi';

function Landing() {
  const navigate = useNavigate();

  const features = [
    { 
      icon: <FiShield className="text-cyan-300" size={22} />, 
      title: 'Transparent Records', 
      desc: 'Clear, verified transaction history for complete savings circle accountability.' 
    },
    { 
      icon: <FiCpu className="text-cyan-300" size={22} />, 
      title: 'AI Savings Helper', 
      desc: 'Instant pool balance calculations, monthly target trackers, and receipt scanning.' 
    },
    { 
      icon: <FiCheckSquare className="text-cyan-300" size={22} />, 
      title: 'Democratic Decisions', 
      desc: 'Group voting on fund disbursements to ensure fair and agreed payouts.' 
    },
    { 
      icon: <FiTrendingUp className="text-cyan-300" size={22} />, 
      title: 'Real-time Circle Sync', 
      desc: 'Instant group chat, payment alerts, and member contribution rosters.' 
    },
  ];

  const steps = [
    {
      number: '1',
      title: 'Create or Join a Circle',
      desc: 'Set your monthly contribution amount (e.g. ₹2,000/month) and invite members to join your private group.',
      color: 'bg-blue-500',
    },
    {
      number: '2',
      title: 'Pay via Direct UPI Scan & Pay',
      desc: 'Members scan the group QR code using Google Pay, PhonePe, or Paytm with zero transaction charges.',
      color: 'bg-cyan-500',
    },
    {
      number: '3',
      title: 'Track Balances & Member Payouts',
      desc: 'See live who has paid and who is pending. Disburse monthly pooled funds to the scheduled member.',
      color: 'bg-emerald-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-600 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
              <div className="text-xl font-bold text-white tracking-tight">TrustCircle</div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="rounded-lg border border-white/30 px-4 py-2 font-semibold text-white hover:bg-white/10 transition text-xs sm:text-sm"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="rounded-lg bg-white px-5 py-2 font-semibold text-blue-900 transition hover:bg-blue-50 shadow-lg text-xs sm:text-sm"
              >
                Create Account
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-center">
              {/* Left Content */}
              <div className="flex flex-col justify-center">
                <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-blue-100 backdrop-blur border border-white/20">
                  <span>✨</span> SIMPLE & TRANSPARENT SAVINGS CIRCLE
                </div>

                <h1 className="mb-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                  Pool & Manage Group Savings with
                  <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent block mt-2">
                    Ease & Clarity.
                  </span>
                </h1>

                <p className="mb-8 text-base text-blue-100 sm:text-lg leading-relaxed">
                  TrustCircle helps friends, families, apartment communities, and chit circles collect monthly contributions, track member dues, and disburse payouts with complete transparency.
                </p>

                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <button
                    onClick={() => navigate('/auth')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 font-bold text-xs sm:text-sm text-blue-900 transition hover:bg-blue-50 shadow-lg hover:shadow-xl"
                  >
                    Start Managing Free <FiArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center justify-center rounded-xl border border-white/30 px-8 py-3.5 font-bold text-xs sm:text-sm text-white transition hover:bg-white/10 backdrop-blur hover:border-white/50"
                  >
                    How It Works
                  </a>
                </div>

                {/* Key Benefits */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-200">Why Groups Choose TrustCircle:</p>
                  <div className="space-y-2.5">
                    {[
                      'Direct UPI Scan & Pay — zero payment gateway transaction cuts',
                      'Real-time dues roster showing who paid and who is pending',
                      'Democratic voting for group expenses and payout approvals',
                      'Built-in group chat and automated payment reminders'
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 text-blue-50">
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
                          <FiCheck className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Visual: How It Works Flow & Features */}
              <div id="how-it-works" className="flex flex-col gap-6">
                {/* How It Works Card */}
                <div className="rounded-3xl bg-white/10 p-6 backdrop-blur border border-white/20 sm:p-7 shadow-2xl">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        How It Works
                      </span>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-blue-100 border border-white/10">
                      3 Simple Steps
                    </span>
                  </div>

                  <div className="mt-5 space-y-3.5">
                    {steps.map((s) => (
                      <div key={s.number} className="flex items-start gap-3.5 rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur hover:bg-white/10 transition">
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${s.color} text-white font-extrabold text-sm shadow-md`}>
                          {s.number}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs sm:text-sm">{s.title}</h4>
                          <p className="mt-1 text-[11px] sm:text-xs text-blue-100 leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4 Core Features */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:bg-white/10"
                    >
                      <div className="mb-2">{feature.icon}</div>
                      <h3 className="font-bold text-white text-xs">{feature.title}</h3>
                      <p className="mt-1 text-[11px] text-blue-100 leading-relaxed">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="border-t border-white/10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 backdrop-blur-sm bg-blue-900/20">
          <div className="mx-auto max-w-7xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-300 mb-2">Designed for Real Groups</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">Built for Your Savings Circle</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 text-left">
              <div className="rounded-2xl bg-white/5 p-6 border border-white/10 backdrop-blur">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="text-base font-bold text-white">Monthly Chit Circles</h3>
                <p className="text-xs text-blue-100 mt-2 leading-relaxed">
                  Pool fixed monthly savings with friends or colleagues. Track who has paid and record who receives the monthly payout.
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-6 border border-white/10 backdrop-blur">
                <div className="text-3xl mb-3">🏢</div>
                <h3 className="text-base font-bold text-white">Apartment & Housing Dues</h3>
                <p className="text-xs text-blue-100 mt-2 leading-relaxed">
                  Collect monthly maintenance fees directly via UPI and record approved building expenses with receipt attachments.
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-6 border border-white/10 backdrop-blur">
                <div className="text-3xl mb-3">✈️</div>
                <h3 className="text-base font-bold text-white">Group Trips & Shared Goals</h3>
                <p className="text-xs text-blue-100 mt-2 leading-relaxed">
                  Collect pooled funds for vacations, events, or shared investments without awkward follow-ups or spreadsheet errors.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ready Call-To-Action */}
        <div className="border-t border-white/10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 bg-gradient-to-b from-transparent to-blue-950/30 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-3 text-3xl font-bold text-white">Ready to start your savings circle?</h2>
            <p className="mb-8 text-xs sm:text-sm text-blue-100 max-w-lg mx-auto">
              Create a free circle, invite your members, and start pooling savings with complete transparency.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="rounded-xl bg-white px-8 py-3.5 font-bold text-xs text-blue-900 transition hover:bg-blue-50 shadow-lg hover:shadow-xl"
              >
                Create Free Account
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="rounded-xl border border-white/30 px-8 py-3.5 font-bold text-xs text-white transition hover:bg-white/10 backdrop-blur hover:border-white/50"
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
