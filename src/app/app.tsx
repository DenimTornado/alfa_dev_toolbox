import { useEffect, useState } from 'react';
import { version } from '../../package.json';
import { useData } from '../shared/storage/data-context';
import { UrlBuilder } from '../modules/url-builder/url-builder';
import { Dictionaries } from '../modules/dictionaries/dictionaries';
import { BuildEnv } from '../modules/build-env/build-env';
import { Settings } from '../modules/settings/settings';
import styles from './app.module.css';
const sections = [
  { path: 'url-builder', name: 'URL Builder', icon: '↗' },
  { path: 'build-env', name: 'Build ENV', icon: '⌘' },
  { path: 'dictionaries', name: 'Dictionaries', icon: '▤' },
  { path: 'settings', name: 'Settings', icon: '⚙' },
];
export function App() {
  const { data, update, storageError } = useData();
  const [route, setRoute] = useState(
    () => location.hash.slice(2).split('?')[0] || 'url-builder',
  );
  useEffect(() => {
    const listener = () =>
      setRoute(location.hash.slice(2).split('?')[0] || 'url-builder');
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        data.settings.theme === 'system'
          ? media.matches
            ? 'dark'
            : 'light'
          : data.settings.theme;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [data.settings.theme]);
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <a href="#/url-builder" className={styles.brand}>
          <span className={styles.brandIcon}>
            [<b>›</b>]
          </span>
          <span>
            DEV<span className={styles.brandSecondary}>Toolbox</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {sections.map((section) => (
            <a
              key={section.path}
              href={`#/${section.path}`}
              aria-current={route === section.path ? 'page' : undefined}
              className={route === section.path ? styles.navActive : ''}
            >
              <span>{section.icon}</span>
              {section.name}
            </a>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <button
            className={styles.themeToggle}
            onClick={() =>
              update((previous) => ({
                ...previous,
                settings: {
                  theme:
                    document.documentElement.dataset.theme === 'dark'
                      ? 'light'
                      : 'dark',
                },
              }))
            }
          >
            ◐ <span>Toggle appearance</span>
            <kbd>☼</kbd>
          </button>
        </div>
      </aside>
      <div className={styles.mainShell}>
        <main className={styles.main}>
          {storageError && (
            <div className={styles.storageWarning} role="alert">
              {storageError} <a href="#/settings">Open Settings →</a>
            </div>
          )}
          {route === 'dictionaries' ? (
            <Dictionaries />
          ) : route === 'settings' ? (
            <Settings />
          ) : route === 'build-env' ? (
            <BuildEnv />
          ) : route === 'url-builder' ? (
            <UrlBuilder />
          ) : (
            <div className={styles.panel}>
              <h1>Page not found</h1>
              <a href="#/url-builder">Go to URL Builder</a>
            </div>
          )}
        </main>
        <footer className={styles.appFooter}>
          <span title="Include this version when reporting an issue">
            DEV Toolbox v{version}
          </span>
        </footer>
      </div>
    </div>
  );
}
