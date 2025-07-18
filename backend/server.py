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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
try:
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'certificate_db')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    logger.info(f"Connected to MongoDB at {mongo_url}")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    logger.warning("Server will start but database operations will fail")
    client = None
    db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
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

# Generate QR Code
def generate_qr_code(verification_id: str, base_url: str = "https://68c73219-583a-46eb-b709-21483e91360f.preview.emergentagent.com") -> str:
    """Generate QR code for certificate verification"""
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
        
        qr_code = generate_qr_code(verification_id)
        return {"qr_code": qr_code, "verification_url": f"https://68c73219-583a-46eb-b709-21483e91360f.preview.emergentagent.com/verify/{verification_id}"}
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