import { describe, it, expect } from 'vitest';
import {
  GITHUB_DMCA_POLICY_URL,
  STATOR_ISSUES_URL,
  STATOR_LICENSE_URL,
  STATOR_RELEASES_URL,
  STATOR_REPO_URL,
  STATOR_SECURITY_URL,
  STATOR_THIRD_PARTY_NOTICES_URL,
  legalRouteToPath,
  parseLegalRoute,
} from '../lib/links.ts';

describe('legal routing and repository links', () => {
  it('parses /privacy, /terms, /dmca, /copyright, and legacy #dmca-notice routes accurately', () => {
    expect(parseLegalRoute('/')).toBe('none');
    expect(parseLegalRoute('/privacy')).toBe('privacy');
    expect(parseLegalRoute('/privacy/')).toBe('privacy');
    expect(parseLegalRoute('/terms')).toBe('terms');
    expect(parseLegalRoute('/terms', '#dmca-notice')).toBe('dmca');
    expect(parseLegalRoute('/dmca')).toBe('dmca');
    expect(parseLegalRoute('/copyright')).toBe('dmca');
    expect(parseLegalRoute('/unknown')).toBe('none');
  });

  it('maps legal routes back to canonical paths', () => {
    expect(legalRouteToPath('none')).toBe('/');
    expect(legalRouteToPath('privacy')).toBe('/privacy');
    expect(legalRouteToPath('terms')).toBe('/terms');
    expect(legalRouteToPath('dmca')).toBe('/dmca');
  });

  it('exposes valid AYYU945/Stator and GitHub DMCA policy URLs', () => {
    expect(STATOR_REPO_URL).toBe('https://github.com/AYYU945/Stator');
    expect(STATOR_LICENSE_URL).toBe('https://github.com/AYYU945/Stator/blob/main/LICENSE');
    expect(STATOR_THIRD_PARTY_NOTICES_URL).toBe(
      'https://github.com/AYYU945/Stator/blob/main/THIRD_PARTY_NOTICES.md'
    );
    expect(STATOR_SECURITY_URL).toBe('https://github.com/AYYU945/Stator/blob/main/SECURITY.md');
    expect(STATOR_ISSUES_URL).toBe('https://github.com/AYYU945/Stator/issues/new/choose');
    expect(STATOR_RELEASES_URL).toBe('https://github.com/AYYU945/Stator/releases');
    expect(GITHUB_DMCA_POLICY_URL).toMatch(/^https:\/\/docs\.github\.com\//);
  });
});
