from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
import qrcode
from io import BytesIO
import base64
import json
from contextlib import asynccontextmanager
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection with fallback
client = None
db = None

async def connect_to_mongodb():
    global client, db
    try:
        mongo_url = os.environ.get('MONGO_URL')
        db_name = os.environ.get('DB_NAME', 'certificate_db')
        
        if not mongo_url:
            raise Exception("MONGO_URL environment variable not set")
        
        logger.info("Connecting to MongoDB Atlas...")
        # Add SSL configuration for Cloud Run compatibility
        client = AsyncIOMotorClient(
            mongo_url, 
            serverSelectionTimeoutMS=30000,
            tlsAllowInvalidCertificates=True
        )
        await client.admin.command('ping')
        db = client[db_name]
        logger.info(f"✅ Connected to MongoDB Atlas: {db_name}")
        return True
        
    except Exception as e:
        logger.error(f"MongoDB Atlas connection failed: {e}")
        logger.error("Server will start but database operations will fail")
        if client:
            client.close()
        client = None
        db = None
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongodb()
    yield
    # Shutdown
    if client:
        client.close()

# Create the main app without a prefix
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Certificate Models
class CertificateCreate(BaseModel):
    intern_name: str
    role: str
    duration: str
    mode: str  # online/offline
    start_date: str
    end_date: str

class Certificate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    verification_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    intern_name: str
    role: str
    duration: str
    mode: str
    start_date: str
    end_date: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    issued_by: str = "A Siddarth Reddy"
    issued_by_title: str = "Chief Technology Officer"
    company: str = "DNOT Technologies"

class CertificateVerification(BaseModel):
    verification_id: str
    is_valid: bool
    certificate_data: Optional[Certificate] = None
    message: str

# User Models
class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    full_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserResponse(BaseModel):
    id: str
    username: str
    full_name: str
    created_at: datetime
    is_active: bool

# Helper functions
def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == password_hash

# Generate QR Code
def generate_qr_code(verification_id: str, base_url: str = None) -> str:
    """Generate QR code for certificate verification"""
    if base_url is None:
        base_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    verification_url = f"{base_url}/verify/{verification_id}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "DNOT Technologies Certificate System"}

@api_router.get("/ip")
async def get_ip():
    """Get the outbound IP address of this Cloud Run service"""
    import requests
    try:
        response = requests.get('https://api.ipify.org?format=json', timeout=5)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

# Authentication Endpoints
@api_router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """Register a new user (admin only endpoint)"""
    try:
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if username already exists
        existing_user = await db.users.find_one({"username": user_data.username})
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Create user
        user_dict = user_data.model_dump()
        user_dict["password_hash"] = hash_password(user_dict.pop("password"))
        user = User(**user_dict)
        
        # Store in database
        await db.users.insert_one(user.model_dump())
        
        return UserResponse(**user.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@api_router.post("/login")
async def login_user(login_data: UserLogin):
    """Login user"""
    try:
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Find user
        user_doc = await db.users.find_one({"username": login_data.username})
        if not user_doc:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        user = User(**user_doc)
        
        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(status_code=401, detail="User account is disabled")
        
        return {
            "message": "Login successful",
            "user": UserResponse(**user.model_dump()).model_dump()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during login: {str(e)}")

@api_router.post("/create-admin")
async def create_admin_user():
    """Create default admin user if no users exist"""
    try:
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if any users exist
        existing_users = await db.users.count_documents({})
        if existing_users > 0:
            raise HTTPException(status_code=400, detail="Admin user already exists")
        
        # Create default admin user
        admin_data = {
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "full_name": "System Administrator"
        }
        admin = User(**admin_data)
        
        # Store in database
        await db.users.insert_one(admin.model_dump())
        
        return {"message": "Admin user created successfully", "username": "admin", "password": "admin123"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating admin user: {str(e)}")

@api_router.post("/certificates", response_model=Certificate)
async def create_certificate(certificate_data: CertificateCreate):
    """Create a new certificate"""
    try:
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Create certificate object
        cert_dict = certificate_data.model_dump()
        certificate = Certificate(**cert_dict)
        
        # Store in database
        await db.certificates.insert_one(certificate.model_dump())
        
        return certificate
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating certificate: {str(e)}")

@api_router.get("/certificates/{certificate_id}", response_model=Certificate)
async def get_certificate(certificate_id: str):
    """Get certificate by ID"""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    certificate = await db.certificates.find_one({"id": certificate_id})
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return Certificate(**certificate)

@api_router.get("/certificates", response_model=List[Certificate])
async def get_all_certificates():
    """Get all certificates"""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    certificates = await db.certificates.find().to_list(1000)
    return [Certificate(**cert) for cert in certificates]

@api_router.get("/verify/{verification_id}")
async def verify_certificate(verification_id: str):
    """Verify certificate by verification ID"""
    try:
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        certificate = await db.certificates.find_one({"verification_id": verification_id})
        
        if certificate:
            return CertificateVerification(
                verification_id=verification_id,
                is_valid=True,
                certificate_data=Certificate(**certificate),
                message="Certificate is valid and verified"
            )
        else:
            return CertificateVerification(
                verification_id=verification_id,
                is_valid=False,
                certificate_data=None,
                message="Certificate not found or invalid"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying certificate: {str(e)}")

@api_router.post("/generate-qr/{verification_id}")
async def generate_certificate_qr(verification_id: str):
    """Generate QR code for certificate verification"""
    try:
        if db is None:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Check if certificate exists
        certificate = await db.certificates.find_one({"verification_id": verification_id})
        if not certificate:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        qr_code = generate_qr_code(verification_id)
        return {"qr_code": qr_code, "verification_url": f"{frontend_url}/verify/{verification_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating QR code: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)