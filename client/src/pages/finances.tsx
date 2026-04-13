import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet, Settings2, TrendingUp, PiggyBank, Sparkles, AlertCircle,
  DollarSign, Target, Send, Loader2, Plus, Trash2, Check, Bot
} from "lucide-react";
import { FinanceProfileDialog } from "@/components/finance-profile-dialog";
import {
  getFinanceProfile, hasCompletedFinanceProfile, type FinanceProfile
} from "@/lib/guest-storage";
import { useToast } from "@/hooks/use-toast";

const BUDGET_TIER_LABELS: Record<string, string> = {
  frugal: "Watching closely",
  moderate: "Balanced",
  comfortable: "Comfortable",
  flexible: "Flexible",
};

const EMOTION_LABELS: Record<string, string> = {
  anxious: "A bit anxious",
  neutral: "Neutral",
  confident: "Confident",
  empowered: "Empowered",
};

const FINANCE_RESOURCES = [
  { title: "The 50/30/20 Rule", description: "Allocate 50% needs, 30% wants, 20% savings. Simple, effective.", category: "Budgeting", url: null },
  { title: "Emergency Fund First", description: "3–6 months of expenses before investing. The foundation of financial peace.", category: "Savings", url: null },
  { title: "Automate Your Savings", description: "Set up automatic transfers on payday. Pay yourself first, every time.", category: "Automation", url: null },
  { title: "The Latte Factor", description: "Small daily expenses add up. $5/day is $1,825/year — invest that instead.", category: "Mindset", url: null },
  { title: "Zero-Based Budgeting", description: "Every dollar has a job. Assign all income until you reach $0 remaining.", category: "Budgeting", url: null },
  { title: "Debt Avalanche Method", description: "Pay minimums on all debt, then attack highest interest rate first.", category: "Debt", url: null },
  { title: "Debt Snowball Method", description: "Pay off smallest balances first for psychological momentum.", category: "Debt", url: null },
  { title: "Index Fund Investing", description: "Low-cost, diversified exposure to the market. Warren Buffett's recommendation.", category: "Investing", url: null },
];

const SAVINGS_GOALS_KEY = "dw:savings_goals";

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  emoji?: string;
}

