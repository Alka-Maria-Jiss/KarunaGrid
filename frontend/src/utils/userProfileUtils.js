/**
 * Utilities for extracting, formatting, and presenting user profile information
 * across all roles (Administrator, Doctor, Nurse, Caregiver, Patient) in KarunaGrid.
 */

/**
 * Extracts and formats the user's actual full name from any user, role, or profile object.
 * Correctly combines first_name/last_name, handles role-specific profiles, and cleans prefixes.
 *
 * @param {Object} user - The user or profile object.
 * @param {string} [roleOverride] - Optional role if known.
 * @returns {string} The formatted full name.
 */
export function getUserFullName(user, roleOverride) {
  let rawName = '';

  // 1. If user object is passed, inspect direct properties
  if (user && typeof user === 'object') {
    // 1a. Check separate first_name and last_name
    const first = typeof user.first_name === 'string' ? user.first_name.trim() : '';
    const last = typeof user.last_name === 'string' ? user.last_name.trim() : '';
    if (first || last) {
      rawName = [first, last].filter(Boolean).join(' ');
    }

    // 1b. Direct name properties
    if (!rawName && typeof user.name === 'string' && user.name.trim()) {
      rawName = user.name.trim();
    }
    if (!rawName && typeof user.full_name === 'string' && user.full_name.trim()) {
      rawName = user.full_name.trim();
    }
    if (!rawName && typeof user.doctor_name === 'string' && user.doctor_name.trim()) {
      rawName = user.doctor_name.trim();
    }
    if (!rawName && typeof user.nurse_name === 'string' && user.nurse_name.trim()) {
      rawName = user.nurse_name.trim();
    }
    if (!rawName && typeof user.display_name === 'string' && user.display_name.trim()) {
      rawName = user.display_name.trim();
    }

    // 1c. Nested profile objects
    if (!rawName && user.details && typeof user.details.name === 'string' && user.details.name.trim()) {
      rawName = user.details.name.trim();
    }
    if (!rawName && user.doctor_info && typeof user.doctor_info.name === 'string' && user.doctor_info.name.trim()) {
      rawName = user.doctor_info.name.trim();
    }
    if (!rawName && user.nurse_info && typeof user.nurse_info.name === 'string' && user.nurse_info.name.trim()) {
      rawName = user.nurse_info.name.trim();
    }
    if (!rawName && user.patient_info && typeof user.patient_info.name === 'string' && user.patient_info.name.trim()) {
      rawName = user.patient_info.name.trim();
    }
    if (!rawName && user.caregiver_info && typeof user.caregiver_info.name === 'string' && user.caregiver_info.name.trim()) {
      rawName = user.caregiver_info.name.trim();
    }
    if (!rawName && user.administrator && typeof user.administrator.name === 'string' && user.administrator.name.trim()) {
      rawName = user.administrator.name.trim();
    }
    if (!rawName && user.doctor && typeof user.doctor.name === 'string' && user.doctor.name.trim()) {
      rawName = user.doctor.name.trim();
    }
    if (!rawName && user.nurse && typeof user.nurse.name === 'string' && user.nurse.name.trim()) {
      rawName = user.nurse.name.trim();
    }
    if (!rawName && user.caregiver && typeof user.caregiver.name === 'string' && user.caregiver.name.trim()) {
      rawName = user.caregiver.name.trim();
    }
    if (!rawName && user.patient && typeof user.patient.name === 'string' && user.patient.name.trim()) {
      rawName = user.patient.name.trim();
    }
  }

  // 2. If rawName is still missing, fallback to localStorage user_info
  if (!rawName && typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('user_info');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.name === 'string' && parsed.name.trim()) {
            rawName = parsed.name.trim();
          } else if (parsed.details && typeof parsed.details.name === 'string' && parsed.details.name.trim()) {
            rawName = parsed.details.name.trim();
          } else if (typeof parsed.full_name === 'string' && parsed.full_name.trim()) {
            rawName = parsed.full_name.trim();
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const role = (
    roleOverride ||
    (user && typeof user === 'object' && user.role) ||
    ''
  ).toLowerCase();

  // 3. If rawName is still missing, check email
  if (!rawName) {
    const emailCandidate =
      (user && typeof user === 'object' && typeof user.email === 'string' && user.email) || '';
    if (emailCandidate) {
      const localPart = emailCandidate.split('@')[0].replace(/[._-]+/g, ' ').trim();
      if (localPart && localPart.toLowerCase() !== 'doctor' && localPart.toLowerCase() !== 'nurse' && localPart.toLowerCase() !== 'admin') {
        rawName = localPart
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
    }
  }

  // Role-specific formatting
  if (role === 'doctor') {
    if (!rawName) return 'Doctor';
    const lower = rawName.toLowerCase();
    if (lower === 'doctor' || lower === 'dr' || lower === 'dr.') return 'Doctor';
    if (lower.startsWith('dr.')) return rawName;
    if (lower.startsWith('dr ')) return rawName.replace(/^dr\s+/i, 'Dr. ');
    return `Dr. ${rawName}`;
  }

  if (role === 'nurse') {
    if (!rawName) return 'Nurse';
    // Remove any leading "Nurse " prefix so we show their personal full name (e.g., "Mary Joseph")
    return rawName.replace(/^nurse\s+/i, '').trim() || 'Nurse';
  }

  if (role === 'admin' || role === 'administrator') {
    return rawName || 'System Administrator';
  }

  if (role === 'caregiver') {
    return rawName || 'Caregiver';
  }

  if (role === 'patient') {
    return rawName || 'Patient';
  }

  return rawName || (user && typeof user.email === 'string' ? user.email.split('@')[0] : 'User');
}

/**
 * Computes uppercase two-letter initials from a user's full name.
 * Ignores honorifics like "Dr.", "Dr", "Nurse", "Mr.", etc.
 *
 * Examples:
 * - "Mary Joseph" -> "MJ"
 * - "Dr. Anjali Thomas" -> "AT"
 * - "Dr. Abraham Mathew" -> "AM"
 * - "Anna George" -> "AG"
 * - "Thomas Varghese" -> "TV"
 * - "John Mathew" -> "JM"
 * - "Adhil" -> "AD"
 *
 * @param {string} name - The user's name.
 * @param {string} [fallback='KG'] - Fallback initials if name is missing.
 * @returns {string} 2-letter uppercase initials.
 */
export function getAvatarInitials(name, fallback = 'KG') {
  if (!name || typeof name !== 'string') return fallback;

  // Strip prefixes like Dr., Nurse, etc.
  const cleaned = name.replace(/^(dr\.|dr|nurse|mr\.|mr|mrs\.|mrs|ms\.|ms)\s+/i, '').trim();
  if (!cleaned) return fallback;

  // If the cleaned string is just "Doctor" or "Nurse", return standardized 2-letter role initial
  if (cleaned.toLowerCase() === 'doctor') return 'DR';
  if (cleaned.toLowerCase() === 'nurse') return 'NR';

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const firstChar = parts[0].charAt(0);
    const lastChar = parts[parts.length - 1].charAt(0);
    return (firstChar + lastChar).toUpperCase();
  }

  if (parts.length === 1) {
    const word = parts[0];
    if (word.length >= 2) {
      return word.slice(0, 2).toUpperCase();
    }
    return word.charAt(0).toUpperCase();
  }

  return fallback;
}

/**
 * Returns the standardized role label for the header profile section.
 *
 * @param {string} role - The role string.
 * @returns {string} The human-readable role label.
 */
export function getRoleDisplayLabel(role) {
  const r = (role || '').toLowerCase();
  switch (r) {
    case 'admin':
    case 'administrator':
      return 'System Administrator';
    case 'doctor':
      return 'Doctor';
    case 'nurse':
      return 'Nurse';
    case 'caregiver':
      return 'Caregiver';
    case 'patient':
      return 'Patient';
    default:
      return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';
  }
}
