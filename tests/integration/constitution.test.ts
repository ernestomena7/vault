import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Automated constitution compliance.
 *
 * These are the invariants that a reviewer would otherwise have to remember on
 * every change. They are cheap to check and expensive to lose:
 *
 *  - Principle I  — no route may ever accept file bytes.
 *  - Principle III — the Dropbox SDK stays behind one module boundary.
 *  - Principle IV  — no credential is ever returned to a browser.
 *  - Principle VI  — no hardcoded colours; design system tokens only.
 */

const SRC = path.resolve('src');

async function walk(dir: string, filter: (file: string) => boolean): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Synced verbatim from the design system — owned there, not here.
      if (entry.name === 'ds') continue;
      out.push(...(await walk(full, filter)));
    } else if (filter(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const isSource = (file: string) => /\.(ts|tsx)$/.test(file);

describe('Principle I — file bytes never reach the application', () => {
  it('no route handler accepts a multipart or binary body', async () => {
    const routes = (await walk(path.join(SRC, 'app'), isSource)).filter((file) =>
      file.endsWith(`route.ts`),
    );
    expect(routes.length).toBeGreaterThan(0);

    for (const route of routes) {
      const source = await readFile(route, 'utf8');
      const relative = path.relative(SRC, route);

      // request.formData() is how a file body would arrive.
      expect(source, `${relative} reads a form body`).not.toMatch(/\.formData\s*\(/);
      expect(source, `${relative} reads a raw body`).not.toMatch(/\.arrayBuffer\s*\(/);
      expect(source, `${relative} reads a body stream`).not.toMatch(/\.blob\s*\(/);
      expect(source, `${relative} declares multipart`).not.toMatch(/multipart\/form-data/);
    }
  });

  it('no server module writes an uploaded file to disk', async () => {
    const modules = await walk(path.join(SRC, 'lib'), isSource);
    for (const file of modules) {
      const source = await readFile(file, 'utf8');
      expect(source, `${path.relative(SRC, file)} writes to the filesystem`).not.toMatch(
        /createWriteStream|writeFileSync|fs\.writeFile\b/,
      );
    }
  });
});

describe('Principle III — one storage boundary', () => {
  it('the Dropbox SDK is imported only by the adapter', async () => {
    const modules = await walk(SRC, isSource);
    const offenders: string[] = [];

    for (const file of modules) {
      const relative = path.relative(SRC, file).replace(/\\/g, '/');
      if (relative.startsWith('lib/storage/dropbox/')) continue;

      const source = await readFile(file, 'utf8');
      if (/from ['"]dropbox['"]/.test(source)) offenders.push(relative);
    }

    // If this fails, the GCP migration just became a rewrite.
    expect(offenders).toEqual([]);
  });

  it('application code depends on the port, not on a concrete adapter', async () => {
    const routes = (await walk(path.join(SRC, 'app'), isSource)).filter((file) =>
      file.endsWith('route.ts'),
    );

    for (const route of routes) {
      const source = await readFile(route, 'utf8');
      expect(source, `${path.relative(SRC, route)} imports an adapter directly`).not.toMatch(
        /from ['"]@\/lib\/storage\/dropbox/,
      );
    }
  });
});

describe('Principle IV — credentials stay on the server', () => {
  it('no client component reads a secret from the environment', async () => {
    const components = await walk(SRC, isSource);

    for (const file of components) {
      const source = await readFile(file, 'utf8');
      if (!source.startsWith("'use client'")) continue;

      const relative = path.relative(SRC, file);
      expect(source, `${relative} reads process.env`).not.toMatch(
        /process\.env\.(DROPBOX|DATABASE|AUTH_SECRET)/,
      );
      expect(source, `${relative} imports the env module`).not.toMatch(/@\/lib\/config\/env/);
    }
  });

  it('the only credential any route returns is the scoped upload token', async () => {
    const routes = (await walk(path.join(SRC, 'app'), isSource)).filter((file) =>
      file.endsWith('route.ts'),
    );

    for (const route of routes) {
      const source = await readFile(route, 'utf8');
      const relative = path.relative(SRC, route).replace(/\\/g, '/');

      expect(source, `${relative} leaks a refresh token`).not.toMatch(/DROPBOX_REFRESH_TOKEN/);
      expect(source, `${relative} leaks the app secret`).not.toMatch(/DROPBOX_APP_SECRET/);
      expect(source, `${relative} leaks the database URL`).not.toMatch(/DATABASE_URL/);

      if (/uploadToken/.test(source)) {
        expect(relative, 'only the authorize route may return an upload token').toContain(
          'uploads/authorize',
        );
      }
    }
  });

  it('no route selects the password hash column', async () => {
    const routes = (await walk(path.join(SRC, 'app'), isSource)).filter((file) =>
      file.endsWith('route.ts'),
    );

    for (const route of routes) {
      const source = await readFile(route, 'utf8');
      // Writing a hash is fine; returning one is not.
      const returnsHash = /passwordHash/.test(source) && /NextResponse\.json\([^)]*passwordHash/.test(source);
      expect(returnsHash, `${path.relative(SRC, route)} returns a password hash`).toBe(false);
    }
  });
});

describe('Principle VI — design system tokens only', () => {
  it('no hardcoded hex colour appears in application code', async () => {
    const modules = await walk(SRC, isSource);
    const offenders: string[] = [];

    for (const file of modules) {
      const source = await readFile(file, 'utf8');
      const matches = source.match(/#[0-9a-fA-F]{3,8}\b/g);
      if (!matches) continue;

      // The theme-color meta tag is a browser chrome hint, not page styling,
      // and it has no token form.
      const meaningful = matches.filter((match) => !source.includes(`themeColor: '${match}'`));
      if (meaningful.length > 0) {
        offenders.push(`${path.relative(SRC, file)}: ${meaningful.join(', ')}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('the interface is English-only, with no locale machinery', async () => {
    const modules = await walk(SRC, isSource);

    for (const file of modules) {
      const source = await readFile(file, 'utf8');
      const relative = path.relative(SRC, file);
      expect(source, `${relative} introduces a translation layer`).not.toMatch(
        /useTranslation|i18n|next-intl|react-intl/,
      );
    }
  });
});
