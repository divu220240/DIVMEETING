import { Link } from 'react-router-dom';

function LogoMark({ compact = false }) {
  const sizeClass = compact ? 'h-10 w-10' : 'h-12 w-12';

  return (
    <span className={`${sizeClass} relative inline-grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-950 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-300/25`}>
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(125,211,252,0.95),transparent_30%),linear-gradient(135deg,rgba(34,211,238,0.92),rgba(99,102,241,0.84)_52%,rgba(244,114,182,0.78))]" />
      <span className="absolute -right-3 -top-3 h-7 w-7 rounded-full bg-white/25 blur-sm" />
      <svg
        className="relative h-[72%] w-[72%] drop-shadow"
        viewBox="0 0 64 64"
        role="img"
        aria-label="DivMeeting logo"
      >
        <path
          d="M17 20.5C17 15.8 20.8 12 25.5 12h7.8C44 12 52.7 20.7 52.7 31.4S44 50.8 33.3 50.8h-7.8c-4.7 0-8.5-3.8-8.5-8.5V20.5Z"
          fill="rgba(15,23,42,0.88)"
        />
        <path
          d="M25 24.8h7.7c3.7 0 6.7 3 6.7 6.7s-3 6.7-6.7 6.7H25V24.8Z"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5.2"
        />
        <path
          d="M40.2 27.3 49 23.1v16.8l-8.8-4.2"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5.2"
        />
      </svg>
    </span>
  );
}

export default function BrandLogo({ asLink = false, compact = false, className = '' }) {
  const content = (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark compact={compact} />
      <span className="leading-none">
        <span className={`${compact ? 'text-xl' : 'text-2xl'} block font-black text-white`}>
          Div<span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-fuchsia-300 bg-clip-text text-transparent">Meeting</span>
        </span>
        {!compact && <span className="mt-1 block text-xs font-medium uppercase tracking-[0.24em] text-cyan-200/70">Live rooms</span>}
      </span>
    </span>
  );

  if (asLink) {
    return (
      <Link to="/dashboard" className="rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">
        {content}
      </Link>
    );
  }

  return content;
}
