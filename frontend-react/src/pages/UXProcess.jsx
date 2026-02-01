import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import CaseStudyImage from '../components/ux/CaseStudyImage'
import { ArrowRight, FileText, ExternalLink } from 'lucide-react'

// Curated professional images — replace with /ux/* when you have local assets
const IMG = {
  hero: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=600&fit=crop',
  research: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&h=500&fit=crop',
  empathy: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=900&h=500&fit=crop',
  journey: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1000&h=450&fit=crop',
  wireframe: (n) => `https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=520&fit=crop&q=80`,
  wireframe2: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=520&fit=crop&q=80',
  wireframe3: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=520&fit=crop&q=80',
  wireframe4: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=520&fit=crop&q=80',
  prototype: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&h=550&fit=crop',
  before: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
  after: 'https://images.unsplash.com/photo-1559757148-5c350d26184c?w=600&h=400&fit=crop',
}
// Professional portrait-style photos for personas
const PERSONA_PHOTOS = {
  Alex: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=face',
  Sam: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=face',
  Jordan: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=face',
}

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4 },
}

const fadeIn = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4 },
}

const PHASES = [
  { id: 'discover', num: '01', title: 'Discover', subtitle: 'Research & empathy' },
  { id: 'define', num: '02', title: 'Define', subtitle: 'Problem & structure' },
  { id: 'develop', num: '03', title: 'Develop', subtitle: 'Ideation & design' },
  { id: 'deliver', num: '04', title: 'Deliver', subtitle: 'Prototype & testing' },
]

