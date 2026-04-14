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
    <main className="mx-auto w-full max-w-xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Onboarding tenant</h1>
      <Card>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input placeholder="Nom tenant" {...register('name', { required: true })} />
          <Input placeholder="Domaine" {...register('domain', { required: true })} />
          <Input placeholder="Admin email" type="email" {...register('adminEmail', { required: true })} />
          <Input
            placeholder="Mot de passe temporaire"
            type="password"
            {...register('tempPassword', { required: true, minLength: 8 })}
          />
          <Textarea
            placeholder="Invitations (1 email par ligne)"
            {...register('inviteEmails')}
          />
          <Button disabled={formState.isSubmitting} type="submit">
            {formState.isSubmitting ? 'Creation...' : 'Creer tenant'}
          </Button>
        </form>
      </Card>
      {result ? (
        <Card>
          <p>Tenant cree: {result.tenantId}</p>
          <ul className="mt-2 list-disc pl-4 text-sm">
            <li>Creer un site</li>
            <li>Creer une equipe</li>
            <li>Inviter un agent</li>
          </ul>
        </Card>
      ) : null}
    </main>
  );
}
