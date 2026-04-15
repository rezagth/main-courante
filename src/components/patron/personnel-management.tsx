'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  roleCode: string | null;
  siteId: string | null;
  assignmentSiteId: string | null;
  assignmentTeamId: string | null;
};

type Option = { id: string; code?: string; name?: string; label?: string };

type Payload = {
  users: UserRow[];
  roles: Array<{ id: string; code: string; label: string }>;
  sites: Array<{ id: string; code: string; name: string }>;
  teams: Array<{ id: string; code: string; name: string; siteId: string }>;
};

const DEFAULT_FORM = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  roleCode: 'AGENT',
  siteId: '',
  teamId: '',
};

export function PersonnelManagement() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/patron/personnel', { cache: 'no-store' });
    if (res.ok) {
      setData((await res.json()) as Payload);
    } else {
      setMessage('Impossible de charger les utilisateurs.');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const teamsBySite = useMemo(() => {
    const teams = data?.teams ?? [];
    const map = new Map<string, Option[]>();
    for (const team of teams) {
      const key = team.siteId;
      const current = map.get(key) ?? [];
      current.push(team);
      map.set(key, current);
    }
    return map;
  }, [data]);

  const handleCreate = async () => {
    if (!form.email || !form.firstName || !form.lastName || !form.password || !form.roleCode) {
      setMessage('Tous les champs obligatoires doivent être remplis.');
      return;
    }

    setCreating(true);
    setMessage(null);

    const res = await fetch('/api/patron/personnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
        roleCode: form.roleCode,
        siteId: form.siteId || null,
        teamId: form.teamId || null,
      }),
    });

    if (!res.ok) {
      let errorMsg = 'Échec création utilisateur.';
      try {
        const payload = await res.json();
        if (typeof payload === 'object' && payload !== null) {
          if ('error' in payload && typeof payload.error === 'string') {
            errorMsg = payload.error;
          }
        }
      } catch {}
      setMessage(errorMsg);
      setCreating(false);
      return;
    }

    setForm(DEFAULT_FORM);
    setCreating(false);
    setMessage('Utilisateur créé.');
    await load();
  };

  const updateRow = async (user: UserRow, patch: Partial<UserRow> & { password?: string }) => {
    const res = await fetch(`/api/patron/personnel/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: patch.email ?? user.email,
        firstName: patch.firstName ?? user.firstName,
        lastName: patch.lastName ?? user.lastName,
        status: patch.status ?? user.status,
        isActive: patch.isActive ?? user.isActive,
        roleCode: patch.roleCode ?? user.roleCode ?? 'AGENT',
        siteId: patch.assignmentSiteId ?? user.assignmentSiteId ?? null,
        teamId: patch.assignmentTeamId ?? user.assignmentTeamId ?? null,
        ...(patch.password ? { password: patch.password } : {}),
      }),
    });

    if (!res.ok) {
      let errorMsg = 'Mise à jour impossible.';
      try {
        const payload = await res.json();
        if (typeof payload === 'object' && payload !== null) {
          if ('error' in payload && typeof payload.error === 'string') {
            errorMsg = payload.error;
          }
        }
      } catch {}
      setMessage(errorMsg);
      return;
    }
    setMessage('Mise à jour effectuée.');
    await load();
  };

  const disableUser = async (userId: string) => {
    const res = await fetch(`/api/patron/personnel/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
      setMessage('Impossible de désactiver cet utilisateur.');
      return;
    }
    setMessage('Utilisateur désactivé.');
    await load();
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_45%),#111111] p-5 md:p-6">
        <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Patron · Personnel</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">Gestion du personnel</h1>
        <p className="mt-2 text-sm text-zinc-400">Création, modification, affectation des rôles, sites et équipes.</p>
      </section>

      {message ? <p className="text-sm text-amber-200">{message}</p> : null}

      <Card className="space-y-3 border-white/10 bg-[#111111] p-4">
        <h2 className="text-sm font-medium text-zinc-100">Créer un utilisateur</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="border-white/10 bg-[#0f0f0f] text-zinc-100" />
          <Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="Prénom" className="border-white/10 bg-[#0f0f0f] text-zinc-100" />
          <Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Nom" className="border-white/10 bg-[#0f0f0f] text-zinc-100" />
          <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Mot de passe" className="border-white/10 bg-[#0f0f0f] text-zinc-100" />

          <Select
            value={form.roleCode}
            onChange={(e) => setForm((p) => ({ ...p, roleCode: e.target.value }))}
            className="border-white/10 bg-[#0f0f0f] text-zinc-100"
          >
            {(data?.roles ?? []).map((role) => (
              <option key={role.id} value={role.code}>{role.label}</option>
            ))}
          </Select>

          <Select
            value={form.siteId}
            onChange={(e) => {
              const siteId = e.target.value;
              setForm((p) => ({ ...p, siteId, teamId: '' }));
            }}
            className="border-white/10 bg-[#0f0f0f] text-zinc-100"
          >
            <option value="">Aucun site</option>
            {(data?.sites ?? []).map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </Select>

          <Select
            value={form.teamId}
            onChange={(e) => setForm((p) => ({ ...p, teamId: e.target.value }))}
            className="border-white/10 bg-[#0f0f0f] text-zinc-100"
          >
            <option value="">Aucune équipe</option>
            {(teamsBySite.get(form.siteId) ?? []).map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </Select>
        </div>

        <Button className="bg-blue-500 text-white hover:bg-blue-400" onClick={handleCreate} disabled={creating || loading}>
          {creating ? 'Création...' : 'Créer utilisateur'}
        </Button>
      </Card>

      <Card className="space-y-3 border-white/10 bg-[#111111] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-100">Utilisateurs</h2>
          <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10" onClick={load}>
            Actualiser
          </Button>
        </div>

        {loading && !data ? <p className="text-sm text-zinc-500">Chargement...</p> : null}

        <div className="space-y-3">
          {(data?.users ?? []).map((user) => {
            const teamOptions = teamsBySite.get(user.assignmentSiteId ?? '') ?? [];
            const isEditing = editingId === user.id;
            return (
              <article key={user.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="grid gap-2 md:grid-cols-6">
                  <Input defaultValue={user.firstName} className="border-white/10 bg-[#0f0f0f] text-zinc-100" onBlur={(e) => isEditing && updateRow(user, { firstName: e.target.value })} />
                  <Input defaultValue={user.lastName} className="border-white/10 bg-[#0f0f0f] text-zinc-100" onBlur={(e) => isEditing && updateRow(user, { lastName: e.target.value })} />
                  <Input defaultValue={user.email} className="border-white/10 bg-[#0f0f0f] text-zinc-100 md:col-span-2" onBlur={(e) => isEditing && updateRow(user, { email: e.target.value })} />

                  <Select
                    defaultValue={user.roleCode ?? 'AGENT'}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onChange={(e) => isEditing && updateRow(user, { roleCode: e.target.value })}
                  >
                    {(data?.roles ?? []).map((role) => (
                      <option key={role.id} value={role.code}>{role.label}</option>
                    ))}
                  </Select>

                  <Select
                    defaultValue={user.status}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onChange={(e) => isEditing && updateRow(user, { status: e.target.value as UserRow['status'] })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </Select>
                </div>

                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  <Select
                    defaultValue={user.assignmentSiteId ?? ''}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onChange={(e) => isEditing && updateRow(user, { assignmentSiteId: e.target.value || null, assignmentTeamId: null })}
                  >
                    <option value="">Aucun site</option>
                    {(data?.sites ?? []).map((site) => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </Select>

                  <Select
                    defaultValue={user.assignmentTeamId ?? ''}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onChange={(e) => isEditing && updateRow(user, { assignmentTeamId: e.target.value || null })}
                  >
                    <option value="">Aucune équipe</option>
                    {teamOptions.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </Select>

                  <Input
                    type="password"
                    placeholder="Nouveau mot de passe"
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onBlur={(e) => {
                      if (!isEditing || !e.target.value) return;
                      updateRow(user, { password: e.target.value });
                      e.target.value = '';
                    }}
                  />

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={isEditing ? 'default' : 'outline'} className={isEditing ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10'} onClick={() => setEditingId((current) => (current === user.id ? null : user.id))}>
                      {isEditing ? 'Edition active' : 'Editer'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => disableUser(user.id)}>Désactiver</Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
    </main>
  );
}
