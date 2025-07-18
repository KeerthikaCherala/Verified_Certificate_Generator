#!/usr/bin/env python3
"""
Backend API Testing for Certificate Generation and Verification System
Tests all certificate-related endpoints with realistic data
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://68c73219-583a-46eb-b709-21483e91360f.preview.emergentagent.com/api"

# Test data
TEST_CERTIFICATE_DATA = {
    "intern_name": "John Doe",
    "role": "Frontend Intern", 
    "duration": "12-week",
    "mode": "online",
    "start_date": "2024-01-15",
    "end_date": "2024-04-15"
}

class CertificateAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.created_certificate = None
        self.verification_id = None
        
    def test_api_health(self):
        """Test if the API is accessible"""
        print("🔍 Testing API Health...")
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                print("✅ API is accessible")
                print(f"   Response: {response.json()}")
                return True
            else:
                print(f"❌ API health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ API health check failed: {str(e)}")
            return False
    
    def test_create_certificate(self):
        """Test certificate creation API"""
        print("\n🔍 Testing Certificate Creation API...")
        try:
            response = self.session.post(
                f"{self.base_url}/certificates",
                json=TEST_CERTIFICATE_DATA,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                self.created_certificate = response.json()
                self.verification_id = self.created_certificate.get("verification_id")
                print("✅ Certificate created successfully")
                print(f"   Certificate ID: {self.created_certificate.get('id')}")
                print(f"   Verification ID: {self.verification_id}")
                print(f"   Intern Name: {self.created_certificate.get('intern_name')}")
                print(f"   Role: {self.created_certificate.get('role')}")
                print(f"   Company: {self.created_certificate.get('company')}")
                return True
            else:
                print(f"❌ Certificate creation failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Certificate creation failed: {str(e)}")
            return False
    
    def test_get_certificate_by_id(self):
        """Test getting certificate by ID"""
        print("\n🔍 Testing Get Certificate by ID...")
        if not self.created_certificate:
            print("❌ No certificate created to test with")
            return False
            
        try:
            cert_id = self.created_certificate.get("id")
            response = self.session.get(f"{self.base_url}/certificates/{cert_id}")
            
            if response.status_code == 200:
                certificate = response.json()
                print("✅ Certificate retrieved successfully")
                print(f"   Retrieved Certificate ID: {certificate.get('id')}")
                print(f"   Intern Name: {certificate.get('intern_name')}")
                return True
            else:
                print(f"❌ Get certificate failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get certificate failed: {str(e)}")
            return False
    
    def test_get_all_certificates(self):
        """Test getting all certificates"""
        print("\n🔍 Testing Get All Certificates...")
        try:
            response = self.session.get(f"{self.base_url}/certificates")
            
            if response.status_code == 200:
                certificates = response.json()
                print(f"✅ Retrieved {len(certificates)} certificates")
                if certificates:
                    print(f"   First certificate: {certificates[0].get('intern_name')}")
                return True
            else:
                print(f"❌ Get all certificates failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get all certificates failed: {str(e)}")
            return False
    
    def test_generate_qr_code(self):
        """Test QR code generation"""
        print("\n🔍 Testing QR Code Generation...")
        if not self.verification_id:
            print("❌ No verification ID available to test with")
            return False
            
        try:
            response = self.session.post(f"{self.base_url}/generate-qr/{self.verification_id}")
            
            if response.status_code == 200:
                qr_data = response.json()
                print("✅ QR code generated successfully")
                print(f"   Verification URL: {qr_data.get('verification_url')}")
                print(f"   QR Code data length: {len(qr_data.get('qr_code', ''))}")
                return True
            else:
                print(f"❌ QR code generation failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ QR code generation failed: {str(e)}")
            return False
    
    def test_verify_certificate_valid(self):
        """Test certificate verification with valid ID"""
        print("\n🔍 Testing Certificate Verification (Valid ID)...")
        if not self.verification_id:
            print("❌ No verification ID available to test with")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/verify/{self.verification_id}")
            
            if response.status_code == 200:
                verification = response.json()
                print("✅ Certificate verification successful")
                print(f"   Is Valid: {verification.get('is_valid')}")
                print(f"   Message: {verification.get('message')}")
                if verification.get('certificate_data'):
                    cert_data = verification.get('certificate_data')
                    print(f"   Verified Intern: {cert_data.get('intern_name')}")
                    print(f"   Verified Role: {cert_data.get('role')}")
                return verification.get('is_valid', False)
            else:
                print(f"❌ Certificate verification failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Certificate verification failed: {str(e)}")
            return False
    
    def test_verify_certificate_invalid(self):
        """Test certificate verification with invalid ID"""
        print("\n🔍 Testing Certificate Verification (Invalid ID)...")
        invalid_id = "invalid-verification-id-12345"
        
        try:
            response = self.session.get(f"{self.base_url}/verify/{invalid_id}")
            
            if response.status_code == 200:
                verification = response.json()
                print("✅ Invalid certificate verification handled correctly")
                print(f"   Is Valid: {verification.get('is_valid')}")
                print(f"   Message: {verification.get('message')}")
                return not verification.get('is_valid', True)  # Should be False for invalid
            else:
                print(f"❌ Invalid certificate verification failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Invalid certificate verification failed: {str(e)}")
            return False
    
    def test_qr_generation_invalid_id(self):
        """Test QR code generation with invalid verification ID"""
        print("\n🔍 Testing QR Code Generation (Invalid ID)...")
        invalid_id = "invalid-verification-id-12345"
        
        try:
            response = self.session.post(f"{self.base_url}/generate-qr/{invalid_id}")
            
            if response.status_code == 404:
                print("✅ Invalid QR generation handled correctly (404 expected)")
                return True
            else:
                print(f"❌ Invalid QR generation should return 404, got: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Invalid QR generation test failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Certificate System Backend Tests")
        print("=" * 60)
        
        test_results = {}
        
        # Test API health first
        test_results['api_health'] = self.test_api_health()
        
        if not test_results['api_health']:
            print("\n❌ API is not accessible. Stopping tests.")
            return test_results
        
        # Test certificate creation
        test_results['create_certificate'] = self.test_create_certificate()
        
        # Test certificate retrieval
        test_results['get_certificate_by_id'] = self.test_get_certificate_by_id()
        test_results['get_all_certificates'] = self.test_get_all_certificates()
        
        # Test QR code generation
        test_results['generate_qr_code'] = self.test_generate_qr_code()
        
        # Test certificate verification
        test_results['verify_valid'] = self.test_verify_certificate_valid()
        test_results['verify_invalid'] = self.test_verify_certificate_invalid()
        
        # Test error handling
        test_results['qr_invalid_id'] = self.test_qr_generation_invalid_id()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Certificate system is working correctly.")
        else:
            print("⚠️  Some tests failed. Please check the issues above.")
        
        return test_results

def main():
    """Main function to run tests"""
    tester = CertificateAPITester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if all(results.values()):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()