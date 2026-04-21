import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Download, CheckCircle, ExternalLink, Printer } from "lucide-react";

const typeLabel = {
  djurfrisor: "✂️ Djurfrisör",
  uppfodare: "🐾 Uppfödare",
  kurshallare: "📚 Kurshållare",
  simhall: "🏊 Simhall",
  annat: "🤝 Annat",
};

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function QRDownloadButton({ slug }) {
  const ref = useRef();
  const url = `https://prisfall.se/p/${slug}`;

  const handleDownload = () => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement("a");
      link.download = `prisfall-qr-${slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <QRCodeSVG value={url} size={96} />
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownload}>
        <Download className="w-3 h-3" /> Ladda ner PNG
      </Button>
    </div>
  );
}

export default function AdminPartners() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", contact_email: "", contact_phone: "", contact_person: "",
    address: "", city: "", type: "djurfrisor", notes: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me?.role === "admin") await loadPartners();
      } catch (_) {}
      setLoading(false);
    }
    init();
  }, []);

  async function loadPartners() {
    const list = await base44.entities.Partner.list("-created_date");
    setPartners(list || []);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    const slug = slugify(form.name);
    await base44.entities.Partner.create({
      ...form,
      slug,
      commission_per_user: 50,
      commission_threshold: "first_purchase",
      active: true,
      total_users: 0,
      total_active_users: 0,
      total_owed: 0,
      total_paid: 0,
    });
    await loadPartners();
    setShowForm(false);
    setForm({ name: "", contact_email: "", contact_phone: "", contact_person: "", address: "", city: "", type: "djurfrisor", notes: "" });
    setSaving(false);
  }

  async function handleMarkPaid(partner) {
    await base44.entities.Partner.update(partner.id, {
      total_paid: (partner.total_paid || 0) + (partner.total_owed || 0),
      total_owed: 0,
    });
    await loadPartners();
  }

  async function handleToggleActive(partner) {
    await base44.entities.Partner.update(partner.id, { active: !partner.active });
    await loadPartners();
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!user || user.role !== "admin") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><p className="text-2xl">🔒</p><p className="font-semibold">Åtkomst nekad</p></div>
    </div>
  );

  const totalOwed = partners.reduce((s, p) => s + (p.total_owed || 0), 0);
  const activeCount = partners.filter(p => p.active).length;

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin</Link>
            <h1 className="text-2xl font-extrabold mt-1">🤝 Partnerhantering</h1>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Lägg till partner
          </Button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Totalt partners" value={partners.length} />
          <StatCard label="Aktiva partners" value={activeCount} />
          <StatCard label="Totalt utestående" value={`${totalOwed} kr`} highlight={totalOwed > 0} />
          <StatCard label="Totalt värvade" value={partners.reduce((s, p) => s + (p.total_users || 0), 0)} />
        </div>

        {/* Add partner form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-bold text-lg">Ny partner</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Namn *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
              <div className="space-y-1">
                <label className="text-sm font-medium">Typ</label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="djurfrisor">✂️ Djurfrisör</option>
                  <option value="uppfodare">🐾 Uppfödare</option>
                  <option value="kurshallare">📚 Kurshållare</option>
                  <option value="simhall">🏊 Simhall</option>
                  <option value="annat">🤝 Annat</option>
                </select>
              </div>
              <Field label="Kontaktperson" value={form.contact_person} onChange={v => setForm(f => ({ ...f, contact_person: v }))} />
              <Field label="E-post" type="email" value={form.contact_email} onChange={v => setForm(f => ({ ...f, contact_email: v }))} />
              <Field label="Telefon" value={form.contact_phone} onChange={v => setForm(f => ({ ...f, contact_phone: v }))} />
              <Field label="Stad" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
              <div className="sm:col-span-2">
                <Field label="Adress" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium block mb-1">Interna anteckningar</label>
                <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background min-h-[80px]"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            {form.name && (
              <p className="text-xs text-muted-foreground">URL: prisfall.se/p/<strong>{slugify(form.name)}</strong></p>
            )}
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>{saving ? "Sparar..." : "Skapa partner"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Avbryt</Button>
            </div>
          </form>
        )}

        {/* Partners list */}
        <div className="space-y-4">
          {partners.map(partner => (
            <div key={partner.id} className={`bg-card border rounded-xl p-5 space-y-4 ${!partner.active ? "opacity-60" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg">{partner.name}</h3>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{typeLabel[partner.type] || partner.type}</span>
                    {!partner.active && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Inaktiv</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {partner.city && `${partner.city} · `}
                    {partner.contact_email && <a href={`mailto:${partner.contact_email}`} className="hover:text-foreground">{partner.contact_email}</a>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">prisfall.se/p/{partner.slug}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/p/${partner.slug}`} target="_blank">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                      <ExternalLink className="w-3 h-3" /> Förhandsgranska
                    </Button>
                  </Link>
                  <Link to={`/admin/partners/${partner.slug}/sign`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Printer className="w-3 h-3" /> Skylt
                    </Button>
                  </Link>
                  <Button
                    variant="ghost" size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => handleToggleActive(partner)}
                  >
                    {partner.active ? "Inaktivera" : "Aktivera"}
                  </Button>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Värvade" value={partner.total_users || 0} />
                <MiniStat label="Aktiva (köp)" value={partner.total_active_users || 0} />
                <MiniStat label="Utestående" value={`${partner.total_owed || 0} kr`} highlight={(partner.total_owed || 0) > 0} />
                <MiniStat label="Utbetalt" value={`${partner.total_paid || 0} kr`} />
              </div>

              <div className="flex items-end justify-between gap-4 flex-wrap">
                <QRDownloadButton slug={partner.slug} />
                {(partner.total_owed || 0) > 0 && (
                  <Button
                    onClick={() => handleMarkPaid(partner)}
                    size="sm"
                    className="gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Markera {partner.total_owed} kr som betalt
                  </Button>
                )}
              </div>
            </div>
          ))}
          {partners.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-3">🤝</p>
              <p className="font-medium">Inga partners ännu</p>
              <p className="text-sm">Klicka på "Lägg till partner" för att komma igång</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <p className={`text-2xl font-extrabold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, highlight }) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
      <p className={`text-lg font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
      />
    </div>
  );
}