'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

type HospitalRow = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
  locationCount: number;
  agentCount: number;
};

type LocationRow = {
  id: string;
  siteId: string;
  name: string;
  code: string;
  isActive: boolean;
};

type Payload = {
  sites: HospitalRow[];
  locations: LocationRow[];
};

const DEFAULT_HOSPITAL_FORM = {
  name: '',
  code: '',
  address: '',
};

const DEFAULT_LOCATION_FORM = {
  siteId: '',
  name: '',
  code: '',
};

export function HospitalsManagement() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingHospital, setCreatingHospital] = useState(false);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [hospitalForm, setHospitalForm] = useState(DEFAULT_HOSPITAL_FORM);
  const [locationForm, setLocationForm] = useState(DEFAULT_LOCATION_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [editingHospitalId, setEditingHospitalId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/patron/sites', { cache: 'no-store' });
    if (res.ok) {
      setData((await res.json()) as Payload);
    } else {
      setMessage('Impossible de charger les hôpitaux.');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const locationsByHospital = useMemo(() => {
    const map = new Map<string, LocationRow[]>();
    for (const location of data?.locations ?? []) {
      const current = map.get(location.siteId) ?? [];
      current.push(location);
      map.set(location.siteId, current);
    }
    return map;
  }, [data]);

  const filteredHospitals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (data?.sites ?? []).filter((hospital) => {
      if (filterStatus === 'ACTIVE' && !hospital.isActive) return false;
      if (filterStatus === 'INACTIVE' && hospital.isActive) return false;
      if (!normalizedQuery) return true;
      return (
        hospital.name.toLowerCase().includes(normalizedQuery) ||
        hospital.code.toLowerCase().includes(normalizedQuery) ||
        (hospital.address ?? '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [data, filterStatus, query]);

  const createHospital = async () => {
    if (!hospitalForm.name || !hospitalForm.code) {
      setMessage('Nom et code hôpital obligatoires.');
      return;
    }

    setCreatingHospital(true);
    setMessage(null);
    const res = await fetch('/api/patron/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: hospitalForm.name,
        code: hospitalForm.code,
        address: hospitalForm.address || null,
      }),
    });

    if (!res.ok) {
      let errorMsg = 'Création hôpital impossible.';
      try {
        const payload = await res.json();
        if (payload?.error) errorMsg = payload.error;
      } catch {}
      setMessage(errorMsg);
      setCreatingHospital(false);
      return;
    }

    setHospitalForm(DEFAULT_HOSPITAL_FORM);
    setCreatingHospital(false);
    setMessage('Hôpital créé.');
    await load();
  };

  const createLocation = async () => {
    if (!locationForm.siteId || !locationForm.name || !locationForm.code) {
      setMessage('Hôpital, nom et code endroit sont obligatoires.');
      return;
    }

    setCreatingLocation(true);
    setMessage(null);
    const res = await fetch('/api/patron/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locationForm),
    });

    if (!res.ok) {
      let errorMsg = 'Création endroit impossible.';
      try {
        const payload = await res.json();
        if (payload?.error) errorMsg = payload.error;
      } catch {}
      setMessage(errorMsg);
      setCreatingLocation(false);
      return;
    }

    setLocationForm((prev) => ({ ...DEFAULT_LOCATION_FORM, siteId: prev.siteId }));
    setCreatingLocation(false);
    setMessage('Endroit créé.');
    await load();
  };

  const patchHospital = async (hospital: HospitalRow, patch: Partial<HospitalRow>) => {
    const res = await fetch(`/api/patron/sites/${hospital.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: patch.name ?? hospital.name,
        code: patch.code ?? hospital.code,
        address: patch.address ?? hospital.address,
        isActive: patch.isActive ?? hospital.isActive,
      }),
    });
    if (!res.ok) {
      setMessage('Mise à jour hôpital impossible.');
      return;
    }

    setMessage('Hôpital mis à jour.');
    await load();
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_45%),#111111] p-5 md:p-6">
        <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Patron · Hôpitaux</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">Gestion des hôpitaux et endroits</h1>
        <p className="mt-2 text-sm text-zinc-400">Un hôpital contient des endroits (parking, entrée, urgences...).</p>
      </section>

      {message ? <p className="text-sm text-amber-200">{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 border-white/10 bg-[#111111] p-4">
          <h2 className="text-sm font-medium text-zinc-100">Créer un hôpital</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={hospitalForm.name} onChange={(e) => setHospitalForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nom" className="border-white/10 bg-[#0f0f0f] text-zinc-100" />
            <Input value={hospitalForm.code} onChange={(e) => setHospitalForm((p) => ({ ...p, code: e.target.value }))} placeholder="Code" className="border-white/10 bg-[#0f0f0f] text-zinc-100" />
            <Input value={hospitalForm.address} onChange={(e) => setHospitalForm((p) => ({ ...p, address: e.target.value }))} placeholder="Adresse" className="border-white/10 bg-[#0f0f0f] text-zinc-100 md:col-span-2" />
          </div>
          <Button className="bg-emerald-500 text-white hover:bg-emerald-400" onClick={createHospital} disabled={creatingHospital || loading}>
            {creatingHospital ? 'Création...' : 'Créer hôpital'}
          </Button>
        </Card>

        <Card className="space-y-3 border-white/10 bg-[#111111] p-4">
          <h2 className="text-sm font-medium text-zinc-100">Créer un endroit</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              value={locationForm.siteId}
              onChange={(e) => setLocationForm((p) => ({ ...p, siteId: e.target.value }))}
              className="border-white/10 bg-[#0f0f0f] text-zinc-100"
            >
              <option value="">Choisir un hôpital</option>
              {(data?.sites ?? []).map((hospital) => (
                <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
              ))}
            </Select>
            <Input value={locationForm.code} onChange={(e) => setLocationForm((p) => ({ ...p, code: e.target.value }))} placeholder="Code endroit" className="border-white/10 bg-[#0f0f0f] text-zinc-100" />
            <Input value={locationForm.name} onChange={(e) => setLocationForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nom endroit" className="border-white/10 bg-[#0f0f0f] text-zinc-100 md:col-span-2" />
          </div>
          <Button className="bg-blue-500 text-white hover:bg-blue-400" onClick={createLocation} disabled={creatingLocation || loading}>
            {creatingLocation ? 'Création...' : 'Créer endroit'}
          </Button>
        </Card>
      </section>

      <Card className="space-y-3 border-white/10 bg-[#111111] p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-medium text-zinc-100">Hôpitaux</h2>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Recherche nom, code, adresse" className="border-white/10 bg-[#0f0f0f] text-zinc-100 md:w-72" />
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')} className="border-white/10 bg-[#0f0f0f] text-zinc-100 md:w-48">
              <option value="ALL">Tous statuts</option>
              <option value="ACTIVE">Actifs</option>
              <option value="INACTIVE">Inactifs</option>
            </Select>
            <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10" onClick={load}>Actualiser</Button>
          </div>
        </div>

        {loading && !data ? <p className="text-sm text-zinc-500">Chargement...</p> : null}

        <div className="space-y-3">
          {filteredHospitals.map((hospital) => {
            const isEditing = editingHospitalId === hospital.id;
            return (
              <article key={hospital.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="grid gap-2 md:grid-cols-5">
                  <Input defaultValue={hospital.name} className="border-white/10 bg-[#0f0f0f] text-zinc-100" onBlur={(e) => isEditing && patchHospital(hospital, { name: e.target.value })} />
                  <Input defaultValue={hospital.code} className="border-white/10 bg-[#0f0f0f] text-zinc-100" onBlur={(e) => isEditing && patchHospital(hospital, { code: e.target.value })} />
                  <Input defaultValue={hospital.address ?? ''} className="border-white/10 bg-[#0f0f0f] text-zinc-100 md:col-span-2" onBlur={(e) => isEditing && patchHospital(hospital, { address: e.target.value || null })} />
                  <Select defaultValue={hospital.isActive ? 'ACTIVE' : 'INACTIVE'} className="border-white/10 bg-[#0f0f0f] text-zinc-100" onChange={(e) => isEditing && patchHospital(hospital, { isActive: e.target.value === 'ACTIVE' })}>
                    <option value="ACTIVE">Actif</option>
                    <option value="INACTIVE">Inactif</option>
                  </Select>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span>{hospital.agentCount} agents</span>
                  <span>·</span>
                  <span>{hospital.locationCount} endroits</span>
                  <Button size="sm" variant={isEditing ? 'default' : 'outline'} className={isEditing ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10'} onClick={() => setEditingHospitalId((current) => (current === hospital.id ? null : hospital.id))}>
                    {isEditing ? 'Édition active' : 'Éditer'}
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(locationsByHospital.get(hospital.id) ?? []).map((location) => (
                    <span key={location.id} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-zinc-300">
                      {location.name} ({location.code})
                    </span>
                  ))}
                </div>
              </article>
            );
          })}

          {!filteredHospitals.length && !loading ? <p className="text-sm text-zinc-500">Aucun hôpital trouvé.</p> : null}
        </div>
      </Card>
    </main>
  );
}
