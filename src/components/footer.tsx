"use client"

import { useRouter } from "next/navigation"
import { 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Heart, 
  Users
} from "lucide-react"

export default function Footer() {
  const router = useRouter()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold mb-4">TalksFromTherapy</h3>
            <p className="text-gray-300 mb-4 max-w-md">
              Advanced transcription and analysis platform designed specifically for mental health professionals. 
              Secure, GDPR-compliant, and built with privacy as our foundation.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Shield className="h-4 w-4" />
              <span>GDPR Compliant & Encrypted</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <button 
                  onClick={() => router.push("/login")}
                  className="hover:text-white transition-colors"
                >
                  Login
                </button>
              </li>
              <li>
                <button 
                  onClick={() => router.push("/register")}
                  className="hover:text-white transition-colors"
                >
                  Get Started
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm">support@talksfromtherapy.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span className="text-sm">+39 02 1234 5678</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">Milan, Italy</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span>© {currentYear} TalksFromTherapy</span>
              <button className="hover:text-white transition-colors">
                Privacy Policy
              </button>
              <button className="hover:text-white transition-colors">
                Terms of Service
              </button>
              <button className="hover:text-white transition-colors">
                Cookie Policy
              </button>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Made for therapists</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>Trusted by professionals</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
