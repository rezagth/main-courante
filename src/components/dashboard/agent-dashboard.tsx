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

const SEVERITY_CONFIG = {
  FAIBLE:  { label: 'Faible',  dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  MOYENNE: { label: 'Moyenne', dot: 'bg-amber-400',   badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  ELEVEE:  { label: 'Élevée',  dot: 'bg-red-400',     badge: 'bg-red-400/10 text-red-400 border-red-400/20' },
} as const;

const TYPE_ICONS: Record<string, string> = {
  ronde: '🔄', alarme: '🚨', anomalie: '⚠️', observation: '👁', intervention: '🚒',
};

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
  const [showForm, setShowForm] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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

  const fetchEntries = useCallback(async (nextPage = 0, replace = false) => {
    const res = await fetch(`/api/entries?take=20&page=${nextPage}`);
    if (!res.ok) return;
    const payload = (await res.json()) as { data: Entry[]; nextPage: number | null };
    setEntries((prev) => (replace ? payload.data : [...prev, ...payload.data]));
    setHasNext(payload.nextPage !== null);
    setPage(payload.nextPage ?? nextPage);
  }, []);

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
        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Impossible de créer entrée');
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
      setShowForm(false);
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Syne:wght@500;600;700;800&display=swap');

        .mc-root {
          --bg:        #0a0b0e;
          --surface:   #111318;
          --surface2:  #16191f;
          --border:    rgba(255,255,255,0.06);
          --border2:   rgba(255,255,255,0.10);
          --text:      #e8eaf0;
          --muted:     #6b7280;
          --accent:    #f97316;
          --accent2:   #fb923c;
          --red:       #ef4444;
          --green:     #10b981;
          --amber:     #f59e0b;
          --mono:      'JetBrains Mono', monospace;
          --display:   'Syne', sans-serif;
          font-family: var(--mono);
          background:  var(--bg);
          color:       var(--text);
          min-height:  100vh;
        }

        /* Header */
        .mc-header {
          position: sticky; top: 0; z-index: 50;
          background: rgba(10,11,14,0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
          padding: 14px 20px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .mc-logo {
          font-family: var(--display);
          font-size: 15px; font-weight: 800;
          letter-spacing: -0.02em; color: var(--text);
          display: flex; align-items: center; gap: 8px;
        }
        .mc-logo-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%,100% { opacity:1; box-shadow: 0 0 8px var(--accent); }
          50%      { opacity:.6; box-shadow: 0 0 16px var(--accent); }
        }
        .mc-clock {
          font-size: 11px; letter-spacing: 0.08em; color: var(--muted);
        }
        .mc-status-row {
          display: flex; align-items: center; gap: 8px;
        }
        .mc-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px; font-size: 11px;
          border: 1px solid; letter-spacing: 0.04em;
          font-family: var(--mono);
        }
        .mc-pill-online  { background: rgba(16,185,129,.1); color: #10b981; border-color: rgba(16,185,129,.25); }
        .mc-pill-offline { background: rgba(239,68,68,.1);  color: #ef4444; border-color: rgba(239,68,68,.25); }
        .mc-pill-pending { background: rgba(245,158,11,.1); color: #f59e0b; border-color: rgba(245,158,11,.25); }
        .mc-pill-sync    { background: rgba(99,102,241,.1); color: #818cf8; border-color: rgba(99,102,241,.25); }
        .pill-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }

        /* CTA Button */
        .mc-cta {
          margin: 20px 20px 0;
          width: calc(100% - 40px);
          padding: 18px;
          background: var(--accent);
          border: none; border-radius: 14px;
          font-family: var(--display);
          font-size: 17px; font-weight: 700;
          color: #fff; letter-spacing: -0.01em;
          cursor: pointer; position: relative; overflow: hidden;
          transition: transform .15s, box-shadow .15s;
          box-shadow: 0 4px 24px rgba(249,115,22,.3);
        }
        .mc-cta::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,.15) 0%, transparent 60%);
        }
        .mc-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 32px rgba(249,115,22,.4); }
        .mc-cta:active { transform: translateY(0); }
        .mc-cta-icon { margin-right: 8px; font-size: 18px; }

        /* Modal overlay */
        .mc-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,.7); backdrop-filter: blur(4px);
          display: flex; align-items: flex-end;
          animation: fade-in .2s ease;
        }
        @keyframes fade-in { from { opacity:0 } to { opacity:1 } }
        .mc-sheet {
          width: 100%; max-height: 92dvh; overflow-y: auto;
          background: var(--surface);
          border-top: 1px solid var(--border2);
          border-radius: 20px 20px 0 0;
          padding: 24px 20px 40px;
          animation: slide-up .25s cubic-bezier(.32,.72,0,1);
        }
        @keyframes slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
        .mc-sheet-handle {
          width: 36px; height: 4px; border-radius: 2px;
          background: var(--border2); margin: 0 auto 20px;
        }
        .mc-sheet-title {
          font-family: var(--display);
          font-size: 20px; font-weight: 700;
          letter-spacing: -0.02em; margin-bottom: 20px;
          display: flex; align-items: center; gap: 10px;
        }
        .mc-sheet-timer {
          margin-left: auto; font-size: 11px; color: var(--muted);
          font-family: var(--mono); letter-spacing: .05em;
        }

        /* Form fields */
        .mc-field { margin-bottom: 14px; }
        .mc-label {
          display: block; font-size: 10px; letter-spacing: .1em;
          color: var(--muted); text-transform: uppercase; margin-bottom: 6px;
        }
        .mc-input, .mc-select, .mc-textarea {
          width: 100%; padding: 12px 14px;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 10px; color: var(--text);
          font-family: var(--mono); font-size: 13px;
          outline: none; transition: border-color .15s, box-shadow .15s;
          box-sizing: border-box;
          -webkit-appearance: none;
        }
        .mc-input:focus, .mc-select:focus, .mc-textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(249,115,22,.12);
        }
        .mc-select { cursor: pointer; }
        .mc-textarea { resize: none; min-height: 90px; line-height: 1.6; }
        .mc-input::placeholder, .mc-textarea::placeholder { color: var(--muted); }

        /* Severity chips */
        .mc-severity-row { display: flex; gap: 8px; }
        .mc-sev-chip {
          flex: 1; padding: 10px 0; border-radius: 10px;
          text-align: center; font-size: 12px; font-family: var(--mono);
          border: 1px solid var(--border); background: var(--surface2);
          color: var(--muted); cursor: pointer; transition: all .15s;
        }
        .mc-sev-chip:hover { border-color: var(--border2); color: var(--text); }
        .mc-sev-chip.active-faible  { background: rgba(16,185,129,.1);  border-color: rgba(16,185,129,.4);  color: #10b981; }
        .mc-sev-chip.active-moyenne { background: rgba(245,158,11,.1); border-color: rgba(245,158,11,.4); color: #f59e0b; }
        .mc-sev-chip.active-elevee  { background: rgba(239,68,68,.1);   border-color: rgba(239,68,68,.4);   color: #ef4444; }

        /* File upload */
        .mc-upload {
          width: 100%; padding: 14px;
          background: var(--surface2); border: 1px dashed var(--border2);
          border-radius: 10px; color: var(--muted);
          font-family: var(--mono); font-size: 12px;
          text-align: center; cursor: pointer;
          position: relative; box-sizing: border-box;
          transition: border-color .15s;
        }
        .mc-upload:hover { border-color: var(--accent); color: var(--text); }
        .mc-upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }

        /* Submit */
        .mc-submit {
          width: 100%; padding: 15px;
          background: var(--accent); border: none; border-radius: 12px;
          font-family: var(--display); font-size: 15px; font-weight: 700;
          color: #fff; cursor: pointer; margin-top: 6px;
          transition: opacity .15s, transform .1s;
          box-shadow: 0 4px 20px rgba(249,115,22,.25);
        }
        .mc-submit:disabled { opacity: .5; cursor: not-allowed; }
        .mc-submit:not(:disabled):hover { opacity: .92; transform: translateY(-1px); }
        .mc-cancel {
          width: 100%; padding: 13px;
          background: transparent; border: 1px solid var(--border2);
          border-radius: 12px; font-family: var(--mono); font-size: 13px;
          color: var(--muted); cursor: pointer; margin-top: 8px;
          transition: border-color .15s, color .15s;
        }
        .mc-cancel:hover { border-color: var(--border2); color: var(--text); }
        .mc-error {
          padding: 10px 14px; background: rgba(239,68,68,.1);
          border: 1px solid rgba(239,68,68,.25); border-radius: 8px;
          font-size: 12px; color: #ef4444; margin-bottom: 12px;
        }

        /* Section */
        .mc-section { padding: 20px; }
        .mc-section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }
        .mc-section-title {
          font-family: var(--display); font-size: 13px; font-weight: 600;
          letter-spacing: .06em; text-transform: uppercase; color: var(--muted);
        }
        .mc-count {
          font-size: 11px; color: var(--muted); letter-spacing: .04em;
        }
        .mc-divider { height: 1px; background: var(--border); margin: 0 20px; }

        /* Entry card */
        .mc-entry {
          padding: 14px 16px; border-radius: 12px;
          background: var(--surface2); border: 1px solid var(--border);
          margin-bottom: 10px; transition: border-color .15s;
        }
        .mc-entry:hover { border-color: var(--border2); }
        .mc-entry-top {
          display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
        }
        .mc-entry-type {
          font-size: 11px; padding: 2px 8px; border-radius: 6px;
          background: rgba(249,115,22,.1); color: var(--accent);
          border: 1px solid rgba(249,115,22,.2); letter-spacing: .04em;
          font-family: var(--mono);
        }
        .mc-entry-time {
          font-size: 11px; color: var(--muted); margin-left: auto;
          font-family: var(--mono); letter-spacing: .04em;
        }
        .mc-entry-desc {
          font-size: 13px; line-height: 1.5; color: var(--text);
          margin-bottom: 6px;
        }
        .mc-entry-loc {
          font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px;
        }
        .mc-sev-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; padding: 2px 7px; border-radius: 5px; border: 1px solid;
          letter-spacing: .05em; font-family: var(--mono); margin-left: 6px;
        }

        /* Load more */
        .mc-load-more {
          width: 100%; padding: 12px;
          background: transparent; border: 1px solid var(--border);
          border-radius: 10px; color: var(--muted);
          font-family: var(--mono); font-size: 12px; letter-spacing: .04em;
          cursor: pointer; margin-top: 4px; transition: border-color .15s, color .15s;
        }
        .mc-load-more:hover { border-color: var(--border2); color: var(--text); }

        /* Toast */
        .mc-toast {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          z-index: 200; min-width: 300px; max-width: calc(100vw - 40px);
          background: var(--surface2); border: 1px solid var(--border2);
          border-radius: 14px; padding: 14px 16px;
          display: flex; align-items: center; gap: 12px;
          box-shadow: 0 8px 40px rgba(0,0,0,.6);
          animation: toast-in .3s cubic-bezier(.32,.72,0,1);
        }
        @keyframes toast-in { from { transform: translateX(-50%) translateY(20px); opacity:0 } to { transform: translateX(-50%) translateY(0); opacity:1 } }
        .mc-toast-icon { font-size: 18px; }
        .mc-toast-text { flex: 1; font-size: 13px; }
        .mc-toast-label { font-family: var(--display); font-weight: 600; font-size: 13px; }
        .mc-toast-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
        .mc-toast-undo {
          padding: 6px 12px; background: var(--accent);
          border: none; border-radius: 8px; color: #fff;
          font-family: var(--mono); font-size: 12px; font-weight: 500;
          cursor: pointer; white-space: nowrap;
        }
        .mc-toast-close {
          background: none; border: none; color: var(--muted);
          font-size: 16px; cursor: pointer; padding: 2px 4px;
        }

        /* Offline banner */
        .mc-offline-banner {
          margin: 12px 20px 0;
          padding: 10px 14px; border-radius: 10px;
          background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2);
          font-size: 12px; color: #ef4444;
          display: flex; align-items: center; gap: 8px;
        }

        /* Empty state */
        .mc-empty {
          text-align: center; padding: 32px 16px;
          color: var(--muted); font-size: 13px;
        }
        .mc-empty-icon { font-size: 32px; margin-bottom: 8px; opacity: .4; }

        /* Scrollbar */
        .mc-sheet::-webkit-scrollbar { width: 4px; }
        .mc-sheet::-webkit-scrollbar-track { background: transparent; }
        .mc-sheet::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
      `}</style>

      <div className="mc-root">
        {/* Header */}
        <header className="mc-header">
          <div className="mc-logo">
            <div className="mc-logo-dot" />
            MC — INCENDIE
          </div>
          <div className="mc-clock">
            {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="mc-status-row">
            {pendingCount > 0 && (
              <span className="mc-pill mc-pill-pending">
                <span className="pill-dot" />
                {pendingCount} en attente
              </span>
            )}
            <span className={`mc-pill ${isOnline ? 'mc-pill-online' : 'mc-pill-offline'}`}>
              <span className="pill-dot" />
              {isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
            </span>
          </div>
        </header>

        {/* Offline banner */}
        {!isOnline && (
          <div className="mc-offline-banner">
            ⚡ Mode hors ligne — les entrées seront synchronisées au retour réseau
          </div>
        )}

        {/* CTA */}
        <button className="mc-cta" onClick={() => setShowForm(true)}>
          <span className="mc-cta-icon">＋</span>
          Nouvelle entrée
        </button>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: '10px', padding: '16px 20px 0', overflowX: 'auto' }}>
          {[
            { label: "Aujourd'hui", value: entries.length, icon: '📋' },
            { label: 'En attente', value: pendingCount, icon: '⏳' },
            { label: now.toLocaleDateString('fr-FR', { weekday: 'long' }), value: now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), icon: '📅' },
          ].map((stat) => (
            <div key={stat.label} style={{
              flex: '1', minWidth: '90px', padding: '12px 14px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>{stat.icon}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>{stat.value}</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginTop: '2px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Entries list */}
        <div className="mc-section" style={{ paddingTop: '20px' }}>
          <div className="mc-section-header">
            <span className="mc-section-title">Dernières entrées</span>
            <span className="mc-count">{entries.length} entrée{entries.length > 1 ? 's' : ''}</span>
          </div>

          {entries.length === 0 ? (
            <div className="mc-empty">
              <div className="mc-empty-icon">📋</div>
              Aucune entrée aujourd'hui
            </div>
          ) : (
            <>
              {entries.map((entry) => (
                <article key={entry.id} className="mc-entry">
                  <div className="mc-entry-top">
                    <span className="mc-entry-type">
                      {TYPE_ICONS[entry.typeEvenement.label.toLowerCase()] ?? '📌'}&nbsp;
                      {entry.typeEvenement.label.toUpperCase()}
                    </span>
                    {entry.gravite && SEVERITY_CONFIG[entry.gravite] && (
  <span className={`mc-sev-badge ${SEVERITY_CONFIG[entry.gravite].badge}`}>
    <span
      style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: 'currentColor',
        display: 'inline-block',
      }}
    />
    {SEVERITY_CONFIG[entry.gravite].label}
  </span>
)}
                    <span className="mc-entry-time">
                      {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mc-entry-desc">{entry.description}</p>
                  {entry.localisation && (
                    <p className="mc-entry-loc">
                      <span>📍</span>
                      {entry.localisation}
                    </p>
                  )}
                </article>
              ))}
              {hasNext && (
                <button className="mc-load-more" onClick={() => fetchEntries(page, false)}>
                  Charger 20 de plus ↓
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="mc-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="mc-sheet">
            <div className="mc-sheet-handle" />
            <div className="mc-sheet-title">
              Nouvelle entrée
              <span className="mc-sheet-timer">⚡ &lt; 30 sec</span>
            </div>

            {formState.errors.root?.message && (
              <div className="mc-error">⚠ {formState.errors.root.message}</div>
            )}

            <form onSubmit={onSubmit}>
              <div className="mc-field">
                <label className="mc-label">Type d'événement *</label>
                <select className="mc-select" {...register('typeEvenementId', { required: true })}>
                  <option value="">Sélectionner un type…</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="mc-field">
                <label className="mc-label">Description *</label>
                <textarea
                  className="mc-textarea"
                  placeholder="Décrivez l'événement observé…"
                  {...register('description', { required: true, minLength: 3 })}
                />
              </div>

              <div className="mc-field">
                <label className="mc-label">Localisation</label>
                <input
                  className="mc-input"
                  placeholder="Ex : Niveau 2, Couloir B…"
                  {...register('localisation')}
                />
              </div>

              <div className="mc-field">
                <label className="mc-label">Gravité</label>
                <div className="mc-severity-row">
                  {(['FAIBLE', 'MOYENNE', 'ELEVEE'] as const).map((sev) => (
                    <label key={sev} style={{ flex: 1 }}>
                      <input
                        type="radio"
                        value={sev}
                        style={{ display: 'none' }}
                        {...register('gravite')}
                      />
                      <div className={`mc-sev-chip ${watchedValues.gravite === sev ? `active-${sev.toLowerCase()}` : ''}`}>
                        {sev === 'FAIBLE' ? '🟢' : sev === 'MOYENNE' ? '🟡' : '🔴'}&nbsp;
                        {SEVERITY_CONFIG[sev].label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mc-field">
                <label className="mc-label">Photo (optionnel)</label>
                <div className="mc-upload">
                  <input type="file" accept="image/jpeg,image/png,image/webp" {...register('photo')} />
                  📷 Appuyer pour ajouter une photo
                </div>
              </div>

              <button type="submit" className="mc-submit" disabled={isSubmitting}>
                {isSubmitting ? '⏳ Envoi en cours…' : isOnline ? '✓ Créer l\'entrée' : '💾 Enregistrer hors ligne'}
              </button>
              <button type="button" className="mc-cancel" onClick={() => setShowForm(false)}>
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {toastEntryId && (
        <div className="mc-toast">
          <span className="mc-toast-icon">✓</span>
          <div className="mc-toast-text">
            <div className="mc-toast-label">Entrée créée</div>
            <div className="mc-toast-sub">30 secondes pour annuler</div>
          </div>
          <button className="mc-toast-undo" onClick={handleUndo}>Annuler</button>
          <button className="mc-toast-close" onClick={() => setToastEntryId(null)}>✕</button>
        </div>
      )}
    </>
  );
}