import React, { useEffect, useRef, useState } from "react";

import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileAudio,
  FileText,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Play,
  Search,
  Settings,
  Shield,
  Upload,
} from "lucide-react";

import { createJob, getJob, getJobResult, listJobs } from "./api";

// --- MOCK DATA & TYPES ---

type DeliverableCategory = "Summary" | "Analysis" | "Action" | "Insight";

interface DeliverableOption {
  id: string;
  name: string;
  category: DeliverableCategory;
  shortDescription: string;
  outputSections: string[];
  enabled: boolean;
}

interface Job {
  id: string;
  createdAt: string;
  fileName: string;
  optionId: string;
  status: "completed" | "processing" | "failed";
  duration: string | null;
  error?: string | null;
}

const DELIVERABLE_OPTIONS: DeliverableOption[] = [
  {
    id: "opt_session_insight_relationship_pattern_summary",
    name: "Session Insight & Relationship Pattern Summary",
    category: "Summary",
    shortDescription:
      "A grounded overview of the session, highlighting key themes, interaction patterns, and moments of understanding.",
    outputSections: [
      "Session Overview",
      "Core Relationship Dynamics Observed",
      "Expressed Needs and Concerns (As Heard)",
      "Moments of Alignment, Understanding, or Repair",
      "Reflective Questions for Consideration",
    ],
    enabled: true,
  },
  {
    id: "opt_core_conflict_pattern_map",
    name: "Core Conflict Pattern Map",
    category: "Analysis",
    shortDescription:
      "Identifies recurring conflict cycles and how interactions tend to escalate or soften during tension.",
    outputSections: ["Conflict Cycles", "Escalation Points", "Softening/De-escalation"],
    enabled: false,
  },
  {
    id: "opt_emotional_needs_longings_overview",
    name: "Emotional Needs & Longings Overview",
    category: "Insight",
    shortDescription:
      "Surfaces the underlying emotional needs and concerns expressed by each partner during the session.",
    outputSections: ["Partner A", "Partner B", "Shared Needs"],
    enabled: false,
  },
  {
    id: "opt_communication_dynamics_snapshot",
    name: "Communication Dynamics Snapshot",
    category: "Analysis",
    shortDescription:
      "Focuses on how each partner communicates, listens, reacts, and responds under stress or vulnerability.",
    outputSections: ["Communication Patterns", "Listening/Repair", "Stress Responses"],
    enabled: false,
  },
  {
    id: "opt_moments_of_connection_repair",
    name: "Moments of Connection & Repair",
    category: "Insight",
    shortDescription:
      "Highlights moments where empathy, alignment, or emotional repair occurred during the conversation.",
    outputSections: ["Connection Moments", "Repair Attempts", "Shifts in Tone"],
    enabled: false,
  },
  {
    id: "opt_unspoken_assumptions_interpretations",
    name: "Unspoken Assumptions & Interpretations",
    category: "Analysis",
    shortDescription:
      "Reflects implicit assumptions or interpretations that appeared to influence reactions and misunderstandings.",
    outputSections: ["Assumptions", "Interpretations", "Impact on Interaction"],
    enabled: false,
  },
  {
    id: "opt_perspective_taking_summary",
    name: "Perspective-Taking Summary",
    category: "Summary",
    shortDescription:
      "Presents each partner’s perspective side by side to support mutual understanding without blame.",
    outputSections: ["Partner A Perspective", "Partner B Perspective", "Shared Understanding"],
    enabled: false,
  },
  {
    id: "opt_impact_vs_intention_reflection",
    name: "Impact vs. Intention Reflection",
    category: "Insight",
    shortDescription:
      "Explores where intentions differed from impact and how those gaps were experienced in the session.",
    outputSections: ["Intentions Expressed", "Impacts Felt", "Misalignment Points"],
    enabled: false,
  },
  {
    id: "opt_recurring_triggers_sensitivities",
    name: "Recurring Triggers & Sensitivities",
    category: "Analysis",
    shortDescription:
      "Identifies emotional triggers or sensitive themes that repeatedly influenced the interaction.",
    outputSections: ["Triggers", "Sensitive Themes", "Typical Reactions"],
    enabled: false,
  },
  {
    id: "opt_session_themes_meaning_making",
    name: "Session Themes & Meaning-Making",
    category: "Insight",
    shortDescription:
      "Focuses on the broader meaning, values, or narratives shaping the couple’s experience.",
    outputSections: ["Themes", "Values", "Narratives"],
    enabled: false,
  },
  {
    id: "opt_attachment_style_indicators_non_diagnostic",
    name: "Attachment-Style Indicators (Non-Diagnostic)",
    category: "Insight",
    shortDescription:
      "Gently reflects patterns of closeness, distance, reassurance, or self-protection without labeling or diagnosing.",
    outputSections: ["Closeness/Distance", "Reassurance", "Self-Protection"],
    enabled: false,
  },
  {
    id: "opt_power_responsibility_dynamics",
    name: "Power & Responsibility Dynamics",
    category: "Analysis",
    shortDescription: "Explores how responsibility, control, or imbalance showed up in the conversation.",
    outputSections: ["Responsibility", "Control", "Imbalance Patterns"],
    enabled: false,
  },
  {
    id: "opt_emotional_regulation_observations",
    name: "Emotional Regulation Observations",
    category: "Analysis",
    shortDescription:
      "Highlights how emotions were expressed, contained, escalated, or soothed during the session.",
    outputSections: ["Escalation", "Soothing", "Containment"],
    enabled: false,
  },
  {
    id: "opt_language_framing_patterns",
    name: "Language & Framing Patterns",
    category: "Analysis",
    shortDescription:
      "Examines word choices, framing, and phrasing that influenced understanding or misunderstanding.",
    outputSections: ["Word Choices", "Framing", "Phrasing Effects"],
    enabled: false,
  },
  {
    id: "opt_repair_attempts_missed_opportunities",
    name: "Repair Attempts & Missed Opportunities",
    category: "Insight",
    shortDescription:
      "Identifies both successful repair attempts and moments where repair was possible but not reached.",
    outputSections: ["Successful Repairs", "Missed Opportunities", "What Helped"],
    enabled: false,
  },
  {
    id: "opt_shared_goals_points_of_alignment",
    name: "Shared Goals & Points of Alignment",
    category: "Insight",
    shortDescription:
      "Surfaces common hopes, goals, or intentions that emerged despite conflict.",
    outputSections: ["Shared Hopes", "Shared Goals", "Alignment Points"],
    enabled: false,
  },
  {
    id: "opt_narrative_reframing_summary",
    name: "Narrative Reframing Summary",
    category: "Insight",
    shortDescription:
      "Reframes the session conversation into a more coherent, compassionate shared story.",
    outputSections: ["Shared Story", "Compassionate Frame", "Key Shifts"],
    enabled: false,
  },
  {
    id: "opt_session_takeaways_for_reflection",
    name: "Session Takeaways for Reflection",
    category: "Summary",
    shortDescription:
      "Provides a concise set of reflections intended to be revisited between sessions.",
    outputSections: ["Key Takeaways", "What Stood Out", "What to Notice"],
    enabled: false,
  },
  {
    id: "opt_conversation_flow_turning_points",
    name: "Conversation Flow & Turning Points",
    category: "Analysis",
    shortDescription:
      "Tracks how the conversation unfolded and where significant shifts occurred.",
    outputSections: ["Flow Summary", "Turning Points", "Shift Moments"],
    enabled: false,
  },
  {
    id: "opt_integration_meaning_integration_questions",
    name: "Integration & Meaning-Integration Questions",
    category: "Insight",
    shortDescription:
      "Offers reflective prompts to help clients integrate insights into daily awareness.",
    outputSections: ["Reflection Prompts", "Integration", "Daily Awareness"],
    enabled: false,
  },
];

