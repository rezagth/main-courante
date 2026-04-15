'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type FormValues = {
  name: string;
  domain: string;
  adminEmail: string;
  tempPassword: string;
  inviteEmails: string;
};

export function TenantOnboardingForm() {
  const [result, setResult] = useState<{ tenantId: string } | null>(null);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: {
      name: '',
      domain: '',
      adminEmail: '',
      tempPassword: '',
      inviteEmails: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const inviteEmails = values.inviteEmails
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);

    const res = await fetch('/api/onboarding/tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, inviteEmails }),
    });
    if (!res.ok) return;
    setResult((await res.json()) as { tenantId: string });
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.16),transparent_45%),#111111] p-5 md:p-6">
        <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Admin · Onboarding</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">Création d’un tenant</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Crée un tenant complet avec quotas, checklist, types d’événements et invitation admin initiale.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="border-white/10 bg-[#111111] p-5">
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input className="border-white/10 bg-[#0f0f0f] text-zinc-100" placeholder="Nom tenant" {...register('name', { required: true })} />
              <Input className="border-white/10 bg-[#0f0f0f] text-zinc-100" placeholder="Domaine" {...register('domain', { required: true })} />
            </div>
            <Input className="border-white/10 bg-[#0f0f0f] text-zinc-100" placeholder="Admin email" type="email" {...register('adminEmail', { required: true })} />
            <Input
              className="border-white/10 bg-[#0f0f0f] text-zinc-100"
              placeholder="Mot de passe temporaire"
              type="password"
              {...register('tempPassword', { required: true, minLength: 8 })}
            />
            <Textarea
              className="min-h-36 border-white/10 bg-[#0f0f0f] text-zinc-100"
              placeholder="Invitations (1 email par ligne)"
              {...register('inviteEmails')}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="bg-orange-500 text-white hover:bg-orange-400" disabled={formState.isSubmitting} type="submit">
                {formState.isSubmitting ? 'Création...' : 'Créer le tenant'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="border-white/10 bg-[#111111] p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Checklist</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>1. Renseigner le nom et le domaine</li>
              <li>2. Créer l’admin initial</li>
              <li>3. Générer les quotas et politiques</li>
              <li>4. Créer les types d’événements par défaut</li>
              <li>5. Envoyer les invitations</li>
            </ul>
          </Card>

          <Card className="border-white/10 bg-[#111111] p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Conseil</p>
            <p className="mt-2 text-sm text-zinc-400">
              Utilise un domaine cohérent avec le nom du client pour garder les codes tenant lisibles.
            </p>
          </Card>
        </div>
      </div>

      {result ? (
        <Card className="border-emerald-400/20 bg-emerald-500/10 p-5 text-emerald-100">
          <p className="font-medium">Tenant créé: {result.tenantId}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-emerald-100/80">
            <li>Créer un site</li>
            <li>Créer une équipe</li>
            <li>Inviter un agent</li>
          </ul>
        </Card>
      ) : null}
    </main>
  );
}