function loadSavingsGoals(): SavingsGoal[] {
  try { return JSON.parse(localStorage.getItem(SAVINGS_GOALS_KEY) ?? "[]"); } catch { return []; }
}
function saveSavingsGoals(goals: SavingsGoal[]) {
  try { localStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(goals)); } catch {}
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function FinancesPage() {
  usePageMeta("Finances", "Track your budget, manage spending, and build financial wellness.");
  const { toast } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [financeProfile, setFinanceProfile] = useState<FinanceProfile | null>(getFinanceProfile());
  const [hasProfile, setHasProfile] = useState(hasCompletedFinanceProfile());

  // Savings goals
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(loadSavingsGoals);
  const [showSavingsForm, setShowSavingsForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", targetAmount: "", currentAmount: "", targetDate: "", emoji: "💰" });

  // AI Coach chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your financial wellness coach. Ask me anything about budgeting, saving, debt, or building financial confidence. What's on your mind?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleProfileComplete = () => {
    setProfileOpen(false);
    setFinanceProfile(getFinanceProfile());
    setHasProfile(hasCompletedFinanceProfile());
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const profile = financeProfile;
      const systemContext = profile
        ? `User's financial profile: budget tier = ${profile.budgetTier || "unknown"}, money emotion = ${profile.moneyEmotion || "unknown"}, priorities = ${(profile.financialPriorities || []).join(", ") || "none listed"}.`
        : "User has not set up a financial profile.";

      const res = await apiRequest("POST", "/api/chat/smart", {
        message,
        conversationHistory: chatMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        systemPromptOverride: `You are DW's compassionate financial wellness coach. You help people build healthy relationships with money without shame or judgment. You give practical, actionable advice while being sensitive to financial stress and anxiety. ${systemContext} Keep responses concise (2-3 short paragraphs max), warm, and grounded. Avoid jargon. Never promise specific returns.`,
      });
      const json = await res.json();
      return json.response as string;
    },
    onSuccess: (response) => {
      setChatMessages(msgs => [...msgs, { role: "assistant", content: response }]);
    },
    onError: () => toast({ title: "Couldn't get a response. Try again.", variant: "destructive" }),
  });

  const handleSend = () => {
    const msg = chatInput.trim();
    if (!msg || chatMutation.isPending) return;
    setChatMessages(msgs => [...msgs, { role: "user", content: msg }]);
    setChatInput("");
    chatMutation.mutate(msg);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatMutation.isPending]);

  const handleAddSavingsGoal = () => {
    const target = parseFloat(newGoal.targetAmount);
    const current = parseFloat(newGoal.currentAmount || "0");
    if (!newGoal.name.trim() || isNaN(target) || target <= 0) return;
    const goal: SavingsGoal = {
      id: `sg_${Date.now()}`,
      name: newGoal.name.trim(),
      targetAmount: target,
      currentAmount: current,
      targetDate: newGoal.targetDate || undefined,
      emoji: newGoal.emoji,
    };
    const updated = [goal, ...savingsGoals];
    setSavingsGoals(updated);
    saveSavingsGoals(updated);
    setNewGoal({ name: "", targetAmount: "", currentAmount: "", targetDate: "", emoji: "💰" });
    setShowSavingsForm(false);
    toast({ title: "Savings goal added!" });
  };

  const handleUpdateSavings = (id: string, newCurrent: number) => {
    const updated = savingsGoals.map(g => g.id === id ? { ...g, currentAmount: newCurrent } : g);
    setSavingsGoals(updated);
    saveSavingsGoals(updated);
  };

  const handleDeleteSavingsGoal = (id: string) => {
    const updated = savingsGoals.filter(g => g.id !== id);
    setSavingsGoals(updated);
    saveSavingsGoals(updated);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Financial Wellness" />
      <ScrollArea className="flex-1">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24 page-enter">

          {/* Profile setup or display */}
          {!hasProfile ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Share your financial context</h3>
                  <p className="text-sm text-muted-foreground">
                    Help DW suggest budget-friendly options and be mindful of financial stress
                  </p>
                </div>
                <Button onClick={() => setProfileOpen(true)} data-testid="button-open-finance-profile">
                  Get started
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base font-medium">Your Financial Profile</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setProfileOpen(true)} data-testid="button-edit-finance-profile">
                  <Settings2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Budget: <span className="font-medium">{BUDGET_TIER_LABELS[financeProfile?.budgetTier || ""] || "Not set"}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Feeling: <span className="font-medium">{EMOTION_LABELS[financeProfile?.moneyEmotion || ""] || "Not set"}</span></span>
                </div>
                {financeProfile?.financialPriorities && financeProfile.financialPriorities.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {financeProfile.financialPriorities.slice(0, 4).map(p => (
                      <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Anxiety alert */}
          {hasProfile && financeProfile?.moneyEmotion === "anxious" && (
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm mb-1">We hear you</h4>
                  <p className="text-sm text-muted-foreground">
                    Financial stress is real. DW prioritizes budget-friendly suggestions and avoids adding pressure.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── AI Financial Coach ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Financial Coach
              </h2>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-52 p-4">
                  <div className="space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatMutation.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                <div className="border-t p-3 flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Ask about budgeting, saving, debt…"
                    className="h-9 text-sm"
                    data-testid="input-finance-chat"
                    disabled={chatMutation.isPending}
                  />
                  <Button size="sm" onClick={handleSend} disabled={!chatInput.trim() || chatMutation.isPending} data-testid="button-send-finance-chat">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick questions */}
            <div className="flex gap-2 flex-wrap">
              {["How do I start an emergency fund?", "Help me pay off debt", "How do I stick to a budget?"].map(q => (
                <button
                  key={q}
                  onClick={() => { setChatInput(q); }}
                  className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* ── Savings Goals ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-emerald-500" />
                Savings Goals
              </h2>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowSavingsForm(!showSavingsForm)} data-testid="button-add-savings-goal">
                <Plus className="h-3 w-3" />
                Add Goal
              </Button>
            </div>

            {showSavingsForm && (
              <Card className="border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Goal name</Label>
                      <Input value={newGoal.name} onChange={e => setNewGoal(g => ({ ...g, name: e.target.value }))} placeholder="Emergency fund, Vacation, New car…" className="h-8 text-sm" data-testid="input-savings-name" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Target amount ($)</Label>
                      <Input type="number" value={newGoal.targetAmount} onChange={e => setNewGoal(g => ({ ...g, targetAmount: e.target.value }))} placeholder="5000" className="h-8 text-sm" data-testid="input-savings-target" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Already saved ($)</Label>
                      <Input type="number" value={newGoal.currentAmount} onChange={e => setNewGoal(g => ({ ...g, currentAmount: e.target.value }))} placeholder="0" className="h-8 text-sm" data-testid="input-savings-current" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Target date</Label>
                      <Input type="date" value={newGoal.targetDate} onChange={e => setNewGoal(g => ({ ...g, targetDate: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Emoji</Label>
                      <Input value={newGoal.emoji} onChange={e => setNewGoal(g => ({ ...g, emoji: e.target.value }))} placeholder="💰" className="h-8 text-sm" maxLength={4} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddSavingsGoal} disabled={!newGoal.name.trim() || !newGoal.targetAmount} data-testid="button-save-savings-goal">Save Goal</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowSavingsForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {savingsGoals.length === 0 && !showSavingsForm && (
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <PiggyBank className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No savings goals yet. Add one to track your progress.</p>
                </CardContent>
              </Card>
            )}

            {savingsGoals.map(goal => {
              const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              const remaining = goal.targetAmount - goal.currentAmount;
              const monthsRemaining = goal.targetDate
                ? Math.max(1, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
                : null;
              const monthlyNeeded = monthsRemaining ? (remaining / monthsRemaining) : null;

              return (
                <Card key={goal.id} data-testid={`card-savings-${goal.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{goal.emoji || "💰"}</span>
                        <div>
                          <p className="font-semibold text-sm">{goal.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ${goal.currentAmount.toLocaleString()} of ${goal.targetAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {pct >= 100 && <Check className="h-4 w-4 text-green-500" />}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSavingsGoal(goal.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{pct}% saved</span>
                        <span>${remaining.toLocaleString()} to go</span>
                      </div>
                      <Progress value={pct} className="h-2.5" />
                    </div>

                    {monthlyNeeded && monthlyNeeded > 0 && (
                      <p className="text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3 inline mr-0.5" />
                        Save <span className="font-medium text-foreground">${Math.ceil(monthlyNeeded).toLocaleString()}/month</span> to hit this by {new Date(goal.targetDate!).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Update current amount"
                        className="h-7 text-xs flex-1"
                        onBlur={e => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v >= 0) handleUpdateSavings(goal.id, v);
                        }}
                        data-testid={`input-savings-update-${goal.id}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── Resource Library ── */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Financial Toolkit
            </h2>
            <div className="space-y-2">
              {FINANCE_RESOURCES.map((res, i) => (
                <Card key={i} className="hover:shadow-sm transition-shadow" data-testid={`card-finance-resource-${i}`}>
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{res.title}</p>
                          <Badge variant="outline" className="text-[10px]">{res.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{res.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <FinanceProfileDialog
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            onComplete={handleProfileComplete}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
