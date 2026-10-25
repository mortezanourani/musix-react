import type { ScanStatus } from './LibraryContext';

/** One-line status shown under a page heading. */
export function libraryStatusMessage(
  status: ScanStatus,
  ready: string,
  idle = 'Update your library from the Settings page.',
): string {
  switch (status) {
    case 'restoring':
      return 'Restoring your library…';
    case 'scanning':
      return 'Scanning the Music directory…';
    case 'ready':
      return ready;
    case 'error':
      return 'Library update failed.';
    default:
      return idle;
  }
}

/** Message shown in place of an empty collection. */
export function libraryEmptyMessage(status: ScanStatus, ready: string): string {
  switch (status) {
    case 'restoring':
      return 'Restoring your library…';
    case 'scanning':
      return 'Scanning your music files…';
    case 'ready':
      return ready;
    case 'error':
      return 'Fix the library error and try again.';
    default:
      return 'Update your library from the Settings page to fill this page.';
  }
}
