import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const PIPELINES = [
  { id: 1, name: "frontend-deploy", status: "success", branch: "main", build: 142, duration: "3m 22s", trigger: "push", ago: "2m ago", stages: ["clone","build","test","docker","push","deploy"], stageStatus: ["success","success","success","success","success","success"] },
  { id: 2, name: "backend-api", status: "running", branch: "develop", build: 98, duration: "1m 14s", trigger: "manual", ago: "running", stages: ["clone","build","test","docker","push","deploy"], stageStatus: ["success","success","running","pending","pending","pending"] },
  { id: 3, name: "auth-service", status: "failed", branch: "feature/auth", build: 67, duration: "2m 05s", trigger: "push", ago: "15m ago", stages: ["clone","build","test","docker","push","deploy"], stageStatus: ["success","success","failed","pending","pending","pending"] },
  { id: 4, name: "payment-gateway", status: "success", branch: "main", build: 201, duration: "4m 48s", trigger: "schedule", ago: "1h ago", stages: ["clone","build","test","docker","push","deploy"], stageStatus: ["success","success","success","success","success","success"] },
  { id: 5, name: "notification-svc", status: "queued", branch: "main", build: 34, duration: "—", trigger: "push", ago: "queued", stages: ["clone","build","test","docker","push","deploy"], stageStatus: ["pending","pending","pending","pending","pending","pending"] },
];

const CONTAINERS = [
  { id: "c1", name: "frontend-app", image: "node:18-alpine", status: "running", cpu: 12.4, mem: 256, port: "3000:3000", uptime: "3d 14h" },
  { id: "c2", name: "backend-api", image: "python:3.11-slim", status: "running", cpu: 34.7, mem: 512, port: "8000:8000", uptime: "3d 14h" },
  { id: "c3", name: "postgres-db", image: "postgres:15", status: "running", cpu: 8.1, mem: 384, port: "5432:5432", uptime: "10d 2h" },
  { id: "c4", name: "redis-cache", image: "redis:7-alpine", status: "running", cpu: 2.3, mem: 64, port: "6379:6379", uptime: "10d 2h" },
  { id: "c5", name: "nginx-proxy", image: "nginx:1.25-alpine", status: "running", cpu: 1.1, mem: 32, port: "80:80", uptime: "10d 2h" },
  { id: "c6", name: "worker-queue", image: "python:3.11-slim", status: "stopped", cpu: 0, mem: 0, port: "—", uptime: "stopped" },
];

const EC2_INSTANCES = [
  { id: "i-0a1b2c3d4e5f", name: "prod-web-01", type: "t3.medium", state: "running", az: "us-east-1a", ip: "54.23.11.89", cpu: 45, ram: 62, disk: 38 },
  { id: "i-1b2c3d4e5f6a", name: "prod-api-01", type: "t3.large", state: "running", az: "us-east-1b", ip: "54.23.45.12", cpu: 71, ram: 78, disk: 52 },
  { id: "i-2c3d4e5f6a7b", name: "staging-01", type: "t3.small", state: "stopped", az: "us-east-1c", ip: "—", cpu: 0, ram: 0, disk: 14 },
];

const SERVICES = [
  { name: "User Service", status: "healthy", latency: 42, version: "v2.4.1", lastDeploy: "2h ago", endpoint: "/api/users" },
  { name: "Order Service", status: "healthy", latency: 78, version: "v1.9.3", lastDeploy: "6h ago", endpoint: "/api/orders" },
  { name: "Payment Service", status: "degraded", latency: 342, version: "v3.1.0", lastDeploy: "1d ago", endpoint: "/api/payments" },
  { name: "Notification Svc", status: "healthy", latency: 29, version: "v1.2.0", lastDeploy: "3h ago", endpoint: "/api/notify" },
];

const BUILD_TREND = Array.from({length:14}, (_,i) => ({ day: `D${i+1}`, success: Math.floor(Math.random()*12+4), failed: Math.floor(Math.random()*3) }));
const CPU_TREND = Array.from({length:20}, (_,i) => ({ t: `${i*3}m`, cpu: Math.floor(Math.random()*40+20), mem: Math.floor(Math.random()*30+40) }));
const DEPLOY_FREQ = Array.from({length:7}, (_,i) => { const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]; return { day: days[i], deploys: Math.floor(Math.random()*8+1) }; });

