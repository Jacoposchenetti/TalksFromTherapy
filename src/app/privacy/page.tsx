import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-center">Privacy Policy</CardTitle>
            <p className="text-center text-gray-600">
              TalksFromTherapy - Last updated: July 11, 2025
            </p>
          </CardHeader>
          <CardContent className="prose max-w-none">
            
            <h2>🔒 Data Protection Overview</h2>
            <p>
              TalksFromTherapy is designed specifically for mental health professionals who need secure, 
              GDPR-compliant transcription services. We take your privacy and your patients' privacy seriously.
            </p>

            <h2>📋 What Data We Process</h2>
            <h3>Professional Data (About You)</h3>
            <ul>
              <li><strong>Account Information:</strong> Name, email, professional license number (optional)</li>
              <li><strong>Usage Data:</strong> Login times, session activity, feature usage</li>
            </ul>
            
            <h3>Patient Data (Under Your Control)</h3>
            <ul>
              <li><strong>Patient Identifiers:</strong> Only initials (no full names)</li>
              <li><strong>Audio Recordings:</strong> Temporary processing only, deleted after transcription</li>
              <li><strong>Transcriptions:</strong> Encrypted text of therapy sessions</li>
              <li><strong>Session Notes:</strong> Your therapeutic observations and notes</li>
            </ul>

            <h2>🎯 Why We Process Data</h2>
            <ul>
              <li><strong>Service Delivery:</strong> Provide AI transcription and session management</li>
              <li><strong>Account Management:</strong> User authentication and account security</li>
              <li><strong>Technical Support:</strong> Troubleshoot issues and improve service quality</li>
              <li><strong>Security:</strong> Prevent fraud, protect against unauthorized access</li>
            </ul>

            <h2>🔐 How We Protect Your Data</h2>
            <h3>Technical Measures</h3>
            <ul>
              <li><strong>AES-256 Encryption:</strong> All sensitive data encrypted at rest</li>
              <li><strong>HTTPS/TLS:</strong> Secure transmission of all data</li>
              <li><strong>Access Controls:</strong> You only see your own data</li>
              <li><strong>Audit Logging:</strong> All data access is logged and monitored</li>
            </ul>

            <h3>Organizational Measures</h3>
            <ul>
              <li><strong>Principle of Least Privilege:</strong> Staff access only when necessary</li>
              <li><strong>Regular Security Reviews:</strong> Ongoing security assessments</li>
              <li><strong>Data Processing Agreements:</strong> All vendors bound by strict contracts</li>
            </ul>

            <h2>🌍 Data Processing Location</h2>
            <p>
              Your data is processed in EU data centers with appropriate safeguards. 
              We do not transfer personal data outside the European Economic Area without adequate protection.
            </p>

            <h2>⏰ Data Retention</h2>
            <ul>
              <li><strong>Account Data:</strong> Retained while your account is active</li>
              <li><strong>Patient Data:</strong> Retained according to your professional requirements</li>
              <li><strong>Audio Files:</strong> Deleted immediately after transcription</li>
              <li><strong>Backups:</strong> Secure encrypted backups for disaster recovery</li>
            </ul>

            <h2>👤 Your Rights (GDPR)</h2>
            <p>As a data subject, you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Export your data in a standard format</li>
              <li><strong>Withdraw Consent:</strong> Stop processing at any time</li>
            </ul>

            <h2>🚨 Data Breach Notification</h2>
            <p>
              In the unlikely event of a data breach affecting personal data, we will:
            </p>
            <ul>
              <li>Notify the relevant supervisory authority within 72 hours</li>
              <li>Inform affected users if there is a high risk to their rights</li>
              <li>Implement immediate containment and remediation measures</li>
            </ul>

            <h2>🤝 Third-Party Services</h2>
            <p>We use the following trusted service providers:</p>
            <ul>
              <li><strong>OpenAI:</strong> AI transcription processing (encrypted data only)</li>
              <li><strong>Supabase:</strong> Database hosting and authentication</li>
              <li><strong>Vercel:</strong> Application hosting and delivery</li>
            </ul>
            <p>All third parties are bound by strict data processing agreements.</p>

            <h2>📞 Contact Information</h2>
            <p>For privacy-related questions or to exercise your rights:</p>
            <ul>
              <li><strong>Email:</strong> privacy@talksfromtherapy.com</li>
              <li><strong>Data Protection Officer:</strong> dpo@talksfromtherapy.com</li>
              <li><strong>Response Time:</strong> Within 30 days as required by GDPR</li>
            </ul>

            <h2>📝 Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy to reflect changes in our practices or for legal compliance. 
              Users will be notified of significant changes via email or in-app notification.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-8">
              <h3 className="text-green-800 font-semibold">✅ GDPR Compliant</h3>
              <p className="text-green-700 text-sm mt-2">
                This Privacy Policy meets all GDPR requirements for transparent data processing. 
                Your data is protected with enterprise-grade security measures and you retain full control 
                over your information.
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
