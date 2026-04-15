'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);
    if (!result || result.error) {
      setError('Identifiants invalides. Vérifiez votre email et mot de passe.');
      return;
    }

    window.location.href = result.url ?? callbackUrl;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          --bg:       #0a0b0e;
          --surface:  #111318;
          --surface2: #16191f;
          --border:   rgba(255,255,255,0.06);
          --border2:  rgba(255,255,255,0.12);
          --text:     #e8eaf0;
          --muted:    #4b5263;
          --muted2:   #6b7280;
          --accent:   #f97316;
          --accent2:  #fb923c;
          --red:      #ef4444;
          --mono:     'JetBrains Mono', monospace;
          --display:  'Syne', sans-serif;

          min-height: 100dvh;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
          font-family: var(--mono);
          color: var(--text);
          position: relative;
          overflow: hidden;
        }

        /* Ambient background glow */
        .login-root::before {
          content: '';
          position: fixed;
          top: -30%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(ellipse, rgba(249,115,22,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-root::after {
          content: '';
          position: fixed;
          bottom: -20%;
          right: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(99,102,241,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Grid pattern */
        .login-grid {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        /* Card */
        .login-card {
          width: 100%;
          max-width: 400px;
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: 20px;
          padding: 36px 32px 32px;
          position: relative;
          z-index: 1;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.02),
            0 24px 60px rgba(0,0,0,0.5),
            0 0 80px rgba(249,115,22,0.04);
        }

        /* Top accent line */
        .login-card::before {
          content: '';
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          border-radius: 1px;
        }

        /* Logo / brand */
        .login-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }
        .login-brand-icon {
          width: 38px; height: 38px;
          background: rgba(249,115,22,0.12);
          border: 1px solid rgba(249,115,22,0.25);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        }
        .login-brand-name {
          font-family: var(--display);
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text);
          line-height: 1;
        }
        .login-brand-sub {
          font-size: 10px;
          color: var(--muted2);
          letter-spacing: .08em;
          text-transform: uppercase;
          margin-top: 3px;
        }

        /* Header */
        .login-header {
          margin-bottom: 28px;
        }
        .login-title {
          font-family: var(--display);
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text);
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .login-title span {
          color: var(--accent);
        }
        .login-subtitle {
          font-size: 12px;
          color: var(--muted2);
          letter-spacing: .03em;
          line-height: 1.5;
        }

        /* Divider */
        .login-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: 24px;
        }

        /* Field */
        .login-field {
          margin-bottom: 14px;
        }
        .login-label {
          display: block;
          font-size: 10px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--muted2);
          margin-bottom: 7px;
        }
        .login-input-wrap {
          position: relative;
        }
        .login-input-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          color: var(--muted);
          pointer-events: none;
          transition: color .15s;
        }
        .login-input-wrap.focused .login-input-icon {
          color: var(--accent);
        }
        .login-input {
          width: 100%;
          padding: 13px 14px 13px 40px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 11px;
          color: var(--text);
          font-family: var(--mono);
          font-size: 13px;
          outline: none;
          transition: border-color .15s, box-shadow .15s, background .15s;
          -webkit-appearance: none;
        }
        .login-input::placeholder {
          color: var(--muted);
        }
        .login-input:focus {
          border-color: var(--accent);
          background: rgba(249,115,22,0.03);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.10);
        }
        .login-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #16191f inset !important;
          -webkit-text-fill-color: var(--text) !important;
        }

        /* Error */
        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 11px 14px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.22);
          border-radius: 10px;
          font-size: 12px;
          color: #f87171;
          margin-bottom: 16px;
          line-height: 1.5;
          animation: shake .35s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0) }
          20%      { transform: translateX(-5px) }
          60%      { transform: translateX(5px) }
        }
        .login-error-icon { font-size: 13px; flex-shrink: 0; margin-top: 1px; }

        /* Submit */
        .login-submit {
          width: 100%;
          padding: 15px;
          background: var(--accent);
          border: none;
          border-radius: 12px;
          font-family: var(--display);
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.01em;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform .15s, box-shadow .15s, opacity .15s;
          box-shadow: 0 4px 24px rgba(249,115,22,0.28);
          margin-top: 6px;
        }
        .login-submit::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,.15) 0%, transparent 60%);
        }
        .login-submit:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 32px rgba(249,115,22,0.38);
        }
        .login-submit:not(:disabled):active {
          transform: translateY(0);
        }
        .login-submit:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        /* Loading spinner */
        .login-spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin .7s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes spin { to { transform: rotate(360deg) } }

        /* Footer */
        .login-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .login-footer-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 6px var(--accent);
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%,100% { opacity:1 }
          50%      { opacity:.4 }
        }
        .login-footer-text {
          font-size: 10px;
          color: var(--muted2);
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        /* Security badge */
        .login-security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: 14px;
          font-size: 10px;
          color: var(--muted);
          letter-spacing: .05em;
        }
      `}</style>

      <div className="login-root">
        <div className="login-grid" />

        <div className="login-card">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-brand-icon">🚒</div>
            <div>
              <div className="login-brand-name">MC — INCENDIE</div>
              <div className="login-brand-sub">Sécurité · Terrain · Traçabilité</div>
            </div>
          </div>

          {/* Header */}
          <div className="login-header">
            <h1 className="login-title">
              Accès <span>sécurisé</span>
            </h1>
            <p className="login-subtitle">
              Connectez-vous à votre main courante électronique.
            </p>
          </div>

          <div className="login-divider" />

          {/* Form */}
          <form onSubmit={onSubmit}>
            <div className="login-field">
              <label className="login-label">Adresse email</label>
              <div className={`login-input-wrap ${focused === 'email' ? 'focused' : ''}`}>
                <span className="login-input-icon">✉</span>
                <input
                  className="login-input"
                  type="email"
                  placeholder="agent@exemple.fr"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label">Mot de passe</label>
              <div className={`login-input-wrap ${focused === 'password' ? 'focused' : ''}`}>
                <span className="login-input-icon">🔒</span>
                <input
                  className="login-input"
                  type="password"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="login-error">
                <span className="login-error-icon">⚠</span>
                {error}
              </div>
            )}

            <button className="login-submit" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="login-spinner" />
                  Vérification…
                </>
              ) : (
                '→ Se connecter'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="login-footer">
            <div className="login-footer-dot" />
            <span className="login-footer-text">Système actif — Accès restreint</span>
          </div>

          <div className="login-security">
            🔐 Connexion chiffrée · Session sécurisée
          </div>
        </div>
      </div>
    </>
  );
}