const UXProcess = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-foreground">
      {/* Minimal header — Behance-style */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3 sm:py-4">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
          <nav className="flex items-center gap-4">
            {PHASES.map((p) => (
              <a key={p.id} href={`#${p.id}`} className="hidden sm:inline text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                {p.num}
              </a>
            ))}
            <Link
              to="/signup"
              className="text-sm font-medium text-foreground bg-foreground dark:bg-white text-background dark:text-slate-950 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — Behance-style: title, tagline, metadata */}
      <section className="container mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16">
        <motion.div
          className="max-w-4xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
            Case Study · Product Design · UI/UX
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground dark:text-white">
            Split Easy
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-muted-foreground dark:text-slate-400 max-w-2xl font-light">
            Simplifying the journey from shared expenses to settled balances.
          </p>
          <p className="mt-6 text-sm text-muted-foreground dark:text-slate-500 max-w-xl leading-relaxed">
            A sleek and intuitive platform for splitting costs with friends and groups. We applied the Double Diamond framework to explore the problem space, define the right solution, and deliver a user-centred expense-splitting experience.
          </p>
        </motion.div>
        <motion.figure
          className="mt-12 sm:mt-16 rounded-xl overflow-hidden bg-muted/30"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <img
            src={IMG.hero}
            alt="Split Easy UX case study — team collaboration and design process"
            className="w-full object-cover aspect-[21/9]"
            loading="eager"
            decoding="async"
          />
        </motion.figure>
      </section>

      {/* ——— 01 DISCOVER ——— Behance-style */}
      <section id="discover" className="border-t border-border/40 py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <motion.div {...fadeInUp} className="mb-12 sm:mb-16">
            <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground dark:text-slate-500 mb-2">01</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white tracking-tight">Discover</h2>
            <p className="text-sm text-muted-foreground dark:text-slate-400 mt-1">Research & empathy</p>
            <p className="text-muted-foreground dark:text-slate-400 mt-6 max-w-2xl leading-relaxed">
              Understanding users and context through research and empathy. We explored pain points around splitting expenses and group money management.
            </p>
          </motion.div>

          {/* Research Summary */}
          <motion.div {...fadeInUp} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-foreground dark:text-white">Research Summary</h3>
            </div>
            <Card className="rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 p-6 sm:p-8">
              <ul className="space-y-3 text-sm text-muted-foreground dark:text-slate-400">
                <li className="flex gap-3">· Users forget who paid for what and struggle to settle up fairly.</li>
                <li className="flex gap-3">· Manual spreadsheets and mental math lead to awkward conversations.</li>
                <li className="flex gap-3">· People want a simple way to add expenses and see who owes whom.</li>
                <li className="flex gap-3">· Group trips and shared households need one shared view of balances.</li>
              </ul>
            </Card>
            <CaseStudyImage
              src={IMG.research}
              alt="User research and interviews for Split Easy"
              caption="User research sessions and interview insights"
              className="mt-6"
              aspectRatio="16/9"
            />
          </motion.div>

          {/* Persona Cards */}
          <motion.div {...fadeInUp} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-foreground dark:text-white">Personas</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { name: 'Alex', age: 28, role: 'Trip organiser', goals: 'Split costs fairly without hassle', frustrations: 'Chasing people for money' },
                { name: 'Sam', age: 24, role: 'Flatmate', goals: 'See what I owe at a glance', frustrations: 'Unclear who paid for what' },
                { name: 'Jordan', age: 32, role: 'Group diner', goals: 'Pay back quickly and track history', frustrations: 'Multiple apps and messages' },
              ].map((p) => (
                <Card key={p.name} className="rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 p-5 hover:border-border dark:hover:border-slate-700 transition-colors">
                  <img
                    src={PERSONA_PHOTOS[p.name]}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover mb-3 ring-2 ring-border dark:ring-slate-700"
                  />
                  <p className="font-semibold text-foreground">{p.name}, {p.age}</p>
                  <p className="text-xs text-muted-foreground mb-2">{p.role}</p>
                  <p className="text-xs text-foreground"><span className="font-medium">Goals:</span> {p.goals}</p>
                  <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Frustrations:</span> {p.frustrations}</p>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Empathy Map */}
          <motion.div {...fadeInUp} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-foreground dark:text-white">Empathy Map</h3>
            </div>
            {/* Empathy map: central persona + four quadrants + teal oval */}
            <div className="relative min-h-[420px] sm:min-h-[480px] rounded-xl bg-slate-900 dark:bg-slate-950 p-6 sm:p-8 border border-slate-800 dark:border-slate-800 overflow-hidden">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                <ellipse cx="50%" cy="50%" rx="42%" ry="38%" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal-500 dark:text-teal-400" />
              </svg>
              <div className="absolute top-6 left-6 right-6 bottom-6 sm:top-8 sm:left-8 sm:right-8 sm:bottom-8 grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4">
                {[
                  { label: 'Thinks', items: ['I hope everybody pays without me having to remind personally', 'I hope the app clearly shows the expenditure, so that I stay within my budget'] },
                  { label: 'Says', items: ['Splitting bills should be fair and transparent for everyone.', "I don't know how much I'm spending monthly.", 'Why is there no payment option?'] },
                  { label: 'Feels', items: ['Feels frustrated that she has to go to different apps for different purposes', 'Satisfied when everyone settles their debts promptly'] },
                  { label: 'Does', items: ['Remember the amount and pay to her friends.', 'Regularly adds and categorizes bills', 'Checks the app to see balances'] },
                ].map((q) => (
                  <div key={q.label} className="rounded-xl bg-slate-800 dark:bg-slate-700 p-4 sm:p-5 flex flex-col shadow-inner">
                    <p className="text-sm font-semibold text-teal-400 dark:text-teal-300 uppercase tracking-wide mb-2 sm:mb-3 shrink-0">{q.label}</p>
                    <ul className="text-xs sm:text-sm text-white/95 space-y-1.5 list-disc list-inside">
                      {q.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-teal-500/30 dark:ring-teal-400/30 bg-teal-100 dark:bg-teal-900/50 overflow-hidden shadow-lg">
                  <img src={PERSONA_PHOTOS.Sam} alt="Persona — expense splitter" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-sm text-muted-foreground">Empathy map — Thinks, Says, Feels, Does</p>
          </motion.div>

          {/* Benchmark Table */}
          <motion.div {...fadeInUp}>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold text-foreground dark:text-white">Benchmark Comparison</h3>
            </div>
            <Card className="rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border dark:border-slate-800 bg-muted/30 dark:bg-slate-800/50">
                      <th className="text-left p-4 font-semibold text-foreground dark:text-white">App</th>
                      <th className="text-left p-4 font-semibold text-foreground">Pros</th>
                      <th className="text-left p-4 font-semibold text-foreground">Cons</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border dark:border-slate-800"><td className="p-4 font-medium text-foreground dark:text-white">Splitwise</td><td className="p-4">Popular, multi-currency</td><td className="p-4">Cluttered UI, ads</td></tr>
                    <tr className="border-b border-border"><td className="p-4 font-medium text-foreground">Tricount</td><td className="p-4">Simple, offline</td><td className="p-4">Limited groups, older look</td></tr>
                    <tr className="border-b border-border dark:border-slate-800"><td className="p-4 font-medium text-foreground dark:text-white">Split Easy</td><td className="p-4">Clean, group chat, settle flow</td><td className="p-4">Newer, smaller user base</td></tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ——— 02 DEFINE ——— Behance-style */}
      <section id="define" className="border-t border-border/40 py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <motion.div {...fadeInUp} className="mb-12 sm:mb-16">
            <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground dark:text-slate-500 mb-2">02</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white tracking-tight">Define</h2>
            <p className="text-sm text-muted-foreground dark:text-slate-400 mt-1">Problem & structure</p>
            <p className="text-muted-foreground dark:text-slate-400 mt-6 max-w-2xl leading-relaxed">
              Synthesising insights into a clear problem and success criteria. We defined the scope and prioritised features for Split Easy.
            </p>
          </motion.div>

          {/* Problem Statement */}
          <motion.div {...fadeInUp} className="mb-10">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-3">Problem Statement</h3>
            <Card className="rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 p-6 sm:p-8">
              <p className="text-foreground font-medium">
                How might we help groups split expenses and settle up in a simple, transparent way so that no one feels awkward and everyone knows who owes whom?
              </p>
            </Card>
          </motion.div>

          {/* Project Goals */}
          <motion.div {...fadeInUp} className="mb-10">
            <h3 className="font-semibold text-foreground mb-3">Project Goals / UX Objectives</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {['Clear “who owes whom” at a glance', 'One-tap add expense and assign split', 'Settle up flow with confirmation', 'Group chat and notifications', 'Accessible on mobile and desktop'].map((g) => (
                <li key={g} className="flex items-center gap-2">· {g}</li>
              ))}
            </ul>
          </motion.div>

          {/* User Journey Map */}
          <motion.div {...fadeInUp} className="mb-10">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-4">User Journey Map</h3>
            <CaseStudyImage
              src={IMG.journey}
              alt="User journey map — Create group to See results"
              caption="User journey: Create group → Add members → Add expense → See results"
              className="mb-6"
              aspectRatio="20/9"
            />
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-[600px]">
                {[
                  { step: 'Create group', pain: 'Choosing members', emotion: '😕', after: '😊' },
                  { step: 'Add members', pain: 'Invites & permissions', emotion: '😕', after: '😊' },
                  { step: 'Add expense', pain: 'Split logic', emotion: '😕', after: '😊' },
                  { step: 'See results', pain: 'Clarity of balances', emotion: '😕', after: '😊' },
                ].map((s) => (
                  <div key={s.step} className="flex-shrink-0 w-36 rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 p-4 text-center">
                    <p className="font-medium text-foreground text-sm">{s.step}</p>
                    <p className="text-xs text-muted-foreground mt-2">Pain: {s.pain}</p>
                    <p className="mt-2 text-lg">{s.emotion} → {s.after}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Card Sorting + Tree Test */}
          <div className="grid gap-8 sm:grid-cols-2">
            <motion.div {...fadeInUp}>
              <h3 className="text-lg font-semibold text-foreground dark:text-white mb-3">Card Sorting</h3>
              <Card className="rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 p-4 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  {['Groups', 'Expenses', 'Settle', 'Friends', 'Profile', 'Chat', 'Analytics'].map((label) => (
                    <span key={label} className="rounded-lg bg-muted/50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-foreground dark:text-slate-200">
                      {label}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-500 mt-3">Grouped by: Navigation & core flows</p>
              </Card>
            </motion.div>
            <motion.div {...fadeInUp}>
              <h3 className="text-lg font-semibold text-foreground dark:text-white mb-3">Tree Test (Success rate)</h3>
              <Card className="rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 p-4 sm:p-6">
                <div className="flex items-end gap-2 h-24">
                  {[72, 85, 78, 90].map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-foreground dark:bg-slate-500" style={{ height: `${v}%` }} />
                      <span className="text-xs text-muted-foreground dark:text-slate-500">{v}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground dark:text-slate-500 mt-2">Tasks: Add expense, Find balance, Settle, Invite</p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ——— DEVELOP ——— */}
      <section
        id="develop"
        className="relative bg-gradient-to-b from-emerald-50/80 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/10 py-12 sm:py-16"
      >
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div {...fadeInUp}>
            <div className="flex items-center gap-3 mb-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-2xl">💡</span>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Develop</h2>
                <p className="text-sm text-muted-foreground">Ideation & design</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Ideating and designing solutions. We created information architecture, wireframes, and a cohesive visual direction for the product.
            </p>
          </motion.div>

          {/* Mind Map */}
          <motion.div {...fadeInUp} className="mb-10">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-4">Brain Map / Mind Map</h3>
            <Card className="rounded-2xl shadow-md border-emerald-200/60 dark:border-emerald-800/40 bg-white/80 dark:bg-card/80 p-6">
              <div className="flex flex-col items-center">
                <div className="rounded-xl bg-foreground dark:bg-white text-background dark:text-slate-950 font-bold px-6 py-3 mb-6">Split Easy</div>
                <div className="flex flex-wrap justify-center gap-4">
                  {['Group creation', 'Expense adding', 'Balance view', 'Notifications', 'Settle up', 'Chat'].map((branch) => (
                    <div key={branch} className="rounded-xl border-2 border-dashed border-border dark:border-slate-700 px-4 py-2 text-sm font-medium text-foreground dark:text-slate-200">
                      {branch}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* IA / Sitemap */}
          <motion.div {...fadeInUp} className="mb-10">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-4">Information Architecture (Sitemap)</h3>
            <Card className="rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 p-6 sm:p-8">
              <div className="font-mono text-sm text-foreground dark:text-slate-300 space-y-1">
                <p>├── Dashboard</p>
                <p>├── Expenses → Add expense</p>
                <p>├── Groups → [Group] → Edit / Chat</p>
                <p>├── Friends</p>
                <p>├── Settle</p>
                <p>├── Chat</p>
                <p>├── Wallets</p>
                <p>├── Analytics</p>
                <p>└── Profile</p>
              </div>
            </Card>
          </motion.div>

          {/* Wireframes gallery */}
          <motion.div {...fadeInUp} className="mb-10">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-4">Wireframes</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { src: IMG.wireframe(1), label: 'Dashboard sketch' },
                { src: IMG.wireframe2, label: 'Add expense flow' },
                { src: IMG.wireframe3, label: 'Group view' },
                { src: IMG.wireframe4, label: 'Settle flow' },
              ].map((item, i) => (
                <CaseStudyImage
                  key={i}
                  src={item.src}
                  alt={item.label}
                  caption={item.label}
                  aspectRatio="3/4"
                  className="rounded-xl"
                />
              ))}
            </div>
          </motion.div>

          {/* Moodboard */}
          <motion.div {...fadeInUp}>
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-4">Moodboard / Visual Style</h3>
            <Card className="rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 p-6 sm:p-8">
              <div className="flex flex-wrap gap-4">
                <div className="flex gap-2">
                  {['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'].map((c) => (
                    <div key={c} className="h-10 w-10 rounded-lg shadow-inner border border-border" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground dark:text-slate-400">
                  <p className="font-medium text-foreground dark:text-white">Fonts:</p>
                  <p>Inter / system-ui, Tajawal (RTL)</p>
                </div>
                <div className="text-sm text-muted-foreground dark:text-slate-400">
                  <p className="font-medium text-foreground dark:text-white">Icons:</p>
                  <p>Lucide React</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ——— 04 DELIVER ——— Behance-style */}
      <section id="deliver" className="border-t border-border/40 py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <motion.div {...fadeInUp} className="mb-12 sm:mb-16">
            <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground dark:text-slate-500 mb-2">04</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white tracking-tight">Deliver</h2>
            <p className="text-sm text-muted-foreground dark:text-slate-400 mt-1">Prototype & testing</p>
            <p className="text-muted-foreground dark:text-slate-400 mt-6 max-w-2xl leading-relaxed">
              Building, testing, and iterating toward launch. We prototyped, ran user tests, and refined the experience before release.
            </p>
          </motion.div>

          {/* Prototype Preview */}
          <motion.div {...fadeInUp} className="mb-10">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-4">Prototype Preview</h3>
            <Card className="rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 p-6 sm:p-8">
              <p className="text-sm text-muted-foreground dark:text-slate-400 mb-4">Interactive prototype built with React, Tailwind, and real API integration.</p>
              <Link to="/signup">
                <Button className="rounded-xl font-medium">
                  View Prototype
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Card>
          </motion.div>

          {/* User Testing Results */}
          <motion.div {...fadeInUp} className="mb-10">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-4">User Testing Results</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="rounded-2xl shadow-md border-violet-200/60 dark:border-violet-800/40 p-4">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">✓ Liked</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Clear balance view</li>
                  <li>• Easy add expense</li>
                  <li>• Group chat in one place</li>
                </ul>
              </Card>
              <Card className="rounded-2xl shadow-md border-violet-200/60 dark:border-violet-800/40 p-4">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">? Confused</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• First-time settle flow</li>
                  <li>• Who is “payer” vs “receiver”</li>
                </ul>
              </Card>
            </div>
          </motion.div>

          {/* Iteration Board */}
          <motion.div {...fadeInUp} className="mb-10">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-4">Iteration Board</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { problem: 'Settle flow unclear', feedback: 'Users didn’t know who confirms', fix: 'Added “Confirm received” for receiver' },
                { problem: 'Balance wording', feedback: '“You owe” vs “You are owed” mixed', fix: 'Unified labels + icons' },
                { problem: 'Onboarding', feedback: 'New users lost after signup', fix: 'Dashboard summary + empty states' },
              ].map((row) => (
                <Card key={row.problem} className="rounded-2xl shadow-md border-violet-200/60 dark:border-violet-800/40 p-4">
                  <p className="text-xs font-semibold text-muted-foreground dark:text-slate-500 uppercase mb-2">Problem</p>
                  <p className="text-sm text-foreground dark:text-white mb-3">{row.problem}</p>
                  <p className="text-xs font-semibold text-muted-foreground dark:text-slate-500 uppercase mb-2">Feedback</p>
                  <p className="text-sm text-muted-foreground dark:text-slate-400 mb-3">{row.feedback}</p>
                  <p className="text-xs font-semibold text-muted-foreground dark:text-slate-500 uppercase mb-2">Fix</p>
                  <p className="text-sm text-foreground dark:text-white">{row.fix}</p>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Before vs After */}
          <motion.div {...fadeInUp}>
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-4">Before vs After</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <CaseStudyImage
                src={IMG.before}
                alt="Before: unclear settle flow and dense balance list"
                caption="Before — Unclear settle flow, no confirmation step, dense balance list"
                aspectRatio="3/2"
              />
              <CaseStudyImage
                src={IMG.after}
                alt="After: clear settle flow with payer and receiver confirmation"
                caption="After — Payer pays → Receiver confirms; status labels; summary + table"
                aspectRatio="3/2"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 mt-6">
              <Card className="rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 p-5 sm:p-6">
                <p className="text-xs font-semibold text-muted-foreground dark:text-slate-500 mb-3">Before</p>
                <ul className="text-sm text-muted-foreground dark:text-slate-400 space-y-1">
                  <li>· Unclear settle flow</li>
                  <li>· No confirmation step</li>
                  <li>· Dense balance list</li>
                </ul>
              </Card>
              <Card className="rounded-xl border border-border/50 dark:border-slate-800 bg-card dark:bg-slate-900/50 p-5 sm:p-6">
                <p className="text-xs font-semibold text-foreground dark:text-white mb-3">After</p>
                <ul className="text-sm text-foreground dark:text-slate-200 space-y-1">
                  <li>· Payer pays → Receiver confirms</li>
                  <li>· Status: Pending / Awaiting / Paid</li>
                  <li>· Summary + table with actions</li>
                </ul>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ——— CONCLUSION ——— Behance-style */}
      <section id="conclusion" className="border-t border-border/40 py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <motion.div {...fadeIn}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white tracking-tight mb-8">Conclusion</h2>

            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-3">Lessons Learned</h3>
            <ul className="space-y-3 text-muted-foreground dark:text-slate-400 mb-8 leading-relaxed">
              {[
                'User research early prevented overbuilding; we focused on “who owes whom” and settle flow first.',
                'Testing the settle flow with real users revealed the need for receiver confirmation and clear status labels.',
                'Keeping the IA simple (Dashboard, Groups, Expenses, Settle) matched how people think about splitting.',
                'Iterating on copy and labels (Pending / Awaiting confirmation / Paid) reduced confusion in testing.',
              ].map((l) => (
                <li key={l} className="flex gap-2">· {l}</li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-3">Next Steps</h3>
            <ul className="space-y-3 text-muted-foreground dark:text-slate-400 mb-10 leading-relaxed">
              {[
                'Recurring expenses and reminders.',
                'Multi-currency and conversion in settle flow.',
                'Export and reporting for groups.',
                'Mobile app (React Native or PWA).',
              ].map((n) => (
                <li key={n} className="flex gap-2">· {n}</li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="rounded-xl font-medium bg-foreground dark:bg-white text-background dark:text-slate-950 hover:opacity-90">
                  View Split Easy Prototype
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="rounded-xl font-medium border-foreground dark:border-slate-600 text-foreground dark:text-slate-300 hover:bg-muted dark:hover:bg-slate-800" asChild>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <FileText className="mr-2 h-5 w-5" />
                  See Full Case Study PDF
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground dark:text-slate-500">Split Easy · UX/UI Case Study</p>
          <Link to="/" className="text-sm font-medium text-foreground dark:text-white hover:underline">Back to home</Link>
        </div>
      </footer>
    </div>
  )
}

export default UXProcess
