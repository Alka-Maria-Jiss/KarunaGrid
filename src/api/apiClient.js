const DEFAULT_BASE_URL = 'http://127.0.0.1:8000/api';

class ApiClientError extends Error {
  constructor(message, status = null, data = null) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Sanitizes technical API/network errors into friendly, branded messages.
 * Logs actual technical details to console.error for developer debugging.
 */
function sanitizeError(error, responseData = null, status = null) {
  // Log real technical error for developer DevTools inspection
  console.error('[KarunaGrid API Error Log]:', {
    status,
    technicalError: error,
    responseData,
  });

  if (status === 400) {
    if (responseData && responseData.errors) {
      return new ApiClientError('Validation error', 400, responseData);
    }
    return new ApiClientError(
      responseData?.detail || 'Please check the information provided and try again.',
      400,
      responseData
    );
  }

  if (status === 401) {
    return new ApiClientError(
      'Your session has expired. Please log in again.',
      401,
      responseData
    );
  }

  if (status === 403) {
    const detailMsg = responseData?.detail || 'Access restricted. Please contact your care administrator.';
    return new ApiClientError(detailMsg, 403, responseData);
  }

  if (status === 404) {
    return new ApiClientError(
      "We couldn't find what you were looking for.",
      404,
      responseData
    );
  }

  if (status === 429) {
    return new ApiClientError(
      'Too many attempts. Please wait a moment and try again.',
      429,
      responseData
    );
  }

  if (status >= 500) {
    return new ApiClientError(
      'Something went wrong on our end. Please try again in a moment.',
      status,
      responseData
    );
  }

  // Network offline / connection failed / CORS / failed to fetch
  return new ApiClientError(
    'Something went wrong on our end. Please try again in a moment.',
    null,
    responseData
  );
}

export const apiClient = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');
    const headers = { ...options.headers };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Do not set Content-Type if payload is FormData (browser will auto-set boundary)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const url = endpoint.startsWith('http') ? endpoint : `${DEFAULT_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, { ...options, headers });
      let data = null;

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { detail: text } : null;
      }

      if (!response.ok) {
        throw sanitizeError(new Error(`HTTP ${response.status}`), data, response.status);
      }

      return data;
    } catch (err) {
      if (err instanceof ApiClientError) {
        throw err;
      }
      throw sanitizeError(err, null, null);
    }
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  put(endpoint, body, options = {}) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },
};

export default apiClient;