type InsightsJson = {
  session_overview: string[];
  core_relationship_dynamics_observed: string[];
  expressed_needs_and_concerns_as_heard: string[];
  moments_of_alignment_understanding_or_repair: string[];
  reflective_questions_for_consideration: string[];
};

function Paragraphs({
  items,
  paragraphClassName,
}: {
  items: string[] | undefined | null;
  paragraphClassName?: string;
}) {
  if (!items || items.length === 0) return <p className="text-slate-500">—</p>;
  return (
    <div className="space-y-3">
      {items.map((t, i) => (
        <p key={i} className={cn("leading-7", paragraphClassName || "text-slate-600")}>
          {t}
        </p>
      ))}
    </div>
  );
}

function Questions({ items }: { items: string[] | undefined | null }) {
  if (!items || items.length === 0) return <p className="text-slate-500">—</p>;
  return (
    <div className="space-y-4">
      {items.map((q, i) => (
        <div key={i} className="flex gap-4 items-start">
          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-xs font-bold text-slate-500 shrink-0 mt-0.5">
            {i + 1}
          </span>
          <p className="text-slate-800 font-medium italic leading-7">
            {q.startsWith('"') || q.startsWith("“") ? q : `"${q}"`}
          </p>
        </div>
      ))}
    </div>
  );
}

