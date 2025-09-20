// src/App.jsx
// Paste your full MS-DAS UI code here (the one with menu, Box Office, etc.)

export default function App() {
  return (
    <div className="min-h-screen bg-black text-green-400 p-4 font-mono">
      <h1>MS‑DAS Web</h1>
      <p>Replace this with the full App.jsx code.</p>
    </div>
  );
}
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * MS‑DAS Web (React)
 * A DOS‑style festival management UI for Das Improv Festival Berlin 2025
 *
 * - Single‑file React app (no external UI libs required)
 * - TailwindCSS recommended (monospace, green‑on‑black aesthetics)
 * - LocalStorage as the persistence layer ("DB")
 * - CSV import/export, JSON backup/restore
 * - Keyboard‑driven main menu (1‑9, B, Q), Help (F1), Language toggle (L)
 * - Mock data seeded on first run; feel free to replace with real data
 *
 * Notes:
 * - This is a single‑component export for easy preview. In production, split into modules.
 * - Designed to feel like MS‑DOS text UI while running in the browser.
 */

// ---------- Types ----------

type Ticket = {
  tid: string;
  showId: string;
  type: "GA" | "VIP" | "STAFF" | "PRESS";
  price: number;
  status: "SOLD" | "VOID" | "USED";
  channel: "ONSITE" | "PRESALE";
  soldAt: string; // YYYY-MM-DD
  soldTime: string; // HH:MM
  buyer: string;
  email: string;
  notes?: string;
};

type Show = {
  showId: string;
  title: string;
  venueId: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  capacity: number;
  category: "Show" | "Workshop";
  headliner?: string;
  techNotes?: string;
};

type Venue = {
  venueId: string;
  name: string;
  address: string;
  capacity: number;
  contact?: string;
  phone?: string;
  notes?: string;
};

type Person = {
  pid: string;
  role: "PERF" | "VOL" | "STAFF" | "PRESS";
  first: string;
  last: string;
  email?: string;
  phone?: string;
  team?: string; // troupe/dept
  lang?: "EN" | "DE";
  notes?: string;
};

type Shift = {
  shiftId: string;
  venueId: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  role: string; // Door/Tech/FOH
  cap: number; // needed count
};

type Assignment = {
  assignId: string;
  shiftId: string;
  pid: string;
  status: "OK" | "DROP";
  notes?: string;
};

type Sale = {
  sid: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  showId: string;
  tid: string;
  method: "CASH" | "CARD";
  amount: number;
};

type Expense = {
  eid: string;
  date: string;
  cat: string; // category
  payee: string;
  memo?: string;
  amount: number;
  paid: boolean;
};

type Scan = {
  scanId: string;
  tid: string;
  when: string; // YYYY-MM-DD
  time: string; // HH:MM
  gate: string; // GateA
  ok: boolean;
  msg?: string;
};

// ---------- Utilities ----------

