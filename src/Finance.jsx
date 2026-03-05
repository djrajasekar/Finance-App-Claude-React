import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STORAGE_KEYS = {
  transactions: "pf_transactions",
  savings: "pf_savings",
  investments: "pf_investments",
  income: "pf_income",
};

const EXPENSE_CATEGORIES = ["Housing", "Food", "Transport", "Utilities", "Healthcare", "Entertainment", "Shopping", "Other"];
const INCOME_SOURCES = ["Salary", "Freelance", "Bonus", "Investment Returns", "Other"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const formatCurrency = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const PALETTE = {
  income: "#4ade80",
  expense: "#f87171",
  savings: "#60a5fa",
  debt: "#fb923c",
  accent: "#a78bfa",
  bg: "#0f1117",
  card: "#1a1d27",
  cardHover: "#1f2335",
  border: "#2a2d3e",
  text: "#e2e8f0",
  muted: "#64748b",
};

const PIE_COLORS = ["#4ade80","#60a5fa","#fb923c","#f87171","#a78bfa","#fbbf24","#34d399","#e879f9"];

function useStorage(key, defaultVal) {
  const [value, setValue] = useState(() => defaultVal);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(key);
        if (res) setValue(JSON.parse(res.value));
      } catch {}
      setLoaded(true);
    })();
  }, [key]);

  const set = useCallback(async (val) => {
    const next = typeof val === "function" ? val(value) : val;
    setValue(next);
    try { await window.storage.set(key, JSON.stringify(next)); } catch {}
  }, [key, value]);

  return [value, set, loaded];
}

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: PALETTE.card, border:`1px solid ${PALETTE.border}`, borderRadius:16, padding:28, minWidth:340, maxWidth:480, width:"90%" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontFamily:"'Playfair Display', serif", fontSize:20, color: PALETTE.text }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color: PALETTE.muted, cursor:"pointer", fontSize:22 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <div style={{ fontSize:12, color: PALETTE.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>}
    <input {...props} style={{ width:"100%", background:"#12151f", border:`1px solid ${PALETTE.border}`, borderRadius:8, padding:"10px 12px", color: PALETTE.text, fontSize:14, outline:"none", boxSizing:"border-box", ...props.style }} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <div style={{ fontSize:12, color: PALETTE.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>}
    <select {...props} style={{ width:"100%", background:"#12151f", border:`1px solid ${PALETTE.border}`, borderRadius:8, padding:"10px 12px", color: PALETTE.text, fontSize:14, outline:"none", boxSizing:"border-box" }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Btn = ({ children, variant="primary", ...props }) => {
  const styles = {
    primary: { background: PALETTE.accent, color:"#fff" },
    success: { background: PALETTE.income, color:"#111" },
    danger: { background: "#3f1414", color: PALETTE.expense, border:`1px solid ${PALETTE.expense}33` },
    ghost: { background:"transparent", color: PALETTE.muted, border:`1px solid ${PALETTE.border}` },
  };
  return (
    <button {...props} style={{ padding:"10px 20px", borderRadius:8, border:"none", fontWeight:600, cursor:"pointer", fontSize:13, transition:"opacity .15s", ...styles[variant], ...props.style }}>
      {children}
    </button>
  );
};

const StatCard = ({ label, value, sub, color, icon }) => (
  <div style={{ background: PALETTE.card, border:`1px solid ${PALETTE.border}`, borderRadius:16, padding:"20px 24px", flex:1, minWidth:160 }}>
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ fontSize:12, color: PALETTE.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</span>
    </div>
    <div style={{ fontFamily:"'Playfair Display', serif", fontSize:28, color: color || PALETTE.text, fontWeight:700 }}>{value}</div>
    {sub && <div style={{ fontSize:12, color: PALETTE.muted, marginTop:4 }}>{sub}</div>}
  </div>
);

export default function App() {
  const [transactions, setTransactions, txLoaded] = useStorage(STORAGE_KEYS.transactions, []);
  const [savings, setSavings, savLoaded] = useStorage(STORAGE_KEYS.savings, []);
  const [investments, setInvestments, invLoaded] = useStorage(STORAGE_KEYS.investments, []);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const years = [currentYear, currentYear - 1, currentYear - 2];

  // Derived stats
  const monthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const monthIncome = monthTx.filter(t => t.type === "income").reduce((s,t) => s + Number(t.amount), 0);
  const monthExpense = monthTx.filter(t => t.type === "expense").reduce((s,t) => s + Number(t.amount), 0);
  const monthNet = monthIncome - monthExpense;
  const totalSavings = savings.reduce((s,g) => s + Number(g.current), 0);
  const totalInvestments = investments.reduce((s,i) => s + Number(i.value), 0);
  const totalDebt = investments.filter(i => i.type === "debt").reduce((s,i) => s + Number(i.value), 0);

  // Chart data – monthly by year
  const monthlyData = MONTHS.map((m, mi) => {
    const ytx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === filterYear && d.getMonth() === mi;
    });
    return {
      month: m,
      income: ytx.filter(t => t.type === "income").reduce((s,t) => s + Number(t.amount), 0),
      expenses: ytx.filter(t => t.type === "expense").reduce((s,t) => s + Number(t.amount), 0),
    };
  });

  // Expense breakdown pie
  const expBreakdown = EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    value: transactions.filter(t => t.type === "expense" && t.category === cat && new Date(t.date).getFullYear() === filterYear).reduce((s,t) => s + Number(t.amount), 0),
  })).filter(c => c.value > 0);

  const openModal = (type) => {
    setModal(type);
    const today = new Date().toISOString().split("T")[0];
    if (type === "addTx") setForm({ type:"expense", category:"Food", source:"Salary", date: today, amount:"", note:"" });
    if (type === "addSaving") setForm({ name:"", target:"", current:"", note:"" });
    if (type === "addInvestment") setForm({ name:"", type:"investment", value:"", note:"" });
  };

  const handleAddTx = () => {
    if (!form.amount || !form.date) return;
    setTransactions(prev => [{ id: Date.now(), ...form }, ...prev]);
    setModal(null);
  };

  const handleAddSaving = () => {
    if (!form.name || !form.target) return;
    setSavings(prev => [{ id: Date.now(), ...form }, ...prev]);
    setModal(null);
  };

  const handleAddInvestment = () => {
    if (!form.name || !form.value) return;
    setInvestments(prev => [{ id: Date.now(), ...form }, ...prev]);
    setModal(null);
  };

  const deleteTx = (id) => setTransactions(prev => prev.filter(t => t.id !== id));
  const deleteSaving = (id) => setSavings(prev => prev.filter(t => t.id !== id));
  const deleteInvestment = (id) => setInvestments(prev => prev.filter(t => t.id !== id));

  const navItems = [
    { id:"dashboard", icon:"📊", label:"Dashboard" },
    { id:"transactions", icon:"💸", label:"Transactions" },
    { id:"savings", icon:"🏦", label:"Savings" },
    { id:"investments", icon:"📈", label:"Portfolio" },
  ];

  const recentTx = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  const loaded = txLoaded && savLoaded && invLoaded;

  return (
    <div style={{ minHeight:"100vh", background: PALETTE.bg, color: PALETTE.text, fontFamily:"'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Top Navigation Bar */}
      <div style={{ position:"fixed", left:0, right:0, top:0, height:64, background: PALETTE.card, borderBottom:`1px solid ${PALETTE.border}`, display:"flex", alignItems:"center", padding:"0 28px", zIndex:10, gap:32 }}>
        <div style={{ marginRight:8 }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:18, color: PALETTE.text, whiteSpace:"nowrap" }}>FinanceOS</div>
          <div style={{ fontSize:10, color: PALETTE.muted, marginTop:1 }}>Personal Finance</div>
        </div>
        <nav style={{ display:"flex", gap:4, flex:1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              display:"flex", alignItems:"center", gap:8, padding:"8px 16px",
              borderRadius:10, border:"none", cursor:"pointer",
              background: tab === item.id ? "#252840" : "transparent",
              color: tab === item.id ? PALETTE.text : PALETTE.muted,
              fontFamily:"'DM Sans', sans-serif", fontSize:14, fontWeight: tab === item.id ? 600 : 400,
              transition:"all .15s", whiteSpace:"nowrap"
            }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        {loaded && (
          <div style={{ display:"flex", alignItems:"center", gap:10, borderLeft:`1px solid ${PALETTE.border}`, paddingLeft:24 }}>
            <div style={{ fontSize:11, color: PALETTE.muted, textTransform:"uppercase", letterSpacing:"0.05em" }}>Net Worth</div>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, color: PALETTE.income }}>
              {formatCurrency(totalSavings + totalInvestments - totalDebt)}
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ marginLeft:0, paddingTop:64+32, padding:"96px 32px 32px", minHeight:"100vh" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <div>
            <h1 style={{ margin:0, fontFamily:"'Playfair Display', serif", fontSize:26, fontWeight:700 }}>
              {navItems.find(n => n.id === tab)?.label}
            </h1>
            <div style={{ fontSize:13, color: PALETTE.muted, marginTop:3 }}>
              {now.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {tab === "transactions" && <Btn variant="success" onClick={() => openModal("addTx")}>+ Add Transaction</Btn>}
            {tab === "savings" && <Btn variant="success" onClick={() => openModal("addSaving")}>+ Add Goal</Btn>}
            {tab === "investments" && <Btn variant="success" onClick={() => openModal("addInvestment")}>+ Add Entry</Btn>}
            {tab === "dashboard" && <Btn variant="ghost" onClick={() => openModal("addTx")}>+ Quick Add</Btn>}
          </div>
        </div>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display:"flex", gap:16, marginBottom:24, flexWrap:"wrap" }}>
              <StatCard icon="💰" label="This Month Income" value={formatCurrency(monthIncome)} color={PALETTE.income} sub="current month" />
              <StatCard icon="💸" label="This Month Expenses" value={formatCurrency(monthExpense)} color={PALETTE.expense} sub="current month" />
              <StatCard icon="📊" label="Net This Month" value={formatCurrency(monthNet)} color={monthNet >= 0 ? PALETTE.income : PALETTE.expense} sub={monthNet >= 0 ? "surplus" : "deficit"} />
              <StatCard icon="🏦" label="Total Savings" value={formatCurrency(totalSavings)} color={PALETTE.savings} sub={`${savings.length} goals`} />
              <StatCard icon="📈" label="Portfolio Value" value={formatCurrency(totalInvestments)} color={PALETTE.accent} sub={`${investments.filter(i=>i.type!=="debt").length} entries`} />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
              {/* Monthly Chart */}
              <div style={{ background: PALETTE.card, border:`1px solid ${PALETTE.border}`, borderRadius:16, padding:24 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <span style={{ fontFamily:"'Playfair Display', serif", fontSize:16 }}>Monthly Overview</span>
                  <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                    style={{ background:"#12151f", border:`1px solid ${PALETTE.border}`, color: PALETTE.muted, borderRadius:6, padding:"4px 8px", fontSize:12 }}>
                    {years.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} barGap={2}>
                    <XAxis dataKey="month" tick={{ fill: PALETTE.muted, fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: PALETTE.muted, fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000)+"k" : v}`} />
                    <Tooltip contentStyle={{ background: PALETTE.card, border:`1px solid ${PALETTE.border}`, borderRadius:8, fontSize:12 }} formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="income" fill={PALETTE.income} radius={[4,4,0,0]} />
                    <Bar dataKey="expenses" fill={PALETTE.expense} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Expense Pie */}
              <div style={{ background: PALETTE.card, border:`1px solid ${PALETTE.border}`, borderRadius:16, padding:24 }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:16, marginBottom:16 }}>Spending by Category</div>
                {expBreakdown.length === 0 ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color: PALETTE.muted, fontSize:14 }}>No expense data yet</div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <ResponsiveContainer width="50%" height={180}>
                      <PieChart>
                        <Pie data={expBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                          {expBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: PALETTE.card, border:`1px solid ${PALETTE.border}`, fontSize:12 }} formatter={v => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex:1 }}>
                      {expBreakdown.map((c, i) => (
                        <div key={c.name} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                          <div style={{ width:8, height:8, borderRadius:2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink:0 }} />
                          <span style={{ fontSize:12, color: PALETTE.muted, flex:1 }}>{c.name}</span>
                          <span style={{ fontSize:12, fontWeight:600 }}>{formatCurrency(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div style={{ background: PALETTE.card, border:`1px solid ${PALETTE.border}`, borderRadius:16, padding:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <span style={{ fontFamily:"'Playfair Display', serif", fontSize:16 }}>Recent Transactions</span>
                <button onClick={() => setTab("transactions")} style={{ background:"none", border:"none", color: PALETTE.accent, cursor:"pointer", fontSize:13 }}>View all →</button>
              </div>
              {recentTx.length === 0 ? (
                <div style={{ color: PALETTE.muted, fontSize:14, padding:"16px 0" }}>No transactions yet. Add one to get started!</div>
              ) : (
                recentTx.map(tx => (
                  <div key={tx.id} style={{ display:"flex", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${PALETTE.border}33` }}>
                    <div style={{ width:36, height:36, borderRadius:10, background: tx.type === "income" ? "#0d2310" : "#230d0d", display:"flex", alignItems:"center", justifyContent:"center", marginRight:12, fontSize:16 }}>
                      {tx.type === "income" ? "↑" : "↓"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:500 }}>{tx.note || tx.category || tx.source}</div>
                      <div style={{ fontSize:12, color: PALETTE.muted }}>{tx.category || tx.source} · {tx.date}</div>
                    </div>
                    <div style={{ fontWeight:600, fontSize:15, color: tx.type === "income" ? PALETTE.income : PALETTE.expense }}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TRANSACTIONS */}
        {tab === "transactions" && (
          <div>
            <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
              <StatCard icon="⬆️" label="Total Income" value={formatCurrency(transactions.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0))} color={PALETTE.income} />
              <StatCard icon="⬇️" label="Total Expenses" value={formatCurrency(transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0))} color={PALETTE.expense} />
              <StatCard icon="🔢" label="Transactions" value={transactions.length} />
            </div>
            <div style={{ background: PALETTE.card, border:`1px solid ${PALETTE.border}`, borderRadius:16, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px 100px 80px", padding:"12px 20px", borderBottom:`1px solid ${PALETTE.border}`, fontSize:11, color: PALETTE.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                <span>Description</span><span>Category</span><span>Date</span><span>Amount</span><span></span>
              </div>
              {transactions.length === 0 && (
                <div style={{ padding:40, textAlign:"center", color: PALETTE.muted }}>No transactions yet. Click "+ Add Transaction" to start.</div>
              )}
              {[...transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).map(tx => (
                <div key={tx.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 100px 100px 80px", padding:"14px 20px", borderBottom:`1px solid ${PALETTE.border}22`, alignItems:"center" }}>
                  <span style={{ fontSize:14 }}>{tx.note || (tx.type === "income" ? tx.source : tx.category)}</span>
                  <span style={{ fontSize:13, color: PALETTE.muted }}>{tx.type === "income" ? tx.source : tx.category}</span>
                  <span style={{ fontSize:13, color: PALETTE.muted }}>{tx.date}</span>
                  <span style={{ fontWeight:600, color: tx.type === "income" ? PALETTE.income : PALETTE.expense }}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                  <button onClick={() => deleteTx(tx.id)} style={{ background:"none", border:"none", color: PALETTE.muted, cursor:"pointer", fontSize:16 }}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SAVINGS */}
        {tab === "savings" && (
          <div>
            <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
              <StatCard icon="🏦" label="Total Saved" value={formatCurrency(totalSavings)} color={PALETTE.savings} />
              <StatCard icon="🎯" label="Total Target" value={formatCurrency(savings.reduce((s,g)=>s+Number(g.target),0))} />
              <StatCard icon="📋" label="Active Goals" value={savings.length} />
            </div>
            {savings.length === 0 && (
              <div style={{ background: PALETTE.card, border:`1px solid ${PALETTE.border}`, borderRadius:16, padding:48, textAlign:"center", color: PALETTE.muted }}>
                No savings goals yet. Click "+ Add Goal" to create one.
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:16 }}>
              {savings.map(g => {
                const pct = Math.min(100, Math.round((Number(g.current) / Number(g.target)) * 100));
                return (
                  <div key={g.id} style={{ background: PALETTE.card, border:`1px solid ${PALETTE.border}`, borderRadius:16, padding:22 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                      <div>
                        <div style={{ fontFamily:"'Playfair Display', serif", fontSize:17 }}>{g.name}</div>
                        {g.note && <div style={{ fontSize:12, color: PALETTE.muted, marginTop:2 }}>{g.note}</div>}
                      </div>
                      <button onClick={() => deleteSaving(g.id)} style={{ background:"none", border:"none", color: PALETTE.muted, cursor:"pointer" }}>🗑</button>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ color: PALETTE.savings, fontWeight:700, fontSize:18 }}>{formatCurrency(g.current)}</span>
                      <span style={{ color: PALETTE.muted, fontSize:14 }}>of {formatCurrency(g.target)}</span>
                    </div>
                    <div style={{ background:"#12151f", borderRadius:6, height:8, overflow:"hidden" }}>
                      <div style={{ width:`${pct}%`, height:"100%", background: pct >= 100 ? PALETTE.income : PALETTE.savings, borderRadius:6, transition:"width .5s" }} />
                    </div>
                    <div style={{ fontSize:12, color: PALETTE.muted, marginTop:6 }}>{pct}% complete</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* INVESTMENTS */}
        {tab === "investments" && (
          <div>
            <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
              <StatCard icon="📈" label="Investments" value={formatCurrency(investments.filter(i=>i.type!=="debt").reduce((s,i)=>s+Number(i.value),0))} color={PALETTE.accent} />
              <StatCard icon="💳" label="Total Debt" value={formatCurrency(totalDebt)} color={PALETTE.expense} />
              <StatCard icon="🧮" label="Net Portfolio" value={formatCurrency(investments.filter(i=>i.type!=="debt").reduce((s,i)=>s+Number(i.value),0) - totalDebt)} color={PALETTE.savings} />
            </div>
            {investments.length === 0 && (
              <div style={{ background: PALETTE.card, border:`1px solid ${PALETTE.border}`, borderRadius:16, padding:48, textAlign:"center", color: PALETTE.muted }}>
                No portfolio entries yet. Click "+ Add Entry" to start.
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px,1fr))", gap:16 }}>
              {investments.map(inv => (
                <div key={inv.id} style={{ background: PALETTE.card, border:`1px solid ${inv.type === "debt" ? PALETTE.expense+"55" : PALETTE.border}`, borderRadius:16, padding:22 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ fontFamily:"'Playfair Display', serif", fontSize:17 }}>{inv.name}</div>
                      <div style={{ fontSize:12, color: PALETTE.muted, marginTop:2, textTransform:"capitalize" }}>{inv.type}</div>
                    </div>
                    <button onClick={() => deleteInvestment(inv.id)} style={{ background:"none", border:"none", color: PALETTE.muted, cursor:"pointer" }}>🗑</button>
                  </div>
                  <div style={{ fontWeight:700, fontSize:22, color: inv.type === "debt" ? PALETTE.expense : PALETTE.accent, fontFamily:"'Playfair Display', serif" }}>
                    {formatCurrency(inv.value)}
                  </div>
                  {inv.note && <div style={{ fontSize:12, color: PALETTE.muted, marginTop:6 }}>{inv.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      <Modal open={modal === "addTx"} onClose={() => setModal(null)} title="Add Transaction">
        <Select label="Type" options={["expense","income"]} value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} />
        {form.type === "expense"
          ? <Select label="Category" options={EXPENSE_CATEGORIES} value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} />
          : <Select label="Source" options={INCOME_SOURCES} value={form.source} onChange={e => setForm(f => ({...f, source: e.target.value}))} />
        }
        <Input label="Amount ($)" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} />
        <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
        <Input label="Note (optional)" placeholder="Description..." value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} />
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="success" style={{ flex:1 }} onClick={handleAddTx}>Save Transaction</Btn>
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
        </div>
      </Modal>

      <Modal open={modal === "addSaving"} onClose={() => setModal(null)} title="Add Savings Goal">
        <Input label="Goal Name" placeholder="e.g. Emergency Fund" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
        <Input label="Target Amount ($)" type="number" placeholder="10000" value={form.target} onChange={e => setForm(f => ({...f, target: e.target.value}))} />
        <Input label="Current Amount ($)" type="number" placeholder="0" value={form.current} onChange={e => setForm(f => ({...f, current: e.target.value}))} />
        <Input label="Notes (optional)" placeholder="..." value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} />
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="success" style={{ flex:1 }} onClick={handleAddSaving}>Save Goal</Btn>
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
        </div>
      </Modal>

      <Modal open={modal === "addInvestment"} onClose={() => setModal(null)} title="Add Portfolio Entry">
        <Input label="Name" placeholder="e.g. S&P 500 ETF, Car Loan" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
        <Select label="Type" options={["investment","stocks","real estate","crypto","debt","other"]} value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} />
        <Input label="Current Value ($)" type="number" placeholder="0" value={form.value} onChange={e => setForm(f => ({...f, value: e.target.value}))} />
        <Input label="Notes (optional)" placeholder="..." value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} />
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <Btn variant="success" style={{ flex:1 }} onClick={handleAddInvestment}>Save Entry</Btn>
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}