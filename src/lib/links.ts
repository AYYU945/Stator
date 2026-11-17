export const STATOR_REPO_URL = 'https://github.com/AYYU945/Stator';
export const STATOR_REPO_GIT_URL = 'https://github.com/AYYU945/Stator.git';
export const STATOR_LICENSE_URL = 'https://github.com/AYYU945/Stator/blob/main/LICENSE';
export const STATOR_THIRD_PARTY_NOTICES_URL =
  'https://github.com/AYYU945/Stator/blob/main/THIRD_PARTY_NOTICES.md';
export const STATOR_SECURITY_URL = 'https://github.com/AYYU945/Stator/blob/main/SECURITY.md';
export const STATOR_SECURITY_ADVISORIES_URL =
  'https://github.com/AYYU945/Stator/security/advisories';
export const STATOR_ISSUES_URL = 'https://github.com/AYYU945/Stator/issues/new/choose';
export const STATOR_RELEASES_URL = 'https://github.com/AYYU945/Stator/releases';
export const STATOR_MAINTAINER = 'AYYU945';
export const STATOR_MAINTAINER_URL = 'https://github.com/AYYU945';
export const GITHUB_DMCA_POLICY_URL =
  'https://docs.github.com/en/site-policy/copyright-and-dmca-takedown-policy/dmca-takedown-policy';

export type LegalRoute = 'none' | 'privacy' | 'terms' | 'dmca';

export function parseLegalRoute(pathname: string, hash: string = ''): LegalRoute {
  const cleanPath = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
  const cleanHash = (hash || '').toLowerCase();

  if (cleanPath === '/privacy') return 'privacy';
  if (cleanPath === '/dmca' || cleanPath === '/copyright') return 'dmca';
  if (cleanPath === '/terms') {
    if (cleanHash === '#dmca-notice' || cleanHash === '#copyright') return 'dmca';
    return 'terms';
  }
  return 'none';
}

export function legalRouteToPath(route: LegalRoute): string {
  switch (route) {
    case 'privacy':
      return '/privacy';
    case 'terms':
      return '/terms';
    case 'dmca':
      return '/dmca';
    default:
      return '/';
  }
}
