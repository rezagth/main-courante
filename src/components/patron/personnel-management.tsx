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
  assignmentSiteId: string | null;
  locationAssignments?: Array<{ siteId: string; locationId: string | null }>;
  managedSiteIds?: string[];
};

type RoleOption = { id: string; code: string; label: string };
type SiteOption = { id: string; code: string; name: string };
type LocationOption = { id: string; code: string; name: string; siteId: string };

type Payload = {
  users: UserRow[];
  roles: RoleOption[];
  sites: SiteOption[];
  teams: Array<{ id: string; code: string; name: string; siteId: string }>;
  locations?: LocationOption[];
};

const DEFAULT_FORM = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  roleCode: 'AGENT',
  siteId: '',
  locationId: '',
  managedSiteId: '',
};

export function PersonnelManagement() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filterSiteId, setFilterSiteId] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [draftByUserId, setDraftByUserId] = useState<
    Record<
      string,
      {
        email: string;
        firstName: string;
        lastName: string;
        status: UserRow['status'];
        roleCode: string;
        hospitalId: string;
        locationId: string;
        managedHospitalId: string;
        password: string;
      }
    >
  >({});

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

  const locationsBySite = useMemo(() => {
    const map = new Map<string, LocationOption[]>();
    for (const location of data?.locations ?? []) {
      const current = map.get(location.siteId) ?? [];
      current.push(location);
      map.set(location.siteId, current);
    }
    return map;
  }, [data]);

  const filteredUsers = useMemo(() => {
    return (data?.users ?? []).filter((user) => {
      if (filterSiteId && user.assignmentSiteId !== filterSiteId) return false;
      if (filterRole && user.roleCode !== filterRole) return false;
      return true;
    });
  }, [data, filterSiteId, filterRole]);

  const getPrimaryLocationId = (user: UserRow): string => {
    return user.locationAssignments?.[0]?.locationId ?? '';
  };

  const getManagedSiteId = (user: UserRow): string => {
    return user.managedSiteIds?.[0] ?? '';
  };

  const displayRoleLabel = (label: string): string => {
    return label
      .replace(/équipe/gi, 'hôpital')
      .replace(/equipe/gi, 'hopital');
  };

  const startEditing = (user: UserRow) => {
    setEditingId(user.id);
    setDraftByUserId((prev) => ({
      ...prev,
      [user.id]: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        roleCode: user.roleCode ?? 'AGENT',
        hospitalId: user.assignmentSiteId ?? '',
        locationId: getPrimaryLocationId(user),
        managedHospitalId: getManagedSiteId(user),
        password: '',
      },
    }));
  };

  const patchDraft = (userId: string, patch: Partial<(typeof draftByUserId)[string]>) => {
    setDraftByUserId((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        ...patch,
      },
    }));
  };

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
        locationAssignments: form.siteId ? [{ siteId: form.siteId, locationId: form.locationId || null }] : [],
        managedSiteIds: form.roleCode === 'CHEF_EQUIPE' && form.managedSiteId ? [form.managedSiteId] : [],
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

  const saveUser = async (user: UserRow) => {
    const draft = draftByUserId[user.id];
    if (!draft) return;

    const res = await fetch(`/api/patron/personnel/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: draft.email,
        firstName: draft.firstName,
        lastName: draft.lastName,
        status: draft.status,
        isActive: user.isActive,
        roleCode: draft.roleCode,
        siteId: draft.hospitalId || null,
        locationAssignments: draft.hospitalId ? [{ siteId: draft.hospitalId, locationId: draft.locationId || null }] : [],
        managedSiteIds: draft.roleCode === 'CHEF_EQUIPE' && draft.managedHospitalId ? [draft.managedHospitalId] : [],
        ...(draft.password ? { password: draft.password } : {}),
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
    setEditingId(null);
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
        <p suppressHydrationWarning className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Patron · Utilisateurs</p>
        <h1 suppressHydrationWarning className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">Gestion des utilisateurs</h1>
        <p suppressHydrationWarning className="mt-2 text-sm text-zinc-400">Simple: créer, affecter à un hôpital/endroit, et choisir le chef d'hôpital.</p>
      </section>

      {message ? <p className="text-sm text-amber-200">{message}</p> : null}

      <Card className="space-y-3 border-white/10 bg-[#111111] p-4">
        <h2 className="text-sm font-medium text-zinc-100">Créer un utilisateur</h2>
        <div className="grid gap-3 md:grid-cols-4">
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
              <option key={role.id} value={role.code}>{displayRoleLabel(role.label)}</option>
            ))}
          </Select>

          <Select
            value={form.siteId}
            onChange={(e) => {
              const siteId = e.target.value;
              setForm((p) => ({ ...p, siteId, locationId: '' }));
            }}
            className="border-white/10 bg-[#0f0f0f] text-zinc-100"
          >
            <option value="">Aucun hôpital</option>
            {(data?.sites ?? []).map((hospital) => (
              <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
            ))}
          </Select>

          <Select
            value={form.locationId}
            onChange={(e) => setForm((p) => ({ ...p, locationId: e.target.value }))}
            className="border-white/10 bg-[#0f0f0f] text-zinc-100"
          >
            <option value="">Aucun endroit</option>
            {(locationsBySite.get(form.siteId) ?? []).map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </Select>

          <Select
            value={form.managedSiteId}
            onChange={(e) => setForm((p) => ({ ...p, managedSiteId: e.target.value }))}
            className="border-white/10 bg-[#0f0f0f] text-zinc-100"
          >
            <option value="">Hôpital géré (chef)</option>
            {(data?.sites ?? []).map((hospital) => (
              <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
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
          <div className="flex items-center gap-2">
            <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="h-9 w-44 border-white/10 bg-[#0f0f0f] text-zinc-100">
              <option value="">Tous rôles</option>
              {(data?.roles ?? []).map((role) => (
                <option key={role.id} value={role.code}>{displayRoleLabel(role.label)}</option>
              ))}
            </Select>
            <Select value={filterSiteId} onChange={(e) => setFilterSiteId(e.target.value)} className="h-9 w-56 border-white/10 bg-[#0f0f0f] text-zinc-100">
              <option value="">Tous hôpitaux</option>
              {(data?.sites ?? []).map((hospital) => (
                <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
              ))}
            </Select>
          <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10" onClick={load}>
            Actualiser
          </Button>
          </div>
        </div>

        {loading && !data ? <p className="text-sm text-zinc-500">Chargement...</p> : null}

        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const isEditing = editingId === user.id;
            const draft = draftByUserId[user.id];
            const effectiveHospitalId = isEditing ? draft?.hospitalId ?? '' : user.assignmentSiteId ?? '';
            const effectiveLocationId = isEditing ? draft?.locationId ?? '' : getPrimaryLocationId(user);
            const effectiveManagedHospitalId = isEditing ? draft?.managedHospitalId ?? '' : getManagedSiteId(user);
            return (
              <article key={user.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="grid gap-2 md:grid-cols-4">
                  <Input
                    value={isEditing ? draft?.firstName ?? '' : user.firstName}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onChange={(e) => isEditing && patchDraft(user.id, { firstName: e.target.value })}
                    readOnly={!isEditing}
                  />
                  <Input
                    value={isEditing ? draft?.lastName ?? '' : user.lastName}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onChange={(e) => isEditing && patchDraft(user.id, { lastName: e.target.value })}
                    readOnly={!isEditing}
                  />
                  <Input
                    value={isEditing ? draft?.email ?? '' : user.email}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100 md:col-span-2"
                    onChange={(e) => isEditing && patchDraft(user.id, { email: e.target.value })}
                    readOnly={!isEditing}
                  />

                  <Select
                    value={isEditing ? draft?.roleCode ?? 'AGENT' : user.roleCode ?? 'AGENT'}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onChange={(e) => {
                      if (!isEditing) return;
                      const roleCode = e.target.value;
                      patchDraft(user.id, {
                        roleCode,
                        managedHospitalId: roleCode === 'CHEF_EQUIPE' ? effectiveManagedHospitalId : '',
                      });
                    }}
                    disabled={!isEditing}
                  >
                    {(data?.roles ?? []).map((role) => (
                      <option key={role.id} value={role.code}>{displayRoleLabel(role.label)}</option>
                    ))}
                  </Select>

                  <Select
                    value={isEditing ? draft?.status ?? 'ACTIVE' : user.status}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onChange={(e) => isEditing && patchDraft(user.id, { status: e.target.value as UserRow['status'] })}
                    disabled={!isEditing}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </Select>

                  <Select
                    value={effectiveHospitalId}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onChange={(e) => {
                      if (!isEditing) return;
                      patchDraft(user.id, { hospitalId: e.target.value, locationId: '' });
                    }}
                    disabled={!isEditing}
                  >
                    <option value="">Aucun hôpital</option>
                    {(data?.sites ?? []).map((hospital) => (
                      <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
                    ))}
                  </Select>

                  <Select
                    value={effectiveLocationId}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onChange={(e) => isEditing && patchDraft(user.id, { locationId: e.target.value })}
                    disabled={!isEditing}
                  >
                    <option value="">Aucun endroit</option>
                    {(locationsBySite.get(effectiveHospitalId) ?? []).map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </Select>

                  <Select
                    value={effectiveManagedHospitalId}
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    onChange={(e) => isEditing && patchDraft(user.id, { managedHospitalId: e.target.value })}
                    disabled={!isEditing || (isEditing ? draft?.roleCode : user.roleCode) !== 'CHEF_EQUIPE'}
                  >
                    <option value="">Hôpital géré (chef)</option>
                    {(data?.sites ?? []).map((hospital) => (
                      <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
                    ))}
                  </Select>

                  <Input
                    type="password"
                    placeholder="Nouveau mot de passe"
                    className="border-white/10 bg-[#0f0f0f] text-zinc-100"
                    value={isEditing ? draft?.password ?? '' : ''}
                    onChange={(e) => isEditing && patchDraft(user.id, { password: e.target.value })}
                    readOnly={!isEditing}
                  />
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {!isEditing ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
                      onClick={() => startEditing(user)}
                    >
                      Editer
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" className="bg-emerald-500 text-white hover:bg-emerald-400" onClick={() => saveUser(user)}>
                        Enregistrer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
                        onClick={() => setEditingId(null)}
                      >
                        Annuler
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => disableUser(user.id)}>Désactiver</Button>
                </div>
              </article>
            );
          })}
          {!loading && filteredUsers.length === 0 ? <p className="text-sm text-zinc-500">Aucun utilisateur trouvé pour ce filtre.</p> : null}
        </div>
      </Card>
    </main>
  );
}
