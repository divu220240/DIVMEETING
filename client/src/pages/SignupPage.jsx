import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from '../components/BrandLogo';

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from?.pathname || '/dashboard';
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await signUp(values);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="panel mx-auto w-full max-w-md">
        <div className="mb-8 flex justify-center lg:hidden">
          <BrandLogo />
        </div>
        <p className="section-eyebrow">Start hosting</p>
        <h1 className="mt-3 text-3xl font-black text-white">Create your workspace</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Set up your account and launch professional rooms with screen sharing, chat, notes, and AI support.</p>
        {error && <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-500/12 p-3 text-sm text-rose-100">{error}</div>}
        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Name</span>
            <input
              type="text"
              value={values.name}
              onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
              className="control mt-2 w-full"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </label>
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
              placeholder="Create a secure password"
              autoComplete="new-password"
              required
            />
          </label>
          <button className="primary-button w-full">
            Sign Up
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Already a member?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-cyan-300 hover:text-cyan-200">
            Login
          </Link>
        </p>
      </div>

      <div className="hidden panel h-full min-h-[34rem] overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <div>
          <BrandLogo />
          <p className="mt-8 section-eyebrow">Built for focused calls</p>
          <h2 className="mt-3 max-w-xl text-4xl font-black leading-tight text-white">
            A premium meeting cockpit for hosts who need control without clutter.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400">
            Create a room, share the link, lock access, capture decisions, and let the assistant turn context into next actions.
          </p>
        </div>

        <div className="grid gap-3">
          {[
            ['01', 'Launch private rooms in seconds'],
            ['02', 'Manage participants from the host panel'],
            ['03', 'Capture notes and AI-ready meeting context'],
          ].map(([number, text]) => (
            <div key={number} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/65 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300 text-sm font-black text-slate-950">
                {number}
              </span>
              <p className="text-sm font-semibold text-slate-200">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
