'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { formatBytes } from '@/lib/format';

type EntryRow = {
  id: string;
  timestamp: string;
  description: string;
  localisation: string | null;
  gravite: 'FAIBLE' | 'MOYENNE' | 'ELEVEE' | null;
  photoUrl?: string | null;
  photoSizeBytes?: number | null;
  site: { id: string; name: string };
  team: { id: string; name: string };
  user: { id: string; firstName: string; lastName: string };
  typeEvenement: { id: string; label: string };
};

type Payload = {
  data: EntryRow[];
  nextPage: number | null;
  filters: {
    sites: Array<{ id: string; name: string }>;
    teams: Array<{ id: string; name: string; siteId: string }>;
    agents: Array<{ id: string; firstName: string; lastName: string }>;
  };
};

export function PatronEntriesManagement() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [siteId, setSiteId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [userId, setUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async (nextPage?: number) => {
    setLoading(true);
    setMessage(null);

    const targetPage = nextPage ?? page;
    const params = new URLSearchParams();
    params.set('page', String(targetPage));
    params.set('take', '25');
    if (query.trim()) params.set('query', query.trim());
    if (siteId) params.set('siteId', siteId);
    if (teamId) params.set('teamId', teamId);
    if (userId) params.set('userId', userId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    const res = await fetch(`/api/patron/entries?${params.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const payload = (await res.json()) as Payload;
      setData(payload);
      if (!selectedEntryId && payload.data.length) {
        setSelectedEntryId(payload.data[0].id);
      }
    } else {
      setMessage('Impossible de charger les entrées.');
    }
    setLoading(false);
  };

  useEffect(() => {
    load(0);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTeams = useMemo(() => {
    const teams = data?.filters.teams ?? [];
    if (!siteId) return teams;
    return teams.filter((team) => team.siteId === siteId);
  }, [data, siteId]);

  const selectedEntry = useMemo(() => {
    return (data?.data ?? []).find((entry) => entry.id === selectedEntryId) ?? null;
  }, [data, selectedEntryId]);

  const applyFilters = async () => {
    setPage(0);
    await load(0);
  };

  const resetFilters = async () => {
    setQuery('');
    setSiteId('');
    setTeamId('');
    setUserId('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
    await load(0);
  };

  const goToPage = async (next: number) => {
    setPage(next);
    await load(next);
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_45%),#111111] p-5 md:p-6">
        <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Patron · Entrées</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">Suivi des entrées terrain</h1>
        <p className="mt-2 text-sm text-zinc-400">Consultez rapidement les entrées par hôpital, endroit, agent et période.</p>
      </section>

      {message ? <p className="text-sm text-amber-200">{message}</p> : null}

      <Card className="space-y-3 border-white/10 bg-[#111111] p-4">
        <h2 className="text-sm font-medium text-zinc-100">Filtres</h2>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Recherche description" className="border-white/10 bg-[#0f0f0f] text-zinc-100" />

          <Select value={siteId} onChange={(e) => {
            setSiteId(e.target.value);
            setTeamId('');
          }} className="border-white/10 bg-[#0f0f0f] text-zinc-100">
            <option value="">Tous hôpitaux</option>
            {(data?.filters.sites ?? []).map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </Select>

          <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="border-white/10 bg-[#0f0f0f] text-zinc-100">
            <option value="">Tous endroits</option>
            {filteredTeams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </Select>

          <Select value={userId} onChange={(e) => setUserId(e.target.value)} className="border-white/10 bg-[#0f0f0f] text-zinc-100">
            <option value="">Tous agents</option>
            {(data?.filters.agents ?? []).map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.firstName} {agent.lastName}</option>
            ))}
          </Select>

          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border-white/10 bg-[#0f0f0f] text-zinc-100" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border-white/10 bg-[#0f0f0f] text-zinc-100" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-blue-500 text-white hover:bg-blue-400" onClick={applyFilters}>Appliquer</Button>
          <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10" onClick={resetFilters}>Réinitialiser</Button>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="space-y-3 border-white/10 bg-[#111111] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-100">Entrées</h2>
            <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10" onClick={() => load()}>Actualiser</Button>
          </div>

          {loading && !data ? <p className="text-sm text-zinc-500">Chargement...</p> : null}

          <div className="space-y-2">
            {(data?.data ?? []).map((entry) => {
              const selected = selectedEntryId === entry.id;
              return (
                <Link
                  key={entry.id}
                  href={`/entries/${entry.id}?from=${encodeURIComponent('/patron/entrees')}`}
                  onClick={() => setSelectedEntryId(entry.id)}
                  className={`block w-full rounded-lg border p-3 text-left transition ${selected ? 'border-blue-400/40 bg-blue-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
                >
                  <p className="text-sm font-medium text-zinc-100">{entry.typeEvenement.label} · {entry.user.firstName} {entry.user.lastName}</p>
                  <p className="mt-1 text-xs text-zinc-500">{new Date(entry.timestamp).toLocaleString()} · {entry.site.name} / {entry.team.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-300">{entry.description}</p>
                </Link>
              );
            })}
            {!loading && !(data?.data.length) ? <p className="text-sm text-zinc-500">Aucune entrée trouvée.</p> : null}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
              disabled={page === 0}
              onClick={() => goToPage(Math.max(page - 1, 0))}
            >
              Précédent
            </Button>
            <p className="text-xs text-zinc-500">Page {page + 1}</p>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
              disabled={data?.nextPage == null}
              onClick={() => data?.nextPage != null && goToPage(data.nextPage)}
            >
              Suivant
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 border-white/10 bg-[#111111] p-4">
          <h2 className="text-sm font-medium text-zinc-100">Détail entrée</h2>
          {!selectedEntry ? (
            <p className="text-sm text-zinc-500">Sélectionnez une entrée pour afficher son détail.</p>
          ) : (
            <div className="space-y-2 text-sm text-zinc-300">
              <p><span className="text-zinc-500">Type:</span> {selectedEntry.typeEvenement.label}</p>
              <p><span className="text-zinc-500">Agent:</span> {selectedEntry.user.firstName} {selectedEntry.user.lastName}</p>
              <p><span className="text-zinc-500">Hôpital:</span> {selectedEntry.site.name}</p>
              <p><span className="text-zinc-500">Endroit:</span> {selectedEntry.team.name}</p>
              <p><span className="text-zinc-500">Date:</span> {new Date(selectedEntry.timestamp).toLocaleString()}</p>
              <p><span className="text-zinc-500">Gravité:</span> {selectedEntry.gravite ?? 'Non renseignée'}</p>
              <p><span className="text-zinc-500">Localisation:</span> {selectedEntry.localisation ?? 'Non renseignée'}</p>
              <p className="pt-1"><span className="text-zinc-500">Description:</span></p>
              <p className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs leading-relaxed text-zinc-200">{selectedEntry.description}</p>
              <div className="pt-2">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Photo</p>
                {selectedEntry.photoUrl ? (
                  <div className="mt-2 space-y-2">
                    <img className="max-h-80 w-full rounded-lg border border-white/10 object-contain" src={selectedEntry.photoUrl} alt={`Photo de l'entrée ${selectedEntry.id}`} />
                    <a className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/10" href={selectedEntry.photoUrl} target="_blank" rel="noreferrer">
                      Ouvrir la photo
                    </a>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">Aucune photo enregistrée.</p>
                )}
              </div>
              <p className="text-xs text-zinc-500">Taille photo: {formatBytes(selectedEntry.photoSizeBytes)}</p>
              <Link href={`/entries/${selectedEntry.id}`} className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/10">
                Ouvrir la vue détail
              </Link>
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
