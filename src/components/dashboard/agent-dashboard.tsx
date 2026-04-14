'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UndoToast } from '@/components/ui/toast';
import { loadDraft, useDraftAutosave } from '@/hooks/use-draft-autosave';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useServiceWorker } from '@/hooks/use-service-worker';
import { useSyncQueue } from '@/hooks/use-sync-queue';
import { sha256 } from '@/lib/utils';

type EventType = { id: string; code: string; label: string };
type Entry = {
  id: string;
  timestamp: string;
  description: string;
  localisation?: string | null;
  gravite?: 'FAIBLE' | 'MOYENNE' | 'ELEVEE' | null;
  typeEvenement: { label: string };
  user: { firstName: string; lastName: string };
};

type FormValues = {
  typeEvenementId: string;
  description: string;
  localisation: string;
  gravite: '' | 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
  photo: FileList;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function AgentDashboard() {
  const formRef = useRef<HTMLElement | null>(null);
  const isOnline = useOnlineStatus();
  const { pendingCount, enqueue, syncNow } = useSyncQueue();
  useServiceWorker();

  const [types, setTypes] = useState<EventType[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);
  const [toastEntryId, setToastEntryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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

  const { register, handleSubmit, watch, reset, setError, formState } = useForm<FormValues>({
    defaultValues,
  });

  const watchedValues = watch();
  useDraftAutosave('agent-entry-draft', {
    typeEvenementId: watchedValues.typeEvenementId,
    description: watchedValues.description,
    localisation: watchedValues.localisation,
    gravite: watchedValues.gravite,
  });

  const fetchTypes = useCallback(async () => {
    const res = await fetch('/api/entries/types');
    if (!res.ok) return;
    const payload = (await res.json()) as { data: EventType[] };
    setTypes(payload.data);
  }, []);

  const fetchEntries = useCallback(
    async (nextPage = 0, replace = false) => {
      const res = await fetch(`/api/entries?take=20&page=${nextPage}`);
      if (!res.ok) return;
      const payload = (await res.json()) as { data: Entry[]; nextPage: number | null };
      setEntries((prev) => (replace ? payload.data : [...prev, ...payload.data]));
      setHasNext(payload.nextPage !== null);
      setPage(payload.nextPage ?? nextPage);
    },
    [],
  );

  useEffect(() => {
    fetchTypes();
    fetchEntries(0, true);
  }, [fetchEntries, fetchTypes]);

  useEffect(() => {
    if (!isOnline) return;
    syncNow().then(() => fetchEntries(0, true));
  }, [isOnline, syncNow, fetchEntries]);

  const uploadPhoto = useCallback(async (file?: File) => {
    if (!file) return null;
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error('Format photo invalide (jpg/png/webp).');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Photo trop volumineuse (max 5MB).');
    }

    const presign = await fetch('/api/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });
    if (!presign.ok) throw new Error("Echec de generation d'URL d'upload");

    const { uploadUrl, publicUrl } = (await presign.json()) as {
      uploadUrl: string;
      publicUrl: string;
    };

    const upload = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!upload.ok) throw new Error("Echec d'upload photo");
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
        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Impossible de creer entree');
        const data = (await res.json()) as { data: Entry };
        setToastEntryId(data.data.id);
        await fetchEntries(0, true);
      } else {
        await enqueue({
          id: crypto.randomUUID(),
          ...payload,
          descriptionHash: await sha256(`${payload.timestamp}:${payload.description}`),
          clientUpdatedAt: new Date().toISOString(),
        });
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

  const handleUndo = async () => {
    if (!toastEntryId) return;
    await fetch(`/api/entries/${toastEntryId}/undo`, { method: 'POST' });
    setToastEntryId(null);
    await fetchEntries(0, true);
  };

  useEffect(() => {
    if (!toastEntryId) return;
    const timer = window.setTimeout(() => setToastEntryId(null), 30_000);
    return () => window.clearTimeout(timer);
  }, [toastEntryId]);

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-4">
      <header className="sticky top-0 z-10 flex items-center justify-between rounded-xl bg-white/95 p-2 backdrop-blur">
        <h1 className="text-lg font-semibold">Main courante agent</h1>
        <Badge className={pendingCount ? 'bg-amber-100 text-amber-900' : ''}>
          {pendingCount} en attente
        </Badge>
      </header>

      <Button size="lg" className="w-full text-base" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}>
        Nouvelle entree
      </Button>

      <Card ref={formRef} className="space-y-3">
        <h2 className="font-medium">Creation rapide (&lt; 30 sec)</h2>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Select {...register('typeEvenementId', { required: true })}>
            <option value="">Type d'evenement</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </Select>

          <Textarea
            {...register('description', { required: true, minLength: 3 })}
            placeholder="Description"
          />

          <Input {...register('localisation')} placeholder="Localisation (optionnel)" />

          <Select {...register('gravite')}>
            <option value="">Gravite (optionnel)</option>
            <option value="FAIBLE">Faible</option>
            <option value="MOYENNE">Moyenne</option>
            <option value="ELEVEE">Elevee</option>
          </Select>

          <Input type="file" accept="image/jpeg,image/png,image/webp" {...register('photo')} />

          {formState.errors.root?.message ? (
            <p className="text-sm text-red-600">{formState.errors.root.message}</p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Envoi...' : isOnline ? 'Creer entree' : 'Enregistrer hors ligne'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => syncNow()}>
              Sync
            </Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-medium">Dernieres entrees du jour</h2>
        <div className="space-y-2">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-lg border border-zinc-200 p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <Badge>{entry.typeEvenement.label}</Badge>
              </div>
              <p className="text-sm font-medium">{entry.description}</p>
              {entry.localisation ? <p className="text-xs text-zinc-600">{entry.localisation}</p> : null}
            </article>
          ))}
        </div>
        {hasNext ? (
          <Button variant="outline" className="w-full" onClick={() => fetchEntries(page, false)}>
            Charger 20 de plus
          </Button>
        ) : null}
      </Card>

      {toastEntryId ? (
        <UndoToast
          title="Entree creee"
          onUndo={handleUndo}
          onClose={() => setToastEntryId(null)}
        />
      ) : null}
    </main>
  );
}
