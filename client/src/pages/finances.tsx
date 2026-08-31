import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage
} from "@/components/ui/form";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet, Settings2, TrendingUp, PiggyBank, Sparkles,
  DollarSign, Send, Loader2, Plus, Trash2, Bot, Link2, RefreshCw,
  ArrowUpRight, ArrowDownRight, Building2, AlertTriangle, Target, CheckCircle2
} from "lucide-react";
import { FinanceProfileDialog } from "@/components/finance-profile-dialog";
import {
  getFinanceProfile, hasCompletedFinanceProfile, type FinanceProfile
} from "@/lib/guest-storage";
import { useToast } from "@/hooks/use-toast";
import { usePlaidLink } from "react-plaid-link";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";

// ══════════════════════════════════════════════════════════════════════
// Shared constants + form schemas
// ══════════════════════════════════════════════════════════════════════

const SPEND_CATEGORIES = [
  "Food", "Transport", "Entertainment", "Shopping", "Health",
  "Housing", "Subscriptions", "Income", "Transfer", "Other",
] as const;

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit card" },
  { value: "loan", label: "Loan" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
] as const;

const HOLDING_TYPES = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "Crypto" },
  { value: "bond", label: "Bond" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
] as const;

const PIE_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6", "#ef4444", "#84cc16"];

const accountFormSchema = z.object({
  name: z.string().min(1, "Name required"),
  type: z.enum(["checking", "savings", "credit", "loan", "investment", "other"]),
  institution: z.string().optional(),
  currentBalance: z.coerce.number().finite().default(0),
});
type AccountFormValues = z.infer<typeof accountFormSchema>;

const transactionFormSchema = z.object({
  sign: z.enum(["expense", "income"]),
  amount: z.coerce.number().positive("Enter a positive amount"),
  category: z.enum(SPEND_CATEGORIES),
  merchant: z.string().optional(),
  date: z.string().min(10, "Date required"),
  accountId: z.string().optional(),
  goalId: z.string().optional(),
  note: z.string().optional(),
});
type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const budgetFormSchema = z.object({
  category: z.enum(SPEND_CATEGORIES),
  monthlyLimit: z.coerce.number().positive("Enter a positive limit"),
});
type BudgetFormValues = z.infer<typeof budgetFormSchema>;

const goalFormSchema = z.object({
  name: z.string().min(1, "Name required").max(120),
  targetAmount: z.coerce.number().positive("Enter a positive target"),
  currentAmount: z.coerce.number().nonnegative("Cannot be negative").default(0),
  targetDate: z.string().optional(),
  note: z.string().optional(),
});
type GoalFormValues = z.infer<typeof goalFormSchema>;

const holdingFormSchema = z.object({
  ticker: z.string().optional(),
  name: z.string().min(1, "Name required"),
  type: z.enum(["stock", "etf", "crypto", "bond", "cash", "other"]),
  shares: z.coerce.number().nonnegative().optional().or(z.literal("")),
  costBasis: z.coerce.number().nonnegative().optional().or(z.literal("")),
  manualValue: z.coerce.number().nonnegative().optional().or(z.literal("")),
});
type HoldingFormValues = z.infer<typeof holdingFormSchema>;

function fmtMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 2 });
}

interface Account {
  id: string; name: string; type: string; institution: string | null;
  currentBalance: number | null; isManual: boolean | null; plaidAccountId: string | null;
}
interface Transaction {
  id: string; accountId: string | null; amount: number; category: string;
  merchant: string | null; note: string | null; date: string; source: string; pending: boolean | null;
  goalId: string | null;
  appliedRuleId: string | null;
}
interface Budget {
  id: string; category: string; monthlyLimit: number; spent: number;
}
interface Holding {
  id: string; ticker: string | null; name: string; type: string;
  shares: number | null; costBasis: number | null; currentPrice: number | null;
  manualValue: number | null; lastQuoteAt: string | null; value: number;
}
interface SavingsGoal {
  id: string; name: string; targetAmount: number; currentAmount: number;
  targetDate: string | null; note: string | null;
}
interface SavingsGoalRule {
  id: string; goalId: string; label: string | null;
  accountId: string | null; category: string | null; merchantPattern: string | null;
  amountType: "fixed" | "percent" | "all"; amountValue: number | null; enabled: boolean;
}
interface NetWorthPoint { date: string; assets: number; liabilities: number; netWorth: number; }
interface Summary {
  netWorth: number; assets: number; liabilities: number;
  monthSpend: number; monthIncome: number;
  spendByCategory: Record<string, number>;
  budgets: Budget[];
  accounts: Account[];
  holdings: Holding[];
  recentTransactions: Transaction[];
  goals?: SavingsGoal[];
}
interface PlaidStatus {
  configured: boolean; env: string;
  items: Array<{
    id: string;
    institutionName: string | null;
    lastSyncAt: string | null;
    lastSuccessAt?: string | null;
    status?: "ok" | "error";
    lastError?: string | null;
    lastErrorCode?: string | null;
    lastErrorAt?: string | null;
    needsReconnect?: boolean;
  }>;
}

function formatTimeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
interface ChatMessage { role: "user" | "assistant"; content: string; }

// ══════════════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════════════

export default function FinancesPage() {
  usePageMeta("Finances", "Track your budget, manage spending, and build financial wellness.");
  const queryClient = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [financeProfile, setFinanceProfile] = useState<FinanceProfile | null>(getFinanceProfile());
  const [activeTab, setActiveTab] = useState("overview");
  const financeSummary = queryClient.getQueryData<Summary>(["/api/finance/summary"]);

  return (
    <div className="container max-w-7xl pt-6 pb-32 space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><Wallet className="w-6 h-6" /> Finances</span>}
        rightContent={
          <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)} data-testid="button-finance-settings">
            <Settings2 className="w-4 h-4 mr-2" />Preferences
          </Button>
        }
      />

      {/* DW opening line */}
      <p className="text-sm text-muted-foreground italic -mt-2" data-testid="text-dw-line-finances">
        {financeSummary
          ? financeSummary.budgets.some((budget) => budget.spent > budget.monthlyLimit)
            ? "A few budgets are over — awareness is the first move toward change."
            : "Your money shows you what you value — let's make sure they match."
          : "Financial clarity is a form of self-respect."}
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-finance">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
          <TabsTrigger value="budgets" data-testid="tab-budgets">Budgets</TabsTrigger>
          <TabsTrigger value="goals" data-testid="tab-goals">Goals</TabsTrigger>
          <TabsTrigger value="investments" data-testid="tab-investments">Investments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab profile={financeProfile} onViewAllGoals={() => setActiveTab("goals")} /></TabsContent>
        <TabsContent value="transactions" className="mt-6"><TransactionsTab /></TabsContent>
        <TabsContent value="budgets" className="mt-6"><BudgetsTab /></TabsContent>
        <TabsContent value="goals" className="mt-6"><GoalsTab /></TabsContent>
        <TabsContent value="investments" className="mt-6"><InvestmentsTab /></TabsContent>
      </Tabs>

      <FinanceCoachChat />

      <FinanceProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onComplete={() => { setFinanceProfile(getFinanceProfile()); setProfileOpen(false); }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Overview tab
// ══════════════════════════════════════════════════════════════════════

function OverviewTab({ profile, onViewAllGoals }: { profile: FinanceProfile | null; onViewAllGoals: () => void }) {
  const { data: summary, isLoading } = useQuery<Summary>({ queryKey: ["/api/finance/summary"] });
  const { data: netWorthSeries } = useQuery<NetWorthPoint[]>({ queryKey: ["/api/finance/net-worth"] });

  if (isLoading || !summary) {
    return <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  }

  const categoryData = Object.entries(summary.spendByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const overBudgets = summary.budgets.filter(b => b.spent > b.monthlyLimit);
  const activeGoals = (summary.goals || []).filter(g => g.currentAmount < g.targetAmount).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Net worth" value={fmtMoney(summary.netWorth)} icon={<DollarSign className="w-4 h-4" />} testId="stat-net-worth" />
        <StatCard title="Income this month" value={fmtMoney(summary.monthIncome)} icon={<ArrowUpRight className="w-4 h-4 text-emerald-500" />} testId="stat-income" />
        <StatCard title="Spend this month" value={fmtMoney(summary.monthSpend)} icon={<ArrowDownRight className="w-4 h-4 text-rose-500" />} testId="stat-spend" />
      </div>

      {overBudgets.length > 0 && (
        <Alert variant="destructive" data-testid="alert-budget-overage">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You're over on {overBudgets.map(b => `${b.category} by ${fmtMoney(b.spent - b.monthlyLimit)}`).join(", ")}.
          </AlertDescription>
        </Alert>
      )}

      {activeGoals.length > 0 && (
        <Card data-testid="card-overview-top-goals">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base"><Target className="w-4 h-4" /> Top goals</CardTitle>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-primary hover:bg-transparent hover:underline" onClick={onViewAllGoals} data-testid="link-view-all-goals">
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeGoals.map(g => {
              const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
              return (
                <div key={g.id} className="space-y-1" data-testid={`row-overview-goal-${g.id}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate" data-testid={`text-overview-goal-name-${g.id}`}>{g.name}</span>
                    <span className="text-muted-foreground tabular-nums" data-testid={`text-overview-goal-progress-${g.id}`}>
                      {fmtMoney(g.currentAmount)} / {fmtMoney(g.targetAmount)} ({Math.round(pct)}%)
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Net worth trend</CardTitle></CardHeader>
          <CardContent>
            {netWorthSeries && netWorthSeries.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={netWorthSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmtMoney(v)} />
                  <Line type="monotone" dataKey="netWorth" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">Not enough history yet. Check back tomorrow.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Spending this month</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">No spending recorded yet this month.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Accounts</CardTitle>
            <PlaidConnect />
          </div>
        </CardHeader>
        <CardContent>
          <AccountsList accounts={summary.accounts} />
        </CardContent>
      </Card>

      {profile && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4" /> Your preferences</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {profile.budgetTier && <Badge variant="secondary" className="mr-2">{profile.budgetTier}</Badge>}
            {profile.moneyEmotion && <Badge variant="secondary" className="mr-2">{profile.moneyEmotion}</Badge>}
            {profile.financialPriorities && profile.financialPriorities.length > 0 && (
              <div className="mt-2">Priorities: {profile.financialPriorities.join(", ")}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, testId }: { title: string; value: string; icon: React.ReactNode; testId: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-semibold" data-testid={testId}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Accounts (inside Overview) with react-hook-form
// ══════════════════════════════════════════════════════════════════════

function AccountsList({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { name: "", type: "checking", institution: "", currentBalance: 0 },
  });

  const createMut = useMutation({
    mutationFn: async (values: AccountFormValues) => {
      const res = await apiRequest("POST", "/api/finance/accounts", {
        name: values.name,
        type: values.type,
        institution: values.institution || null,
        currentBalance: values.currentBalance,
        currency: "USD",
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      setOpen(false);
      form.reset({ name: "", type: "checking", institution: "", currentBalance: 0 });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/finance/accounts/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] }),
  });

  return (
    <div className="space-y-2">
      {accounts.length === 0 && <p className="text-sm text-muted-foreground">No accounts yet. Add one below or connect your bank.</p>}
      {accounts.map(a => (
        <div key={a.id} className="flex items-center justify-between p-3 border rounded-md" data-testid={`row-account-${a.id}`}>
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">{a.name} {!a.isManual && <Badge variant="outline" className="ml-1 text-xs">Linked</Badge>}</p>
              <p className="text-xs text-muted-foreground capitalize">{a.type}{a.institution ? ` · ${a.institution}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium" data-testid={`text-balance-${a.id}`}>{fmtMoney(a.currentBalance)}</span>
            {a.isManual && (
              <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(a.id)} data-testid={`button-delete-account-${a.id}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full" data-testid="button-add-account">
            <Plus className="w-4 h-4 mr-2" /> Add account manually
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Add account</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createMut.mutate(v))} className="space-y-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} data-testid="input-account-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-account-type"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="institution" render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution (optional)</FormLabel>
                  <FormControl><Input {...field} data-testid="input-account-institution" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="currentBalance" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current balance (USD)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} data-testid="input-account-balance" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createMut.isPending} data-testid="button-save-account">
                  {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Plaid Connect button
// ══════════════════════════════════════════════════════════════════════

function PlaidConnect() {
  const { toast } = useToast();
  const { data: status } = useQuery<PlaidStatus>({ queryKey: ["/api/plaid/status"] });
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const tokenMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/plaid/link-token", {});
      return await res.json();
    },
    onSuccess: (data) => setLinkToken(data.link_token),
    onError: (err: Error) => toast({ title: "Couldn't open Plaid", description: err.message || "Try again later", variant: "destructive" }),
  });

  const exchangeMut = useMutation({
    mutationFn: async (vars: { public_token: string; institution: { name?: string; institution_id?: string } | null }) => {
      const res = await apiRequest("POST", "/api/plaid/exchange", vars);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plaid/status"] });
      toast({ title: "Bank connected", description: "Syncing transactions..." });
      syncMut.mutate();
    },
  });

  const syncMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/plaid/sync", {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      toast({ title: "Sync complete", description: `Added ${data.added}, updated ${data.modified}` });
    },
    onError: (err: Error) => toast({ title: "Sync failed", description: err.message || "Try again", variant: "destructive" }),
  });

  const { open: openPlaid, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      exchangeMut.mutate({ public_token, institution: metadata.institution || null });
      setLinkToken(null);
    },
    onExit: () => setLinkToken(null),
  });

  useEffect(() => {
    if (linkToken && ready) openPlaid();
  }, [linkToken, ready, openPlaid]);

  if (!status) return null;
  if (!status.configured) {
    return <Badge variant="outline" className="text-xs" data-testid="badge-plaid-unconfigured">Bank sync: not configured</Badge>;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {status.items.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => syncMut.mutate()} disabled={syncMut.isPending} data-testid="button-plaid-sync">
            {syncMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync
          </Button>
        )}
        <Button size="sm" onClick={() => tokenMut.mutate()} disabled={tokenMut.isPending} data-testid="button-plaid-connect">
          {tokenMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
          Connect bank
        </Button>
      </div>
      {status.items.length > 0 && (
        <div className="flex flex-col items-end gap-1 w-full">
          {status.items.map((item) => {
            const isError = item.status === "error";
            const lastSync = item.lastSuccessAt ?? item.lastSyncAt;
            return (
              <div
                key={item.id}
                className="flex flex-col items-end gap-0.5 text-xs"
                data-testid={`plaid-item-${item.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground" data-testid={`text-institution-${item.id}`}>
                    {item.institutionName || "Bank"}
                  </span>
                  <span className="text-muted-foreground" data-testid={`text-last-synced-${item.id}`}>
                    Last synced {formatTimeAgo(lastSync)}
                  </span>
                  {isError && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0" data-testid={`badge-plaid-status-${item.id}`}>
                      Needs attention
                    </Badge>
                  )}
                </div>
                {isError && (
                  <div className="flex items-center gap-2">
                    <span className="text-destructive max-w-[18rem] truncate" data-testid={`text-plaid-error-${item.id}`}>
                      {item.lastError || "Sync failed"}
                    </span>
                    {item.needsReconnect && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] px-2"
                        onClick={() => tokenMut.mutate()}
                        disabled={tokenMut.isPending}
                        data-testid={`button-plaid-reconnect-${item.id}`}
                      >
                        Reconnect bank
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Transactions tab
// ══════════════════════════════════════════════════════════════════════

function TransactionsTab() {
  const [filter, setFilter] = useState<string>("all");
  const { data: txns, isLoading } = useQuery<Transaction[]>({ queryKey: ["/api/finance/transactions"] });
  const { data: summary } = useQuery<Summary>({ queryKey: ["/api/finance/summary"] });

  const filtered = useMemo(() => {
    if (!txns) return [];
    return filter === "all" ? txns : txns.filter(t => t.category === filter);
  }, [txns, filter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Transactions</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40" data-testid="select-txn-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {SPEND_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <AddTransactionButton accounts={summary?.accounts || []} goals={summary?.goals || []} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64" /> : <TransactionList txns={filtered} />}
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionList({ txns }: { txns: Transaction[] }) {
  const { data: goals } = useQuery<SavingsGoal[]>({ queryKey: ["/api/finance/goals"] });
  const { toast } = useToast();
  const goalById = useMemo(() => {
    const m = new Map<string, SavingsGoal>();
    (goals || []).forEach(g => m.set(g.id, g));
    return m;
  }, [goals]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/finance/transactions/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/budgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/goals"] });
    },
  });

  // Re-link a transaction to a different savings goal (or clear it).
  // Send goalId: null to clear; goalById invalidation refreshes the totals.
  const relinkMut = useMutation({
    mutationFn: async (vars: { id: string; goalId: string | null }) => {
      await apiRequest("PATCH", `/api/finance/transactions/${vars.id}`, { goalId: vars.goalId });
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      const target = vars.goalId ? goalById.get(vars.goalId)?.name ?? "goal" : null;
      toast({
        title: target ? `Linked to ${target}` : "Goal link cleared",
      });
    },
    onError: () => {
      toast({ title: "Couldn't update goal link", variant: "destructive" });
    },
  });

  if (txns.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>;
  }
  const NONE = "__none__";
  return (
    <div className="space-y-1">
      {txns.map(t => {
        const linkedGoal = t.goalId ? goalById.get(t.goalId) : null;
        // Goal linkage is only meaningful for income (amount > 0) — savings
        // are funded by money coming in. For expenses we just show the row.
        const showGoalPicker = t.amount > 0 && (goals?.length ?? 0) > 0;
        return (
        <div key={t.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md" data-testid={`row-txn-${t.id}`}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{t.merchant || t.category}</p>
            <p className="text-xs text-muted-foreground">
              {t.date} · {t.category}
              {t.source === "plaid" && <Badge variant="outline" className="ml-2 text-[10px]">Plaid</Badge>}
              {t.pending && <Badge variant="secondary" className="ml-1 text-[10px]">Pending</Badge>}
              {linkedGoal && (
                <Badge variant="outline" className="ml-2 text-[10px] gap-0.5" data-testid={`badge-goal-${t.id}`}>
                  <Target className="w-2.5 h-2.5" /> {linkedGoal.name}
                </Badge>
              )}
              {t.appliedRuleId && (
                <Badge variant="secondary" className="ml-1 text-[10px]" data-testid={`badge-auto-${t.id}`}>
                  Auto
                </Badge>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showGoalPicker && (
              <Select
                value={t.goalId ?? NONE}
                onValueChange={(v) => relinkMut.mutate({ id: t.id, goalId: v === NONE ? null : v })}
                disabled={relinkMut.isPending}
              >
                <SelectTrigger
                  className="h-7 w-[130px] text-xs px-2 gap-1"
                  data-testid={`select-goal-link-${t.id}`}
                  aria-label="Link to savings goal"
                >
                  <SelectValue placeholder="No goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE} data-testid={`option-goal-none-${t.id}`}>No goal</SelectItem>
                  {(goals || []).map(g => (
                    <SelectItem key={g.id} value={g.id} data-testid={`option-goal-${g.id}-${t.id}`}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <span className={`font-medium ${t.amount < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`} data-testid={`text-amount-${t.id}`}>
              {t.amount < 0 ? "-" : "+"}{fmtMoney(Math.abs(t.amount))}
            </span>
            {t.source === "manual" && (
              <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(t.id)} data-testid={`button-delete-txn-${t.id}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}

function AddTransactionButton({ accounts, goals }: { accounts: Account[]; goals: SavingsGoal[] }) {
  const [open, setOpen] = useState(false);
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      sign: "expense",
      amount: 0,
      category: "Food",
      merchant: "",
      note: "",
      accountId: "none",
      goalId: "none",
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const sign = form.watch("sign");

  const createMut = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      const amt = Math.abs(values.amount) * (values.sign === "expense" ? -1 : 1);
      const res = await apiRequest("POST", "/api/finance/transactions", {
        amount: amt,
        category: values.category,
        merchant: values.merchant || null,
        note: values.note || null,
        date: values.date,
        accountId: values.accountId && values.accountId !== "none" ? values.accountId : null,
        goalId: values.sign === "income" && values.goalId && values.goalId !== "none" ? values.goalId : null,
        currency: "USD",
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/budgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/goals"] });
      setOpen(false);
      form.reset({
        sign: "expense", amount: 0, category: "Food",
        merchant: "", note: "", accountId: "none", goalId: "none",
        date: new Date().toISOString().slice(0, 10),
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-add-transaction"><Plus className="w-4 h-4 mr-1" />Add</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add transaction</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => createMut.mutate(v))} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField control={form.control} name="sign" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-txn-type"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (USD)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} data-testid="input-txn-amount" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger data-testid="select-txn-category"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {SPEND_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="merchant" render={({ field }) => (
              <FormItem>
                <FormLabel>Merchant</FormLabel>
                <FormControl><Input {...field} data-testid="input-txn-merchant" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl><Input type="date" {...field} data-testid="input-txn-date" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {accounts.length > 0 && (
              <FormField control={form.control} name="accountId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account (optional)</FormLabel>
                  <Select value={field.value || "none"} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-txn-account"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">— none —</SelectItem>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            {sign === "income" && goals.length > 0 && (
              <FormField control={form.control} name="goalId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contributes to savings goal (optional)</FormLabel>
                  <Select value={field.value || "none"} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-txn-goal"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">— none —</SelectItem>
                      {goals.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">We'll auto-credit this goal when the transaction saves.</p>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl><Textarea {...field} rows={2} data-testid="input-txn-note" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={createMut.isPending} data-testid="button-save-transaction">
                {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Budgets tab
// ══════════════════════════════════════════════════════════════════════

function BudgetsTab() {
  const { data: budgets, isLoading } = useQuery<Budget[]>({ queryKey: ["/api/finance/budgets"] });

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: { category: "Food", monthlyLimit: 0 },
  });

  const saveMut = useMutation({
    mutationFn: async (values: BudgetFormValues) => {
      const res = await apiRequest("POST", "/api/finance/budgets", {
        category: values.category, monthlyLimit: values.monthlyLimit,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/budgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      form.setValue("monthlyLimit", 0);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/finance/budgets/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/finance/budgets"] }),
  });

  const chartData = (budgets || []).map(b => ({
    category: b.category, budget: b.monthlyLimit, spent: b.spent,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Monthly budgets</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMut.mutate(v))} className="flex flex-wrap gap-2 mb-4 items-end">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem className="flex-1 min-w-[140px]">
                  <FormLabel className="text-xs">Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-budget-category"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {SPEND_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="monthlyLimit" render={({ field }) => (
                <FormItem className="flex-1 min-w-[120px]">
                  <FormLabel className="text-xs">Monthly limit</FormLabel>
                  <FormControl><Input type="number" step="1" placeholder="500" {...field} data-testid="input-budget-limit" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={saveMut.isPending} data-testid="button-save-budget">
                {saveMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
              </Button>
            </form>
          </Form>

          {isLoading ? <Skeleton className="h-32" /> : (budgets && budgets.length > 0) ? (
            <div className="space-y-3">
              {budgets.map(b => {
                const pct = b.monthlyLimit > 0 ? Math.min(100, (b.spent / b.monthlyLimit) * 100) : 0;
                const overBy = b.spent - b.monthlyLimit;
                const isOver = overBy > 0;
                return (
                  <div key={b.id} className="space-y-1" data-testid={`row-budget-${b.id}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{b.category}</span>
                      <div className="flex items-center gap-2">
                        <span className={isOver ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"} data-testid={`text-budget-spent-${b.id}`}>
                          {fmtMoney(b.spent)} / {fmtMoney(b.monthlyLimit)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMut.mutate(b.id)} data-testid={`button-delete-budget-${b.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={pct} className={isOver ? "[&>div]:bg-rose-500" : ""} />
                    {isOver && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1" data-testid={`text-budget-overage-${b.id}`}>
                        <AlertTriangle className="w-3 h-3" />
                        You're over by {fmtMoney(overBy)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No budgets yet. Set your first above.</p>
          )}
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Budget vs. actual</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Bar dataKey="budget" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Goals tab — personal savings goals with progress bars
// ══════════════════════════════════════════════════════════════════════

// Per-goal auto-credit rules. Lists existing rules, lets the user add new
// ones, toggle enabled, or delete. Filters are AND-ed on the server; an
// unset filter means "no constraint", so a rule with no filters at all
// will match every income transaction (we warn the user accordingly).
function GoalRulesManager({ goal, accounts }: { goal: SavingsGoal; accounts: Account[] }) {
  const { toast } = useToast();
  const { data: rules, isLoading } = useQuery<SavingsGoalRule[]>({
    queryKey: ["/api/finance/goal-rules", { goalId: goal.id }],
    queryFn: async () => {
      const res = await fetch(`/api/finance/goal-rules?goalId=${goal.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load rules");
      return await res.json();
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [accountId, setAccountId] = useState<string>("any");
  const [category, setCategory] = useState<string>("any");
  const [merchantPattern, setMerchantPattern] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/finance/goal-rules", { goalId: goal.id }] });
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const body = {
        goalId: goal.id,
        label: label.trim() || null,
        accountId: accountId === "any" ? null : accountId,
        category: category === "any" ? null : category,
        merchantPattern: merchantPattern.trim() || null,
        amountType: "all" as const,
      };
      const res = await apiRequest("POST", "/api/finance/goal-rules", body);
      return await res.json();
    },
    onSuccess: () => {
      invalidate();
      setLabel(""); setAccountId("any"); setCategory("any"); setMerchantPattern("");
      setShowAdd(false);
      toast({ title: "Rule added" });
    },
    onError: () => toast({ title: "Couldn't add rule", variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: async (vars: { id: string; enabled: boolean }) => {
      await apiRequest("PATCH", `/api/finance/goal-rules/${vars.id}`, { enabled: vars.enabled });
    },
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/finance/goal-rules/${id}`); },
    onSuccess: () => { invalidate(); toast({ title: "Rule deleted" }); },
  });

  const accountName = (id: string | null) =>
    id ? (accounts.find(a => a.id === id)?.name ?? "Unknown account") : "Any account";

  return (
    <div className="pt-2 border-t mt-2 space-y-2" data-testid={`rules-section-${goal.id}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Auto-credit rules</p>
        <Button
          variant="ghost" size="sm" className="h-6 px-2 text-xs"
          onClick={() => setShowAdd(v => !v)}
          data-testid={`button-toggle-add-rule-${goal.id}`}
        >
          {showAdd ? "Cancel" : <><Plus className="w-3 h-3 mr-1" /> Add rule</>}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-10" />
      ) : (rules && rules.length > 0) ? (
        <div className="space-y-1">
          {rules.map(r => {
            const filters: string[] = [];
            if (r.accountId) filters.push(accountName(r.accountId));
            if (r.category) filters.push(`category “${r.category}”`);
            if (r.merchantPattern) filters.push(`merchant ~ “${r.merchantPattern}”`);
            const summary = filters.length === 0
              ? "All income (no filters)"
              : filters.join(" + ");
            return (
              <div key={r.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-muted/40" data-testid={`row-rule-${r.id}`}>
                <div className="min-w-0 flex-1">
                  {r.label && <p className="font-medium truncate">{r.label}</p>}
                  <p className="text-muted-foreground truncate" data-testid={`text-rule-summary-${r.id}`}>{summary}</p>
                </div>
                <Switch
                  checked={r.enabled}
                  onCheckedChange={(v) => toggleMut.mutate({ id: r.id, enabled: v })}
                  data-testid={`switch-rule-enabled-${r.id}`}
                  aria-label="Enable rule"
                />
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => deleteMut.mutate(r.id)}
                  data-testid={`button-delete-rule-${r.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No rules yet. Add one to auto-fund this goal from matching deposits.
        </p>
      )}

      {showAdd && (
        <div className="space-y-2 p-2 border rounded-md bg-card" data-testid={`form-add-rule-${goal.id}`}>
          <Input
            placeholder="Label (optional, e.g. Paycheck)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-8 text-xs"
            data-testid={`input-rule-label-${goal.id}`}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-8 text-xs" data-testid={`select-rule-account-${goal.id}`} aria-label="Account filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any account</SelectItem>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-xs" data-testid={`select-rule-category-${goal.id}`} aria-label="Category filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any category</SelectItem>
                {SPEND_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Merchant contains… (optional)"
            value={merchantPattern}
            onChange={(e) => setMerchantPattern(e.target.value)}
            className="h-8 text-xs"
            data-testid={`input-rule-merchant-${goal.id}`}
          />
          <Button
            size="sm" className="w-full h-8 text-xs"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            data-testid={`button-save-rule-${goal.id}`}
          >
            {createMut.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            Save rule
          </Button>
        </div>
      )}
    </div>
  );
}

function GoalsTab() {
  const { data: goals, isLoading } = useQuery<SavingsGoal[]>({ queryKey: ["/api/finance/goals"] });
  // Accounts are needed so the rule form can let users scope a rule to a
  // specific account (e.g. "only my Chase checking deposits go here").
  const { data: accounts } = useQuery<Account[]>({ queryKey: ["/api/finance/accounts"] });
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [open, setOpen] = useState(false);

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: { name: "", targetAmount: 0, currentAmount: 0, targetDate: "", note: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", targetAmount: 0, currentAmount: 0, targetDate: "", note: "" });
    setOpen(true);
  };

  const openEdit = (g: SavingsGoal) => {
    setEditing(g);
    form.reset({
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      targetDate: g.targetDate || "",
      note: g.note || "",
    });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async (values: GoalFormValues) => {
      const body = {
        name: values.name,
        targetAmount: values.targetAmount,
        currentAmount: values.currentAmount,
        targetDate: values.targetDate || null,
        note: values.note || null,
      };
      const res = editing
        ? await apiRequest("PATCH", `/api/finance/goals/${editing.id}`, body)
        : await apiRequest("POST", "/api/finance/goals", body);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/finance/goals/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
    },
  });

  const totalTarget = (goals || []).reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = (goals || []).reduce((s, g) => s + g.currentAmount, 0);
  const overallPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="space-y-4">
      {goals && goals.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Goals" value={String(goals.length)} icon={<Target className="w-4 h-4" />} testId="stat-goals-count" />
          <StatCard title="Saved" value={fmtMoney(totalSaved)} icon={<PiggyBank className="w-4 h-4" />} testId="stat-goals-saved" />
          <StatCard title="Target" value={fmtMoney(totalTarget)} icon={<TrendingUp className="w-4 h-4" />} testId="stat-goals-target" />
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2"><Target className="w-4 h-4" /> Savings goals</CardTitle>
            <Button size="sm" onClick={openCreate} data-testid="button-add-goal">
              <Plus className="w-4 h-4 mr-1" /> New goal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-32" /> : (goals && goals.length > 0) ? (
            <div className="space-y-4">
              {goals.length > 1 && (
                <div className="space-y-1 pb-2 border-b">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">All goals combined</span>
                    <span className="text-muted-foreground" data-testid="text-goals-overall">
                      {fmtMoney(totalSaved)} / {fmtMoney(totalTarget)} ({Math.round(overallPct)}%)
                    </span>
                  </div>
                  <Progress value={overallPct} />
                </div>
              )}
              {goals.map(g => {
                const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
                const remaining = Math.max(0, g.targetAmount - g.currentAmount);
                const complete = g.currentAmount >= g.targetAmount;
                return (
                  <div key={g.id} className="space-y-2 p-3 border rounded-md" data-testid={`row-goal-${g.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm flex items-center gap-2" data-testid={`text-goal-name-${g.id}`}>
                          {complete && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {g.name}
                        </p>
                        {g.targetDate && (
                          <p className="text-xs text-muted-foreground" data-testid={`text-goal-date-${g.id}`}>
                            Target: {g.targetDate}
                          </p>
                        )}
                        {g.note && (
                          <p className="text-xs text-muted-foreground mt-0.5">{g.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(g)} data-testid={`button-edit-goal-${g.id}`}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMut.mutate(g.id)} data-testid={`button-delete-goal-${g.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={complete ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"} data-testid={`text-goal-progress-${g.id}`}>
                          {fmtMoney(g.currentAmount)} of {fmtMoney(g.targetAmount)}
                        </span>
                        <span className="text-muted-foreground">
                          {complete ? "Reached!" : `${fmtMoney(remaining)} to go · ${Math.round(pct)}%`}
                        </span>
                      </div>
                      <Progress value={pct} className={complete ? "[&>div]:bg-emerald-500" : ""} />
                    </div>
                    <GoalRulesManager goal={g} accounts={accounts || []} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <Target className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
              <p className="text-sm text-muted-foreground">No savings goals yet.</p>
              <p className="text-xs text-muted-foreground">Try "Emergency fund", "Vacation", or "Down payment".</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit goal" : "New savings goal"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMut.mutate(v))} className="space-y-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="Emergency fund" {...field} data-testid="input-goal-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-2">
                <FormField control={form.control} name="targetAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target amount</FormLabel>
                    <FormControl><Input type="number" step="1" placeholder="5000" {...field} data-testid="input-goal-target" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="currentAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saved so far</FormLabel>
                    <FormControl><Input type="number" step="1" placeholder="0" {...field} data-testid="input-goal-current" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="targetDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Target date (optional)</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-goal-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="What's this for?" {...field} data-testid="input-goal-note" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={saveMut.isPending} data-testid="button-save-goal">
                  {saveMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editing ? "Save changes" : "Create goal"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Investments tab  (with allocation pie + performance line)
// ══════════════════════════════════════════════════════════════════════

function InvestmentsTab() {
  const { toast } = useToast();
  const { data: holdings, isLoading } = useQuery<Holding[]>({ queryKey: ["/api/finance/holdings"] });
  const { data: netWorthSeries } = useQuery<NetWorthPoint[]>({ queryKey: ["/api/finance/net-worth"] });

  const refreshMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/finance/refresh-quotes", {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/holdings"] });
      toast({ title: "Quotes refreshed", description: data.note || `Updated ${data.updated} holding${data.updated === 1 ? "" : "s"}` });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/finance/holdings/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/finance/holdings"] }),
  });

  const totalValue = (holdings || []).reduce((s, h) => s + (h.value || 0), 0);
  const totalCost = (holdings || []).reduce((s, h) => s + ((h.costBasis || 0) * (h.shares || 0)), 0);
  const gain = totalValue - totalCost;

  const allocationData = (holdings || [])
    .filter(h => (h.value || 0) > 0)
    .map(h => ({ name: h.ticker || h.name, value: h.value || 0 }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Portfolio value" value={fmtMoney(totalValue)} icon={<TrendingUp className="w-4 h-4" />} testId="stat-portfolio" />
        <StatCard title="Cost basis" value={fmtMoney(totalCost)} icon={<PiggyBank className="w-4 h-4" />} testId="stat-cost" />
        <StatCard title="Unrealized gain" value={fmtMoney(gain)} icon={gain >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-rose-500" />} testId="stat-gain" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Allocation</CardTitle></CardHeader>
          <CardContent>
            {allocationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2} label={(e) => e.name}>
                    {allocationData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtMoney(v)} />
                  <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">Add holdings to see your allocation.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Portfolio performance</CardTitle></CardHeader>
          <CardContent>
            {netWorthSeries && netWorthSeries.length > 1 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={netWorthSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmtMoney(v)} />
                  <Line type="monotone" dataKey="assets" stroke="#10b981" strokeWidth={2} dot={false} name="Assets" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">Performance history will appear as snapshots accumulate.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Holdings</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending || !holdings?.length} data-testid="button-refresh-quotes">
                {refreshMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh quotes
              </Button>
              <AddHoldingButton />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40" /> : (holdings && holdings.length > 0) ? (
            <div className="space-y-2">
              {holdings.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 border rounded-md" data-testid={`row-holding-${h.id}`}>
                  <div>
                    <p className="font-medium text-sm">
                      {h.ticker ? <span className="font-mono mr-2">{h.ticker}</span> : null}
                      {h.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {h.type}
                      {h.shares ? ` · ${h.shares} shares` : ""}
                      {h.currentPrice ? ` @ ${fmtMoney(h.currentPrice)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" data-testid={`text-holding-value-${h.id}`}>{fmtMoney(h.value)}</span>
                    <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(h.id)} data-testid={`button-delete-holding-${h.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No holdings yet. Add your first investment above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddHoldingButton() {
  const [open, setOpen] = useState(false);
  const form = useForm<HoldingFormValues>({
    resolver: zodResolver(holdingFormSchema),
    defaultValues: { ticker: "", name: "", type: "stock", shares: "", costBasis: "", manualValue: "" },
  });

  const createMut = useMutation({
    mutationFn: async (values: HoldingFormValues) => {
      const body: Record<string, unknown> = {
        ticker: values.ticker || null,
        name: values.name,
        type: values.type,
      };
      if (values.shares !== "" && values.shares != null) body.shares = Number(values.shares);
      if (values.costBasis !== "" && values.costBasis != null) body.costBasis = Number(values.costBasis);
      if (values.manualValue !== "" && values.manualValue != null) body.manualValue = Number(values.manualValue);
      const res = await apiRequest("POST", "/api/finance/holdings", body);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/holdings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      setOpen(false);
      form.reset({ ticker: "", name: "", type: "stock", shares: "", costBasis: "", manualValue: "" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-add-holding"><Plus className="w-4 h-4 mr-1" />Add holding</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add holding</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => createMut.mutate(v))} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField control={form.control} name="ticker" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticker</FormLabel>
                  <FormControl><Input placeholder="AAPL" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} data-testid="input-holding-ticker" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-holding-type"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {HOLDING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="Apple Inc." {...field} data-testid="input-holding-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-2">
              <FormField control={form.control} name="shares" render={({ field }) => (
                <FormItem>
                  <FormLabel>Shares</FormLabel>
                  <FormControl><Input type="number" step="0.0001" {...field} data-testid="input-holding-shares" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="costBasis" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost per share</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} data-testid="input-holding-cost" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="manualValue" render={({ field }) => (
              <FormItem>
                <FormLabel>Or manual value (USD)</FormLabel>
                <FormControl><Input type="number" step="0.01" placeholder="Use if untracked by ticker" {...field} data-testid="input-holding-manual" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" disabled={createMut.isPending} data-testid="button-save-holding">
                {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════
// AI coach chat
// ══════════════════════════════════════════════════════════════════════

function FinanceCoachChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const chatMut = useMutation({
    mutationFn: async (message: string) => {
      const history = messages.slice(-10);
      const res = await apiRequest("POST", "/api/finance/chat", { message, history });
      return await res.json();
    },
    onSuccess: (data) => {
      setMessages(m => [...m, { role: "assistant", content: data.response || "..." }]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = () => {
    if (!input.trim() || chatMut.isPending) return;
    const msg = input.trim();
    setMessages(m => [...m, { role: "user", content: msg }]);
    setInput("");
    chatMut.mutate(msg);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-4 h-4" /> Money coach
          <Badge variant="secondary" className="text-[10px] ml-2">Grounded in your data</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 pr-3">
          <div ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground space-y-2 py-6 text-center">
                <p>Ask me about your spending, budgets, or investments.</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {["How am I doing this month?", "Where can I cut back?", "Am I on track with budgets?"].map(q => (
                    <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => setInput(q)} data-testid={`chip-suggest-${q.slice(0, 8)}`}>{q}</Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`} data-testid={`msg-${m.role}-${i}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatMut.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2"><Loader2 className="w-4 h-4 animate-spin" /></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 mt-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about your money..."
            disabled={chatMut.isPending}
            data-testid="input-coach-message"
          />
          <Button onClick={send} disabled={!input.trim() || chatMut.isPending} data-testid="button-coach-send">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
