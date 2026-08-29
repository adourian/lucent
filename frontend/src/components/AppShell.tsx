import type { MouseEvent, ReactNode } from "react";
import { Github } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { clearAnalysisSession } from "../lib/analysisSession";

const SOURCE_URL = "https://github.com/adourian/lucent";

interface AppShellProps {
  children: ReactNode;
  onBrandActivate?: () => void;
}

function AppShell({ children, onBrandActivate }: AppShellProps) {
  const currentYear = new Date().getFullYear();

  const handleBrandClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const isModifiedClick =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;

    if (isModifiedClick) return;

    clearAnalysisSession();
    onBrandActivate?.();
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link
            className="brand"
            to="/"
            aria-label="Lucent analysis home"
            onClick={handleBrandClick}
          >
            <img className="brand__mark" src="/vite.svg" alt="" />
            <span className="brand__copy">
              <span className="brand__name">Lucent</span>
              <span className="brand__descriptor">Clinical Trial Prediction</span>
            </span>
          </Link>

          <nav className="site-nav" aria-label="Primary navigation">
            <NavLink
              className={({ isActive }) =>
                `site-nav__link${isActive ? " site-nav__link--active" : ""}`
              }
              end
              to="/"
            >
              Analyze
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `site-nav__link${isActive ? " site-nav__link--active" : ""}`
              }
              to="/about"
            >
              Model note
            </NavLink>
            <a
              className="site-nav__link site-nav__source"
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Source code (opens in a new tab)"
            >
              <Github aria-hidden="true" size={16} strokeWidth={1.8} />
              <span className="site-nav__source-label site-nav__source-label--desktop">
                Source
              </span>
              <span className="site-nav__source-label site-nav__source-label--mobile">
                Code
              </span>
            </a>
          </nav>
        </div>
      </header>

      <div className="app-shell__content">{children}</div>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <p>
            Open-source model interface. Outputs estimate favorable trial
            outcomes; they are not observed results.
          </p>
          <div className="site-footer__meta">
            <span>© {currentYear} Lucent</span>
            <span aria-hidden="true">·</span>
            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
              MIT licensed source
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppShell;
