
import { useEffect, useMemo, useState } from "react";

const KEY = "eli-wealth-tracker-v2";
const OLD_KEY = "eli-wealth-tracker-v1"; // v1 stored the rate as NZD per PHP
const CLASSES = ["Stock", "Global Fund", "REIT", "MP2", "ETF", "Fund", "Bond", "Crypto", "Cash", "Property", "Other"];
const COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#fb923c", "#22d3ee", "#94a3b8"];
const DEFAULT_RATE = 35; // PHP per 1 NZD. Placeholder only, NOT a live rate: edit it

const DEMO = [
  { id: "demo1", demo: true, name: "Demo Global Index Fund", ticker: "DEMO-IDX", assetClass: "Global Fund", account: "Demo Brokerage", currency: "NZD", units: 120, avgPrice: 10.5, currentPrice: 11.2 },
  { id: "demo2", demo: true, name: "Demo PH Blue Chip", ticker: "DEMO-PH", assetClass: "Stock", account: "Demo PH Broker", currency: "PHP", units: 500, avgPrice: 120, currentPrice: 131.5 },
  { id: "demo3", demo: true, name: "Demo MP2 Account", ticker: "DEMO-MP2", assetClass: "MP2", account: "Demo PH Savings", currency: "PHP", units: 10000, avgPrice: 1, currentPrice: 1.04 },
  { id: "demo5", demo: true, name: "Demo PH REIT", ticker: "DEMO-REIT", assetClass: "REIT", account: "Demo PH Broker", currency: "PHP", units: 300, avgPrice: 5.2, currentPrice: 4.9 },
  { id: "demo4", demo: true, name: "Demo Cash Reserve", ticker: "CASH", assetClass: "Cash", account: "Demo Bank", currency: "PHP", units: 1, avgPrice: 150000, currentPrice: 150000 },
];

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.holdings)) return { holdings: s.holdings, rate: s.rate > 0 ? s.rate : DEFAULT_RATE, display: s.display === "PHP" ? "PHP" : "NZD" };
  } catch {}
  try {
    const o = JSON.parse(localStorage.getItem(OLD_KEY));
    if (o && Array.isArray(o.holdings)) return { holdings: o.holdings, rate: o.rate > 0 ? Math.round((1 / o.rate) * 10000) / 10000 : DEFAULT_RATE, display: o.display === "PHP" ? "PHP" : "NZD" };
  } catch {}
  return { holdings: DEMO, rate: DEFAULT_RATE, display: "NZD" };
}

// rate = PHP per 1 NZD
const conv = (amt, from, to, rate) => (from === to ? amt : from === "NZD" ? amt * rate : amt / rate);
const money = (n, cur) => new Intl.NumberFormat("en", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n);
const qty = (n) => new Intl.NumberFormat("en", { maximumFractionDigits: 6 }).format(n);
const pct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const sign = (n) => (n > 0 ? "pos" : n < 0 ? "neg" : "");

