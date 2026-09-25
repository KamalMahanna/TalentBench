"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/context/theme-context";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { initGSAP } from "@/lib/animations/gsap-setup";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  FileText,
  Menu,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Moon,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PipelinePreview } from "@/components/landing/pipeline-preview";
import { useLenis } from "@/lib/animations/lenis-provider";

const faqs = [
  [
    "What is TalentBench?",
    "TalentBench gives recruiting teams one clear workspace to review candidates, compare evidence, and make consistent decisions.",
  ],
  [
    "Can I customize the scorecard?",
    "Yes. Start with a role template or create your own criteria, weights, and interview rounds.",
  ],
  [
    "Is candidate data shared with candidates?",
    "You choose what to share. Candidate reports can include strengths, next steps, and benchmark context.",
  ],
];

const stats = [
  { value: "1,248", label: "Candidates reviewed", icon: Users, tone: "lavender" },
  { value: "86%", label: "Shortlist confidence", icon: BarChart3, tone: "blue" },
  { value: "4.8 days", label: "Average time to hire", icon: Sparkles, tone: "peach" },
];

const candidates = [
  {
    initials: "AM",
    name: "Avery Morgan",
    role: "Senior Product Designer",
    score: 92,
    status: "Strong match",
    color: "purple",
  },
  {
    initials: "JL",
    name: "Jordan Lee",
    role: "Product Designer",
    score: 87,
    status: "Review next",
    color: "blue",
  },
  {
    initials: "SK",
    name: "Samira Khan",
    role: "UX Researcher",
    score: 81,
    status: "Needs review",
    color: "green",
  },
];

const heroContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function Button({
  children,
  variant = "filled",
  onClick,
  href,
  className = "",
}: {
  children: React.ReactNode;
  variant?: "filled" | "tonal" | "text";
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const buttonClasses = `md-button md-button--${variant}${className ? ` ${className}` : ""}`;
  if (href) {
    return (
      <Link href={href} className={buttonClasses}>
        {children}
      </Link>
    );
  }
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={buttonClasses}
    >
      {children}
    </motion.button>
  );
}

function Avatar({
  initials,
  color = "purple",
}: {
  initials: string;
  color?: string;
}) {
  return <div className={`avatar avatar--${color}`}>{initials}</div>;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      aria-pressed={isDark}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      <span className="theme-toggle-icon">
        {isDark ? <Moon size={15} /> : <Sun size={15} />}
      </span>
      <span className="theme-toggle-label">{isDark ? "Dark" : "Light"}</span>
      <span className="theme-toggle-knob" />
    </button>
  );
}

