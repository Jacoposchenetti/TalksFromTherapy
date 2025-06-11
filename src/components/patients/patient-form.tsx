"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Patient {
  id?: string
  initials: string
  dateOfBirth?: string
  notes?: string
}

interface PatientFormProps {
  patient?: Patient | null
  onSave: () => void
  onCancel: () => void
}

export function PatientForm({ patient, onSave, onCancel }: PatientFormProps) {
  const [formData, setFormData] = useState({
    initials: patient?.initials || "",
    dateOfBirth: patient?.dateOfBirth || "",
    notes: patient?.notes || ""
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.initials.trim()) {
      newErrors.initials = "Le iniziali sono obbligatorie"
    } else if (formData.initials.trim().length < 2) {
      newErrors.initials = "Le iniziali devono essere di almeno 2 caratteri"
    } else if (!/^[A-Za-z\s]+$/.test(formData.initials.trim())) {
      newErrors.initials = "Le iniziali possono contenere solo lettere"
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "La data di nascita è obbligatoria"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return    setLoading(true)
    try {
      const url = patient ? `/api/patients/${patient.id}` : "/api/patients"
      const method = patient ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSave()
      } else {
        const error = await response.json()
        console.error("Error saving patient:", error)
        // Show error message to user
        if (error.error) {
          setErrors({ submit: error.error })
        }
      }
    } catch (error) {
      console.error("Error saving patient:", error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="initials">Iniziali Paziente *</Label>        <Input
          id="initials"
          name="initials"
          value={formData.initials}
          onChange={handleChange}
          placeholder="es. S.F. (per Sebastiano Franchini)"
          className={errors.initials ? "border-red-500" : ""}
          maxLength={10}
        />
        {errors.initials && (
          <p className="text-sm text-red-500">{errors.initials}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Inserisci le iniziali del paziente per rispettare la privacy (es. M.R. per Mario Rossi)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Data di Nascita *</Label>
        <Input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={handleChange}
          className={errors.dateOfBirth ? "border-red-500" : ""}
        />
        {errors.dateOfBirth && (
          <p className="text-sm text-red-500">{errors.dateOfBirth}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Note aggiuntive sul paziente..."
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows={3}
        />
      </div>      <div className="flex gap-4 pt-4">
        {errors.submit && (
          <div className="w-full p-3 mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
            {errors.submit}
          </div>
        )}
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Salvando..." : patient ? "Aggiorna Paziente" : "Crea Paziente"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Annulla
        </Button>
      </div>
    </form>
  )
}