const LOG_LINES = [
  { ts:"10:42:01", level:"INFO", msg:"Pipeline frontend-deploy #142 started" },
  { ts:"10:42:03", level:"INFO", msg:"Cloning repository from github.com/org/frontend" },
  { ts:"10:42:11", level:"INFO", msg:"Running npm install..." },
  { ts:"10:42:45", level:"INFO", msg:"Build completed in 34s" },
  { ts:"10:42:46", level:"INFO", msg:"Running test suite (jest)..." },
  { ts:"10:43:10", level:"WARN", msg:"2 snapshot tests outdated, auto-updating" },
  { ts:"10:43:11", level:"INFO", msg:"All 142 tests passed" },
  { ts:"10:43:12", level:"INFO", msg:"Building Docker image node:18-alpine..." },
  { ts:"10:43:55", level:"INFO", msg:"Pushing image to ECR registry" },
  { ts:"10:44:01", level:"INFO", msg:"Deploying to ECS cluster prod-cluster" },
  { ts:"10:44:22", level:"SUCCESS", msg:"Deployment successful. Service healthy." },
  { ts:"10:44:23", level:"INFO", msg:"Rolling update complete. 3/3 tasks running." },
  { ts:"10:44:24", level:"ERROR", msg:"[auth-service] Tests failed: AuthMiddleware.spec.ts line 88" },
  { ts:"10:44:24", level:"ERROR", msg:"  Expected 401, received 200" },
  { ts:"10:44:25", level:"INFO", msg:"Pipeline auth-service #67 marked as FAILED" },
  { ts:"10:44:30", level:"INFO", msg:"Notification sent to #devops-alerts Slack channel" },
];

const NOTIFS = [
  { id:1, type:"success", title:"Build Passed", msg:"frontend-deploy #142 deployed to prod", time:"2m ago" },
  { id:2, type:"error", title:"Build Failed", msg:"auth-service #67 failed at test stage", time:"15m ago" },
  { id:3, type:"warning", title:"High CPU", msg:"prod-api-01 CPU at 71%", time:"30m ago" },
  { id:4, type:"info", title:"Scheduled Deploy", msg:"payment-gateway #201 triggered by schedule", time:"1h ago" },
];

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#080c14",
  surface: "#0d1420",
  surfaceAlt: "#111927",
  border: "#1a2535",
  borderBright: "#243245",
  accent: "#00d4ff",
  accentDim: "#0099bb",
  green: "#00e676",
  red: "#ff3d5a",
  yellow: "#ffab00",
  purple: "#bf69ff",
  text: "#e2eaf4",
  textMuted: "#6b7f96",
  textDim: "#3d5068",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const statusColor = s => ({ success:"#00e676", running:"#00d4ff", failed:"#ff3d5a", queued:"#ffab00", stopped:"#6b7f96", healthy:"#00e676", degraded:"#ffab00", unhealthy:"#ff3d5a" }[s] || "#6b7f96");
const statusIcon = s => ({ success:"✓", running:"◎", failed:"✕", queued:"◷", stopped:"■", healthy:"●", degraded:"◑", unhealthy:"✕" }[s] || "?");

function Badge({ status, label }) {
  const col = statusColor(status);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:`${col}18`, border:`1px solid ${col}44`, color:col, borderRadius:20, padding:"2px 10px", fontSize:11, fontFamily:"'JetBrains Mono', monospace", fontWeight:600 }}>
      <span style={{ fontSize:8 }}>●</span> {label || status}
    </span>
  );
}

function Card({ children, style, glow }) {
  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }}
      style={{ background:C.surface, border:`1px solid ${glow ? glow+"44" : C.border}`, borderRadius:12, padding:20, boxShadow: glow ? `0 0 20px ${glow}18` : "0 2px 12px #00000066", ...style }}>
      {children}
    </motion.div>
  );
}