function BulletBlocks({
  items,
  symbol,
  symbolClassName,
}: {
  items: string[] | undefined | null;
  symbol: string;
  symbolClassName: string;
}) {
  if (!items || items.length === 0) return <p className="text-slate-500">—</p>;
  return (
    <div className="space-y-3">
      {items.map((t, i) => (
        <div
          key={i}
          className="flex gap-3 text-sm text-slate-700 bg-white p-3 rounded-md border border-slate-100 shadow-sm"
        >
          <span className={cn(symbolClassName, "font-bold shrink-0")}>{symbol}</span>
          <span className="leading-6">{t}</span>
        </div>
      ))}
    </div>
  );
}

// --- SHADCN-LIKE COMPONENTS ---

const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(" ");

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
    size?: "default" | "sm" | "icon";
  }
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  const base =
    "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const variants = {
    default: "bg-purple-600 text-white hover:bg-purple-700 shadow-sm",
    destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
    outline: "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    ghost: "hover:bg-slate-100 text-slate-900",
  };
  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    icon: "h-10 w-10",
  };
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});
Button.displayName = "Button";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div
    className={cn("rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm", className)}
  >
    {children}
  </div>
);

const CardHeader = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>;

const CardTitle = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
    {children}
  </h3>
);

const CardDescription = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => <p className={cn("text-sm text-slate-500", className)}>{children}</p>;

const CardContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => <div className={cn("p-6 pt-0", className)}>{children}</div>;

const CardFooter = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => <div className={cn("flex items-center p-6 pt-0", className)}>{children}</div>;

const Badge = ({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: "default" | "secondary" | "outline" | "success" | "destructive";
  children: React.ReactNode;
}) => {
  const variants = {
    default: "border-transparent bg-purple-600 text-white hover:bg-purple-700",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "text-slate-950 border-slate-200",
    success: "border-transparent bg-emerald-100 text-emerald-800",
    destructive: "border-transparent bg-red-100 text-red-800",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  );
};

const Separator = ({ className }: { className?: string }) => (
  <div className={cn("shrink-0 bg-slate-200 h-[1px] w-full my-4", className)} />
);

const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
    <div
      className="h-full w-full flex-1 bg-purple-600 transition-all duration-500 ease-in-out"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
);

