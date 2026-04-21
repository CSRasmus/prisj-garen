import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, QrCode, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PARTNER_TYPES = {
  djurfrisor: "Djurfrisör",
  uppfodare: "Uppfödare",
  kurshallare: "Kurshållare",
  simhall: "Simhall",
  annat: "Annat",
};

export default function AdminPartners() {
  const [user, setUser] = useState(null);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", contact_email: "", city: "", type: "annat", commission_per_user: 50 });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (u?.role !== "admin") { navigate("/dashboard"); return; }
      setUser(u);
      loadPartners();
    }).catch(() => navigate("/"));
  }, []);

  const loadPartners = async () => {
    const data = await base44.entities.Partner.list("-created_date");
    setPartners(data);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await base44.entities.Partner.create({ ...form, active: true, total_users: 0, total_active_users: 0, total_owed: 0, total_paid: 0 });
    toast({ title: "Partner skapad!" });
    setShowForm(false);
    setForm({ name: "", slug: "", contact_email: "", city: "", type: "annat", commission_per_user: 50 });
    loadPartners();
  };

  const handleMarkPaid = async (partner) => {
    await base44.entities.Partner.update(partner.id, {
      total_paid: (partner.total_paid || 0) + (partner.total_owed || 0),
      total_owed: 0,
    });
    toast({ title: `Markerade ${partner.name} som betald` });
    loadPartners();
  };

  const handleToggleActive = async (partner) => {
    await base44.entities.Partner.update(partner.id, { active: !partner.active });
    loadPartners();
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
        <h1 className="text-2xl font-bold">Partners</h1>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Ny partner
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Lägg till partner</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Namn *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Slug (unik URL) *" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} required />
              <Input placeholder="E-post" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
              <Input placeholder="Stad" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              <select className="border rounded-md px-3 py-2 text-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {Object.entries(PARTNER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <Input type="number" placeholder="Kommission per användare (kr)" value={form.commission_per_user} onChange={e => setForm({ ...form, commission_per_user: Number(e.target.value) })} />
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Avbryt</Button>
                <Button type="submit">Skapa</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {partners.map(partner => (
          <Card key={partner.id} className={!partner.active ? "opacity-60" : ""}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{partner.name}</h3>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {PARTNER_TYPES[partner.type] || partner.type}
                  </span>
                  {!partner.active && <span className="text-xs text-muted-foreground">(Inaktiv)</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  /p/{partner.slug} · {partner.city || "—"} · {partner.contact_email || "Ingen e-post"}
                </p>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span>👥 {partner.total_users || 0} användare</span>
                  <span>💰 {partner.total_owed || 0} kr utestående</span>
                  <span>✅ {partner.total_paid || 0} kr betalt</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Link to={`/admin/partners/${partner.slug}/sign`} target="_blank">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <QrCode className="w-3.5 h-3.5" /> Skylt
                  </Button>
                </Link>
                {(partner.total_owed || 0) > 0 && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-200"
                    onClick={() => handleMarkPaid(partner)}>
                    <CheckCircle className="w-3.5 h-3.5" /> Markera betald
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-muted-foreground"
                  onClick={() => handleToggleActive(partner)}>
                  {partner.active ? "Inaktivera" : "Aktivera"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {partners.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Inga partners än. Skapa den första!</p>
        )}
      </div>
    </div>
  );
}