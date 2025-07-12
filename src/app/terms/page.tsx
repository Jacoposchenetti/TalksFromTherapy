import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-center">Terms of Service</CardTitle>
            <p className="text-center text-gray-600">
              TalksFromTherapy - Last updated: July 11, 2025
            </p>
          </CardHeader>
          <CardContent className="prose max-w-none">
            
            <h2>🎯 Service Overview</h2>
            <p>
              TalksFromTherapy provides AI-powered transcription services specifically designed for 
              mental health professionals. By using our service, you agree to these terms.
            </p>

            <h2>👨‍⚕️ Professional Use Only</h2>
            <ul>
              <li><strong>Licensed Professionals:</strong> This service is intended for licensed mental health professionals</li>
              <li><strong>Professional Standards:</strong> You must comply with your professional ethical guidelines</li>
              <li><strong>Patient Consent:</strong> You are responsible for obtaining appropriate patient consent for recording</li>
              <li><strong>Confidentiality:</strong> You maintain full professional responsibility for patient confidentiality</li>
            </ul>

            <h2>🔐 Data Processing Agreement</h2>
            <h3>Your Role as Data Controller</h3>
            <p>
              As a mental health professional, you are the <strong>Data Controller</strong> under GDPR. 
              TalksFromTherapy acts as your <strong>Data Processor</strong>.
            </p>
            
            <h3>Our Processing Activities</h3>
            <p>We process data solely to provide the following services:</p>
            <ul>
              <li>AI-powered transcription of audio recordings</li>
              <li>Secure storage and organization of transcriptions</li>
              <li>Session management and note-taking tools</li>
              <li>Data export and backup services</li>
            </ul>

            <h3>Data Security Commitments</h3>
            <ul>
              <li><strong>Encryption:</strong> AES-256 encryption for all sensitive data</li>
              <li><strong>Access Control:</strong> Strict access controls and audit logging</li>
              <li><strong>No Unauthorized Access:</strong> We will never access your data without authorization</li>
              <li><strong>Breach Notification:</strong> Immediate notification of any security incidents</li>
            </ul>

            <h2>📱 Acceptable Use</h2>
            <h3>Permitted Uses</h3>
            <ul>
              <li>Transcription of therapy sessions with patient consent</li>
              <li>Professional note-taking and session management</li>
              <li>Secure sharing with authorized colleagues (your responsibility)</li>
            </ul>

            <h3>Prohibited Uses</h3>
            <ul>
              <li>Processing recordings without proper patient consent</li>
              <li>Sharing login credentials with unauthorized persons</li>
              <li>Attempting to access other users' data</li>
              <li>Using the service for non-therapeutic purposes</li>
              <li>Reverse engineering or attempting to compromise security</li>
            </ul>

            <h2>🔄 Data Retention and Deletion</h2>
            <ul>
              <li><strong>Your Control:</strong> You determine how long to retain patient data</li>
              <li><strong>Account Deletion:</strong> You can delete your account and all data at any time</li>
              <li><strong>Professional Requirements:</strong> Comply with your jurisdiction's retention requirements</li>
              <li><strong>Backup Retention:</strong> Encrypted backups retained for 90 days after deletion</li>
            </ul>

            <h2>💳 Payment and Billing</h2>
            <ul>
              <li><strong>Subscription Model:</strong> Monthly or annual billing cycles</li>
              <li><strong>Usage-Based:</strong> Fees based on transcription minutes and storage</li>
              <li><strong>Cancellation:</strong> Cancel anytime, data retained for 30 days</li>
              <li><strong>Refund Policy:</strong> Pro-rated refunds for annual subscriptions</li>
            </ul>

            <h2>⚠️ Limitations and Disclaimers</h2>
            <h3>AI Transcription Accuracy</h3>
            <ul>
              <li>AI transcription may contain errors</li>
              <li>Always review transcriptions for accuracy</li>
              <li>Clinical decisions should not rely solely on AI transcriptions</li>
            </ul>

            <h3>Service Availability</h3>
            <ul>
              <li>We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
              <li>Scheduled maintenance will be announced in advance</li>
              <li>Emergency maintenance may occur without notice</li>
            </ul>

            <h2>🛡️ Professional Liability</h2>
            <p>
              <strong>Important:</strong> TalksFromTherapy is a technical tool. You retain full professional 
              responsibility for:
            </p>
            <ul>
              <li>Clinical decision-making</li>
              <li>Patient care and safety</li>
              <li>Compliance with professional standards</li>
              <li>Obtaining appropriate patient consents</li>
              <li>Meeting documentation requirements</li>
            </ul>

            <h2>🌍 Governing Law and Jurisdiction</h2>
            <ul>
              <li><strong>Governing Law:</strong> European Union law and local regulations</li>
              <li><strong>GDPR Compliance:</strong> Full compliance with EU data protection regulations</li>
              <li><strong>Professional Standards:</strong> Compliance with local mental health regulations</li>
            </ul>

            <h2>📞 Support and Contact</h2>
            <ul>
              <li><strong>Technical Support:</strong> support@talksfromtherapy.com</li>
              <li><strong>Data Protection:</strong> privacy@talksfromtherapy.com</li>
              <li><strong>Emergency Contact:</strong> Available 24/7 for security incidents</li>
            </ul>

            <h2>🔄 Changes to Terms</h2>
            <p>
              We may update these terms to reflect service improvements or legal requirements. 
              Significant changes will be communicated 30 days in advance.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
              <h3 className="text-blue-800 font-semibold">🤝 Professional Partnership</h3>
              <p className="text-blue-700 text-sm mt-2">
                We view our relationship as a professional partnership. We provide secure, reliable 
                technology tools while you maintain full control and responsibility for your therapeutic practice.
              </p>
            </div>

            <div className="text-center mt-8 pt-8 border-t border-gray-200">
              <Link 
                href="/register" 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                ← Back to Registration
              </Link>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
