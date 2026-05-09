import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from?.pathname || '/dashboard';
  const [values, setValues] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await signIn(values);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="hidden panel h-full min-h-[34rem] overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <div>
          <BrandLogo />
          <p className="mt-8 section-eyebrow">Secure meeting operations</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black leading-tight text-white">
            Run rooms, calls, chat, notes, and AI briefs from one polished workspace.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400">
            DivMeeting keeps the host controls close, the meeting state visible, and the room workflow fast enough for repeated daily use.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {['Low-latency calls', 'Private room links', 'Live AI context'].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/65 p-4">
              <div className="h-1.5 w-10 rounded-full bg-cyan-300" />
              <p className="mt-4 text-sm font-semibold text-slate-200">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel mx-auto w-full max-w-md">
        <div className="mb-8 flex justify-center lg:hidden">
          <BrandLogo />
        </div>
        <p className="section-eyebrow">Welcome back</p>
        <h1 className="mt-3 text-3xl font-black text-white">Sign in to DivMeeting</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Access your dashboard, join active rooms, and continue previous sessions.</p>
        {error && <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-500/12 p-3 text-sm text-rose-100">{error}</div>}
        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Email</span>
          <input
            type="email"
            value={values.email}
            onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
            className="control mt-2 w-full"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Password</span>
          <input
            type="password"
            value={values.password}
            onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
            className="control mt-2 w-full"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className="primary-button w-full">
          Sign In
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        New to DivMeeting?{' '}
        <Link to="/signup" state={location.state} className="font-semibold text-cyan-300 hover:text-cyan-200">
          Create account
        </Link>
      </p>
      </div>
    </section>
  );
}