const DB_KEY = "msdas_db_v1";

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeStr(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function uid(prefix: string) {
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}-${ts}`;
}

function tidFor(showId: string, seq: number) {
  // e.g., 25-A-000123
  return `${new Date().getFullYear().toString().slice(2)}-${showId.slice(-1)}-${pad(seq, 6)}`;
}

function saveFile(filename: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): string[][] {
  // Very small CSV parser (no quotes escaping beyond basic). Good enough for simple imports.
  return text
    .split(/\r?\n/)
    .filter((r) => r.trim().length > 0)
    .map((row) => row.split(",").map((c) => c.trim()));
}



// ---------- Seed Data ----------

type DB = {
  tickets: Ticket[];
  shows: Show[];
  venues: Venue[];
  persons: Person[];
  shifts: Shift[];
  assigns: Assignment[];
  sales: Sale[];
  expenses: Expense[];
  scans: Scan[];
  seq: { [k: string]: number }; // counters per key
  locale: "EN" | "DE";
};

const seedDB = (): DB => ({
  tickets: [],
  shows: [
    {
      showId: "IMP25-S01",
      title: "Opening Night Jam",
      venueId: "VENUA",
      date: "2025-10-16",
      start: "19:00",
      end: "20:30",
      capacity: 180,
      category: "Show",
      headliner: "Berlin All-Stars",
    },
    {
      showId: "IMP25-S02",
      title: "International Ensemble",
      venueId: "VENUB",
      date: "2025-10-17",
      start: "20:00",
      end: "21:30",
      capacity: 220,
      category: "Show",
    },
  ],
  venues: [
    {
    venueId: "VEN-CCB",
    name: "Comedy Café Berlin",
    address: "Roseggerstr. 17, Berlin",
    capacity: 60,   // estimate or leave blank
    contact: "",
    phone: "",
    notes: "Main venue"
  },
  {
    venueId: "VEN-IDAN",
    name: "Ida Nowhere",
    address: "Donaustr. 79, Berlin",
    capacity: 30,  // estimate or blank
    contact: "",
    phone: "",
    notes: "Partner venue"
  },
  {
    venueId: "VEN‑CCBS",
    name: "CCB Studios",
    address: "Hasenheide 12, Berlin",
    capacity: 50,
    contact: "",
    phone: "",
    notes: "Workshop space"
  }
  ],
  persons: [
    { pid: "P0001", role: "TECH", first: "Josh", last: "Telson", team: "Smash Cut", lang: "EN" },
    { pid: "P0002", role: "SANDWICH", first: "Noah", last: "Telson", team: "Toasty" , phone: "911", lang: "DE" },
  ],
  shifts: [
    { shiftId: "SH001", venueId: "VENUA", date: "2025-10-16", start: "17:30", end: "22:00", role: "FOH", cap: 4 },
  ],
  assigns: [],
  sales: [],
  expenses: [],
  scans: [],
  seq: { TICKET: 1, SALE: 1, EXP: 1, SCAN: 1 },
  locale: "EN",
});

function loadDB(): DB {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const d = seedDB();
    localStorage.setItem(DB_KEY, JSON.stringify(d));
    return d;
  }
  try {
    return JSON.parse(raw) as DB;
  } catch {
    const d = seedDB();
    localStorage.setItem(DB_KEY, JSON.stringify(d));
    return d;
  }
}

function saveDB(db: DB) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ---------- UI Helpers ----------

const Box: React.FC<{ title?: string; children: React.ReactNode; className?: string }>= ({ title, children, className }) => (
  <div className={`border border-green-500 p-2 ${className ?? ""}`}>
    {title && (
      <div className="mb-1">
        <span className="px-1 bg-green-700 text-black font-bold">{title}</span>
      </div>
    )}
    <div className="whitespace-pre-wrap">{children}</div>
  </div>
);

const Row: React.FC<{ label: string; children?: React.ReactNode }>= ({ label, children }) => (
  <div className="grid grid-cols-12 gap-2 items-center mb-1">
    <div className="col-span-3 text-green-300">{label}</div>
    <div className="col-span-9">{children}</div>
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`bg-black border border-green-600 px-2 py-1 text-green-100 outline-none w-full ${props.className ?? ""}`}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className={`bg-black border border-green-600 px-2 py-1 text-green-100 outline-none w-full ${props.className ?? ""}`}
  />
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...rest }) => (
  <button
    {...rest}
    className={`border border-green-600 hover:bg-green-900/40 px-3 py-1 text-green-100 mr-2`}>
    {children}
  </button>
);

function AsciiFrame({ children }: { children: React.ReactNode }) {
  return (
    <pre className="leading-none">
{String.raw`┌──────────────────────────────────────────────────────────────────────────┐`}
{"\n"}
{children}
{"\n"}
{String.raw`└──────────────────────────────────────────────────────────────────────────┘`}
    </pre>
  );
}

// ---------- Main App ----------

const MENU = [
  { key: "1", id: "BOX", label: "Box Office (Fast Sell & Check‑In)" },
  { key: "2", id: "TICKETS", label: "Tickets (Manage/Import/Refund)" },
  { key: "3", id: "SCHEDULE", label: "Schedule (Shows/Venues/Conflicts)" },
  { key: "4", id: "PEOPLE", label: "People (Performers/Staff/Press)" },
  { key: "5", id: "CHECKIN", label: "Check‑in (Scanner Mode)" },
  { key: "6", id: "VOL", label: "Volunteers & Shifts" },
  { key: "7", id: "VENDOR", label: "Vendors & Inventory" },
  { key: "8", id: "FIN", label: "Finance & Cash‑up" },
  { key: "9", id: "REPORTS", label: "Reports & Badges" },
  { key: "B", id: "BACKUP", label: "Backup / Restore" },
];

type ViewId = typeof MENU[number]["id"] | "HOME" | "ABOUT";

const LANG = {
  EN: {
    title: "MS‑DAS v1.0 — Das Improv Festival Berlin 2025",
    help: "F1 Help  •  1‑9/B menu  •  L switch language  •  Ctrl+/ search",
    quit: "Q) Quit",
  },
  DE: {
    title: "MS‑DAS v1.0 — Das Improv Festival Berlin 2025",
    help: "F1 Hilfe  •  1‑9/B Menü  •  L Sprache wechseln  •  Strg+/ Suchen",
    quit: "Q) Beenden",
  },
};

export default function App() {
  const [db, setDb] = useState<DB>(() => loadDB());
  const [view, setView] = useState<ViewId>("HOME");
  const [search, setSearch] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Persist DB on change
  useEffect(() => saveDB(db), [db]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F1") {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        const el = document.getElementById("msdas-search") as HTMLInputElement | null;
        el?.focus();
        return;
      }
      // Menu keys
      const m = MENU.find((m) => m.key.toUpperCase() === e.key.toUpperCase());
      if (m) {
        setView(m.id as ViewId);
        return;
      }
      if (e.key.toUpperCase() === "Q") {
        // fake quit -> go home
        setView("HOME");
        return;
      }
      if (e.key.toUpperCase() === "L") {
        setDb((d) => ({ ...d, locale: d.locale === "EN" ? "DE" : "EN" }));
        setFlash(disp("Language:") + " " + (db.locale === "EN" ? "Deutsch" : "English"));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [db.locale]);

  function disp(s: string) {
    return db.locale === "DE"
      ? s
          .replace("Language:", "Sprache:")
      : s;
  }

  function update<K extends keyof DB>(key: K, mutate: (cur: DB[K]) => DB[K]) {
    setDb((d) => ({ ...d, [key]: mutate(d[key]) } as DB));
  }

  // ---------- Modules ----------

  function Home() {
    return (
      <AsciiFrame>
{String.raw`│ Date: ${todayStr()}   Time: ${timeStr()}   Venue Set: [ ALL ]   User: [ FOH ]             │`}
{"\n"}
{String.raw`├──────────────────────────────────────────────────────────────────────────┤`}
{"\n"}
{String.raw`│ 1) Box Office  (Fast Sell & Check‑In)      6) Volunteers & Shifts          │`}
{"\n"}
{String.raw`│ 2) Tickets     (Manage/Import/Refund)      7) Vendors & Inventory          │`}
{"\n"}
{String.raw`│ 3) Schedule    (Shows/Venues/Conflicts)    8) Finance & Cash‑up            │`}
{"\n"}
{String.raw`│ 4) People      (Performers/Staff/Press)    9) Reports & Badges             │`}
{"\n"}
{String.raw`│ 5) Check‑in    (Scanner Mode)              B) Backup / Restore             │`}
{"\n"}
{String.raw`│                                                                          │`}
{"\n"}
{String.raw`│ L) Language [${db.locale}]     Q) Quit    F1) Help    Ctrl+/ Search                 │`}
      </AsciiFrame>
    );
  }

  function BoxOffice() {
    const [showId, setShowId] = useState(db.shows[0]?.showId ?? "");
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(15);
    const [type, setType] = useState<Ticket["type"]>("GA");
    const [method, setMethod] = useState<Sale["method"]>("CASH");
    const show = db.shows.find((s) => s.showId === showId);
    const soldCount = db.tickets.filter((t) => t.showId === showId && t.status !== "VOID").length;
    const remaining = Math.max(0, (show?.capacity ?? 0) - soldCount);

    function sell() {
      if (!show) return;
      if (qty <= 0) return;
      if (remaining < qty) {
        setFlash("Capacity exceeded");
        return;
      }
      const nextSeq = (db.seq.TICKET ?? 1);
      const newTickets: Ticket[] = Array.from({ length: qty }, (_, i) => {
        const seq = nextSeq + i;
        return {
          tid: tidFor(show.showId, seq),
          showId: show.showId,
          type,
          price,
          status: "SOLD",
          channel: "ONSITE",
          soldAt: todayStr(),
          soldTime: timeStr(),
          buyer: "Walk-up",
          email: "",
        };
      });
      const saleRows: Sale[] = newTickets.map((t) => ({
        sid: uid("SID"),
        date: t.soldAt,
        time: t.soldTime,
        showId: t.showId,
        tid: t.tid,
        method,
        amount: t.price,
      }));
      setDb((d) => ({
        ...d,
        tickets: [...d.tickets, ...newTickets],
        sales: [...d.sales, ...saleRows],
        seq: { ...d.seq, TICKET: nextSeq + qty },
      }));
      setFlash(`${qty} ticket(s) sold for ${show.title}`);
    }

    return (
      <div className="grid md:grid-cols-2 gap-4">
        <Box title="Box Office">
          <Row label="Show">
            <Select value={showId} onChange={(e) => setShowId(e.target.value)}>
              {db.shows.map((s) => (
                <option key={s.showId} value={s.showId}>{`${s.date} ${s.start} — ${s.title}`}</option>
              ))}
            </Select>
          </Row>
          <Row label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as Ticket["type"]) }>
              <option>GA</option>
              <option>VIP</option>
              <option>STAFF</option>
              <option>PRESS</option>
            </Select>
          </Row>
          <Row label="Price EUR">
            <Input type="number" step="0.01" value={price} onChange={(e)=>setPrice(parseFloat(e.target.value||"0"))} />
          </Row>
          <Row label="Qty">
            <Input type="number" value={qty} onChange={(e)=>setQty(parseInt(e.target.value||"1"))} />
          </Row>
          <Row label="Method">
            <Select value={method} onChange={(e)=>setMethod(e.target.value as Sale["method"]) }>
              <option>CASH</option>
              <option>CARD</option>
            </Select>
          </Row>
          <div className="mt-2">
            <Button onClick={sell}>Sell & Check‑in</Button>
            <span className="text-green-300">Remaining: {remaining}</span>
          </div>
        </Box>
        <Box title="Recent Sales">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-black">
                <tr className="text-green-300 border-b border-green-700">
                  <th className="text-left">Time</th>
                  <th className="text-left">Show</th>
                  <th className="text-left">TID</th>
                  <th className="text-right">EUR</th>
                </tr>
              </thead>
              <tbody>
                {[...db.sales].reverse().slice(0, 20).map((s) => (
                  <tr key={s.sid} className="border-b border-green-900/30">
                    <td>{s.date} {s.time}</td>
                    <td>{s.showId}</td>
                    <td className="font-bold">*{s.tid}*</td>
                    <td className="text-right">{s.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Box>
      </div>
    );
  }

  function TicketsView() {
    const [filter, setFilter] = useState("");
    const filtered = db.tickets.filter((t) =>
      [t.tid, t.showId, t.buyer, t.email].join(" ").toLowerCase().includes(filter.toLowerCase())
    );

    function voidTicket(tid: string) {
      setDb((d) => ({ ...d, tickets: d.tickets.map((t) => (t.tid === tid ? { ...t, status: "VOID" } : t)) }));
    }

    return (
      <div>
        <Row label="Search">
          <Input placeholder="TID / Buyer / Email" value={filter} onChange={(e)=>setFilter(e.target.value)} />
        </Row>
        <div className="max-h-96 overflow-auto border border-green-700">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-black">
              <tr className="text-green-300 border-b border-green-700">
                <th className="text-left">TID</th>
                <th className="text-left">Show</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-right">EUR</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.tid} className="border-b border-green-900/30">
                  <td className="font-bold">{t.tid}</td>
                  <td>{t.showId}</td>
                  <td className="text-center">{t.type}</td>
                  <td className="text-center">{t.status}</td>
                  <td className="text-right">{t.price.toFixed(2)}</td>
                  <td>
                    <Button onClick={()=>voidTicket(t.tid)}>Void</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function ScheduleView() {
    const [form, setForm] = useState<Partial<Show>>({});

    function addShow() {
      if (!form.title || !form.venueId || !form.date || !form.start || !form.end || !form.capacity) return;
      const showId = `IMP25-${uid("S").slice(-3)}`;
      const row: Show = {
        showId,
        title: form.title!,
        venueId: form.venueId!,
        date: form.date!,
        start: form.start!,
        end: form.end!,
        capacity: Number(form.capacity),
        category: (form.category as any) || "Show",
        headliner: form.headliner || "",
        techNotes: form.techNotes || "",
      };
      setDb((d) => ({ ...d, shows: [...d.shows, row] }));
      setForm({});
      setFlash("Show added");
    }

    // Simple conflict detection
    function conflicts(show: Show) {
      const overlapping = db.shows.filter((s) =>
        s.venueId === show.venueId && s.date === show.date && !(s.end <= show.start || s.start >= show.end) && s.showId !== show.showId
      );
      return overlapping;
    }

    return (
      <div className="grid lg:grid-cols-2 gap-4">
        <Box title="Add Show">
          <Row label="Title"><Input value={form.title||""} onChange={(e)=>setForm({...form, title:e.target.value})} /></Row>
          <Row label="Venue">
            <Select value={form.venueId||""} onChange={(e)=>setForm({...form, venueId:e.target.value})}>
              <option value="">Select…</option>
              {db.venues.map(v=> <option key={v.venueId} value={v.venueId}>{v.name}</option>)}
            </Select>
          </Row>
          <Row label="Date"><Input type="date" value={form.date||""} onChange={(e)=>setForm({...form, date:e.target.value})}/></Row>
          <Row label="Start"><Input type="time" value={form.start||""} onChange={(e)=>setForm({...form, start:e.target.value})}/></Row>
          <Row label="End"><Input type="time" value={form.end||""} onChange={(e)=>setForm({...form, end:e.target.value})}/></Row>
          <Row label="Capacity"><Input type="number" value={form.capacity as any || ""} onChange={(e)=>setForm({...form, capacity: Number(e.target.value) })}/></Row>
          <Row label="Category">
            <Select value={(form.category as any)||"Show"} onChange={(e)=>setForm({...form, category: e.target.value as any})}>
              <option>Show</option>
              <option>Workshop</option>
            </Select>
          </Row>
          <div className="mt-2"><Button onClick={addShow}>Add</Button></div>
        </Box>
        <Box title="Shows">
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-black">
                <tr className="text-green-300 border-b border-green-700">
                  <th>Date</th><th>Start</th><th>End</th><th>Venue</th><th>Title</th><th>⚠︎</th>
                </tr>
              </thead>
              <tbody>
                {db.shows.sort((a,b)=> (a.date+a.start).localeCompare(b.date+b.start)).map(s=>{
                  const c = conflicts(s);
                  return (
                    <tr key={s.showId} className="border-b border-green-900/30">
                      <td>{s.date}</td>
                      <td>{s.start}</td>
                      <td>{s.end}</td>
                      <td>{db.venues.find(v=>v.venueId===s.venueId)?.name||s.venueId}</td>
                      <td className="font-bold">{s.title}</td>
                      <td className="text-center">{c.length>0?"✖":""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Box>
      </div>
    );
  }

  function PeopleView() {
    const [form, setForm] = useState<Partial<Person>>({ role: "PERF", lang: db.locale });
    const [q, setQ] = useState("");
    const people = db.persons.filter(p=> [p.first,p.last,p.team,p.role].join(" ").toLowerCase().includes(q.toLowerCase()));

    function add() {
      if (!form.first || !form.last || !form.role) return;
      const row: Person = {
        pid: uid("P").slice(-6),
        role: form.role as Person["role"],
        first: form.first!,
        last: form.last!,
        email: form.email || "",
        phone: form.phone || "",
        team: form.team || "",
        lang: (form.lang as any) || "EN",
        notes: form.notes || "",
      };
      setDb(d=>({...d, persons:[...d.persons, row]}));
      setForm({ role: "PERF", lang: db.locale });
      setFlash("Person added");
    }

    return (
      <div className="grid lg:grid-cols-2 gap-4">
        <Box title="Add Person">
          <Row label="Role">
            <Select value={form.role as any} onChange={(e)=>setForm({...form, role: e.target.value as any})}>
              <option value="PERF">PERF</option>
              <option value="VOL">VOL</option>
              <option value="STAFF">STAFF</option>
              <option value="PRESS">PRESS</option>
            </Select>
          </Row>
          <Row label="First"><Input value={form.first||""} onChange={(e)=>setForm({...form, first:e.target.value})}/></Row>
          <Row label="Last"><Input value={form.last||""} onChange={(e)=>setForm({...form, last:e.target.value})}/></Row>
          <Row label="Team"><Input value={form.team||""} onChange={(e)=>setForm({...form, team:e.target.value})}/></Row>
          <Row label="Phone"><Input value={form.phone||""} onChange={(e)=>setForm({...form, phone:e.target.value})}/></Row>
          <Row label="Email"><Input value={form.email||""} onChange={(e)=>setForm({...form, email:e.target.value})}/></Row>
          <div className="mt-2"><Button onClick={add}>Add</Button></div>
        </Box>
        <Box title="People">
          <Row label="Search"><Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Name / Team / Role"/></Row>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-black">
                <tr className="text-green-300 border-b border-green-700"><th>PID</th><th>Name</th><th>Role</th><th>Team</th><th>Contact</th></tr>
              </thead>
              <tbody>
                {people.map(p=> (
                  <tr key={p.pid} className="border-b border-green-900/30">
                    <td className="font-bold">{p.pid}</td>
                    <td>{p.first} {p.last}</td>
                    <td className="text-center">{p.role}</td>
                    <td>{p.team}</td>
                    <td>{p.phone || p.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Box>
      </div>
    );
  }

  function CheckinView() {
    const [tid, setTid] = useState("");
    const [result, setResult] = useState<string>("");

    function scan() {
      const t = db.tickets.find((x) => x.tid.toUpperCase() === tid.toUpperCase());
      if (!t) {
        setResult("NOT FOUND");
        return;
      }
      if (t.status === "USED") {
        setResult("DUPLICATE ENTRY");
      } else if (t.status === "VOID") {
        setResult("VOID / INVALID");
      } else {
        setDb((d) => ({ ...d, tickets: d.tickets.map((x) => (x.tid === t.tid ? { ...x, status: "USED" } : x)), scans: [...d.scans, { scanId: uid("SCAN"), tid: t.tid, when: todayStr(), time: timeStr(), gate: "GateA", ok: true }] }));
        setResult("OK — WELCOME");
      }
    }

    return (
      <div className="grid md:grid-cols-2 gap-4">
        <Box title="Scanner">
          <Row label="Ticket ID">
            <Input value={tid} onChange={(e)=>setTid(e.target.value)} placeholder="*IMP25-…*" onKeyDown={(e)=> e.key==='Enter' && scan()} />
          </Row>
          <div className="mt-2">
            <Button onClick={scan}>Check‑in</Button>
            <span className="ml-2 font-bold">{result}</span>
          </div>
        </Box>
        <Box title="Recent Check‑ins">
          <div className="max-h-72 overflow-auto">
            {[...db.scans].reverse().slice(0,15).map(s=> (
              <div key={s.scanId} className="border-b border-green-900/30 py-1">
                {s.when} {s.time} — {s.tid} — {s.ok?"OK":"FAIL"}
              </div>
            ))}
          </div>
        </Box>
      </div>
    );
  }

  function VolunteersView() {
    const [form, setForm] = useState<Partial<Shift>>({ cap: 1 });
    const [assignPid, setAssignPid] = useState("");
    const [assignShift, setAssignShift] = useState("");

    function addShift() {
      if (!form.venueId || !form.date || !form.start || !form.end || !form.cap || !form.role) return;
      const row: Shift = { shiftId: uid("SH").slice(-6), venueId: form.venueId!, date: form.date!, start: form.start!, end: form.end!, role: form.role!, cap: Number(form.cap) };
      setDb(d=>({...d, shifts:[...d.shifts, row]}));
      setForm({ cap: 1 });
    }

    function assign() {
      if (!assignPid || !assignShift) return;
      const row: Assignment = { assignId: uid("AS").slice(-6), pid: assignPid, shiftId: assignShift, status: "OK" };
      setDb(d=>({...d, assigns:[...d.assigns, row]}));
      setAssignPid("");
      setAssignShift("");
    }

    const volunteerList = db.persons.filter(p=>p.role==="VOL");

    return (
      <div className="grid lg:grid-cols-2 gap-4">
        <Box title="Create Shift">
          <Row label="Venue">
            <Select value={form.venueId||""} onChange={(e)=>setForm({...form, venueId:e.target.value})}>
              <option value="">Select…</option>
              {db.venues.map(v=> <option key={v.venueId} value={v.venueId}>{v.name}</option>)}
            </Select>
          </Row>
          <Row label="Date"><Input type="date" value={form.date||""} onChange={(e)=>setForm({...form, date:e.target.value})}/></Row>
          <Row label="Start"><Input type="time" value={form.start||""} onChange={(e)=>setForm({...form, start:e.target.value})}/></Row>
          <Row label="End"><Input type="time" value={form.end||""} onChange={(e)=>setForm({...form, end:e.target.value})}/></Row>
          <Row label="Role"><Input value={form.role||""} onChange={(e)=>setForm({...form, role:e.target.value})}/></Row>
          <Row label="Cap"><Input type="number" value={form.cap as any || 1} onChange={(e)=>setForm({...form, cap:Number(e.target.value)})}/></Row>
          <div className="mt-2"><Button onClick={addShift}>Add Shift</Button></div>
        </Box>
        <Box title="Assign Volunteers">
          <Row label="Volunteer">
            <Select value={assignPid} onChange={(e)=>setAssignPid(e.target.value)}>
              <option value="">Select…</option>
              {volunteerList.map(v=> <option key={v.pid} value={v.pid}>{v.first} {v.last}</option>)}
            </Select>
          </Row>
          <Row label="Shift">
            <Select value={assignShift} onChange={(e)=>setAssignShift(e.target.value)}>
              <option value="">Select…</option>
              {db.shifts.map(s=> <option key={s.shiftId} value={s.shiftId}>{s.date} {s.start}-{s.end} {db.venues.find(v=>v.venueId===s.venueId)?.name}</option>)}
            </Select>
          </Row>
          <div className="mt-2"><Button onClick={assign}>Assign</Button></div>
          <div className="mt-3 max-h-48 overflow-auto">
            {db.assigns.map(a=> {
              const v = db.persons.find(p=>p.pid===a.pid);
              const s = db.shifts.find(sh=>sh.shiftId===a.shiftId);
              return <div key={a.assignId} className="border-b border-green-900/30 py-1">{s?.date} {s?.start}-{s?.end} — {v?.first} {v?.last} ({a.status})</div>
            })}
          </div>
        </Box>
      </div>
    );
  }

  function FinanceView() {
    const [expense, setExpense] = useState<Partial<Expense>>({ date: todayStr(), paid: false });

    function addExpense() {
      if (!expense.date || !expense.cat || !expense.payee || !expense.amount) return;
      const row: Expense = { eid: uid("EXP").slice(-6), date: expense.date!, cat: expense.cat!, payee: expense.payee!, memo: expense.memo||"", amount: Number(expense.amount), paid: !!expense.paid };
      setDb(d=>({...d, expenses:[...d.expenses, row]}));
      setExpense({ date: todayStr(), paid:false });
    }

    const totals = useMemo(()=>{
      const salesTotal = db.sales.reduce((s,x)=> s + x.amount, 0);
      const byMethod = db.sales.reduce((m,x)=> ({...m, [x.method]: (m as any)[x.method]?(m as any)[x.method]+x.amount:x.amount}), {} as Record<string,number>);
      const expenses = db.expenses.reduce((s,x)=> s + x.amount, 0);
      return { salesTotal, byMethod, expenses, net: salesTotal - expenses };
    }, [db.sales, db.expenses]);

    return (
      <div className="grid lg:grid-cols-2 gap-4">
        <Box title="Add Expense">
          <Row label="Date"><Input type="date" value={expense.date||""} onChange={(e)=>setExpense({...expense, date:e.target.value})}/></Row>
          <Row label="Category"><Input value={expense.cat||""} onChange={(e)=>setExpense({...expense, cat:e.target.value})}/></Row>
          <Row label="Payee"><Input value={expense.payee||""} onChange={(e)=>setExpense({...expense, payee:e.target.value})}/></Row>
          <Row label="Memo"><Input value={expense.memo||""} onChange={(e)=>setExpense({...expense, memo:e.target.value})}/></Row>
          <Row label="Amount EUR"><Input type="number" step="0.01" value={expense.amount as any || ""} onChange={(e)=>setExpense({...expense, amount: Number(e.target.value)})}/></Row>
          <Row label="Paid?"><Select value={expense.paid?"Yes":"No"} onChange={(e)=>setExpense({...expense, paid: e.target.value==="Yes"})}><option>No</option><option>Yes</option></Select></Row>
          <div className="mt-2"><Button onClick={addExpense}>Add</Button></div>
        </Box>
        <Box title="Totals">
          <div>Sales Total: EUR {totals.salesTotal.toFixed(2)}</div>
          <div className="mt-1">By Method:
            <ul className="list-disc ml-6">
              {Object.entries(totals.byMethod).map(([k,v])=> (
                <li key={k}>{k}: EUR {v.toFixed(2)}</li>
              ))}
            </ul>
          </div>
          <div className="mt-2">Expenses: EUR {totals.expenses.toFixed(2)}</div>
          <div className="mt-2 font-bold">NET: EUR {totals.net.toFixed(2)}</div>
        </Box>
      </div>
    );
  }

  function ReportsView() {
    const daily = useMemo(()=>{
      const d = todayStr();
      const sales = db.sales.filter(s=> s.date === d);
      const total = sales.reduce((s,x)=> s + x.amount, 0);
      const byShow = Object.values(sales.reduce((m,x)=>{
        (m[x.showId] ||= { showId: x.showId, count:0, amount:0 });
        m[x.showId].count++; m[x.showId].amount += x.amount; return m;}, {} as Record<string, any>));
      let lines = [
        `Z‑REPORT — ${d}`,
        "",
        "By Show:",
        ...byShow.map((r:any)=> `${r.showId}  ${pad(r.count,3)}  EUR ${r.amount.toFixed(2)}`),
        "",
        `TOTAL: EUR ${total.toFixed(2)}`,
      ];
      return lines.join("\n");
    }, [db.sales]);

    function downloadReport() {
      saveFile(`ZREPORT_${todayStr()}.txt`, daily, "text/plain");
    }

    function exportJSON() {
      saveFile(`MSDAS_EXPORT_${todayStr()}.json`, JSON.stringify(db, null, 2));
    }

    return (
      <div className="grid lg:grid-cols-2 gap-4">
        <Box title="Z‑Report (Daily Sales)"><pre className="whitespace-pre-wrap">{daily}</pre>
          <div className="mt-2"><Button onClick={downloadReport}>Download .TXT</Button></div>
        </Box>
        <Box title="Exports">
          <div className="mb-2">Export current database snapshot (JSON):</div>
          <Button onClick={exportJSON}>Export JSON</Button>
        </Box>
      </div>
    );
  }

  function VendorsView() {
    return (
      <Box title="Vendors">
        <div>Basic placeholder for vendor stock counts. Track merch/food in a future iteration.</div>
      </Box>
    );
  }

  function BackupView() {
    function backup() { saveFile(`MSDAS_BACKUP_${todayStr()}.json`, JSON.stringify(db), "application/json"); setFlash("Backup created"); }
    function restore(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { const next = JSON.parse(String(reader.result)); setDb(next); setFlash("Backup restored"); }
        catch { setFlash("Restore failed (invalid file)"); }
      };
      reader.readAsText(file);
    }

    function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result);
        const rows = parseCSV(text);
        const [headers, ...data] = rows;
        const hi = Object.fromEntries(headers.map((h, i) => [h.toLowerCase(), i]));
        // Minimal Pretix-style columns: tid, show_id, type, buyer, email, status, price
        const add: Ticket[] = data.map((r) => ({
          tid: r[hi["tid"]] || uid("TID").slice(-8),
          showId: r[hi["show_id"]] || db.shows[0]?.showId || "",
          type: (r[hi["type"]] as any) || "GA",
          price: parseFloat(r[hi["price"]] || "0"),
          status: (r[hi["status"]] as any) || "SOLD",
          channel: "PRESALE",
          soldAt: r[hi["sold_at"]] || todayStr(),
          soldTime: r[hi["sold_time"]] || timeStr(),
          buyer: r[hi["buyer"]] || "",
          email: r[hi["email"]] || "",
        }));
        setDb((d) => ({ ...d, tickets: [...d.tickets, ...add] }));
        setFlash(`Imported ${add.length} tickets`);
      };
      reader.readAsText(file);
    }

    return (
      <div className="grid lg:grid-cols-2 gap-4">
        <Box title="Backup / Restore">
          <div className="mb-2">
            <Button onClick={backup}>Create Backup (JSON)</Button>
          </div>
          <div className="mb-2">
            <label className="mr-2">Restore from backup:</label>
            <input type="file" accept="application/json" className="text-green-200" onChange={restore} />
          </div>
        </Box>
        <Box title="Import Presales (CSV)">
          <div className="mb-2">Upload CSV with headers: <code>tid,show_id,type,buyer,email,status,price,sold_at,sold_time</code></div>
          <input type="file" accept=".csv,text/csv" className="text-green-200" onChange={importCSV} />
        </Box>
      </div>
    );
  }

  function TitleBar() {
    return (
      <div className="w-full bg-green-900/40 border-b border-green-700 px-3 py-1 flex items-center justify-between">
        <div className="font-bold">{LANG[db.locale].title}</div>
        <div className="text-green-300 text-sm">{LANG[db.locale].help}</div>
      </div>
    );
  }

  function MenuBar() {
    return (
      <div className="grid md:grid-cols-2 gap-2">
        {MENU.map((m) => (
          <div key={m.id} className="border border-green-700 p-2 hover:bg-green-900/30 cursor-pointer" onClick={()=>setView(m.id as ViewId)}>
            <span className="text-green-300 mr-2">{m.key})</span>{m.label}
          </div>
        ))}
      </div>
    );
  }

  function SearchBar() {
    return (
      <div className="my-2 flex items-center gap-2">
        <span className="text-green-300">Search</span>
        <Input id="msdas-search" placeholder="Global search…" value={search} onChange={(e)=>setSearch(e.target.value)} />
      </div>
    );
  }

  function GlobalSearchResults() {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const t = db.tickets.filter(x => [x.tid, x.buyer, x.email, x.showId].join(" ").toLowerCase().includes(q)).slice(0,10);
    const s = db.shows.filter(x => [x.title, x.showId, x.venueId].join(" ").toLowerCase().includes(q)).slice(0,10);
    const p = db.persons.filter(x => [x.first, x.last, x.team, x.pid].join(" ").toLowerCase().includes(q)).slice(0,10);
    return (
      <Box title="Search Results">
        <div className="grid lg:grid-cols-3 gap-4">
          <div>
            <div className="text-green-300 mb-1">Tickets</div>
            {t.map(x=> <div key={x.tid}>{x.tid} — {x.showId} — {x.buyer||x.email||x.type}</div>)}
          </div>
          <div>
            <div className="text-green-300 mb-1">Shows</div>
            {s.map(x=> <div key={x.showId}>{x.date} {x.start} — {x.title}</div>)}
          </div>
          <div>
            <div className="text-green-300 mb-1">People</div>
            {p.map(x=> <div key={x.pid}>{x.first} {x.last} — {x.role}</div>)}
          </div>
        </div>
      </Box>
    );
  }

  function FooterBar() {
    return (
      <div className="mt-4 flex items-center justify-between text-sm text-green-300">
        <div>© 2025 Das Improv Festival — MS‑DAS (web) mock</div>
        <div>{LANG[db.locale].quit}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-100 font-mono p-3">
      <TitleBar />
      <div className="my-3">
        <MenuBar />
        <SearchBar />
        {showHelp && (
          <Box title="Help">
            <div>• Use the menu (1‑9, B) or click.
              <br/>• Box Office: sell tickets quickly, capacity awareness.
              <br/>• Tickets: search/void tickets.
              <br/>• Schedule: add shows, see venue conflicts (✖).
              <br/>• People: performers, staff, volunteers.
              <br/>• Check‑in: validate TIDs; prevents duplicate use.
              <br/>• Volunteers: create shifts, assign volunteers.
              <br/>• Finance: expenses entry; sales & net totals.
              <br/>• Reports: daily Z‑report, exports.
              <br/>• Backup: one‑click JSON backup/restore; CSV import.
            </div>
          </Box>
        )}
        <GlobalSearchResults />
        <div className="mt-3">
          {view === "HOME" && <Home />}
          {view === "BOX" && <BoxOffice />}
          {view === "TICKETS" && <TicketsView />}
          {view === "SCHEDULE" && <ScheduleView />}
          {view === "PEOPLE" && <PeopleView />}
          {view === "CHECKIN" && <CheckinView />}
          {view === "VOL" && <VolunteersView />}
          {view === "VENDOR" && <VendorsView />}
          {view === "FIN" && <FinanceView />}
          {view === "REPORTS" && <ReportsView />}
          {view === "BACKUP" && <BackupView />}
        </div>
        {flash && (
          <div className="mt-3 border border-green-600 p-2">
            <span className="font-bold">{flash}</span>
            <Button onClick={()=>setFlash(null)} className="ml-2">OK</Button>
          </div>
        )}
        <FooterBar />
      </div>
      {/* Global styles to enhance DOS vibe */}
      <style>{`
        * { caret-color: #22c55e; }
        ::selection { background: rgba(34,197,94,0.25); }
        table th, table td { padding: 0.25rem 0.35rem; }
        code { background: rgba(34,197,94,0.1); padding: 0 0.25rem; }
      `}</style>
    </div>
  );
}
