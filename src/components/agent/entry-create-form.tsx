'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { loadDraft, useDraftAutosave } from '@/hooks/use-draft-autosave';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useServiceWorker } from '@/hooks/use-service-worker';
import { useSyncQueue } from '@/hooks/use-sync-queue';
import { sha256 } from '@/lib/utils';

type EventType = { id: string; code: string; label: string };

type FormValues = {
  typeEvenementId: string;
  description: string;
  localisation: string;
  gravite: '' | 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
  photo: FileList;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const SEVERITY_CONFIG = {
  FAIBLE: { label: 'Faible', className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' },
  MOYENNE: { label: 'Moyenne', className: 'border-amber-400/20 bg-amber-400/10 text-amber-300' },
  ELEVEE: { label: 'Élevée', className: 'border-red-400/20 bg-red-400/10 text-red-300' },
} as const;

export function EntryCreateForm() {
  const isOnline = useOnlineStatus();
  const { pendingCount, enqueue } = useSyncQueue();
  useServiceWorker();

  const [types, setTypes] = useState<EventType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const defaultValues = useMemo(
    () =>
      loadDraft<Omit<FormValues, 'photo'>>('agent-entry-draft') ?? {
        typeEvenementId: '',
        description: '',
        localisation: '',
        gravite: '',
      },
    [],
  );

  const { register, handleSubmit, watch, reset, setError, formState } = useForm<FormValues>({ defaultValues });
  const watchedValues = watch();

  useDraftAutosave('agent-entry-draft', {
    typeEvenementId: watchedValues.typeEvenementId,
    description: watchedValues.description,
    localisation: watchedValues.localisation,
    gravite: watchedValues.gravite,
  });

  const fetchTypes = useCallback(async () => {
    const response = await fetch('/api/entries/types');
    if (!response.ok) return;
    const payload = (await response.json()) as { data: EventType[] };
    setTypes(payload.data);
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const uploadPhoto = useCallback(async (file?: File) => {
    if (!file) return null;
    if (!ALLOWED_FILE_TYPES.includes(file.type)) throw new Error('Format photo invalide (jpg/png/webp).');
    if (file.size > MAX_FILE_SIZE) throw new Error('Photo trop volumineuse (max 5MB).');

    const presign = await fetch('/api/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
    });
    if (!presign.ok) throw new Error("Échec de génération d'URL d'upload");
    const { uploadUrl, publicUrl } = (await presign.json()) as { uploadUrl: string; publicUrl: string };

    const upload = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!upload.ok) throw new Error("Échec d'upload photo");
    return publicUrl;
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const file = values.photo?.[0];
      const nextPhotoUrl = file && isOnline ? await uploadPhoto(file) : photoUrl;
      const payload = {
        typeEvenementId: values.typeEvenementId,
        description: values.description.trim(),
        localisation: values.localisation.trim(),
        gravite: values.gravite || undefined,
        photoUrl: nextPhotoUrl ?? undefined,
        timestamp: new Date().toISOString(),
      };

      if (isOnline) {
        const response = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Impossible de créer entrée');
        const data = (await response.json()) as { data: { id: string } };
        setSuccessMessage(`Entrée créée avec l'identifiant ${data.data.id}`);
      } else {
        await enqueue({
          id: crypto.randomUUID(),
          ...payload,
          descriptionHash: await sha256(`${payload.timestamp}:${payload.description}`),
          clientUpdatedAt: new Date().toISOString(),
        });
        setSuccessMessage('Entrée mise en file pour synchronisation');
      }

      localStorage.removeItem('agent-entry-draft');
      reset({ typeEvenementId: '', description: '', localisation: '', gravite: '' });
      setPhotoUrl(null);
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Erreur inconnue' });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_45%),#111111] p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Agent</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-100">Créer une entrée</h1>
          <p className="mt-1 text-sm text-zinc-400">Saisie rapide, compatible hors ligne, avec photo optionnelle et autosave.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={isOnline ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' : 'bg-red-500/10 text-red-300 border-red-400/20'}>
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </Badge>
          <Badge className="bg-white/5 text-zinc-300 border-white/10">{pendingCount} en attente</Badge>
          <Button asChild variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
            <Link href="/agent/dashboard">Retour dashboard</Link>
          </Button>
        </div>
      </div>

      {!isOnline ? (
        <Card className="border-red-400/20 bg-red-500/10 text-red-200">Mode hors ligne activé — la création sera synchronisée dès le retour réseau.</Card>
      ) : null}

      {successMessage ? (
        <Card className="border-emerald-400/20 bg-emerald-500/10 text-emerald-100">{successMessage}</Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="space-y-5 border-white/10 bg-[#111111] p-5 text-zinc-100">
          <form onSubmit={onSubmit} className="space-y-5">
          {formState.errors.root?.message ? <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{formState.errors.root.message}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Type d'événement *</label>
              <Select className="bg-[#0f0f0f] border-white/10 text-zinc-100" {...register('typeEvenementId', { required: true })}>
                <option value="">Sélectionner un type…</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Localisation</label>
              <Input className="bg-[#0f0f0f] border-white/10 text-zinc-100 placeholder:text-zinc-500" placeholder="Ex : Niveau 2, Couloir B…" {...register('localisation')} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Description *</label>
            <Textarea
              className="min-h-32 border-white/10 bg-[#0f0f0f] text-zinc-100 placeholder:text-zinc-500"
              placeholder="Décrivez l'événement observé…"
              {...register('description', { required: true, minLength: 3 })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Gravité</label>
            <div className="grid gap-2 md:grid-cols-3">
              {(['FAIBLE', 'MOYENNE', 'ELEVEE'] as const).map((severity) => (
                <label key={severity} className="cursor-pointer">
                  <input type="radio" value={severity} className="sr-only" {...register('gravite')} />
                  <div className={`rounded-xl border px-4 py-3 text-center text-sm transition-colors ${watchedValues.gravite === severity ? SEVERITY_CONFIG[severity].className : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                    {SEVERITY_CONFIG[severity].label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">Photo</label>
            <div className="relative overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-5 text-center text-sm text-zinc-400">
              <input className="absolute inset-0 cursor-pointer opacity-0" type="file" accept="image/jpeg,image/png,image/webp" {...register('photo')} />
              Appuie pour joindre une photo JPG, PNG ou WEBP
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <Button type="submit" disabled={isSubmitting} className="bg-orange-500 text-white hover:bg-orange-400 md:flex-1">
              {isSubmitting ? 'Création...' : isOnline ? "Créer l'entrée" : 'Mettre en attente'}
            </Button>
            <Button type="button" variant="outline" asChild className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10 md:flex-1">
              <Link href="/agent/dashboard">Annuler</Link>
            </Button>
          </div>
          </form>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="border-white/10 bg-[#111111] p-4 text-zinc-200">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Aperçu rapide</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-xs text-zinc-500">Type</p>
                <p>{types.find((type) => type.id === watchedValues.typeEvenementId)?.label ?? 'Non sélectionné'}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-xs text-zinc-500">Description</p>
                <p className="line-clamp-3">{watchedValues.description || 'Aucune description'}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-xs text-zinc-500">Localisation</p>
                <p>{watchedValues.localisation || 'Non renseignée'}</p>
              </div>
            </div>
          </Card>

          <Card className="border-white/10 bg-[#111111] p-4 text-zinc-200">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Conseils</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-400">
              <li>Décris le fait en une phrase claire et factuelle.</li>
              <li>Ajoute la localisation précise pour accélérer le traitement.</li>
              <li>Choisis la gravité la plus proche du risque réel.</li>
              <li>En mode hors ligne, la synchronisation se fait automatiquement.</li>
            </ul>
          </Card>
        </div>
      </div>
    </main>
  );
}
