import { useState, useEffect, useRef } from 'react'

const STATS = [
  { value: '827+', label: 'Locations Monitored' },
  { value: '99%',  label: 'Model Accuracy' },
  { value: '15m',  label: 'Refresh Interval' },
  { value: '7',    label: 'Day Forecast' },
]

const FEATURES = [
  {
    icon: '🌧️',
    title: 'Real-Time Detection',
    desc: 'Live data from OpenWeatherMap API updated every 15 minutes across 827+ Indian cities and districts.',
  },
  {
    icon: '🤖',
    title: 'ML-Powered Prediction',
    desc: 'Random Forest model trained on 8,000+ weather records with 99% accuracy and 0.999 AUC-ROC score.',
  },
  {
    icon: '📅',
    title: '7-Day Forecast',
    desc: 'Full week cloudburst probability forecast with hourly breakdown and rain intensity analysis.',
  },
  {
    icon: '🚨',
    title: 'Instant Alerts',
    desc: 'Browser push notifications the moment risk goes HIGH or CRITICAL for your selected location.',
  },
  {
    icon: '🗺️',
    title: 'Pan-India Coverage',
    desc: 'Every state, union territory, and district from Kashmir to Kanyakumari — including Tier 3 towns.',
  },
  {
    icon: '📊',
    title: 'Deep Analytics',
    desc: 'Rain intensity charts, pressure trends, humidity analysis, and side-by-side city comparisons.',
  },
]

const HIGH_RISK = [
  { name: 'Cherrapunji', state: 'Meghalaya',  risk: 'HIGH',     prob: 68 },
  { name: 'Kedarnath',   state: 'Uttarakhand', risk: 'MODERATE', prob: 42 },
  { name: 'Munnar',      state: 'Kerala',      risk: 'MODERATE', prob: 38 },
  { name: 'Manali',      state: 'Himachal',    risk: 'LOW',      prob: 12 },
  { name: 'Darjeeling',  state: 'W. Bengal',   risk: 'LOW',      prob: 18 },
]

const RISK_COLOR = { LOW: '#639922', MODERATE: '#EF9F27', HIGH: '#E24B4A', CRITICAL: '#E24B4A' }
const RISK_BG    = { LOW: 'rgba(99,153,34,0.12)', MODERATE: 'rgba(239,159,39,0.12)', HIGH: 'rgba(226,75,74,0.15)', CRITICAL: 'rgba(226,75,74,0.2)' }

