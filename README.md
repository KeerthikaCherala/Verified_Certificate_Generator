# DNOT Technologies Certificate Generator

A full-stack certificate generation and verification system with authentication.

## 🏗️ **Architecture**

- **Backend**: FastAPI + MongoDB (Python)
- **Frontend**: React + Tailwind CSS
- **Database**: MongoDB Atlas (with local fallback)
- **Authentication**: Simple username/password with localStorage

## 🚀 **Getting Started**

### **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
python server.py
```

### **Frontend Setup**
```bash
cd frontend
npm install
npm start
```

### **Initial Admin User**
Create the first admin user:
```bash
curl -X POST http://localhost:8000/api/create-admin
```
Default credentials: `admin` / `admin123`

## 📚 **API Endpoints**

### **Authentication**
- `POST /api/create-admin` - Create initial admin user (only works if no users exist)
- `POST /api/login` - Login with username/password
- `POST /api/register` - Create new admin user

**Register new admin example:**
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "manager",
    "password": "password123", 
    "full_name": "Manager Name"
  }'
```

### **Certificates**
- `POST /api/certificates` - Create new certificate (protected)
- `GET /api/certificates` - Get all certificates
- `GET /api/certificates/{id}` - Get specific certificate
- `GET /api/verify/{verification_id}` - Verify certificate (public)
- `POST /api/generate-qr/{verification_id}` - Generate QR code

## 🎯 **User Flow**

### **Public Access (No Login Required)**
1. **Home Page** (`/`) - Landing page with navigation
2. **Certificate Verification** (`/verify/{id}`) - Anyone can verify certificates
   - Enter verification ID or scan QR code
   - Shows certificate details and visual certificate
   - Download certificate as PNG

### **Admin Access (Login Required)**
1. **Admin Login** (`/login`) - Dark themed login form
2. **Certificate Creation** (`/create`) - Protected route
   - Fill out intern details (name, role, duration, dates)
   - Generate certificate with logo, signature, QR code
   - Download certificate as PNG
   - Get verification ID for sharing

## 🔐 **Authentication System**

### **How It Works**
- **MongoDB Storage**: Users stored in `users` collection
- **Password Hashing**: SHA-256 for security
- **Session Management**: localStorage in frontend
- **Protected Routes**: Automatic redirect to login if not authenticated

### **User Management**
- All users have same permissions (can create certificates)
- Use `/api/register` to create additional admin users
- No role-based access control (all admins)

### **Frontend Auth Context**
```javascript
const { user, login, logout } = useAuth();

// Check if logged in
if (user) {
  // Show admin features
}

// Login
const result = await login(username, password);
if (result.success) {
  // Redirect to certificate creation
}

// Logout
logout(); // Clears localStorage and redirects
```

## 🎨 **Frontend Components**

### **Main Components**
- `Home` - Landing page with navigation
- `Login` - Dark themed authentication form
- `CertificateCreator` - Protected certificate generation
- `CertificateVerification` - Public certificate verification
- `ProtectedRoute` - Authentication wrapper

### **Auth Context**
- `AuthProvider` - Wraps entire app
- `useAuth()` - Hook for auth state/functions
- Auto-login from localStorage on app start
- Automatic redirect handling

## 🛠️ **Database Schema**

### **Users Collection**
```javascript
{
  id: "uuid",
  username: "string",
  password_hash: "sha256_hash", 
  full_name: "string",
  created_at: "datetime",
  is_active: true
}
```

### **Certificates Collection**
```javascript
{
  id: "uuid",
  verification_id: "uuid", 
  intern_name: "string",
  role: "string",
  duration: "string",
  mode: "online/offline",
  start_date: "YYYY-MM-DD",
  end_date: "YYYY-MM-DD",
  created_at: "datetime",
  issued_by: "A Siddarth Reddy",
  issued_by_title: "Chief Technology Officer",
  company: "DNOT Technologies"
}
```

## 🔧 **Configuration**

### **Backend (.env)**
```
MONGO_URL="mongodb+srv://..."
DB_NAME="certificate_db"
FRONTEND_URL="http://localhost:3000"
```

### **Frontend (.env)**
```
REACT_APP_BACKEND_URL="http://localhost:8000"
```

## 🌐 **Next.js Migration**

This code is ready for Next.js with these changes:

### **File Structure**
```
pages/
  index.js          // Home (public)
  login.js          // Login (public)  
  create.js         // Certificate creation (protected)
  verify/[id].js    // Verification (public)

pages/api/
  login.js          // Auth endpoints
  register.js
  certificates.js   // Certificate CRUD

components/
  AuthContext.js    // Auth context
  ProtectedRoute.js // Route protection
```

### **Key Changes for Next.js**
1. Move API endpoints to `pages/api/`
2. Use Next.js routing instead of React Router
3. Move auth context to `_app.js`
4. Convert components to Next.js pages

## 🧪 **Testing**

### **Test Certificate Creation**
1. Access home page (`http://localhost:3000`)
2. Click "Admin Login" 
3. Login with `admin` / `admin123`
4. Fill out certificate form
5. Generate and download certificate

### **Test Certificate Verification**
1. Use verification ID from generated certificate
2. Go to home page, click "Verify Certificate"
3. Enter verification ID
4. View certificate details and download

### **API Testing**
```bash
# Create certificate
curl -X POST http://localhost:8000/api/certificates \
  -H "Content-Type: application/json" \
  -d '{
    "intern_name": "John Doe",
    "role": "Software Developer Intern",
    "duration": "3 months", 
    "mode": "online",
    "start_date": "2024-01-01",
    "end_date": "2024-03-31"
  }'

# Verify certificate  
curl http://localhost:8000/api/verify/{verification_id}
```

## 📝 **Notes**

- **MongoDB Atlas**: Cloud database for team collaboration
- **Certificate Design**: Professional layout with logo, signature, QR code
- **Dark Theme**: Modern UI for verification pages
- **Mobile Responsive**: Works on all devices
- **Security**: Basic but effective for internal use
- **Extensible**: Easy to add features like user roles, certificate templates, etc.