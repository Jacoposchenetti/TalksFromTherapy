"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  User, 
  Mail, 
  Calendar, 
  Shield,
  Camera,
  CheckCircle
} from "lucide-react"

export default function ProfilePage() {
  const { data: session, status, update } = useSession()
  const [tempImage, setTempImage] = useState<string | null>(null) // Solo per preview temporanea
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  // Pulisci i messaggi dopo un po'
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage("")
        setError("")
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message, error])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError("L'immagine deve essere inferiore a 5MB")
        return
      }
      
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setTempImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Upload automatico quando viene selezionata un'immagine
      uploadImage(file)
    }
  }

  const uploadImage = async (file: File) => {
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Foto profilo aggiornata con successo!")
        setTempImage(null) // Rimuovi preview temporanea
        
        // Aggiorna la sessione con la nuova immagine
        await update({
          ...session,
          user: {
            ...session?.user,
            image: data.url  // Cambiato da data.avatarUrl a data.url
          }
        })
      } else {
        setError(data.error || "Errore durante l'upload dell'immagine")
        setTempImage(null) // Rimuovi preview in caso di errore
      }
    } catch (error) {
      setError("Errore di connessione durante l'upload")
      setTempImage(null)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getUserInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento profilo...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600">Devi essere autenticato per vedere il profilo</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Il mio Profilo</h1>
        <p className="text-gray-600">Visualizza le informazioni del tuo account</p>
      </div>

      {message && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Colonna sinistra - Info account */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informazioni Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar className="w-24 h-24 ring-4 ring-white shadow-lg">
                    <AvatarImage 
                      src={tempImage || session?.user?.image || ""} 
                      alt="Profile" 
                      className="object-cover"
                    />
                    <AvatarFallback className="text-lg bg-blue-600 text-white">
                      {getUserInitials(session?.user?.name || "User")}
                    </AvatarFallback>
                  </Avatar>
                  
                  <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                    <Camera className="h-4 w-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </label>
                  
                  {isLoading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                
                <div className="text-center mt-3">
                  <h3 className="font-semibold text-lg">{session.user?.name}</h3>
                  <p className="text-sm text-gray-600">{session.user?.email}</p>
                </div>
              </div>

              {/* Account Stats */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Attivo
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Registrato</span>
                  <span className="text-sm font-medium">
                    {session.user?.created_at ? formatDate(session.user.created_at) : 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ultimo accesso</span>
                  <span className="text-sm font-medium">
                    {session.user?.last_sign_in_at ? formatDate(session.user.last_sign_in_at) : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonna destra - Form dati */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dati Personali
                </CardTitle>
                <CardDescription>
                  Le tue informazioni personali e professionali
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                {/* Nome */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Nome completo</span>
                  </div>
                  <p className="text-gray-900">{session?.user?.name || "Non specificato"}</p>
                </div>

                {/* Email */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Email</span>
                  </div>
                  <p className="text-gray-900">{session?.user?.email || "Non specificato"}</p>
                </div>

                {/* Telefono */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">Telefono</span>
                  </div>
                  <p className="text-gray-900">{session?.user?.phone || "Non specificato"}</p>
                </div>

                {/* Numero licenza */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Numero di licenza professionale</span>
                  </div>
                  <p className="text-gray-900">{session?.user?.license_number || "Non specificato"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
