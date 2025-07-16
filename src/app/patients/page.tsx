"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PatientForm } from "@/components/patients/patient-form"
import { PatientList } from "@/components/patients/patient-list"
import { Plus, ArrowLeft } from "lucide-react"

interface Patient {
  id: string
  initials: string
  dateOfBirth?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export default function PatientsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    fetchPatients()
  }, [session, status, router])
  const fetchPatients = async () => {
    try {
      console.log("🔄 Fetching patients from API...")
      const response = await fetch("/api/patients")
      console.log("📡 API Response status:", response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log("📦 Raw API data:", data)
        
        // L'API restituisce { success: true, data: { patients: [...] } }
        const patients = data.data?.patients || data.patients || []
        console.log("👥 Patients array:", patients)
        console.log("📊 Patients count:", patients?.length)
        setPatients(patients)
      } else {
        console.error("❌ API error:", response.status, response.statusText)
        const errorText = await response.text()
        console.error("❌ Error body:", errorText)
      }
    } catch (error) {
      console.error("💥 Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePatientSaved = () => {
    setShowForm(false)
    setEditingPatient(null)
    fetchPatients()
  }

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient)
    setShowForm(true)
  }

  const handleDeletePatient = async (patientId: string) => {
    if (!confirm("Are you sure you want to delete this patient?")) return

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchPatients()
      }    } catch (error) {
      console.error("Error deleting patient:", error)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) return null

  if (showForm) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={() => {
              setShowForm(false)
              setEditingPatient(null)
            }}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patients
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>
                {editingPatient ? "Edit Patient" : "New Patient"}
              </CardTitle>
              <CardDescription>
                {editingPatient
                  ? "Edit patient details"
                  : "Enter new patient details"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatientForm
                patient={editingPatient}
                onSave={handlePatientSaved}
                onCancel={() => {
                  setShowForm(false)
                  setEditingPatient(null)
                }}
              />
            </CardContent>
          </Card>        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Patients</h1>
          <p className="text-muted-foreground">
            Manage your patients and their information
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Patient
        </Button>
      </div>      <PatientList
        patients={patients}
        onEdit={handleEditPatient}
        onDelete={handleDeletePatient}
        onViewSessions={(patientId) => router.push(`/sessions?patientId=${patientId}`)}
        onViewAnalysis={(patientId) => router.push(`/patients/${patientId}/analysis`)}
      />
    </div>
  )
}
