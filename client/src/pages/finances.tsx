import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage
} from "@/components/ui/form";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet, Settings2, TrendingUp, PiggyBank, Sparkles,
  DollarSign, Send, Loader2, Plus, Trash2, Bot, Link2, RefreshCw,
  ArrowUpRight, ArrowDownRight, Building2, AlertTriangle
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
  note: z.string().optional(),
});
type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const budgetFormSchema = z.object({
  category: z.enum(SPEND_CATEGORIES),
  monthlyLimit: z.coerce.number().positive("Enter a positive limit"),
});
type BudgetFormValues = z.infer<typeof budgetFormSchema>;

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
}
interface Budget {
  id: string; category: string; monthlyLimit: number; spent: number;
}
interface Holding {
  id: string; ticker: string | null; name: string; type: string;
  shares: number | null; costBasis: number | null; currentPrice: number | null;
  manualValue: number | null; lastQuoteAt: string | null; value: number;
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
}
interface PlaidStatus {
  configured: boolean; env: string;
  items: Array<{ id: string; institutionName: string | null; lastSyncAt: string | null }>;
}
interface ChatMessage { role: "user" | "assistant"; content: string; }

// ══════════════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════════════

export default function FinancesPage() {
  usePageMeta("Finances", "Track your budget, manage spending, and build financial wellness.");
  const [profileOpen, setProfileOpen] = useState(false);
  const [financeProfile, setFinanceProfile] = useState<FinanceProfile | null>(getFinanceProfile());

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><Wallet className="w-6 h-6" /> Finances</span>}
        rightContent={
          <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)} data-testid="button-finance-settings">
            <Settings2 className="w-4 h-4 mr-2" />Preferences
          </Button>
        }
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-finance">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
          <TabsTrigger value="budgets" data-testid="tab-budgets">Budgets</TabsTrigger>
          <TabsTrigger value="investments" data-testid="tab-investments">Investments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab profile={financeProfile} /></TabsContent>
        <TabsContent value="transactions" className="mt-6"><TransactionsTab /></TabsContent>
        <TabsContent value="budgets" className="mt-6"><BudgetsTab /></TabsContent>
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

function OverviewTab({ profile }: { profile: FinanceProfile | null }) {
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
              <AddTransactionButton accounts={summary?.accounts || []} />
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
  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/finance/transactions/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/budgets"] });
    },
  });

  if (txns.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>;
  }
  return (
    <div className="space-y-1">
      {txns.map(t => (
        <div key={t.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md" data-testid={`row-txn-${t.id}`}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{t.merchant || t.category}</p>
            <p className="text-xs text-muted-foreground">
              {t.date} · {t.category}
              {t.source === "plaid" && <Badge variant="outline" className="ml-2 text-[10px]">Plaid</Badge>}
              {t.pending && <Badge variant="secondary" className="ml-1 text-[10px]">Pending</Badge>}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
      ))}
    </div>
  );
}

function AddTransactionButton({ accounts }: { accounts: Account[] }) {
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
      date: new Date().toISOString().slice(0, 10),
    },
  });

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
        currency: "USD",
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/budgets"] });
      setOpen(false);
      form.reset({
        sign: "expense", amount: 0, category: "Food",
        merchant: "", note: "", accountId: "none",
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
