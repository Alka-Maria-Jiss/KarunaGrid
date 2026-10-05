# KarunaGrid — Community Palliative Care Network

KarunaGrid coordinates community palliative care between patients, caregivers, doctors, and nurses with compassion, comfort, and dignity at home.

---

## Sign in with Google (Google Identity Services) Setup

KarunaGrid supports **Sign in with Google** for existing approved users (Patients, Doctors, Nurses, Caregivers, and Administrators).

### 1. Google Cloud Console Configuration

To enable Google Sign-In for development:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing project.
3. Navigate to **APIs & Services** > **OAuth consent screen**:
   - Select **External** (or Internal for Google Workspace).
   - Fill in the App name (e.g., `KarunaGrid`), User support email, and Developer contact information.
   - Add scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`.
4. Navigate to **APIs & Services** > **Credentials**:
   - Click **Create Credentials** > **OAuth client ID**.
   - Choose **Web application** as the application type.
   - Under **Authorized JavaScript origins**, add:
     - `http://localhost:5173`
     - `http://127.0.0.1:5173`
     - (Add production frontend URL when deploying to production)
   - Click **Create** and copy the generated **Client ID**.

### 2. Environment Variables

Add the Google OAuth Client ID to your `.env` file:

```env
# Backend Google Token Verification
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Frontend Google Identity Services Client
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

> **Note**: The client ID is public and safe to expose in the frontend (`VITE_GOOGLE_CLIENT_ID`). Never expose or commit a Client Secret.

---

## Authentication Flow

```text
1. User clicks "Sign in with Google" on /login
2. Google Identity Services (GIS) UI authenticates Google account
3. Frontend receives Google ID token credential
4. Frontend sends POST /api/auth/google/ { credential }
5. Backend verifies token signature, audience, issuer, expiration, and verified email status
6. Backend matches verified email to existing KarunaGrid User (case-insensitive)
7. Backend verifies account active status and role-specific approval requirements
8. Backend generates standard SimpleJWT tokens (access & refresh)
9. Frontend stores JWT tokens and redirects to the appropriate role dashboard
```

---

## Running the Application

### Backend (Django)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Run system check
python manage.py check

# Run tests
python manage.py test --settings=test_settings

# Start development server
python manage.py runserver 8000
```

### Frontend (React + Vite)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build

# Run linter
npm run lint
```

