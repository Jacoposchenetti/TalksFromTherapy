"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    acceptTerms: false,
    acceptPrivacy: false
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleCheckboxChange = (name: string, checked: boolean | "indeterminate") => {
    setFormData(prev => ({
      ...prev,
      [name]: checked === true
    }))
  }

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password) {
      setError("All required fields must be filled")
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address")
      return false
    }

    if (!formData.acceptTerms) {
      setError("You must accept the Terms of Service to register")
      return false
    }

    if (!formData.acceptPrivacy) {
      setError("You must accept the Privacy Policy to register")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          licenseNumber: formData.licenseNumber || null,
          acceptTerms: formData.acceptTerms,
          acceptPrivacy: formData.acceptPrivacy
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Si è verificato un errore durante la registrazione")
        return
      }

      // Registrazione completata
      setSuccess("Registrazione completata! Controlla la tua email per attivare l'account.")
      setTimeout(() => {
        router.push("/login?message=" + encodeURIComponent("Registrazione completata! Controlla la tua email per attivare l'account prima di accedere."))
      }, 2000)
    } catch (error) {
      setError("Si è verificato un errore durante la registrazione")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Register
          </CardTitle>
          <CardDescription className="text-center">
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your-email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Professional License Number</Label>
              <Input
                id="licenseNumber"
                name="licenseNumber"
                type="text"
                placeholder="E.g.: 12345 (optional)"
                value={formData.licenseNumber}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repeat the password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>


            
            {/* GDPR Consent Section */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
        
              
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="gdprTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => handleCheckboxChange('acceptTerms', checked)}
                  className="mt-1 flex-shrink-0"
                />
                <div className="text-sm leading-relaxed cursor-pointer" onClick={() => handleCheckboxChange('acceptTerms', !formData.acceptTerms)}>
                  I accept the <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link> and agree to the processing of my professional data to provide the transcription service.
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="gdprPrivacy"
                  checked={formData.acceptPrivacy}
                  onCheckedChange={(checked) => handleCheckboxChange('acceptPrivacy', checked)}
                  className="mt-1 flex-shrink-0"
                />
                <div className="text-sm leading-relaxed cursor-pointer" onClick={() => handleCheckboxChange('acceptPrivacy', !formData.acceptPrivacy)}>
                  I have read and accept the <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</Link> and consent to the processing of personal data for therapeutic transcription services.
                </div>
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>
                  ✅ {success}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Registering..." : "Register"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link 
              href="/login" 
              className="font-medium text-primary hover:text-primary/80"
            >
              Log in here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
