import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/78 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <BrandLogo asLink compact />
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link to="/credits" className="secondary-button px-3 py-2">
            Credits
          </Link>
          {user ? (
            <>
              <span className="hidden max-w-40 truncate text-sm font-medium text-slate-300 sm:inline">{user.name}</span>
              <button onClick={logout} className="secondary-button px-3 py-2">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="primary-button px-3 py-2">
                Login
              </Link>
              <Link to="/signup" className="secondary-button hidden px-3 py-2 sm:inline-flex">
                Signup
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