export default function App() {
  const [init] = useState(load);
  const [holdings, setHoldings] = useState(init.holdings);
  const [rate, setRate] = useState(init.rate);
  const [rateText, setRateText] = useState(String(init.rate));
  const [display, setDisplay] = useState(init.display);
  const [editing, setEditing] = useState(null); // null | "new" | holding

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ holdings, rate, display })); } catch {}
  }, [holdings, rate, display]);

  const rows = useMemo(() => holdings.map((h) => {
    const cost = h.units * h.avgPrice, value = h.units * h.currentPrice, pl = value - cost;
    const c = (x) => conv(x, h.currency, display, rate);
    return { ...h, cost, value, pl, plPct: cost ? (pl / cost) * 100 : 0, dCost: c(cost), dValue: c(value), dPl: c(pl) };
  }), [holdings, rate, display]);

  const tot = useMemo(() => {
    const value = rows.reduce((s, r) => s + r.dValue, 0), cost = rows.reduce((s, r) => s + r.dCost, 0);
    return { value, cost, pl: value - cost, plPct: cost ? ((value - cost) / cost) * 100 : 0 };
  }, [rows]);

  const group = (key) => {
    const m = {};
    rows.forEach((r) => { m[r[key] || "Unassigned"] = (m[r[key] || "Unassigned"] || 0) + r.dValue; });
    return Object.entries(m).map(([label, value]) => ({ label, value })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  };

  const hasDemo = holdings.some((h) => h.demo);
  const accounts = [...new Set(holdings.map((h) => h.account).filter(Boolean))];

  const onRate = (v) => {
    setRateText(v);
    const n = parseFloat(v);
    if (n > 0) setRate(n);
  };
  const save = (h) => {
    setHoldings((p) => (p.some((x) => x.id === h.id) ? p.map((x) => (x.id === h.id ? h : x)) : [...p, h]));
    setEditing(null);
  };
  const del = (h) => { if (window.confirm(`Delete ${h.name}?`)) setHoldings((p) => p.filter((x) => x.id !== h.id)); };

  return (
    <div className="app">
      <header className="top">
        <h1>Eli’s Wealth Tracker</h1>
        <div className="controls">
          <div className="seg" role="group" aria-label="Display currency">
            {["NZD", "PHP"].map((c) => (
              <button key={c} className={display === c ? "on" : ""} onClick={() => setDisplay(c)}>{c}</button>
            ))}
          </div>
          <label className="rate">
            1 NZD =
            <input inputMode="decimal" value={rateText} onChange={(e) => onRate(e.target.value)} aria-label="PHP per NZD exchange rate" />
            PHP
          </label>
        </div>
        <p className="note">Exchange rate is entered by you (the default is a placeholder, not live). All prices are entered manually.</p>
      </header>

      {hasDemo && (
        <div className="banner">
          <span><b>Demo data</b> is showing. These are made-up holdings and prices.</span>
          <button onClick={() => setHoldings((p) => p.filter((h) => !h.demo))}>Remove demo data</button>
        </div>
      )}

      <section className="summary">
        <div className="card big"><span>Total portfolio value</span><strong>{money(tot.value, display)}</strong></div>
        <div className="card"><span>Invested capital</span><strong>{money(tot.cost, display)}</strong></div>
        <div className="card"><span>Unrealized P/L</span><strong className={sign(tot.pl)}>{money(tot.pl, display)}</strong><small className={sign(tot.pl)}>{pct(tot.plPct)}</small></div>
      </section>

      <section className="charts">
        <div className="card"><h2>By asset class</h2><Donut data={group("assetClass")} cur={display} /></div>
        <div className="card"><h2>By account</h2><Donut data={group("account")} cur={display} /></div>
        <div className="card"><h2>By currency</h2><Donut data={group("currency")} cur={display} /></div>
      </section>

      <section>
        <div className="bar">
          <h2>Holdings</h2>
          <button className="primary" onClick={() => setEditing("new")}>+ Add holding</button>
        </div>

        {rows.length === 0 && (
          <div className="card empty">
            No holdings yet.
            <div><button className="primary" onClick={() => setEditing("new")}>Add your first holding</button>{" "}
              <button onClick={() => setHoldings(DEMO)}>Load demo data</button></div>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="cards">
              {rows.map((r) => (
                <article className="card hold" key={r.id}>
                  <div className="hh">
                    <div><b>{r.name}</b>{r.demo && <em className="tag">DEMO</em>}<br /><small>{r.ticker} · {r.assetClass} · {r.account || "No account"}</small></div>
                    <div className="right"><b>{money(r.value, r.currency)}</b><br /><small className={sign(r.pl)}>{money(r.pl, r.currency)} ({pct(r.plPct)})</small></div>
                  </div>
                  <dl>
                    <div><dt>Units</dt><dd>{qty(r.units)}</dd></div>
                    <div><dt>Avg price</dt><dd>{money(r.avgPrice, r.currency)}</dd></div>
                    <div><dt>Current</dt><dd>{money(r.currentPrice, r.currency)}</dd></div>
                    <div><dt>Cost basis</dt><dd>{money(r.cost, r.currency)}</dd></div>
                  </dl>
                  <div className="acts"><button onClick={() => setEditing(r)}>Edit</button><button className="danger" onClick={() => del(r)}>Delete</button></div>
                </article>
              ))}
            </div>

            <div className="tablewrap">
              <table>
                <thead><tr>
                  <th>Asset</th><th>Ticker</th><th>Class</th><th>Account</th><th>Cur.</th>
                  <th className="n">Units</th><th className="n">Avg price</th><th className="n">Current</th>
                  <th className="n">Cost basis</th><th className="n">Market value</th><th className="n">Unrealized P/L</th><th></th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}{r.demo && <em className="tag">DEMO</em>}</td><td>{r.ticker}</td><td>{r.assetClass}</td><td>{r.account}</td><td>{r.currency}</td>
                      <td className="n">{qty(r.units)}</td><td className="n">{money(r.avgPrice, r.currency)}</td><td className="n">{money(r.currentPrice, r.currency)}</td>
                      <td className="n">{money(r.cost, r.currency)}</td><td className="n">{money(r.value, r.currency)}</td>
                      <td className={"n " + sign(r.pl)}>{money(r.pl, r.currency)} ({pct(r.plPct)})</td>
                      <td className="acts"><button onClick={() => setEditing(r)}>Edit</button><button className="danger" onClick={() => del(r)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <footer>Data stays in this browser (localStorage). No broker connections, no logins, no live price feeds.</footer>

      {editing && <HoldingForm initial={editing === "new" ? null : editing} accounts={accounts} onSave={save} onCancel={() => setEditing(null)} />}
    </div>
  );
}

function Donut({ data, cur }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let off = 0;
  if (!total) return <p className="muted">No data</p>;
  return (
    <div className="donut">
      <svg viewBox="0 0 42 42" role="img" aria-label="Allocation chart">
        <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#e7ebf0" strokeWidth="6" />
        {data.map((d, i) => {
          const p = (d.value / total) * 100;
          const el = <circle key={d.label} cx="21" cy="21" r="15.9155" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="6" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={25 - off} />;
          off += p;
          return el;
        })}
      </svg>
      <ul>
        {data.map((d, i) => (
          <li key={d.label}><i style={{ background: COLORS[i % COLORS.length] }} />{d.label}<span>{((d.value / total) * 100).toFixed(1)}%</span></li>
        ))}
      </ul>
    </div>
  );
}

function HoldingForm({ initial, accounts, onSave, onCancel }) {
  const [f, setF] = useState(() => initial
    ? { ...initial, units: String(initial.units), avgPrice: String(initial.avgPrice), currentPrice: String(initial.currentPrice) }
    : { name: "", ticker: "", assetClass: "Stock", account: "", currency: "NZD", units: "", avgPrice: "", currentPrice: "" });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const units = parseFloat(f.units), avgPrice = parseFloat(f.avgPrice), currentPrice = parseFloat(f.currentPrice);
    if (!f.name.trim()) return setErr("Asset name is required.");
    if (!(units > 0)) return setErr("Units must be greater than 0.");
    if (!(avgPrice >= 0) || !(currentPrice >= 0)) return setErr("Prices must be 0 or more.");
    onSave({
      id: initial?.id || crypto.randomUUID?.() || String(Date.now()),
      name: f.name.trim(), ticker: f.ticker.trim().toUpperCase(), assetClass: f.assetClass,
      account: f.account.trim(), currency: f.currency, units, avgPrice, currentPrice,
    });
  };

  return (
    <div className="overlay" onClick={onCancel}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial ? "Edit holding" : "Add holding"}</h2>
        <label>Asset name<input value={f.name} onChange={set("name")} autoFocus /></label>
        <div className="two">
          <label>Ticker<input value={f.ticker} onChange={set("ticker")} /></label>
          <label>Asset class<select value={f.assetClass} onChange={set("assetClass")}>{CLASSES.map((c) => <option key={c}>{c}</option>)}</selec
