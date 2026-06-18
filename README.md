# Dental Health App Backend

Backend for the Dental Web Application, built with Node.js, Express, Firebase, and YOLOv8 following an accelerated development timeline on free-tier infrastructure.

## Frameworks, APIs, Libraries, and Dependencies

This project relies on the following core technologies:

- **Node.js & Express** - Core framework and routing for the backend API.
- **Firebase Admin SDK** - Authentication and serverless document database (Firestore).
- **Cloudinary** - External image hosting for secure storage of original and annotated user images.
- **YOLOv8** - Machine learning model used for dental condition inference and annotation.
- **Zod** - Payload and schema validation gateway.
- **Jest & Supertest** - Comprehensive testing framework and HTTP assertion library for API endpoints.
- **Swagger UI (OpenAPI 3.0)** - Interactive API documentation.

## Project Structure

```text
Dental-Health-App-API/
├── server/                             # Backend application source code
│   ├── config/                         # Firebase Admin SDK & Cloudinary config
│   ├── middleware/                     # Global auth, errors, and upload middleware
│   ├── mocks/                          # Mock implementations (e.g., mock ML endpoint)
│   ├── routes/                         # Strict REST API route handlers (/api/v1/...)
│   ├── schemas/                        # Zod Data validation schemas
│   ├── services/                       # Firestore database operations
│   ├── tests/                          # Comprehensive Jest test suite
│   ├── app.js                          # Main Express app (orchestrates routes)
│   ├── server.js                       # Entry point to start the server
│   └── swagger.json                    # OpenAPI 3.0 specification file
└── [Configuration Files]               # package.json, .env, eslint.config.js, etc.
```

## Setup Instructions

### Prerequisites

- **Node.js**: v18 or higher

### 1. Install dependencies

```sh
npm install
```

### 2. Environment Variables

Create `.env` at the root with your Firebase Admin, Firebase Client, and Cloudinary credentials:

```text
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Web SDK (client)
FIREBASE_API_KEY=your-web-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id

# Cloudinary Image Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 3. Run the server

```sh
npm run dev
```

Navigate to `http://localhost:3000/api-docs` to view the interactive API documentation.

### 4. Run tests

```sh
npm test
npm run lint
```

## API Endpoints (v1)

This API strictly follows RESTful principles under the `/api/v1/` namespace. Authentication is handled via secure **HTTP-Only cookies**.

_(Note: Frontend clients must use `withCredentials: true` in Axios or `credentials: 'include'` in Fetch)._

### User Authentication

| Method | Endpoint                             | Description                      | Auth Required |
| ------ | ------------------------------------ | -------------------------------- | ------------- |
| POST   | `/api/v1/auth/users/register`        | Register a new user              | No            |
| POST   | `/api/v1/auth/users/login`           | Login user (Sets `token` cookie) | No            |
| POST   | `/api/v1/auth/users/logout`          | Logout user (Clears cookie)      | Yes           |
| POST   | `/api/v1/auth/users/forgot-password` | Initiate password reset flow     | No            |

### Admin Authentication

| Method | Endpoint                       | Description                       | Auth Required |
| ------ | ------------------------------ | --------------------------------- | ------------- |
| POST   | `/api/v1/auth/admins/register` | Register a new admin              | No            |
| POST   | `/api/v1/auth/admins/login`    | Login admin (Sets `token` cookie) | No            |
| POST   | `/api/v1/auth/admins/logout`   | Logout admin (Clears cookie)      | Yes (Admin)   |

### Dental Images

| Method | Endpoint                         | Description                        | Auth Required |
| ------ | -------------------------------- | ---------------------------------- | ------------- |
| POST   | `/api/v1/dental-images`          | Upload image for ML gatekeeper     | Yes           |
| GET    | `/api/v1/dental-images`          | Get logged-in user's image history | Yes           |
| GET    | `/api/v1/dental-images/:imageId` | Get specific dental image details  | Yes           |

### Admin Management (Admins)

| Method | Endpoint             | Description               | Auth Required |
| ------ | -------------------- | ------------------------- | ------------- |
| GET    | `/api/v1/admins`     | Get list of all admins    | Yes (Admin)   |
| PUT    | `/api/v1/admins/:id` | Update an admin's details | Yes (Admin)   |
| DELETE | `/api/v1/admins/:id` | Delete an admin account   | Yes (Admin)   |

### Admin Management (Users)

| Method | Endpoint                              | Description                        | Auth Required |
| ------ | ------------------------------------- | ---------------------------------- | ------------- |
| GET    | `/api/v1/users`                       | Get list of all users              | Yes (Admin)   |
| GET    | `/api/v1/users/stats`                 | Get user statistics                | Yes (Admin)   |
| PATCH  | `/api/v1/users/:userId/status`        | Update user status                 | Yes (Admin)   |
| DELETE | `/api/v1/users/:userId`               | Delete a user account              | Yes (Admin)   |
| GET    | `/api/v1/users/:userId/dental-images` | View specific user's image history | Yes (Admin)   |

### System

| Method | Endpoint         | Description                 | Auth Required |
| ------ | ---------------- | --------------------------- | ------------- |
| GET    | `/api/v1/health` | Basic health check endpoint | No            |

## Interactive Documentation (Swagger UI)

The backend features an interactive OpenAPI (Swagger) interface.
When the server is running, navigate to `http://localhost:3000/api-docs` to view payload schemas, expected responses, and test the endpoints directly from your browser.

## Security & Guardrails

- **Authentication Flexibility**: Supports both secure **HTTP-Only Cookies** (protecting JWT tokens from client-side JavaScript) and **Bearer Tokens** via the `Authorization` header for versatile client support.
- **Two-Tier Middleware Protection**: `verifyFirebaseToken` handles global authentication, while `verifyAdmin` strictly protects administrative endpoints via fast Firestore lookups.
- **Granular Rate Limiting**: Protects against brute-force attacks and API abuse using `express-rate-limit`:
  - **Global**: 100 requests per 15 minutes.
  - **Authentication**: 5 requests per 5 minutes.
  - **ML Inference**: 50 requests per 15 minutes.
- **Strict CORS Policy**: Disables wildcard origins. Dynamically allows requests from local development (`http://localhost:5173`, `http://localhost:3000`), configured production environments via `FRONTEND_URL`, and any Vercel or Render (`.onrender.com`) deployments.
- **No Local Disk Storage**: Images are handled as in-memory buffers and streamed to Cloudinary to support free-tier PaaS deployments (Render).
- **Zod Gateway**: All incoming payload data is strictly validated before interacting with Firestore.
- **Database Optimization**: ML Results are embedded directly inside `dental_images` documents to drastically reduce Firestore read/write operations.

## Testing Status

The application currently has **110 passing tests** covering:

- **Input Validation**: Email format, strict password length, demographics.
- **Schema Validation**: Zod boundaries and enum constraints.
- **Middleware**: Firebase token verification, edge cases, and Admin authorization.
- **Routes**: REST compliance and error formatting.
- **Firebase Integration**: Admin SDK connection and strict security rules.