function Stat({ label, value, icon, color, sub }) {
  return (
    <Card style={{ flex:1, minWidth:140 }} glow={color}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ color:C.textMuted, fontSize:11, fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>{label}</div>
          <div style={{ color: color || C.text, fontSize:28, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif", lineHeight:1 }}>{value}</div>
          {sub && <div style={{ color:C.textMuted, fontSize:11, marginTop:4 }}>{sub}</div>}
        </div>
        <div style={{ fontSize:22, opacity:0.7 }}>{icon}</div>
      </div>
    </Card>
  );
}

function ProgressBar({ value, color, label }) {
  return (
    <div style={{ marginBottom:8 }}>
      {label && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ color:C.textMuted, fontSize:11 }}>{label}</span>
        <span style={{ color: color || C.accent, fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>{value}%</span>
      </div>}
      <div style={{ height:4, background:C.border, borderRadius:4, overflow:"hidden" }}>
        <motion.div initial={{ width:0 }} animate={{ width:`${value}%` }} transition={{ duration:0.8, ease:"easeOut" }}
          style={{ height:"100%", background: color || C.accent, borderRadius:4, boxShadow:`0 0 8px ${color || C.accent}88` }} />
      </div>
    </div>
  );
}

function PipelineStages({ stages, stageStatus }) {
  const sc = { success:C.green, running:C.accent, failed:C.red, pending:C.border };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, marginTop:10 }}>
      {stages.map((s,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <div style={{
              width:28, height:28, borderRadius:"50%", background: sc[stageStatus[i]] || C.border,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:10, color:"#000", fontWeight:700,
              boxShadow: stageStatus[i]==="running" ? `0 0 10px ${C.accent}` : "none",
              animation: stageStatus[i]==="running" ? "pulse 1.5s infinite" : "none"
            }}>
              {stageStatus[i]==="success"?"✓":stageStatus[i]==="failed"?"✕":stageStatus[i]==="running"?"◎":""}
            </div>
            <span style={{ color:C.textMuted, fontSize:9, textTransform:"uppercase" }}>{s}</span>
          </div>
          {i < stages.length-1 && <div style={{ width:20, height:2, background: sc[stageStatus[i]] === C.border ? C.border : sc[stageStatus[i]], margin:"0 2px", marginBottom:14 }} />}
        </div>
      ))}
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

function OverviewPage() {
  const [cpu, setCpu] = useState(45);
  const [mem, setMem] = useState(62);
  const [net, setNet] = useState(23);
  useEffect(() => {
    const t = setInterval(() => {
      setCpu(v => Math.min(95, Math.max(10, v + (Math.random()-0.5)*8)));
      setMem(v => Math.min(90, Math.max(30, v + (Math.random()-0.5)*4)));
      setNet(v => Math.min(80, Math.max(5, v + (Math.random()-0.5)*10)));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <SectionHeader title="Overview" sub="Real-time system pulse" />
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <Stat label="Total Pipelines" value="5" icon="⚡" color={C.accent} />
        <Stat label="Successful Builds" value="347" icon="✓" color={C.green} sub="last 30 days" />
        <Stat label="Failed Builds" value="14" icon="✕" color={C.red} sub="last 30 days" />
        <Stat label="Running Deploys" value="1" icon="◎" color={C.yellow} />
        <Stat label="Active Containers" value="5" icon="🐳" color={C.purple} />
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <Card style={{ flex:1, minWidth:220 }} glow={C.accent}>
          <div style={{ color:C.textMuted, fontSize:11, fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>System Resources</div>
          <ProgressBar value={Math.round(cpu)} color={cpu>80?C.red:cpu>60?C.yellow:C.green} label="CPU" />
          <ProgressBar value={Math.round(mem)} color={mem>80?C.red:mem>60?C.yellow:C.accent} label="Memory" />
          <ProgressBar value={Math.round(net)} color={C.purple} label="Network I/O" />
        </Card>
        <Card style={{ flex:2, minWidth:300 }} glow={C.green}>
          <div style={{ color:C.textMuted, fontSize:11, fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Build Trend (14 days)</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={BUILD_TREND} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="day" tick={{ fill:C.textDim, fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.text }} />
              <Bar dataKey="success" fill={C.green} radius={[3,3,0,0]} />
              <Bar dataKey="failed" fill={C.red} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
        <Card style={{ flex:1, minWidth:280 }} glow={C.accent}>
          <div style={{ color:C.textMuted, fontSize:11, fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>CPU & Memory Trend</div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={CPU_TREND}>
              <defs>
                <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.3}/><stop offset="95%" stopColor={C.accent} stopOpacity={0}/></linearGradient>
                <linearGradient id="gmem" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.purple} stopOpacity={0.3}/><stop offset="95%" stopColor={C.purple} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="t" tick={{ fill:C.textDim, fontSize:9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.text }} />
              <Area type="monotone" dataKey="cpu" stroke={C.accent} fill="url(#gcpu)" strokeWidth={2} />
              <Area type="monotone" dataKey="mem" stroke={C.purple} fill="url(#gmem)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ flex:1, minWidth:280 }} glow={C.purple}>
          <div style={{ color:C.textMuted, fontSize:11, fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Pipeline Status Distribution</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={[{name:"Success",value:3},{name:"Running",value:1},{name:"Failed",value:1}]} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                <Cell fill={C.green} /><Cell fill={C.accent} /><Cell fill={C.red} />
              </Pie>
              <Tooltip contentStyle={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.text }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function PipelinesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [triggering, setTriggering] = useState(null);
  const filtered = PIPELINES.filter(p => (filter==="all"||p.status===filter) && p.name.includes(search));

  const triggerBuild = (id) => {
    setTriggering(id);
    setTimeout(() => setTriggering(null), 2000);
  };

  return (
    <div>
      <SectionHeader title="CI/CD Pipelines" sub="Jenkins pipeline monitoring" />
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search pipelines..."
          style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", color:C.text, outline:"none", flex:1, minWidth:180, fontSize:13 }} />
        {["all","success","running","failed","queued"].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{ background: filter===f ? C.accent+"22" : C.surfaceAlt, border:`1px solid ${filter===f?C.accent:C.border}`, color: filter===f?C.accent:C.textMuted, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:12, fontFamily:"'JetBrains Mono',monospace", textTransform:"capitalize" }}>
            {f}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {filtered.map(p => (
          <Card key={p.id} glow={statusColor(p.status)} style={{ padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <span style={{ color:C.text, fontWeight:700, fontSize:15, fontFamily:"'JetBrains Mono',monospace" }}>{p.name}</span>
                  <Badge status={p.status} />
                </div>
                <div style={{ color:C.textMuted, fontSize:12, display:"flex", gap:16 }}>
                  <span>🌿 {p.branch}</span>
                  <span># Build {p.build}</span>
                  <span>⏱ {p.duration}</span>
                  <span>⚡ {p.trigger}</span>
                  <span>🕐 {p.ago}</span>
                </div>
              </div>
              <button onClick={()=>triggerBuild(p.id)} disabled={triggering===p.id}
                style={{ background: triggering===p.id?"#00d4ff22":C.accent+"22", border:`1px solid ${C.accent}`, color:C.accent, borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:12, fontFamily:"'JetBrains Mono',monospace", transition:"all .2s" }}>
                {triggering===p.id?"▶ Triggering…":"▶ Trigger Build"}
              </button>
            </div>
            <PipelineStages stages={p.stages} stageStatus={p.stageStatus} />
          </Card>
        ))}
      </div>
    </div>
  );
}

function DockerPage() {
  const [restartingId, setRestartingId] = useState(null);
  const restart = (id) => { setRestartingId(id); setTimeout(()=>setRestartingId(null),2000); };

  return (
    <div>
      <SectionHeader title="Docker Monitoring" sub="Container & image management" />
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <Stat label="Running" value={CONTAINERS.filter(c=>c.status==="running").length} icon="🟢" color={C.green} />
        <Stat label="Stopped" value={CONTAINERS.filter(c=>c.status==="stopped").length} icon="🔴" color={C.red} />
        <Stat label="Total Images" value="8" icon="📦" color={C.accent} />
        <Stat label="Volumes" value="5" icon="💾" color={C.purple} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
        {CONTAINERS.map(c => (
          <Card key={c.id} glow={c.status==="running"?C.green:C.red}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:18 }}>🐳</span>
                <span style={{ color:C.text, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", fontSize:13 }}>{c.name}</span>
              </div>
              <Badge status={c.status} />
            </div>
            <div style={{ color:C.textMuted, fontSize:11, marginBottom:12 }}>
              <div style={{ marginBottom:3 }}>📦 {c.image}</div>
              <div style={{ marginBottom:3 }}>🔌 {c.port}</div>
              <div>⏱ Uptime: {c.uptime}</div>
            </div>
            {c.status==="running" && <>
              <ProgressBar value={Math.round(c.cpu)} color={c.cpu>70?C.red:C.accent} label={`CPU: ${c.cpu}%`} />
              <ProgressBar value={Math.round(c.mem/1024*100)} color={C.purple} label={`Mem: ${c.mem}MB`} />
            </>}
            <button onClick={()=>restart(c.id)}
              style={{ marginTop:10, width:"100%", background:C.surfaceAlt, border:`1px solid ${C.border}`, color:restartingId===c.id?C.yellow:C.textMuted, borderRadius:6, padding:"6px", cursor:"pointer", fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>
              {restartingId===c.id?"↻ Restarting...":"↻ Restart Container"}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AWSPage() {
  return (
    <div>
      <SectionHeader title="AWS Deployments" sub="EC2 instance & deployment monitoring" />
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <Stat label="Running Instances" value="2" icon="☁️" color={C.yellow} />
        <Stat label="Stopped" value="1" icon="■" color={C.red} />
        <Stat label="Region" value="us-east-1" icon="🌍" color={C.accent} />
        <Stat label="Uptime SLA" value="99.9%" icon="✓" color={C.green} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {EC2_INSTANCES.map(inst => (
          <Card key={inst.id} glow={inst.state==="running"?C.yellow:C.red}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>☁️</span>
                  <span style={{ color:C.text, fontWeight:700, fontSize:14, fontFamily:"'JetBrains Mono',monospace" }}>{inst.name}</span>
                  <Badge status={inst.state} label={inst.state} />
                </div>
                <div style={{ color:C.textMuted, fontSize:11, display:"flex", gap:16, flexWrap:"wrap" }}>
                  <span>ID: {inst.id}</span>
                  <span>Type: {inst.type}</span>
                  <span>AZ: {inst.az}</span>
                  <span>IP: {inst.ip}</span>
                </div>
              </div>
              <div style={{ minWidth:220 }}>
                {inst.state==="running" ? <>
                  <ProgressBar value={inst.cpu} color={inst.cpu>80?C.red:inst.cpu>60?C.yellow:C.green} label="CPU" />
                  <ProgressBar value={inst.ram} color={C.accent} label="RAM" />
                  <ProgressBar value={inst.disk} color={C.purple} label="Disk" />
                </> : <div style={{ color:C.textMuted, fontSize:12, paddingTop:10 }}>Instance stopped – no metrics</div>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MonitoringPage() {
  return (
    <div>
      <SectionHeader title="Microservices" sub="Service health & API monitoring" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
        {SERVICES.map(s => (
          <Card key={s.name} glow={statusColor(s.status)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ color:C.text, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{s.name}</span>
              <Badge status={s.status} />
            </div>
            <div style={{ color:C.textMuted, fontSize:12, marginBottom:12 }}>
              <div style={{ marginBottom:3 }}>📡 {s.endpoint}</div>
              <div style={{ marginBottom:3 }}>🏷 Version: <span style={{ color:C.accent }}>{s.version}</span></div>
              <div>🚀 Last deploy: {s.lastDeploy}</div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color:C.textMuted, fontSize:10 }}>Response Time</div>
                <div style={{ color: s.latency>200?C.red:s.latency>100?C.yellow:C.green, fontSize:22, fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>{s.latency}<span style={{ fontSize:11 }}>ms</span></div>
              </div>
              <button style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, color:C.textMuted, borderRadius:6, padding:"6px 12px", cursor:"pointer", fontSize:11 }}>
                📋 View Logs
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LogsPage() {
  const [logs, setLogs] = useState(LOG_LINES);
  const [filter, setFilter] = useState("all");
  const [autoscroll, setAutoscroll] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => {
      const msgs = [
        { level:"INFO", msg:"Health check passed for frontend-app" },
        { level:"INFO", msg:"Received POST /api/deploy from CI runner" },
        { level:"WARN", msg:"Memory usage at 78% on prod-api-01" },
        { level:"ERROR", msg:"Connection timeout: redis-cache:6379" },
        { level:"SUCCESS", msg:"Container nginx-proxy restarted successfully" },
      ];
      const m = msgs[Math.floor(Math.random()*msgs.length)];
      const now = new Date();
      setLogs(l => [...l.slice(-80), { ts:`${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`, ...m }]);
    }, 2500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (autoscroll) endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [logs, autoscroll]);

  const levelColor = l => ({ INFO:C.textMuted, WARN:C.yellow, ERROR:C.red, SUCCESS:C.green }[l] || C.textMuted);
  const shown = logs.filter(l => filter==="all" || l.level===filter);

  return (
    <div>
      <SectionHeader title="Log Viewer" sub="Real-time streaming logs" />
      <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        {["all","INFO","WARN","ERROR","SUCCESS"].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{ background: filter===f?"#ffffff11":C.surfaceAlt, border:`1px solid ${filter===f?C.accent:C.border}`, color: filter===f?C.accent:C.textMuted, borderRadius:6, padding:"5px 12px", cursor:"pointer", fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>
            {f}
          </button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:C.textMuted, fontSize:11 }}>Auto-scroll</span>
          <div onClick={()=>setAutoscroll(!autoscroll)}
            style={{ width:36, height:20, background: autoscroll?C.accent:C.border, borderRadius:10, cursor:"pointer", position:"relative", transition:"all .2s" }}>
            <div style={{ position:"absolute", top:3, left: autoscroll?18:3, width:14, height:14, background:"#fff", borderRadius:"50%", transition:"left .2s" }} />
          </div>
        </div>
      </div>
      <div style={{ background:"#030609", border:`1px solid ${C.border}`, borderRadius:10, padding:16, height:420, overflowY:"auto", fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>
        <AnimatePresence initial={false}>
          {shown.map((l,i) => (
            <motion.div key={i} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} style={{ display:"flex", gap:12, marginBottom:4, lineHeight:1.5 }}>
              <span style={{ color:C.textDim, flexShrink:0 }}>{l.ts}</span>
              <span style={{ color:levelColor(l.level), flexShrink:0, minWidth:55 }}>[{l.level}]</span>
              <span style={{ color: l.level==="ERROR"?C.red:l.level==="SUCCESS"?C.green:l.level==="WARN"?C.yellow:C.text }}>{l.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </div>
  );
}

function AnalyticsPage() {
  return (
    <div>
      <SectionHeader title="Analytics" sub="Build & deployment intelligence" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
        <Card glow={C.green}>
          <div style={{ color:C.textMuted, fontSize:11, fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Build Success Rate</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={BUILD_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="day" tick={{ fill:C.textDim, fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:C.textDim, fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.text }} />
              <Bar dataKey="success" fill={C.green} radius={[4,4,0,0]} name="Success" />
              <Bar dataKey="failed" fill={C.red} radius={[4,4,0,0]} name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card glow={C.accent}>
          <div style={{ color:C.textMuted, fontSize:11, fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Deployment Frequency</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={DEPLOY_FREQ}>
              <defs>
                <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.accent} stopOpacity={0.4}/><stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="day" tick={{ fill:C.textDim, fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:C.textDim, fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.text }} />
              <Area type="monotone" dataKey="deploys" stroke={C.accent} fill="url(#gd)" strokeWidth={2} name="Deploys" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card glow={C.purple}>
          <div style={{ color:C.textMuted, fontSize:11, fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Error Rate Trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={CPU_TREND.slice(0,14).map((d,i)=>({...d, errors: Math.floor(Math.random()*5)}))}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="t" tick={{ fill:C.textDim, fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:C.textDim, fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.text }} />
              <Line type="monotone" dataKey="errors" stroke={C.red} strokeWidth={2} dot={false} name="Errors" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card glow={C.yellow}>
          <div style={{ color:C.textMuted, fontSize:11, fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Service Status Distribution</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={[{name:"Healthy",value:3},{name:"Degraded",value:1}]} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                <Cell fill={C.green}/><Cell fill={C.yellow}/>
              </Pie>
              <Tooltip contentStyle={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, color:C.text }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function SettingsPage() {
  const [jenkinsUrl, setJenkinsUrl] = useState("http://jenkins.internal:8080");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [dockerHost, setDockerHost] = useState("unix:///var/run/docker.sock");
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(()=>setSaved(false),2000); };

  const Field = ({label, value, onChange, placeholder}) => (
    <div style={{ marginBottom:16 }}>
      <label style={{ color:C.textMuted, fontSize:11, fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:6 }}>{label}</label>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, outline:"none", fontSize:13, fontFamily:"'JetBrains Mono',monospace", boxSizing:"border-box" }} />
    </div>
  );

  return (
    <div>
      <SectionHeader title="Settings" sub="Configuration & integrations" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16 }}>
        <Card glow={C.accent}>
          <div style={{ color:C.accent, fontWeight:700, marginBottom:16, fontSize:13, fontFamily:"'JetBrains Mono',monospace" }}>⚡ Jenkins Configuration</div>
          <Field label="Jenkins URL" value={jenkinsUrl} onChange={setJenkinsUrl} />
          <Field label="API Token" value="" onChange={()=>{}} placeholder="••••••••••••" />
          <Field label="Username" value="admin" onChange={()=>{}} />
        </Card>
        <Card glow={C.yellow}>
          <div style={{ color:C.yellow, fontWeight:700, marginBottom:16, fontSize:13, fontFamily:"'JetBrains Mono',monospace" }}>☁️ AWS Configuration</div>
          <Field label="Region" value={awsRegion} onChange={setAwsRegion} />
          <Field label="Access Key ID" value="" onChange={()=>{}} placeholder="AKIA••••••••••••" />
          <Field label="Secret Access Key" value="" onChange={()=>{}} placeholder="••••••••••••" />
        </Card>
        <Card glow={C.purple}>
          <div style={{ color:C.purple, fontWeight:700, marginBottom:16, fontSize:13, fontFamily:"'JetBrains Mono',monospace" }}>🐳 Docker Configuration</div>
          <Field label="Docker Host" value={dockerHost} onChange={setDockerHost} />
          <Field label="Registry URL" value="registry.hub.docker.com" onChange={()=>{}} />
          <Field label="Registry Token" value="" onChange={()=>{}} placeholder="••••••••••••" />
        </Card>
        <Card glow={C.green}>
          <div style={{ color:C.green, fontWeight:700, marginBottom:16, fontSize:13, fontFamily:"'JetBrains Mono',monospace" }}>🔔 Notifications</div>
          <Field label="Slack Webhook" value="https://hooks.slack.com/..." onChange={()=>{}} />
          <Field label="PagerDuty Key" value="" onChange={()=>{}} placeholder="••••••••••••" />
          <Field label="Email Recipients" value="devops@company.com" onChange={()=>{}} />
        </Card>
      </div>
      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <button onClick={save}
          style={{ background: saved?C.green+"22":C.accent+"22", border:`1px solid ${saved?C.green:C.accent}`, color: saved?C.green:C.accent, borderRadius:8, padding:"10px 28px", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, transition:"all .2s" }}>
          {saved?"✓ Saved!":"💾 Save Configuration"}
        </button>
      </div>
    </div>
  );
}

// ─── LAYOUT ───────────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:20 }}>
      <h2 style={{ color:C.text, fontSize:22, fontWeight:700, margin:0, fontFamily:"'Space Grotesk',sans-serif" }}>{title}</h2>
      {sub && <div style={{ color:C.textMuted, fontSize:12, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

const NAV = [
  { id:"overview", label:"Overview", icon:"📊" },
  { id:"pipelines", label:"Pipelines", icon:"⚡" },
  { id:"docker", label:"Docker", icon:"🐳" },
  { id:"aws", label:"AWS", icon:"☁️" },
  { id:"monitoring", label:"Services", icon:"🔬" },
  { id:"logs", label:"Logs", icon:"📋" },
  { id:"analytics", label:"Analytics", icon:"📈" },
  { id:"settings", label:"Settings", icon:"⚙️" },
];

const PAGES = { overview:<OverviewPage/>, pipelines:<PipelinesPage/>, docker:<DockerPage/>, aws:<AWSPage/>, monitoring:<MonitoringPage/>, logs:<LogsPage/>, analytics:<AnalyticsPage/>, settings:<SettingsPage/> };

// ─── AUTH ─────────────────────────────────────────────────────────────────────

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email:"admin@devops.io", password:"admin123", name:"" });
  const [loading, setLoading] = useState(false);
  const upd = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const submit = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin({ name: form.name || "Admin", email: form.email }); }, 1200);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'JetBrains Mono',monospace", position:"relative", overflow:"hidden" }}>
      {/* bg grid */}
      <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`, backgroundSize:"40px 40px", opacity:0.3 }} />
      <div style={{ position:"absolute", top:"20%", left:"50%", transform:"translateX(-50%)", width:500, height:500, background:`radial-gradient(${C.accent}18, transparent 70%)`, borderRadius:"50%", pointerEvents:"none" }} />
      <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
        style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:40, width:380, position:"relative", boxShadow:`0 0 60px ${C.accent}18` }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>⚡</div>
          <div style={{ color:C.text, fontSize:22, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif" }}>DevOps Pulse</div>
          <div style={{ color:C.textMuted, fontSize:11, marginTop:4 }}>Enterprise CI/CD Dashboard</div>
        </div>
        <div style={{ display:"flex", marginBottom:24, background:C.surfaceAlt, borderRadius:8, padding:4 }}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ flex:1, background:mode===m?C.accent+"22":"transparent", border:`1px solid ${mode===m?C.accent:"transparent"}`, color:mode===m?C.accent:C.textMuted, borderRadius:6, padding:"8px", cursor:"pointer", fontSize:12, textTransform:"capitalize" }}>{m}</button>
          ))}
        </div>
        {mode==="signup" && <input placeholder="Full Name" value={form.name} onChange={upd("name")}
          style={{ width:"100%", background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"11px 14px", color:C.text, outline:"none", marginBottom:12, fontSize:13, boxSizing:"border-box" }} />}
        <input placeholder="Email" value={form.email} onChange={upd("email")}
          style={{ width:"100%", background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"11px 14px", color:C.text, outline:"none", marginBottom:12, fontSize:13, boxSizing:"border-box" }} />
        <input placeholder="Password" type="password" value={form.password} onChange={upd("password")}
          style={{ width:"100%", background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"11px 14px", color:C.text, outline:"none", marginBottom:20, fontSize:13, boxSizing:"border-box" }} />
        <button onClick={submit} disabled={loading}
          style={{ width:"100%", background:`linear-gradient(135deg,${C.accent},${C.accentDim})`, border:"none", borderRadius:8, padding:"12px", color:"#000", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>
          {loading?"Authenticating…": mode==="login"?"→ Sign In":"→ Create Account"}
        </button>
        {mode==="login" && <div style={{ color:C.textDim, fontSize:10, textAlign:"center", marginTop:16 }}>Demo: admin@devops.io / admin123</div>}
      </motion.div>
    </div>
  );
}

// ─── NOTIFICATION TOAST ───────────────────────────────────────────────────────

function ToastSystem({ toasts, dismiss }) {
  const tc = { success:C.green, error:C.red, warning:C.yellow, info:C.accent };
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} initial={{ opacity:0, x:60 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:60 }}
            style={{ background:C.surface, border:`1px solid ${tc[t.type]}66`, borderLeft:`3px solid ${tc[t.type]}`, borderRadius:10, padding:"12px 16px", minWidth:280, boxShadow:"0 4px 20px #00000099", cursor:"pointer" }}
            onClick={()=>dismiss(t.id)}>
            <div style={{ color: tc[t.type], fontWeight:700, fontSize:12, marginBottom:3 }}>{t.title}</div>
            <div style={{ color:C.textMuted, fontSize:11 }}>{t.msg}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const toastId = useRef(0);

  const addToast = useCallback((t) => {
    const id = ++toastId.current;
    setToasts(ts => [...ts, {...t, id}]);
    setTimeout(() => setToasts(ts => ts.filter(x=>x.id!==id)), 4000);
  }, []);

  const dismissToast = (id) => setToasts(ts => ts.filter(x=>x.id!==id));

  useEffect(() => {
    if (!user) return;
    const msgs = [
      { type:"success", title:"Build Passed", msg:"frontend-deploy #143 deployed" },
      { type:"error", title:"Build Failed", msg:"auth-service test stage failed" },
      { type:"warning", title:"High CPU", msg:"prod-api-01 CPU at 82%" },
      { type:"info", title:"Scheduled Deploy", msg:"payment-gateway triggered" },
    ];
    const t = setInterval(() => {
      addToast(msgs[Math.floor(Math.random()*msgs.length)]);
    }, 12000);
    return () => clearInterval(t);
  }, [user, addToast]);

  if (!user) return <AuthPage onLogin={u => { setUser(u); addToast({ type:"success", title:"Welcome back!", msg:`Logged in as ${u.email}` }); }} />;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'JetBrains Mono',monospace", overflow:"hidden" }}>
      {/* Sidebar */}
      <motion.div animate={{ width: sidebarOpen?220:64 }} transition={{ duration:0.25 }}
        style={{ background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0, zIndex:10 }}>
        <div style={{ padding:16, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20, flexShrink:0 }}>⚡</span>
          {sidebarOpen && <span style={{ color:C.accent, fontWeight:700, fontSize:14, whiteSpace:"nowrap", fontFamily:"'Space Grotesk',sans-serif" }}>DevOps Pulse</span>}
        </div>
        <nav style={{ flex:1, padding:"8px 0", overflowY:"auto" }}>
          {NAV.map(n => (
            <div key={n.id} onClick={()=>setPage(n.id)}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", cursor:"pointer", background: page===n.id?C.accent+"18":"transparent",
                borderLeft: `3px solid ${page===n.id?C.accent:"transparent"}`, transition:"all .15s", color: page===n.id?C.accent:C.textMuted }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{n.icon}</span>
              {sidebarOpen && <span style={{ fontSize:12, whiteSpace:"nowrap", transition:"opacity .2s" }}>{n.label}</span>}
            </div>
          ))}
        </nav>
        <div style={{ padding:16, borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11, fontWeight:700, color:"#000" }}>
              {user.name[0]}
            </div>
            {sidebarOpen && <div style={{ overflow:"hidden" }}>
              <div style={{ color:C.text, fontSize:11, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.name}</div>
              <div style={{ color:C.textMuted, fontSize:10, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.email}</div>
            </div>}
          </div>
        </div>
      </motion.div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Topbar */}
        <div style={{ height:54, background:C.surface, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 20px", gap:12, flexShrink:0 }}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)}
            style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, borderRadius:6, width:32, height:32, cursor:"pointer", fontSize:14 }}>
            {sidebarOpen?"◀":"▶"}
          </button>
          <div style={{ flex:1 }} />
          <div style={{ display:"flex", alignItems:"center", gap:6, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 12px" }}>
            <span style={{ color:C.green, fontSize:8 }}>●</span>
            <span style={{ color:C.textMuted, fontSize:11 }}>Live</span>
          </div>
          <div style={{ position:"relative" }}>
            <button onClick={()=>setNotifOpen(!notifOpen)}
              style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, borderRadius:6, width:32, height:32, cursor:"pointer", fontSize:14, position:"relative" }}>
              🔔
              <span style={{ position:"absolute", top:-4, right:-4, width:14, height:14, background:C.red, borderRadius:"50%", fontSize:8, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {NOTIFS.length}
              </span>
            </button>
            <AnimatePresence>
              {notifOpen && <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
                style={{ position:"absolute", top:40, right:0, width:320, background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 8px 32px #00000099", zIndex:100, overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, color:C.text, fontWeight:700, fontSize:12 }}>Notifications</div>
                {NOTIFS.map(n => {
                  const col = { success:C.green, error:C.red, warning:C.yellow, info:C.accent }[n.type];
                  return (
                    <div key={n.id} style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:10, cursor:"pointer" }}>
                      <div style={{ width:3, background:col, borderRadius:2, flexShrink:0 }} />
                      <div>
                        <div style={{ color:C.text, fontSize:11, fontWeight:700 }}>{n.title}</div>
                        <div style={{ color:C.textMuted, fontSize:10, marginTop:2 }}>{n.msg}</div>
                        <div style={{ color:C.textDim, fontSize:10, marginTop:2 }}>{n.time}</div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>}
            </AnimatePresence>
          </div>
          <button onClick={()=>setUser(null)}
            style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, borderRadius:6, padding:"0 12px", height:32, cursor:"pointer", fontSize:11 }}>
            Sign Out
          </button>
        </div>

        {/* Page content */}
        <div style={{ flex:1, overflowY:"auto", padding:24 }}>
          <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }}>
              {PAGES[page]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ToastSystem toasts={toasts} dismiss={dismissToast} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius:3px; }
        @keyframes pulse { 0%,100%{box-shadow:0 0 6px ${C.accent}} 50%{box-shadow:0 0 16px ${C.accent}} }
      `}</style>
    </div>
  );
}
