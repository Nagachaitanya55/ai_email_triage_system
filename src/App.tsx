import React, { useState, useEffect, useRef } from "react";
import { 
  EmailTriageEnv, 
  callAgent, 
  Email, 
  TriageAction, 
  EmailCategory, 
  PriorityLevel, 
  Sentiment, 
  ResponseSuggestion, 
  TeamAssignment 
} from "./lib/environment";
import { cn } from "./lib/utils";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { 
  Mail, 
  ShieldAlert, 
  User, 
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  RotateCcw, 
  ChevronRight, 
  BrainCircuit,
  BarChart3,
  MessageSquare,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type TaskType = "basic" | "intermediate" | "advanced";

interface StepLog {
  step: number;
  email: Email;
  action: TriageAction;
  reward: number;
  reason?: string;
}

interface CustomEmail {
  sender: string;
  subject: string;
  body: string;
}

export default function App() {
  const [taskType, setTaskType] = useState<TaskType>("basic");
  const [numSteps, setNumSteps] = useState<number>(1);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [logs, setLogs] = useState<StepLog[]>([]);
  const [observation, setObservation] = useState<any>(null);
  const [isDone, setIsDone] = useState(false);
  const [totalReward, setTotalReward] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customEmails, setCustomEmails] = useState<CustomEmail[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const envRef = useRef<EmailTriageEnv | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isProcessing]);

  const startSimulation = async () => {
    const env = new EmailTriageEnv(
      taskType === "basic" ? "basic" : taskType === "intermediate" ? "intermediate" : "advanced",
      numSteps
    );
    envRef.current = env;
    
    // If custom emails are provided, set them in the environment
    if (customEmails.length > 0) {
      // Filter out empty emails
      const validEmails = customEmails.filter(e => e.sender || e.subject || e.body);
      if (validEmails.length > 0) {
        setIsProcessing(true);
        const emailsWithGT = await Promise.all(validEmails.map(async (e) => {
          const gt = await env.inferGroundTruth(e);
          return {
            id: Math.random().toString(36).substring(7),
            sender: e.sender,
            subject: e.subject,
            body: e.body,
            groundTruth: gt
          };
        }));
        env.emails = emailsWithGT;
      }
    }

    setLogs([]);
    setTotalReward(0);
    setCurrentStep(1);
    setIsRunning(true);
    setIsDone(false);
    setIsProcessing(true);

    try {
      // Reset environment (now async)
      const initialObs = await env.reset();
      setObservation(initialObs);
      await processNextStep(env, initialObs);
    } catch (error) {
      console.error("Simulation failed:", error);
      setIsRunning(false);
      setIsProcessing(false);
    }
  };

  const processNextStep = async (env: EmailTriageEnv, obs: any) => {
    if (!obs) {
      setIsDone(true);
      setIsRunning(false);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    const action = await callAgent(obs, taskType === "basic" ? "basic" : taskType === "intermediate" ? "intermediate" : "advanced");
    const { reward, reason, observation: nextObs, done } = await env.step(action);

    const newLog: StepLog = {
      step: obs.step,
      email: obs.email,
      action,
      reward,
      reason,
    };

    setLogs(prev => [...prev, newLog]);
    setTotalReward(prev => prev + reward);
    setObservation(nextObs);
    setCurrentStep(nextObs ? nextObs.step : null);
    
    if (done) {
      setIsDone(true);
      setIsRunning(false);
      setIsProcessing(false);
    } else {
      // Small delay for visual effect
      setTimeout(() => processNextStep(env, nextObs), 1000);
    }
  };

  const reset = () => {
    setIsRunning(false);
    setCurrentStep(null);
    setLogs([]);
    setObservation(null);
    setIsDone(false);
    setTotalReward(0);
    setIsProcessing(false);
  };

  const addCustomEmail = () => {
    setCustomEmails([...customEmails, { sender: "", subject: "", body: "" }]);
  };

  const updateCustomEmail = (index: number, field: keyof CustomEmail, value: string) => {
    const newEmails = [...customEmails];
    newEmails[index][field] = value;
    setCustomEmails(newEmails);
  };

  const removeCustomEmail = (index: number) => {
    setCustomEmails(customEmails.filter((_, i) => i !== index));
  };

  const getCategoryIcon = (category: EmailCategory) => {
    switch (category) {
      case EmailCategory.WORK: return <Briefcase className="w-4 h-4" />;
      case EmailCategory.PERSONAL: return <User className="w-4 h-4" />;
      case EmailCategory.SPAM: return <ShieldAlert className="w-4 h-4" />;
    }
  };

  const getSentimentIcon = (sentiment?: Sentiment) => {
    switch (sentiment) {
      case Sentiment.POSITIVE: return <TrendingUp className="w-4 h-4 text-green-500" />;
      case Sentiment.NEGATIVE: return <TrendingDown className="w-4 h-4 text-red-500" />;
      case Sentiment.NEUTRAL: return <Minus className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority?: PriorityLevel) => {
    switch (priority) {
      case PriorityLevel.HIGH: return "bg-red-100 text-red-700 border-red-200";
      case PriorityLevel.MEDIUM: return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case PriorityLevel.LOW: return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">AI Email Triage AI</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Autonomous Agent Evaluation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {!isRunning && !isDone ? (
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                {(["basic", "intermediate", "advanced"] as TaskType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTaskType(type)}
                    className={cn(
                      "px-4 py-1.5 text-sm font-semibold rounded-md transition-all",
                      taskType === type 
                        ? "bg-white text-indigo-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-bold">
                  Score: {logs.length > 0 ? (totalReward / logs.length).toFixed(2) : "0.00"}
                </span>
              </div>
            )}

            {!isRunning ? (
              <button
                onClick={isDone ? reset : startSimulation}
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
              >
                {isDone ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isDone ? "Reset" : "Start Simulation"}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 animate-pulse">
                <BrainCircuit className="w-4 h-4" />
                <span className="text-sm font-bold">Agent Thinking...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stats & Current Observation */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Environment Stats
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 mb-1">Step</p>
                <p className="text-2xl font-black text-slate-900">
                  {currentStep ?? 0}<span className="text-slate-300 text-lg">/{numSteps}</span>
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 mb-1">Reward</p>
                <p className="text-2xl font-black text-indigo-600">
                  {logs.length > 0 ? logs[logs.length - 1].reward.toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
            
            {!isRunning && !isDone && (
              <div className="mt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Number of Emails</p>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setNumSteps(Math.max(1, numSteps - 1))}
                    className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-black text-slate-900 w-8 text-center">{numSteps}</span>
                  <button 
                    onClick={() => setNumSteps(Math.min(100, numSteps + 1))}
                    className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Task Difficulty</span>
                <span className="font-bold text-slate-900 capitalize">{taskType}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div 
                  className="bg-indigo-600 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(logs.length / numSteps) * 100}%` }}
                />
              </div>
            </div>
          </section>

          {/* Score Chart Section */}
          {(logs.length > 0 || isRunning) && (
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Reward Progress
              </h2>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={logs.map((log, i) => ({ step: i + 1, reward: log.reward }))}>
                    <defs>
                      <linearGradient id="colorReward" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="step" 
                      hide 
                    />
                    <YAxis 
                      domain={[0, 1]} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="reward" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorReward)" 
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <AnimatePresence mode="wait">
            {observation && !isDone && (
              <motion.section 
                key={observation.email.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
              >
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Observation
                  </h2>
                  <span className="text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded uppercase">Step {observation.step}</span>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">From</p>
                    <p className="text-sm font-bold text-slate-900">{observation.email.sender}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</p>
                    <p className="text-sm font-black text-slate-900 leading-tight">{observation.email.subject}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Body</p>
                    <p className="text-sm text-slate-600 leading-relaxed italic">"{observation.email.body}"</p>
                  </div>
                </div>
              </motion.section>
            )}

            {isDone && (
              <motion.section 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-indigo-600 rounded-2xl p-8 text-center text-white shadow-xl shadow-indigo-200"
              >
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4" />
                <h2 className="text-2xl font-black mb-2">Evaluation Complete</h2>
                <p className="text-indigo-100 text-sm mb-6">The agent has processed all emails in the environment.</p>
                <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
                  <p className="text-xs font-bold text-indigo-200 uppercase mb-1">Final Average Score</p>
                  <p className="text-5xl font-black">{(totalReward / logs.length).toFixed(2)}</p>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Custom Email Input Section */}
          {!isRunning && !isDone && (
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Custom Emails (Optional)
                </h2>
                <button 
                  onClick={() => setShowCustomInput(!showCustomInput)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {showCustomInput ? "Hide" : "Show"}
                </button>
              </div>
              
              {showCustomInput && (
                <div className="space-y-4">
                  {customEmails.map((email, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 relative group">
                      <button 
                        onClick={() => removeCustomEmail(idx)}
                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <input 
                        placeholder="Sender"
                        className="w-full text-xs font-bold bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none pb-1"
                        value={email.sender}
                        onChange={(e) => updateCustomEmail(idx, "sender", e.target.value)}
                      />
                      <input 
                        placeholder="Subject"
                        className="w-full text-xs font-black bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none pb-1"
                        value={email.subject}
                        onChange={(e) => updateCustomEmail(idx, "subject", e.target.value)}
                      />
                      <textarea 
                        placeholder="Body"
                        className="w-full text-xs bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none pb-1 resize-none h-16"
                        value={email.body}
                        onChange={(e) => updateCustomEmail(idx, "body", e.target.value)}
                      />
                    </div>
                  ))}
                  <button 
                    onClick={addCustomEmail}
                    className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Email
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Execution Logs */}
        <div className="lg:col-span-8">
          <section className="bg-white rounded-2xl border border-slate-200 h-[calc(100vh-180px)] flex flex-col shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                Agent Execution Logs
              </h2>
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400/20 border border-red-400/50" />
                <span className="w-3 h-3 rounded-full bg-amber-400/20 border border-amber-400/50" />
                <span className="w-3 h-3 rounded-full bg-green-400/20 border border-green-400/50" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
              {logs.length === 0 && !isProcessing && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <div className="bg-slate-50 p-6 rounded-full">
                    <BrainCircuit className="w-12 h-12 opacity-20" />
                  </div>
                  <p className="text-sm font-medium">Simulation not started. Select difficulty and click start.</p>
                </div>
              )}

              {logs.map((log, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group"
                >
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm",
                        log.reward >= 0.8 ? "bg-green-500 text-white" : 
                        log.reward >= 0.4 ? "bg-amber-500 text-white" : "bg-red-500 text-white"
                      )}>
                        {log.step}
                      </div>
                      <div className="w-px flex-1 bg-slate-100 my-2" />
                    </div>
                    
                    <div className="flex-1 space-y-3 pb-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {log.email.subject}
                        </h3>
                        <p className="text-xs text-slate-500 italic mt-1 line-clamp-2">
                          "{log.email.body}"
                        </p>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              log.reward >= 0.8 ? "bg-green-50 text-green-700 border-green-100" : 
                              log.reward >= 0.4 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-700 border-red-100"
                            )}>
                              Reward: {log.reward.toFixed(2)}
                            </span>
                            {log.reward < 1 && (
                              <span className="text-[10px] font-bold text-slate-400 italic">
                                (Ground Truth: {log.email.groundTruth.category})
                              </span>
                            )}
                          </div>
                          {log.reason && (
                            <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                              " {log.reason} "
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Category */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                            {getCategoryIcon(log.action.category)}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Category</p>
                            <p className="text-xs font-bold text-slate-900">{log.action.category}</p>
                          </div>
                        </div>

                        {/* Priority */}
                        {(taskType === "intermediate" || taskType === "advanced") && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                              <AlertCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Priority</p>
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", getPriorityColor(log.action.priority))}>
                                {log.action.priority}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Sentiment */}
                        {(taskType === "intermediate" || taskType === "advanced") && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              {getSentimentIcon(log.action.sentiment)}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Sentiment</p>
                              <p className="text-xs font-bold text-slate-900">{log.action.sentiment}</p>
                            </div>
                          </div>
                        )}

                        {/* Response */}
                        {taskType === "advanced" && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Action</p>
                              <p className="text-xs font-bold text-slate-900">{log.action.response_suggestion}</p>
                            </div>
                          </div>
                        )}

                        {/* Team */}
                        {taskType === "advanced" && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                              <Users className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Team</p>
                              <p className="text-xs font-bold text-slate-900">{log.action.team_assignment}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isProcessing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center animate-pulse">
                      <BrainCircuit className="w-4 h-4 text-indigo-600" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-12 bg-slate-50 rounded-xl animate-pulse" />
                      <div className="h-12 bg-slate-50 rounded-xl animate-pulse" />
                      <div className="h-12 bg-slate-50 rounded-xl animate-pulse" />
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={logsEndRef} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
