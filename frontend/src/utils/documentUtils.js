import { API_ROOT, API_BASE_URL } from '../api/config';

/**
 * Generates a fully qualified URL to the secure document viewer endpoint,
 * appending the current JWT access token so that target="_blank" links
 * authenticate properly in new browser tabs without routing to the frontend SPA.
 */
export function getSecureDocumentUrl(docType, docId, fallbackPath = '') {
  const token = localStorage.getItem('access_token');

  if (docType && (docId !== undefined && docId !== null && docId !== '')) {
    const base = `${API_ROOT}/auth/documents/view/?type=${encodeURIComponent(docType)}&id=${encodeURIComponent(docId)}`;
    return token ? `${base}&token=${encodeURIComponent(token)}` : base;
  }

  if (fallbackPath) {
    let url = fallbackPath;
    if (url.startsWith('/api/')) {
      url = `${API_BASE_URL}${url}`;
    } else if (url.startsWith('/')) {
      url = `${API_BASE_URL}${url}`;
    } else if (!url.startsWith('http')) {
      url = `${API_ROOT}/${url.replace(/^\/+/, '')}`;
    }
    if (token && !url.includes('token=')) {
      url += `${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    }
    return url;
  }

  return '#';
}

/**
 * Attempts to fetch the document as a blob with Authorization header
 * and opens it via URL.createObjectURL(blob).
 * Synchronously opens a new window during the click gesture to avoid
 * popup-blockers, then sets location to blob URL or authenticated backend URL.
 */
export async function openSecureDocument(docType, docId, fallbackPath = '') {
  const fullUrl = getSecureDocumentUrl(docType, docId, fallbackPath);
  if (!fullUrl || fullUrl === '#') return false;

  // Open the tab synchronously during user click context to prevent browser popup blockers
  let newTab = null;
  try {
    newTab = window.open('about:blank', '_blank');
  } catch (e) {
    console.warn('Could not pre-open window:', e);
  }

  const token = localStorage.getItem('access_token');
  try {
    const res = await fetch(fullUrl, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (newTab && !newTab.closed) {
        newTab.location.href = blobUrl;
      } else {
        window.open(blobUrl, '_blank');
      }
      return true;
    } else {
      // If server returned non-200, redirect tab to the direct authenticated URL
      if (newTab && !newTab.closed) {
        newTab.location.href = fullUrl;
      } else {
        window.open(fullUrl, '_blank');
      }
      return true;
    }
  } catch (err) {
    console.warn('Direct blob fetch failed, falling back to authenticated URL navigation:', err);
    if (newTab && !newTab.closed) {
      newTab.location.href = fullUrl;
    } else {
      window.open(fullUrl, '_blank');
    }
    return true;
  }
}

