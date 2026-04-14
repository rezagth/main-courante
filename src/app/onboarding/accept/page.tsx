'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await fetch('/api/onboarding/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, firstName, lastName, password }),
    });
    setIsLoading(false);

    if (!res.ok) {
      setError('Lien invalide/expire ou donnees incorrectes.');
      return;
    }
    setSuccess(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <Card className="w-full max-w-sm space-y-4 text-zinc-900 shadow-sm">
        <h1 className="text-xl font-semibold">Activation du compte</h1>
        {success ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">Compte active. Tu peux te connecter.</p>
            <a href="/login">
              <Button className="w-full">Aller a la connexion</Button>
            </a>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={onSubmit}>
            <Input
              placeholder="Prenom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={isLoading || !token}>
              {isLoading ? 'Activation...' : 'Activer mon compte'}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await fetch('/api/onboarding/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, firstName, lastName, password }),
    });
    setIsLoading(false);

    if (!res.ok) {
      setError('Lien invalide/expire ou donnees incorrectes.');
      return;
    }
    setSuccess(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <Card className="w-full max-w-sm space-y-4 text-zinc-900 shadow-sm">
        <h1 className="text-xl font-semibold">Activation du compte</h1>
        {success ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">Compte active. Tu peux te connecter.</p>
            <a href="/login">
              <Button className="w-full">Aller a la connexion</Button>
            </a>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={onSubmit}>
            <Input
              placeholder="Prenom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={isLoading || !token}>
              {isLoading ? 'Activation...' : 'Activer mon compte'}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