export default function HomePage({ onEnter }) {
  const [visible,    setVisible]    = useState(false)
  const [rainDrops,  setRainDrops]  = useState([])
  const [statCounts, setStatCounts] = useState([0, 0, 0, 0])
  const heroRef = useRef(null)

  useEffect(() => {
    setVisible(true)
    // Generate rain drops
    setRainDrops(Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 0.5 + Math.random() * 1,
      height: 12 + Math.random() * 20,
      opacity: 0.1 + Math.random() * 0.25,
    })))
    // Animate stats
    const targets = [827, 99, 15, 7]
    const duration = 2000
    const steps = 60
    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3)
      setStatCounts(targets.map(t => Math.round(t * eased)))
      if (step >= steps) clearInterval(timer)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{ background: '#070b14', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&family=Space+Mono:wght@400;700&display=swap');
        @keyframes rainFall { 0%{transform:translateY(-30px);opacity:0} 10%{opacity:1} 90%{opacity:0.8} 100%{transform:translateY(100vh);opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        @keyframes scanLine { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(24,95,165,0.3)} 50%{box-shadow:0 0 40px rgba(24,95,165,0.6),0 0 60px rgba(24,95,165,0.2)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .nav-link:hover { color: #4fc3f7 !important; }
        .feature-card:hover { transform: translateY(-6px) !important; border-color: rgba(79,195,247,0.4) !important; }
        .enter-btn:hover { transform: scale(1.04) !important; box-shadow: 0 0 50px rgba(24,95,165,0.7) !important; }
        .risk-row:hover { background: rgba(255,255,255,0.04) !important; }
      `}</style>

      {/* Animated rain background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {rainDrops.map(d => (
          <div key={d.id} style={{
            position: 'absolute', left: `${d.left}%`, top: 0,
            width: '1.5px', height: `${d.height}px`,
            background: `linear-gradient(to bottom, transparent, rgba(79,195,247,${d.opacity}))`,
            animation: `rainFall ${d.duration}s linear infinite`,
            animationDelay: `${d.delay}s`,
          }} />
        ))}
        {/* Gradient overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(24,95,165,0.12) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 80% 80%, rgba(29,158,117,0.08) 0%, transparent 60%)' }} />
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(79,195,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,195,247,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      {/* NAVBAR */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', borderBottom: '0.5px solid rgba(79,195,247,0.1)', backdropFilter: 'blur(10px)', background: 'rgba(7,11,20,0.7)', animation: 'fadeIn 0.6s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #185FA5, #1D9E75)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', animation: 'glow 3s ease infinite' }}>⛈</div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 800, color: '#e6edf3', letterSpacing: '0.5px' }}>CLOUDBURST<span style={{ color: '#4fc3f7' }}>·AI</span></div>
            <div style={{ fontSize: '10px', color: '#4fc3f7', letterSpacing: '1px', marginTop: '-1px' }}>DETECTION SYSTEM</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          {[['Features','#features'],['How it Works','#how-it-works'],['Coverage','#coverage']].map(([label, href]) => (
            <a key={label} className="nav-link" href={href}
              onClick={e => { e.preventDefault(); document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }) }}
              style={{ fontSize: '13px', color: '#8b949e', textDecoration: 'none', transition: 'color .2s', fontWeight: 500 }}>{label}</a>
          ))}
          <button onClick={onEnter} className="enter-btn" style={{ padding: '8px 20px', background: 'rgba(24,95,165,0.2)', border: '1px solid rgba(24,95,165,0.5)', borderRadius: '8px', color: '#4fc3f7', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all .2s', fontFamily: "'DM Sans', sans-serif" }}>
            Open Dashboard →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 48px 60px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '60px', alignItems: 'center' }}>

          <div>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', background: 'rgba(24,95,165,0.15)', border: '1px solid rgba(24,95,165,0.4)', borderRadius: '20px', marginBottom: '28px', animation: visible ? 'fadeUp 0.6s ease both' : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '11px', color: '#4fc3f7', fontWeight: 500, letterSpacing: '0.5px' }}>LIVE — OpenWeatherMap Integrated</span>
            </div>

            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '58px', fontWeight: 800, color: '#e6edf3', lineHeight: 1.05, margin: '0 0 24px', animation: visible ? 'fadeUp 0.7s ease 0.1s both' : 'none' }}>
              Predict<br />
              <span style={{ color: '#4fc3f7' }}>Cloudbursts</span><br />
              Before They<br />
              <span style={{ background: 'linear-gradient(90deg, #185FA5, #1D9E75)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Strike.</span>
            </h1>

            <p style={{ fontSize: '16px', color: '#8b949e', lineHeight: 1.7, maxWidth: '480px', margin: '0 0 36px', animation: visible ? 'fadeUp 0.7s ease 0.2s both' : 'none' }}>
              AI-powered early warning system for India's most flood-prone regions.
              Real-time meteorological data, machine learning predictions, and
              instant alerts — covering <strong style={{ color: '#c9d1d9' }}>827+ cities and districts</strong>.
            </p>

            <div style={{ display: 'flex', gap: '14px', animation: visible ? 'fadeUp 0.7s ease 0.3s both' : 'none' }}>
              <button onClick={onEnter} className="enter-btn" style={{
                padding: '14px 32px', background: 'linear-gradient(135deg, #185FA5, #1368b4)', border: 'none', borderRadius: '10px',
                color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", transition: 'all .25s', boxShadow: '0 0 30px rgba(24,95,165,0.4)',
                animation: 'glow 3s ease 1s infinite',
              }}>
                Launch Dashboard ↗
              </button>
              <a href="https://github.com/Samarth1225/cloud-burst-detection-system" target="_blank" rel="noopener noreferrer" style={{
                padding: '14px 28px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                color: '#8b949e', fontSize: '15px', fontWeight: 500, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all .2s',
              }}>
                ⭐ GitHub
              </a>
            </div>
          </div>

          {/* Live risk panel */}
          <div style={{ animation: visible ? 'fadeUp 0.8s ease 0.4s both' : 'none' }}>
            <div style={{
              background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(79,195,247,0.15)', borderRadius: '16px',
              overflow: 'hidden', backdropFilter: 'blur(20px)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}>
              {/* Terminal header */}
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(79,195,247,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E24B4A' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF9F27' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1D9E75' }} />
                <span style={{ marginLeft: '8px', fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#4fc3f7' }}>cloudburst-ai — live monitor</span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: '10px', color: '#1D9E75' }}>LIVE</span>
                </div>
              </div>

              {/* Scan line effect */}
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, rgba(79,195,247,0.4), transparent)', animation: 'scanLine 4s linear infinite', zIndex: 1 }} />

                <div style={{ padding: '16px' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#8b949e', marginBottom: '12px' }}>
                    <span style={{ color: '#4fc3f7' }}>// </span>real-time risk levels — {new Date().toLocaleDateString('en-IN')}
                  </div>

                  {HIGH_RISK.map((loc, i) => (
                    <div key={loc.name} className="risk-row" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '8px', marginBottom: '6px',
                      background: 'rgba(255,255,255,0.02)', border: `1px solid ${RISK_COLOR[loc.risk]}22`,
                      transition: 'background .15s', animationDelay: `${i * 0.1}s`,
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#e6edf3', fontWeight: 500 }}>{loc.name}</div>
                        <div style={{ fontSize: '10px', color: '#8b949e', marginTop: '1px' }}>{loc.state}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${loc.prob}%`, height: '100%', background: RISK_COLOR[loc.risk], borderRadius: '2px', transition: 'width 1s ease' }} />
                        </div>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, color: RISK_COLOR[loc.risk], minWidth: '36px', textAlign: 'right' }}>{loc.prob}%</span>
                        <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '6px', fontWeight: 600, background: RISK_BG[loc.risk], color: RISK_COLOR[loc.risk], border: `1px solid ${RISK_COLOR[loc.risk]}44` }}>{loc.risk}</span>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: '14px', padding: '10px 12px', background: 'rgba(24,95,165,0.1)', border: '1px solid rgba(24,95,165,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#4fc3f7' }}>827 stations monitored</span>
                    <button onClick={onEnter} style={{ fontSize: '11px', color: '#4fc3f7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>View all →</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '64px', animation: visible ? 'fadeUp 0.8s ease 0.5s both' : 'none' }}>
          {STATS.map((stat, i) => (
            <div key={stat.label} style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(79,195,247,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '36px', fontWeight: 800, color: '#e6edf3', lineHeight: 1 }}>
                {i === 0 ? statCounts[0]+'+' : i === 1 ? statCounts[1]+'%' : i === 2 ? statCounts[2]+'m' : statCounts[3]}
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '6px', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ position: 'relative', zIndex: 1, padding: '80px 48px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <div style={{ fontSize: '11px', color: '#4fc3f7', letterSpacing: '2px', fontWeight: 600, marginBottom: '12px' }}>CAPABILITIES</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '40px', fontWeight: 800, color: '#e6edf3', margin: 0 }}>
            Everything you need to<br /><span style={{ color: '#4fc3f7' }}>stay ahead of storms</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="feature-card" style={{
              padding: '28px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(79,195,247,0.1)',
              borderRadius: '14px', transition: 'all .25s', cursor: 'default',
              animation: visible ? `fadeUp 0.6s ease ${0.1 * i}s both` : 'none',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '14px' }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '17px', fontWeight: 700, color: '#e6edf3', margin: '0 0 10px' }}>{f.title}</h3>
              <p style={{ fontSize: '13px', color: '#8b949e', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ position: 'relative', zIndex: 1, padding: '60px 48px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <div style={{ fontSize: '11px', color: '#4fc3f7', letterSpacing: '2px', fontWeight: 600, marginBottom: '12px' }}>PIPELINE</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '40px', fontWeight: 800, color: '#e6edf3', margin: 0 }}>How it works</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0' }}>
          {[
            { step: '01', icon: '🛰️', title: 'Data Ingestion', desc: 'Live weather pulled from OpenWeatherMap API every 15 minutes' },
            { step: '02', icon: '⚙️', title: 'Feature Engineering', desc: '29 meteorological features: CAPE proxy, moisture flux, rolling stats' },
            { step: '03', icon: '🧠', title: 'ML Prediction', desc: 'Random Forest model scores cloudburst probability 0–100%' },
            { step: '04', icon: '🚨', title: 'Alert & Display', desc: 'Risk level shown on dashboard, browser notification sent instantly' },
          ].map((step, i) => (
            <div key={step.step} style={{ position: 'relative', padding: '32px 24px', textAlign: 'center' }}>
              {i < 3 && <div style={{ position: 'absolute', top: '44px', right: '-1px', width: '50%', height: '1px', background: 'linear-gradient(90deg, rgba(79,195,247,0.4), transparent)', zIndex: 1 }} />}
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(24,95,165,0.2)', border: '1px solid rgba(79,195,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 16px' }}>{step.icon}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#4fc3f7', marginBottom: '8px' }}>{step.step}</div>
              <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700, color: '#e6edf3', margin: '0 0 8px' }}>{step.title}</h4>
              <p style={{ fontSize: '12px', color: '#8b949e', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>


      {/* COVERAGE */}
      <section id="coverage" style={{ position: 'relative', zIndex: 1, padding: '60px 48px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
          <div style={{ fontSize: '11px', color: '#4fc3f7', letterSpacing: '2px', fontWeight: 600, marginBottom: '12px' }}>COVERAGE</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '40px', fontWeight: 800, color: '#e6edf3', margin: 0 }}>
            Every corner of <span style={{ color: '#4fc3f7' }}>India</span>
          </h2>
          <p style={{ fontSize: '14px', color: '#8b949e', marginTop: '14px' }}>827+ locations across all 28 states and 8 union territories</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {[
            { region: 'North India',      states: 'Punjab · Haryana · HP · UK · J&K · Ladakh · Delhi', count: '220+', icon: '🏔️' },
            { region: 'West India',       states: 'Rajasthan · Gujarat · Maharashtra · Goa',            count: '140+', icon: '🌵' },
            { region: 'South India',      states: 'Kerala · Karnataka · Tamil Nadu · AP · Telangana',   count: '180+', icon: '🌴' },
            { region: 'East & Northeast', states: 'WB · Assam · Meghalaya · Sikkim · Arunachal + more', count: '180+', icon: '🌧️' },
            { region: 'Central India',    states: 'MP · Chhattisgarh · Jharkhand · Bihar · UP',         count: '160+', icon: '🌾' },
            { region: 'High Risk Zones',  states: 'Cherrapunji · Kedarnath · Munnar · Darjeeling',      count: 'Priority', icon: '⚠️' },
            { region: 'Hill Stations',    states: 'Shimla · Manali · Ooty · Kodaikanal · Mussoorie',    count: '50+', icon: '⛰️' },
            { region: 'Coastal Areas',    states: 'Mumbai · Kochi · Chennai · Visakhapatnam · Goa',     count: '40+', icon: '🌊' },
          ].map(r => (
            <div key={r.region} style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(79,195,247,0.1)', borderRadius: '12px', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(79,195,247,0.35)'; e.currentTarget.style.background='rgba(79,195,247,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(79,195,247,0.1)'; e.currentTarget.style.background='rgba(255,255,255,0.03)' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{r.icon}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, color: '#e6edf3', marginBottom: '6px' }}>{r.region}</div>
              <div style={{ fontSize: '11px', color: '#8b949e', lineHeight: 1.6, marginBottom: '10px' }}>{r.states}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#4fc3f7', fontWeight: 700 }}>{r.count} locations</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '60px 48px 100px', textAlign: 'center' }}>
        <div style={{ maxWidth: '580px', margin: '0 auto' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'float 4s ease infinite' }}>⛈️</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '42px', fontWeight: 800, color: '#e6edf3', margin: '0 0 16px', lineHeight: 1.1 }}>
            Don't wait for the<br /><span style={{ color: '#4fc3f7' }}>storm to come</span>
          </h2>
          <p style={{ fontSize: '15px', color: '#8b949e', marginBottom: '32px', lineHeight: 1.6 }}>
            Search any city, district, or village in India and get instant cloudburst risk assessment.
          </p>
          <button onClick={onEnter} className="enter-btn" style={{
            padding: '16px 48px', background: 'linear-gradient(135deg, #185FA5, #1368b4)', border: 'none', borderRadius: '12px',
            color: '#fff', fontSize: '17px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            transition: 'all .25s', boxShadow: '0 0 40px rgba(24,95,165,0.4)', animation: 'glow 3s ease infinite',
          }}>
            Open Detection System →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '0.5px solid rgba(79,195,247,0.1)', padding: '24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#484f58' }}>
          © 2026 Cloudburst·AI — Built by Samarth1225
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="https://github.com/Samarth1225/cloud-burst-detection-system" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#484f58', textDecoration: 'none' }}>GitHub ↗</a>
          <span style={{ fontSize: '12px', color: '#484f58' }}>Powered by OpenWeatherMap</span>
        </div>
      </footer>

    </div>
  )
}
