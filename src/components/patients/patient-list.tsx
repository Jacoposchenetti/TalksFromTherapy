"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, FileText, Edit, Trash2, Eye, BarChart3 } from "lucide-react"

interface Patient {
  id: string
  initials: string
  dateOfBirth?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface PatientListProps {
  patients: Patient[]
  onEdit: (patient: Patient) => void
  onDelete: (patientId: string) => void
  onViewSessions: (patientId: string) => void
  onViewAnalysis: (patientId: string) => void
}

export function PatientList({ patients, onEdit, onDelete, onViewSessions, onViewAnalysis }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const filteredPatients = patients.filter(patient =>
    patient.initials.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteClick = (patientId: string) => {
    if (deleteConfirm === patientId) {
      onDelete(patientId)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(patientId)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-2">        <Input
          type="text"
          placeholder="Cerca pazienti per iniziali o note..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Results Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {filteredPatients.length} {filteredPatients.length === 1 ? 'paziente trovato' : 'pazienti trovati'}
        {searchTerm && ` per "${searchTerm}"`}
      </div>

      {/* Patient List */}
      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            {searchTerm ? (
              <>
                <h3 className="text-lg font-semibold mb-2">Nessun paziente trovato</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Nessun paziente corrisponde alla tua ricerca.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm("")}
                >
                  Mostra tutti i pazienti
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Nessun paziente registrato</h3>
                <p className="text-muted-foreground text-center">
                  Inizia aggiungendo il tuo primo paziente.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">                    <CardTitle className="text-xl">
                      {patient.initials}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      {patient.dateOfBirth && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {calculateAge(patient.dateOfBirth)} anni
                          <span className="text-xs">
                            ({formatDate(patient.dateOfBirth)})
                          </span>
                        </span>
                      )}
                    </CardDescription>
                  </div>                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewSessions(patient.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Sessioni
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewAnalysis(patient.id)}
                    >
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Analisi
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(patient)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Modifica
                    </Button>
                    <Button
                      variant={deleteConfirm === patient.id ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => handleDeleteClick(patient.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deleteConfirm === patient.id ? "Conferma" : "Elimina"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {patient.notes && (
                <CardContent className="pt-0">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium mb-1">Note:</p>
                        <p className="text-sm text-muted-foreground">{patient.notes}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
              
              <CardContent className="pt-2">
                <div className="text-xs text-muted-foreground">
                  Creato il {formatDate(patient.createdAt)} • 
                  Ultima modifica il {formatDate(patient.updatedAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              <p className="text-sm">
                Premi "Conferma" di nuovo per eliminare definitivamente il paziente.<br />
                Questa azione non può essere annullata.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