const Label = ({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  >
    {children}
  </label>
);

// --- APP LOGIC & STATE ---

export default function InsightRelayApp() {
  const [currentPath, setCurrentPath] = useState<"/login" | "/dashboard" | "/dashboard/result">(
    "/login"
  );
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; title: string; desc: string }[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const addToast = (title: string, desc: string) => {
    const id = Math.random().toString(36);
    setToasts((prev) => [...prev, { id, title, desc }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const navigate = (path: "/login" | "/dashboard" | "/dashboard/result", jobId?: string) => {
    if (jobId) setCurrentJobId(jobId);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-purple-100 selection:text-purple-900">
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-slate-200 shadow-lg rounded-lg p-4 w-80 animate-in slide-in-from-right-full fade-in duration-300"
          >
            <h4 className="font-semibold text-sm">{t.title}</h4>
            <p className="text-sm text-slate-500">{t.desc}</p>
          </div>
        ))}
      </div>

      {currentPath === "/login" ? (
        <LoginPage onLogin={() => navigate("/dashboard")} />
      ) : (
        <DashboardLayout
          currentPath={currentPath}
          onNavigate={navigate}
          user={{ name: "Alex Chen", email: "alex@enterprise.co" }}
        >
          {currentPath === "/dashboard" && (
            <DashboardPage
              jobs={jobs}
              setJobs={setJobs}
              onProcessComplete={(id) => navigate("/dashboard/result", id)}
              addToast={addToast}
            />
          )}
          {currentPath === "/dashboard/result" && (
            <ResultPage
              jobId={currentJobId}
              onBack={() => navigate("/dashboard")}
              addToast={addToast}
            />
          )}
        </DashboardLayout>
      )}
    </div>
  );
}

// --- PAGE: LOGIN ---

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const demoEmail = "Henk@insightrelay.com";
  const demoPassword = "Henk@insightrelay.com";
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(demoPassword);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalizedEmail = email.trim();
    if (normalizedEmail !== demoEmail || password !== demoPassword) {
      setError("Invalid credentials. Use the provided demo email and password.");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 500);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">InsightRelay</h1>
          <p className="text-sm text-slate-500">Secure access to your private outputs.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  className="bg-slate-50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs text-purple-600 hover:text-purple-500">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  className="bg-slate-50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error ? <p className="text-xs text-red-600">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>

          <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-4">
            <p className="text-xs text-center text-slate-500 w-full flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" /> Enterprise-grade encryption enabled.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// --- LAYOUT ---

function DashboardLayout({
  children,
  user,
  onNavigate,
  currentPath,
}: {
  children: React.ReactNode;
  user: any;
  onNavigate: any;
  currentPath: string;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavItem = ({ icon: Icon, label, path, active, disabled }: any) => (
    <button
      onClick={() => {
        if (disabled) return;
        onNavigate(path);
      }}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        disabled
          ? "text-slate-400 cursor-not-allowed"
          : active
          ? "bg-purple-50 text-purple-900"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="flex h-16 items-center border-b border-slate-200 bg-white px-4 md:hidden">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="mr-4">
          <Menu className="h-6 w-6 text-slate-600" />
        </button>
        <span className="font-semibold">InsightRelay</span>
        <div className="ml-auto">
          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium text-sm">
            AC
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 md:translate-x-0 md:sticky md:top-0 md:h-screen",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center px-6 border-b border-slate-200">
          <div className="h-6 w-6 rounded-full bg-purple-600 mr-2" />
          <span className="font-bold text-lg tracking-tight">InsightRelay</span>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-64px)] p-4">
          <nav className="space-y-1">
            <NavItem icon={LayoutDashboard} label="Dashboard" path="/dashboard" active={currentPath === "/dashboard"} disabled={false} />
            <NavItem icon={History} label="Job History" path="/dashboard" active={false} disabled />
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace</p>
              <NavItem icon={Settings} label="Settings" path="#" active={false} disabled />
            </div>
          </nav>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium text-sm border border-purple-200">
                AC
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">{user.name}</span>
                <span className="text-xs text-slate-500 truncate">{user.email}</span>
              </div>
              <LogOut
                className="ml-auto h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600"
                onClick={() => onNavigate("/login")}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-8">{children}</div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}

// --- PAGE: DASHBOARD ---

function DashboardPage({
  onProcessComplete,
  addToast,
  jobs,
  setJobs,
}: {
  onProcessComplete: (id: string) => void;
  addToast: any;
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>(DELIVERABLE_OPTIONS[0]?.id || "");
  const [processState, setProcessState] = useState<"idle" | "uploading" | "transcribing" | "generating" | "completed">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshJobs = async () => {
    try {
      const res = await listJobs(50, 0);
      setJobs(
        res.items.map((j) => ({
          id: j.id,
          createdAt: j.createdAt,
          fileName: j.fileName || "—",
          optionId: j.optionId,
          status: j.status,
          duration: j.duration,
          error: j.error,
        }))
      );
    } catch (e: any) {
      addToast("Failed to load history", e?.message || "Unknown error");
    }
  };

  // Combobox logic
  const [isComboOpen, setIsComboOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(event.target as Node)) {
        setIsComboOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    refreshJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      addToast("File uploaded", e.dataTransfer.files[0].name);
    }
  };

  const startProcessing = async () => {
    if (!file || !selectedOptionId) return;
    setProcessState("uploading");
    setProgress(5);
    addToast("Processing started", "Uploading your file...");

    try {
      const job = await createJob({ file, optionId: selectedOptionId });
      setActiveJobId(job.id);
      await refreshJobs();

      // Simple UI progression while we poll real status.
      setProcessState("transcribing");
      setProgress(30);

      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        try {
          const j = await getJob(job.id);
          if (j.status === "processing") {
            // keep nudging progress without pretending accuracy
            setProgress((p) => Math.min(90, Math.max(p, 35) + 2));
            setProcessState((s) => (s === "transcribing" ? "generating" : s));
            return;
          }
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          await refreshJobs();

          if (j.status === "failed") {
            setProcessState("idle");
            setProgress(0);
            addToast("Job failed", j.error || "Unknown error");
            return;
          }

          setProcessState("completed");
          setProgress(100);
          addToast("Job Complete", "Redirecting to results...");
          setTimeout(() => onProcessComplete(job.id), 500);
        } catch (e: any) {
          // ignore transient errors while backend is starting
        }
      }, 1200);
    } catch (e: any) {
      setProcessState("idle");
      setProgress(0);
      addToast("Upload failed", e?.message || "Unknown error");
    }
  };

  const selectedOption = DELIVERABLE_OPTIONS.find((o) => o.id === selectedOptionId);
  const filteredOptions = DELIVERABLE_OPTIONS.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Create new structured deliverables from your audio.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* LEFT COLUMN: Input */}
        <div className="md:col-span-7 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>New Processing Job</CardTitle>
              <CardDescription>Upload audio and select your structured output format.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 transition-colors flex flex-col items-center justify-center text-center cursor-pointer",
                  file ? "border-purple-200 bg-purple-50/50" : "border-slate-200 hover:border-purple-400 hover:bg-slate-50"
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => {
                  // Always allow re-open of file picker; clear value first to re-select same file.
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                    fileInputRef.current.click();
                  }
                }}
              >
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  accept=".mp3,.wav,.m4a"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFile(e.target.files[0]);
                      addToast("File selected", e.target.files[0].name);
                    }
                  }}
                />

                {file ? (
                  <div className="flex items-center gap-4 w-full max-w-md">
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <FileAudio className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-slate-900 leading-6 break-words whitespace-normal">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to process
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                          fileInputRef.current.click();
                        } else {
                          setFile(null);
                        }
                      }}
                    >
                      Replace
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <Upload className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-500 mt-1">MP3, M4A, WAV (Max 500MB)</p>
                  </>
                )}
              </div>

              {/* Option Selector (Custom Combobox) */}
              <div className="space-y-2 relative" ref={comboRef}>
                <Label>Structured Deliverable Format</Label>
                <div
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50"
                  onClick={() => setIsComboOpen(!isComboOpen)}
                >
                  <span className={selectedOption ? "text-slate-900" : "text-slate-500"}>
                    {selectedOption ? selectedOption.name : "Select an option..."}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </div>

                {isComboOpen && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                    <div className="flex items-center border-b px-3 py-2">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        className="flex h-5 w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                        placeholder="Search options..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                      {filteredOptions.length === 0 && <p className="p-2 text-sm text-slate-500">No options found.</p>}
                      {filteredOptions.map((opt) => (
                        <div
                          key={opt.id}
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100",
                            selectedOptionId === opt.id && "bg-slate-100 font-medium",
                            !opt.enabled && "opacity-50 cursor-not-allowed hover:bg-white"
                          )}
                          onClick={() => {
                            if (!opt.enabled) return;
                            setSelectedOptionId(opt.id);
                            setIsComboOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedOptionId === opt.id ? "opacity-100" : "opacity-0")} />
                          {opt.name}
                          <span className="ml-auto text-xs text-slate-400 flex items-center gap-2">
                            {!opt.enabled ? <span className="text-slate-400">Coming soon</span> : null}
                            <span>{opt.category}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Selection Preview */}
              {selectedOption && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{selectedOption.name}</h4>
                      <p className="text-sm text-slate-500 mt-1">{selectedOption.shortDescription}</p>
                    </div>
                    <Badge variant="secondary">{selectedOption.category}</Badge>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase">Outputs generated:</span>
                    <ul className="mt-2 space-y-1">
                      {selectedOption.outputSections.map((sec, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-center">
                          <div className="h-1 w-1 rounded-full bg-purple-400 mr-2" />
                          {sec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 border-t bg-slate-50/50 mt-4 pt-4">
              <div className="flex w-full gap-4">
                <Button className="w-full md:w-auto min-w-[140px]" onClick={startProcessing} disabled={!file || !selectedOptionId || processState !== "idle"}>
                  {processState !== "idle" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Process Audio
                </Button>
                {selectedOptionId && <Button variant="outline" disabled>Save as Default</Button>}
              </div>
              <div className="flex items-center text-xs text-slate-400">
                <Shield className="mr-1.5 h-3 w-3" />
                Files and outputs are private to your workspace.
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* RIGHT COLUMN: Status & History */}
        <div className="md:col-span-5 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Job Status</CardTitle>
            </CardHeader>
            <CardContent>
              {processState === "idle" ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                    <Clock className="h-6 w-6" />
                  </div>
                  <p className="text-sm">No active jobs.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="capitalize text-purple-700">{processState}...</span>
                    <span className="text-slate-500">{progress}%</span>
                  </div>
                  <Progress value={progress} />

                  {/* Stepper */}
                  <div className="flex justify-between pt-2">
                    {["Upload", "Transcribe", "Generate"].map((step) => {
                      const isActive =
                        (step === "Upload" && progress > 0) ||
                        (step === "Transcribe" && progress > 30) ||
                        (step === "Generate" && progress > 70);

                      return (
                        <div key={step} className="flex flex-col items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full transition-colors", isActive ? "bg-purple-600" : "bg-slate-200")} />
                          <span className={cn("text-xs transition-colors", isActive ? "text-slate-900 font-medium" : "text-slate-400")}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-md bg-slate-50 p-3 text-xs font-mono text-slate-600">
                    {processState === "uploading" && "> Uploading file to secure bucket..."}
                    {processState === "transcribing" && "> Running speech-to-text engine..."}
                    {processState === "generating" && "> Applying structured prompt model..."}
                    {processState === "completed" && "> Finalizing deliverable document..."}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Recent History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-medium">File Name</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 truncate max-w-[140px]">{job.fileName}</div>
                        <div className="text-xs text-slate-500">
                          {DELIVERABLE_OPTIONS.find((o) => o.id === job.optionId)?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={job.status === "completed" ? "success" : job.status === "failed" ? "destructive" : "secondary"}>
                          {job.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onProcessComplete(job.id)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// --- PAGE: RESULT ---

function ResultPage({
  jobId,
  onBack,
  addToast,
}: {
  jobId: string | null;
  onBack: () => void;
  addToast: any;
}) {
  const [activeTab, setActiveTab] = useState<"transcript" | "metadata">("transcript");
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [segments, setSegments] = useState<Array<{ start: number | null; end: number | null; text: string }>>([]);
  const [insights, setInsights] = useState<InsightsJson | null>(null);
  const [deliverable, setDeliverable] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const option = DELIVERABLE_OPTIONS.find((o) => o.id === job?.optionId) || DELIVERABLE_OPTIONS[0];

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!jobId) return;
      setIsLoading(true);
      try {
        const j = await getJob(jobId);
        if (!mounted) return;
        setJob({
          id: j.id,
          createdAt: j.createdAt,
          fileName: j.fileName || "—",
          optionId: j.optionId,
          status: j.status,
          duration: j.duration,
          error: j.error,
        });

        if (j.status !== "completed") {
          setTranscript("");
          setDeliverable("");
          setIsLoading(false);
          return;
        }

        const r = await getJobResult(jobId);
        if (!mounted) return;
        setTranscript(r.transcript || "");
        setSegments(Array.isArray((r as any).segments) ? ((r as any).segments as any) : []);
        setDeliverable(r.deliverable || "");
        setInsights((r as any).insights || null);
      } catch (e: any) {
        addToast("Failed to load result", e?.message || "Unknown error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [jobId]);

  const handleCopy = () => {
    addToast("Copied to clipboard", "The structured deliverable is now in your clipboard.");
  };

  const fmtTime = (sec: number | null) => {
    if (sec === null || sec === undefined || Number.isNaN(sec as any)) return "";
    const s = Math.max(0, Math.floor(sec));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const two = (n: number) => String(n).padStart(2, "0");
    return hh > 0 ? `${two(hh)}:${two(mm)}:${two(ss)}` : `${two(mm)}:${two(ss)}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <button onClick={onBack} className="hover:text-purple-600 transition-colors">
              Dashboard
            </button>
            <ChevronRight className="h-3 w-3" />
            <span>Results</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-900">{jobId}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{option.name}</h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1">
            <FileAudio className="h-3 w-3" /> {job?.fileName || "—"} • {job?.duration || "—"}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" /> Copy Output
          </Button>
          <Button variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* LEFT COLUMN: Transcript */}
        <div className="md:col-span-4 h-full flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden h-full">
            <div className="flex items-center border-b border-slate-200 px-3 py-2">
              <button
                onClick={() => setActiveTab("transcript")}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === "transcript" ? "bg-purple-100 text-purple-700" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Transcript
              </button>
              <button
                onClick={() => setActiveTab("metadata")}
                className={cn(
                  "ml-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === "metadata" ? "bg-purple-100 text-purple-700" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Metadata
              </button>
            </div>

            {activeTab === "transcript" && (
              <>
                <div className="p-4 space-y-3 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="Search transcript..."
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">Show timestamps</span>
                    <button
                      onClick={() => setShowTimestamps(!showTimestamps)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors flex items-center px-1",
                        showTimestamps ? "bg-purple-600" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "h-4 w-4 rounded-full bg-white shadow transition-transform",
                          showTimestamps ? "translate-x-6" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-4 h-96 overflow-y-auto">
                  {segments.length > 0
                    ? segments.map((seg, i) => (
                        <div key={i} className="text-sm">
                          <div className="flex items-baseline gap-2 mb-1">
                            {showTimestamps ? (
                              <span className="text-xs font-mono text-slate-400 shrink-0">
                                [{fmtTime(seg.start)}–{fmtTime(seg.end)}]
                              </span>
                            ) : null}
                            <span className="font-semibold text-slate-700 text-xs">Speaker</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed pl-2 border-l-2 border-slate-100 ml-1">
                            {seg.text}
                          </p>
                        </div>
                      ))
                    : (transcript || "")
                        .split("\n")
                        .filter(Boolean)
                        .map((line, i) => (
                          <div key={i} className="text-sm">
                            <p className="text-slate-600 leading-relaxed">{line}</p>
                          </div>
                        ))}
                </div>
              </>
            )}

            {activeTab === "metadata" && (
              <div className="p-6 space-y-4">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase">File Info</span>
                  <div className="mt-2 text-sm grid grid-cols-2 gap-2">
                    <span className="text-slate-500">Status:</span> <span className="text-slate-900">{job?.status || "—"}</span>
                    <span className="text-slate-500">Duration:</span> <span className="text-slate-900">{job?.duration || "—"}</span>
                    <span className="text-slate-500">Created:</span> <span className="text-slate-900">{job?.createdAt || "—"}</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase">Participants</span>
                  <div className="mt-2 flex flex-col gap-2">
                    {["Speaker A", "Speaker B", "Speaker C"].map((s) => (
                      <Badge key={s} variant="secondary" className="w-fit">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Deliverable */}
        <div className="md:col-span-8 h-full">
          <Card className="h-full flex flex-col overflow-hidden bg-white shadow-md border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Structured Deliverable
              </CardTitle>
              <CardDescription>Generated by InsightRelay AI • {new Date().toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-8 space-y-8">
              {isLoading ? (
                <div className="text-sm text-slate-500 flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : job?.status === "failed" ? (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-4">
                  {job.error || "Job failed"}
                </div>
              ) : job?.status !== "completed" ? (
                <div className="text-sm text-slate-500">
                  This job is still processing. Go back and refresh in a moment.
                </div>
              ) : (
                <>
                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 pt-2">Session Overview</h3>
                    <Paragraphs items={insights?.session_overview} />
                  </section>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Core Relationship Dynamics</h3>
                    <div className="bg-purple-50 rounded-lg p-5 border border-purple-100">
                      <Paragraphs
                        items={insights?.core_relationship_dynamics_observed}
                        paragraphClassName="text-purple-900"
                      />
                    </div>
                  </section>

                  <div className="grid md:grid-cols-2 gap-8">
                    <section>
                      <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Expressed Needs &amp; Concerns
                      </h3>
                      <BulletBlocks
                        items={insights?.expressed_needs_and_concerns_as_heard}
                        symbol="•"
                        symbolClassName="text-slate-300"
                      />
                    </section>

                    <section>
                      <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        Moments of Alignment
                      </h3>
                      <BulletBlocks
                        items={insights?.moments_of_alignment_understanding_or_repair}
                        symbol="✓"
                        symbolClassName="text-emerald-600"
                      />
                    </section>
                  </div>

                  <Separator />

                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Reflective Questions</h3>
                    <div className="text-sm">
                      <Questions items={insights?.reflective_questions_for_consideration} />
                    </div>
                  </section>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


