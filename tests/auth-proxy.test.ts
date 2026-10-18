import { describe, expect, it } from 'vitest';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config } from '../src/proxy';

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe('authentication proxy boundary', () => {
  it('lets public sign-in and challenge requests reach their handlers without refreshing a stale session', () => {
    for (const path of ['loaf', 'password', 'signup', 'reset-password']) {
      expect(matches(`/api/auth/${path}`)).toBe(false);
      expect(matches(`/api/auth/${path}?retry=1`)).toBe(false);
    }
  });
  it('still refreshes sessions for protected APIs, pages, and other auth routes', () => {
    for (const path of ['/api/world', '/profile', '/', '/api/auth/callback', '/api/auth/password-other']) {
      expect(matches(path)).toBe(true);
    }
  });
});