export default function Home() {
  const { lenis } = useLenis();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const statsRowRef = useRef<HTMLElement>(null);
  const stat1Ref = useRef<HTMLElement>(null);
  const stat2Ref = useRef<HTMLElement>(null);
  const stat3Ref = useRef<HTMLElement>(null);
  const reportScoreNumRef = useRef<HTMLElement>(null);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    if (lenis) {
      lenis.scrollTo(el, { offset: -76 });
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    if (lenis) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const { gsap } = initGSAP();

    const ctx = gsap.context(() => {
      // 1. Stats row reveal & number counters
      const statItems = [
        { ref: stat1Ref, target: 1248, format: (v: number) => Math.round(v).toLocaleString() },
        { ref: stat2Ref, target: 86, format: (v: number) => `${Math.round(v)}%` },
        { ref: stat3Ref, target: 4.8, format: (v: number) => `${v.toFixed(1)} days` },
      ];

      gsap.from(".stat-tile", {
        scrollTrigger: {
          trigger: statsRowRef.current || ".stats-row",
          start: "top 85%",
        },
        y: 28,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
        onStart: () => {
          statItems.forEach(({ ref, target, format }) => {
            if (!ref.current) return;
            const obj = { val: 0 };
            gsap.to(obj, {
              val: target,
              duration: 1.4,
              ease: "power2.out",
              onUpdate: () => {
                if (ref.current) ref.current.innerText = format(obj.val);
              },
            });
          });
        },
      });

      // 2. Feature Cards Stagger on Scroll
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: ".feature-grid",
          start: "top 80%",
        },
        y: 36,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: "power2.out",
      });

      // 3. Scorecard Demo Bars Fill
      gsap.from(".scorecard-demo .demo-bar i", {
        scrollTrigger: {
          trigger: ".scorecard-demo",
          start: "top 85%",
        },
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.9,
        stagger: 0.15,
        ease: "power3.out",
      });

      // 4. Report Card Circular Score & Bars
      gsap.from(".circle-progress", {
        scrollTrigger: {
          trigger: ".report-card",
          start: "top 80%",
        },
        strokeDashoffset: 264,
        duration: 1.5,
        ease: "power2.out",
      });

      gsap.from(".report-bars b", {
        scrollTrigger: {
          trigger: ".report-bars",
          start: "top 85%",
        },
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.1,
        stagger: 0.15,
        ease: "power3.out",
      });

      // 5. Report score number counter: 0 -> 92
      if (reportScoreNumRef.current) {
        const scoreObj = { val: 0 };
        gsap.to(scoreObj, {
          scrollTrigger: {
            trigger: ".report-score",
            start: "top 85%",
          },
          val: 92,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: () => {
            if (reportScoreNumRef.current) {
              reportScoreNumRef.current.innerText = String(Math.round(scoreObj.val));
            }
          },
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="material-shell">
      <header className="app-bar">
        <a className="brand" href="#top" onClick={scrollToTop} aria-label="TalentBench home">
          <Image
            src="/logo.png"
            alt="TalentBench Logo"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
            priority
          />
          <span>TalentBench</span>
        </a>
        <nav className={menuOpen ? "main-nav main-nav--open" : "main-nav"}>
          <button onClick={() => scrollTo("product")}>Product</button>
          <button onClick={() => scrollTo("workspace")}>Workspace</button>
          <button onClick={() => scrollTo("reports")}>Reports</button>
          <button onClick={() => scrollTo("how-it-works")}>How it works</button>
          <button onClick={() => scrollTo("pipeline")}>Pipeline</button>
          <ThemeToggle />
          <Button variant="filled" href="/dashboard">
            Try TalentBench <ArrowRight size={16} />
          </Button>
        </nav>
        <button
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      <main id="top">
        <section className="hero-material" id="product">
          <motion.div
            className="hero-copy-material"
            variants={heroContainerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={heroItemVariants} className="status-chip">
              <span className="status-dot" /> Recruiting, made clearer
            </motion.div>
            <motion.h1 variants={heroItemVariants}>
              Make better<br />
              <span>hiring decisions.</span>
            </motion.h1>
            <motion.p variants={heroItemVariants}>
              One friendly workspace for reviewing candidates, calibrating your team, and turning every interview into useful signal.
            </motion.p>
            <motion.div variants={heroItemVariants} className="hero-buttons">
              <Button href="/dashboard">
                Explore the workspace <ArrowRight size={17} />
              </Button>
              <Button variant="text" onClick={() => scrollTo("reports")}>
                See a sample report
              </Button>
            </motion.div>
            <motion.div variants={heroItemVariants} className="trusted-line">
              <span>Built for thoughtful teams</span>
              <i />
              <span>Fair by design</span>
              <i />
              <span>Simple to start</span>
            </motion.div>
          </motion.div>
          <motion.div
            className="hero-preview"
            aria-label="TalentBench workspace preview"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="preview-window">
              <div className="preview-toolbar">
                <span className="toolbar-title">
                  <span className="mini-mark">
                    <Sparkles size={12} />
                  </span>{" "}
                  Product design / Q3
                </span>
                <span className="toolbar-actions">
                  <Search size={15} />
                  <Settings2 size={15} />
                </span>
              </div>
              <div className="preview-body">
                <aside className="preview-sidebar">
                  <span className="sidebar-active">
                    <BarChart3 size={15} /> Overview
                  </span>
                  <span>
                    <Users size={15} /> Candidates
                  </span>
                  <span>
                    <ClipboardList size={15} /> Scorecards
                  </span>
                  <span>
                    <FileText size={15} /> Reports
                  </span>
                </aside>
                <div className="preview-content">
                  <div className="preview-heading">
                    <div>
                      <small>Good morning, Priya</small>
                      <h3>Product design / Q3</h3>
                    </div>
                    <span className="small-pill">Live pipeline</span>
                  </div>
                  <div className="preview-metrics">
                    <div>
                      <small>In review</small>
                      <strong>24</strong>
                      <span>+6 this week</span>
                    </div>
                    <div>
                      <small>Shortlisted</small>
                      <strong>8</strong>
                      <span>33% of pipeline</span>
                    </div>
                    <div>
                      <small>Avg. score</small>
                      <strong>87</strong>
                      <span>+4 vs last role</span>
                    </div>
                  </div>
                  <div className="preview-list">
                    <div className="list-title">
                      <span>Recent candidates</span>
                      <span>View all</span>
                    </div>
                    {candidates.map((candidate) => (
                      <motion.div
                        className="preview-candidate"
                        key={candidate.name}
                        whileHover={{ scale: 1.015, x: 2, transition: { duration: 0.15 } }}
                      >
                        <Avatar
                          initials={candidate.initials}
                          color={candidate.color}
                        />
                        <div>
                          <strong>{candidate.name}</strong>
                          <small>{candidate.role}</small>
                        </div>
                        <b>{candidate.score}</b>
                        <span
                          className={`match-pill match-pill--${candidate.color}`}
                        >
                          {candidate.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section
          ref={statsRowRef}
          className="stats-row section-wrap"
          aria-label="TalentBench results"
        >
          {stats.map(({ value, label, icon: Icon, tone }, index) => {
            const statRef = index === 0 ? stat1Ref : index === 1 ? stat2Ref : stat3Ref;
            return (
              <div
                className={`stat-tile stat-tile--${tone}`}
                key={label}
              >
                <span className="stat-icon">
                  <Icon size={19} />
                </span>
                <div>
                  <strong ref={statRef}>{value}</strong>
                  <span>{label}</span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="workspace-section section-wrap" id="workspace">
          <div className="section-intro">
            <div className="section-kicker">A calmer recruiting workspace</div>
            <h2>
              Everything you need.<br />
              <span>Nothing you don’t.</span>
            </h2>
            <p>
              TalentBench keeps the important parts of hiring together, so your team can spend less time formatting and more time deciding.
            </p>
          </div>
          <div className="feature-grid">
            <motion.article
              className="feature-card feature-card--large"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="feature-icon feature-icon--purple">
                <Users size={21} />
              </div>
              <h3>Review candidates together</h3>
              <p>
                See every candidate’s evidence in one place. Leave notes, compare signals, and make the next step obvious.
              </p>
              <div className="review-stack">
                <motion.div
                  className="review-row"
                  whileHover={{ scale: 1.015, x: 2, transition: { duration: 0.15 } }}
                >
                  <Avatar initials="AM" color="purple" />
                  <span>Avery Morgan</span>
                  <b>92</b>
                  <Check size={16} />
                </motion.div>
                <motion.div
                  className="review-row"
                  whileHover={{ scale: 1.015, x: 2, transition: { duration: 0.15 } }}
                >
                  <Avatar initials="JL" color="blue" />
                  <span>Jordan Lee</span>
                  <b>87</b>
                  <Check size={16} />
                </motion.div>
                <motion.div
                  className="review-row"
                  whileHover={{ scale: 1.015, x: 2, transition: { duration: 0.15 } }}
                >
                  <Avatar initials="SK" color="green" />
                  <span>Samira Khan</span>
                  <b>81</b>
                  <Check size={16} />
                </motion.div>
              </div>
            </motion.article>
            <motion.article
              className="feature-card feature-card--accent"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="feature-icon feature-icon--blue">
                <BarChart3 size={21} />
              </div>
              <h3>Use a scorecard everyone understands</h3>
              <p>
                Set the criteria, add your weights, and keep interviews consistent from first screen to final round.
              </p>
              <div className="scorecard-demo">
                <div>
                  <span>Product thinking</span>
                  <b>90%</b>
                </div>
                <div className="demo-bar">
                  <i style={{ width: "90%" }} />
                </div>
                <div>
                  <span>Craft & execution</span>
                  <b>82%</b>
                </div>
                <div className="demo-bar">
                  <i style={{ width: "82%" }} />
                </div>
                <div>
                  <span>Collaboration</span>
                  <b>94%</b>
                </div>
                <div className="demo-bar">
                  <i style={{ width: "94%" }} />
                </div>
              </div>
            </motion.article>
            <motion.article
              className="feature-card"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="feature-icon feature-icon--peach">
                <FileText size={21} />
              </div>
              <h3>Give useful feedback</h3>
              <p>
                Turn your process into a clear candidate report with strengths, gaps, and next steps.
              </p>
              <Button variant="tonal" onClick={() => scrollTo("reports")}>
                View sample report <ArrowRight size={15} />
              </Button>
            </motion.article>
          </div>
        </section>

        <section className="report-showcase section-wrap" id="reports">
          <div className="report-copy">
            <div className="section-kicker">Candidate reports</div>
            <h2>
              A better way to say<br />
              <span>“here’s where you stand.”</span>
            </h2>
            <p>
              Share a thoughtful snapshot of performance that helps candidates grow and helps your team build trust.
            </p>
            <div className="report-buttons">
              <Button onClick={() => scrollTo("reports")}>
                Explore reports <ArrowRight size={16} />
              </Button>
            </div>
          </div>
          <div className="report-card">
            <div className="report-card-header">
              <div>
                <span className="small-label">Candidate report</span>
                <h3>Avery Morgan</h3>
                <span>Senior Product Designer</span>
              </div>
              <Avatar initials="AM" color="purple" />
            </div>
            <div className="report-score">
              <div>
                <small>Overall benchmark</small>
                <strong>
                  <span ref={reportScoreNumRef}>92</span><span>/100</span>
                </strong>
                <em>Top 12% of shortlist</em>
              </div>
              <div className="circle-score">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" />
                  <circle className="circle-progress" cx="50" cy="50" r="42" />
                </svg>
                <b>92</b>
              </div>
            </div>
            <div className="report-bars">
              <div>
                <span>Product thinking</span>
                <i>
                  <b style={{ width: "90%" }} />
                </i>
              </div>
              <div>
                <span>Craft & execution</span>
                <i>
                  <b style={{ width: "84%" }} />
                </i>
              </div>
              <div>
                <span>Communication</span>
                <i>
                  <b style={{ width: "96%" }} />
                </i>
              </div>
            </div>
          </div>
        </section>

        <HowItWorks />

        <PipelinePreview />

        <section className="faq-section section-wrap">
          <div className="section-intro">
            <div className="section-kicker">Good to know</div>
            <h2>
              Questions,<br />
              <span>answered.</span>
            </h2>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer], index) => (
              <div className="faq-item" key={question}>
                <button
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                >
                  <span>{question}</span>
                  <motion.span
                    animate={{ rotate: openFaq === index ? 45 : 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Plus size={20} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="faq-answer"
                    >
                      <p>{answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        <motion.section
          className="cta-section section-wrap"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <div className="section-kicker">Ready when you are</div>
            <h2>
              Bring a little more<br />
              <span>clarity to hiring.</span>
            </h2>
            <p>
              Start with one role. See what your team can do with a shared point of view.
            </p>
          </div>
          <Button href="/dashboard">
            Get started <ArrowRight size={17} />
          </Button>
        </motion.section>
      </main>

      <footer className="material-footer section-wrap">
        <a className="brand" href="#top" onClick={scrollToTop}>
          <Image
            src="/logo.png"
            alt="TalentBench Logo"
            width={26}
            height={26}
            className="w-6.5 h-6.5 object-contain"
          />
          <span>TalentBench</span>
        </a>
        <span>Recruiting tools for thoughtful teams.</span>
        <span>© 2026 TalentBench</span>
      </footer>
    </div>
  );
}

export { Home as LandingPage };
