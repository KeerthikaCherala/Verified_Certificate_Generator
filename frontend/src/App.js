import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/login`, { username, password });
      const userData = response.data.user;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Certificate Creation Component
const CertificateCreator = () => {
  const [formData, setFormData] = useState({
    intern_name: '',
    role: '',
    duration: '',
    mode: 'online',
    start_date: '',
    end_date: ''
  });
  const [certificate, setCertificate] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);

  const roles = [
    'Frontend Intern',
    'Backend Intern',
    'Marketing Strategist',
    'Full Stack Developer Intern',
    'UI/UX Designer Intern',
    'Data Analyst Intern',
    'DevOps Intern',
    'Content Writer Intern'
  ];

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const generateCertificate = async () => {
    setLoading(true);
    try {
      // Create certificate in backend
      const response = await axios.post(`${API}/certificates`, formData);
      setCertificate(response.data);
      
      // Generate QR code
      const qrResponse = await axios.post(`${API}/generate-qr/${response.data.verification_id}`);
      setQrCode(qrResponse.data.qr_code);
      
      // Generate certificate image
      setTimeout(() => {
        drawCertificate(response.data, qrResponse.data.qr_code);
      }, 100);
      
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Error generating certificate');
    } finally {
      setLoading(false);
    }
  };

  const drawCertificate = (certData, qrCodeData) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    // Add green ribbon (top right)
    ctx.fillStyle = '#10b981';
    ctx.fillRect(canvas.width - 100, 0, 100, 100);
    
    // Load images and draw certificate
    const logoImg = new Image();
    const signatureImg = new Image();
    let imagesLoaded = 0;
    const totalImages = 2 + (qrCodeData ? 1 : 0);
    let qrImg = null;
    
    const drawCertificateContent = () => {
      // Draw logo
      const logoWidth = 120;
      const logoHeight = (logoWidth * logoImg.height) / logoImg.width;
      ctx.drawImage(logoImg, 50, 30, logoWidth, logoHeight);
      
      // Certificate title
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Certificate of Completion', canvas.width / 2, 160);
      
      // "This certificate awarded to:" text
      ctx.font = '16px Arial';
      ctx.fillText('This certificate awarded to:', canvas.width / 2, 200);
      
      // Intern name
      ctx.font = 'bold 32px Arial';
      ctx.fillText(certData.intern_name, canvas.width / 2, 250);
      
      // Line under name
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(200, 260);
      ctx.lineTo(600, 260);
      ctx.stroke();
      
      // Certificate text
      ctx.font = '16px Arial';
      ctx.fillStyle = '#374151';
      const certText = `successfully completed a ${certData.duration} ${certData.mode} Internship in ${certData.role}`;
      ctx.fillText(certText, canvas.width / 2, 310);
      
      const dateText = `from ${certData.start_date} to ${certData.end_date}, with satisfactory performance.`;
      ctx.fillText(dateText, canvas.width / 2, 340);
      
      // Draw signature
      const signatureWidth = 120;
      const signatureHeight = (signatureWidth * signatureImg.height) / signatureImg.width;
      ctx.drawImage(signatureImg, 100, 420, signatureWidth, signatureHeight);
      
      // Add title below signature
      ctx.fillStyle = '#1f2937';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Chief Technology Officer', 100, 480);
      
      // Draw QR code if available
      if (qrImg) {
        ctx.drawImage(qrImg, canvas.width - 150, 420, 80, 80);
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Verification ID', canvas.width - 110, 515);
      }
    };
    
    // Load logo
    logoImg.onload = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        drawCertificateContent();
      }
    };
    logoImg.src = '/logo.jpeg';
    
    // Load signature
    signatureImg.onload = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        drawCertificateContent();
      }
    };
    signatureImg.src = '/signature.jpeg';
    
    // QR Code
    if (qrCodeData) {
      qrImg = new Image();
      qrImg.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
          drawCertificateContent();
        }
      };
      qrImg.src = qrCodeData;
    }
  };

  const downloadCertificate = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `${formData.intern_name}_certificate.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">DNOT Technologies</h1>
            <p className="text-gray-600">Certificate Generation System</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div>
              <h2 className="text-xl font-semibold mb-6">Certificate Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intern Name
                  </label>
                  <input
                    type="text"
                    name="intern_name"
                    value={formData.intern_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter intern name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select role</option>
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., 24-week"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode
                  </label>
                  <select
                    name="mode"
                    value={formData.mode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <button
                  onClick={generateCertificate}
                  disabled={loading || !formData.intern_name || !formData.role}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Generating...' : 'Generate Certificate'}
                </button>
              </div>
            </div>
            
            {/* Certificate Preview Section */}
            <div>
              <h2 className="text-xl font-semibold mb-6">Certificate Preview</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto border rounded"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
                {certificate && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={downloadCertificate}
                      className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Download Certificate
                    </button>
                    <p className="text-sm text-gray-600 mt-2">
                      Verification ID: {certificate.verification_id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Certificate Verification Component
const CertificateVerification = () => {
  const { verificationId } = useParams();
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const verifyCertificate = async () => {
      try {
        const response = await axios.get(`${API}/verify/${verificationId}`);
        setVerificationResult(response.data);
        
        // If certificate is valid, get QR code and generate certificate image
        if (response.data.is_valid && response.data.certificate_data) {
          try {
            const qrResponse = await axios.post(`${API}/generate-qr/${verificationId}`);
            setQrCode(qrResponse.data.qr_code);
            
            // Generate certificate image after QR code is loaded
            setTimeout(() => {
              drawCertificate(response.data.certificate_data, qrResponse.data.qr_code);
            }, 100);
          } catch (qrError) {
            console.error('Error generating QR code:', qrError);
            // Still draw certificate without QR code
            setTimeout(() => {
              drawCertificate(response.data.certificate_data, null);
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error verifying certificate:', error);
        setVerificationResult({
          is_valid: false,
          message: 'Error verifying certificate'
        });
      } finally {
        setLoading(false);
      }
    };

    if (verificationId) {
      verifyCertificate();
    }
  }, [verificationId]);

  const drawCertificate = (certData, qrCodeData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    // Add green ribbon (top right)
    ctx.fillStyle = '#10b981';
    ctx.fillRect(canvas.width - 100, 0, 100, 100);
    
    // Load images and draw certificate
    const logoImg = new Image();
    const signatureImg = new Image();
    let imagesLoaded = 0;
    const totalImages = 2 + (qrCodeData ? 1 : 0);
    let qrImg = null;
    
    const drawCertificateContent = () => {
      // Draw logo
      const logoWidth = 120;
      const logoHeight = (logoWidth * logoImg.height) / logoImg.width;
      ctx.drawImage(logoImg, 50, 30, logoWidth, logoHeight);
      
      // Certificate title
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Certificate of Completion', canvas.width / 2, 160);
      
      // "This certificate awarded to:" text
      ctx.font = '16px Arial';
      ctx.fillText('This certificate awarded to:', canvas.width / 2, 200);
      
      // Intern name
      ctx.font = 'bold 32px Arial';
      ctx.fillText(certData.intern_name, canvas.width / 2, 250);
      
      // Line under name
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(200, 260);
      ctx.lineTo(600, 260);
      ctx.stroke();
      
      // Certificate text
      ctx.font = '16px Arial';
      ctx.fillStyle = '#374151';
      const certText = `successfully completed a ${certData.duration} ${certData.mode} Internship in ${certData.role}`;
      ctx.fillText(certText, canvas.width / 2, 310);
      
      const dateText = `from ${certData.start_date} to ${certData.end_date}, with satisfactory performance.`;
      ctx.fillText(dateText, canvas.width / 2, 340);
      
      // Draw signature
      const signatureWidth = 120;
      const signatureHeight = (signatureWidth * signatureImg.height) / signatureImg.width;
      ctx.drawImage(signatureImg, 100, 420, signatureWidth, signatureHeight);
      
      // Add title below signature
      ctx.fillStyle = '#1f2937';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Chief Technology Officer', 100, 480);
      
      // Draw QR code if available
      if (qrImg) {
        ctx.drawImage(qrImg, canvas.width - 150, 420, 80, 80);
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Verification ID', canvas.width - 110, 515);
      }
    };
    
    // Load logo
    logoImg.onload = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        drawCertificateContent();
      }
    };
    logoImg.src = '/logo.jpeg';
    
    // Load signature
    signatureImg.onload = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        drawCertificateContent();
      }
    };
    signatureImg.src = '/signature.jpeg';
    
    // QR Code
    if (qrCodeData) {
      qrImg = new Image();
      qrImg.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
          drawCertificateContent();
        }
      };
      qrImg.src = qrCodeData;
    }
  };

  const downloadCertificate = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `${verificationResult.certificate_data.intern_name}_certificate.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Certificate Verification</h1>
          <p className="text-lg text-gray-400">DNOT Technologies</p>
        </header>
        
        <main>
          {verificationResult?.is_valid ? (
            <>
              <div className="bg-gray-800 rounded-xl shadow-2xl p-8 mb-8">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full mx-auto flex items-center justify-center mb-4 border-2 border-green-500">
                    <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h2 className="text-3xl font-semibold text-green-400 mb-2">Certificate Verified!</h2>
                  <p className="text-gray-400">{verificationResult.message}</p>
                </div>
                
                {verificationResult.certificate_data && (
                  <div className="bg-gray-900 rounded-lg p-6 md:p-8">
                    <h3 className="text-2xl font-semibold text-white text-center mb-6">Official Certificate</h3>
                    <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-auto rounded-md"
                        style={{ maxWidth: '100%', height: 'auto' }}
                      />
                    </div>
                    <div className="text-center">
                      <button
                        onClick={downloadCertificate}
                        className="bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold py-3 px-8 rounded-full hover:opacity-90 transition-opacity duration-300 transform hover:scale-105"
                      >
                        Download Certificate
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {verificationResult.certificate_data && (
                <div className="bg-gray-800 rounded-xl shadow-2xl p-8">
                  <h3 className="text-2xl font-semibold text-white mb-6 border-b border-gray-700 pb-3">Certificate Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div><strong className="text-gray-300 font-medium">Intern Name:</strong> <span className="text-gray-400">{verificationResult.certificate_data.intern_name}</span></div>
                    <div><strong className="text-gray-300 font-medium">Role:</strong> <span className="text-gray-400">{verificationResult.certificate_data.role}</span></div>
                    <div><strong className="text-gray-300 font-medium">Duration:</strong> <span className="text-gray-400">{verificationResult.certificate_data.duration}</span></div>
                    <div><strong className="text-gray-300 font-medium">Mode:</strong> <span className="text-gray-400">{verificationResult.certificate_data.mode}</span></div>
                    <div className="md:col-span-2"><strong className="text-gray-300 font-medium">Period:</strong> <span className="text-gray-400">{verificationResult.certificate_data.start_date} to {verificationResult.certificate_data.end_date}</span></div>
                    <div><strong className="text-gray-300 font-medium">Issued by:</strong> <span className="text-gray-400">{verificationResult.certificate_data.issued_by}</span></div>
                    <div><strong className="text-gray-300 font-medium">Title:</strong> <span className="text-gray-400">{verificationResult.certificate_data.issued_by_title}</span></div>
                    <div className="md:col-span-2"><strong className="text-gray-300 font-medium">Company:</strong> <span className="text-gray-400">{verificationResult.certificate_data.company}</span></div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-500/20 rounded-full mx-auto flex items-center justify-center mb-4 border-2 border-red-500">
                  <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <h2 className="text-3xl font-semibold text-red-400 mb-2">Certificate Not Valid</h2>
                <p className="text-gray-400">{verificationResult?.message || 'Certificate could not be verified'}</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Login Component
const Login = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    if (error) setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(credentials.username, credentials.password);
    
    if (result.success) {
      navigate('/create');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-gray-400">DNOT Technologies</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : null;
};

// Home Component
const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {user && (
          <div className="flex justify-end mb-8">
            <div className="bg-white rounded-lg shadow px-4 py-2 flex items-center gap-4">
              <span className="text-gray-700">Welcome, {user.full_name}</span>
              <button
                onClick={logout}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            DNOT Technologies
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Certificate Generation & Verification System
          </p>
          <p className="text-gray-500 mb-12">
            Generate official internship certificates with QR code verification
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Generate Certificate</h3>
              <p className="text-gray-600 mb-4">Create official internship certificates with unique verification QR codes</p>
              <button
                onClick={() => navigate(user ? '/create' : '/login')}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                {user ? 'Create Certificate' : 'Admin Login'}
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Verify Certificate</h3>
              <p className="text-gray-600 mb-4">Scan QR code or enter verification ID to validate certificates</p>
              <button
                onClick={() => {
                  const verificationId = prompt('Enter Verification ID:');
                  if (verificationId) {
                    navigate(`/verify/${verificationId}`);
                  }
                }}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Verify Certificate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/create" element={
              <ProtectedRoute>
                <CertificateCreator />
              </ProtectedRoute>
            } />
            <Route path="/verify/:verificationId" element={<CertificateVerification />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;