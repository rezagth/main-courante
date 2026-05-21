import Link from 'next/link';
import { auth } from '@/lib/auth';
import { fetchServerJson } from '@/lib/server-json';
import { formatBytes } from '@/lib/format';
import { hasAnyRole, resolveDefaultDashboardPath } from '@/lib/role-routing';
import { redirect } from 'next/navigation';

type EntryPayload = {
  data: {
    id: string;
    timestamp: string;
    description: string;
    localisation: string | null;
    gravite: 'FAIBLE' | 'MOYENNE' | 'ELEVEE' | null;
    photoUrl: string | null;
    photoSizeBytes: number | null;
    site: { id: string; name: string };
    team: { id: string; name: string };
    user: { id: string; firstName: string; lastName: string };
    typeEvenement: { id: string; label: string; code: string };
    createdAt: string;
    updatedAt: string;
  };
};

export default async function EntryDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: { from?: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!hasAnyRole(session.user.roles, ['CLIENT', 'CHEF_EQUIPE', 'PATRON', 'SUPER_ADMIN', 'AGENT'])) {
    redirect(resolveDefaultDashboardPath(session.user.roles));
  }

  const { id } = await params;
  const payload = await fetchServerJson<EntryPayload>(`/api/entries/${id}`);
  const from = searchParams?.from ? String(searchParams.from) : null;
  const entry = payload?.data;

  if (!entry) {
    return (
      <main className="mx-auto w-full max-w-4xl p-6 text-zinc-100">
        <p className="text-sm text-zinc-400">Entrée introuvable.</p>
        <Link className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10" href={from ?? '/'}>
          Retour
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-4 text-zinc-100">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_45%),#111111] p-5 md:p-6">
        <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Entrée</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">{entry.typeEvenement.label}</h1>
        <p className="mt-1 text-sm text-zinc-400">{new Date(entry.timestamp).toLocaleString('fr-FR')}</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Description</p>
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-200">{entry.description}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Agent</p>
              <p className="mt-2 text-sm text-zinc-100">{entry.user.firstName} {entry.user.lastName}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Gravité</p>
              <p className="mt-2 text-sm text-zinc-100">{entry.gravite ?? 'Non renseignée'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Hôpital</p>
              <p className="mt-2 text-sm text-zinc-100">{entry.site.name}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Endroit</p>
              <p className="mt-2 text-sm text-zinc-100">{entry.team.name}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Localisation</p>
              <p className="mt-2 text-sm text-zinc-100">{entry.localisation ?? 'Non renseignée'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Horodatage</p>
              <p className="mt-2 text-sm text-zinc-100">{new Date(entry.timestamp).toLocaleString('fr-FR')}</p>
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-4 text-zinc-200">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Photo</p>
            {entry.photoUrl ? (
              <div className="mt-3 space-y-3">
                <img className="max-h-96 w-full rounded-xl border border-white/10 object-contain" src={entry.photoUrl} alt={`Photo de l'entrée ${entry.id}`} />
                <a className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10" href={entry.photoUrl} target="_blank" rel="noreferrer">
                  Ouvrir la photo
                </a>
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-400">Aucune photo enregistrée.</p>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-4 text-zinc-200">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Métadonnées</p>
            <div className="mt-3 space-y-2 text-sm text-zinc-300">
              <p>ID: {entry.id}</p>
              <p>Type code: {entry.typeEvenement.code}</p>
              <p>Créée: {new Date(entry.createdAt).toLocaleString('fr-FR')}</p>
              <p>Modifiée: {new Date(entry.updatedAt).toLocaleString('fr-FR')}</p>
              <p>Photo taille: {formatBytes(entry.photoSizeBytes)}</p>
            </div>
          </section>

          <Link className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100 hover:bg-white/10" href={from ?? '/'}>
            Retour accueil
          </Link>
        </aside>
      </div>
    </main>
  );
}
