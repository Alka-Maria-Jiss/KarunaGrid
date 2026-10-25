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
 * Falls back to opening the authenticated URL directly in a new tab.
 */
export async function openSecureDocument(docType, docId, fallbackPath = '') {
  const fullUrl = getSecureDocumentUrl(docType, docId, fallbackPath);
  if (!fullUrl || fullUrl === '#') return false;

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
      window.open(blobUrl, '_blank');
      return true;
    }
  } catch (err) {
    console.warn('Direct blob fetch failed, navigating to authenticated URL:', err);
  }

  window.open(fullUrl, '_blank');
  return true;
}
