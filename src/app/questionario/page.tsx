"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PlaceAutocomplete } from "@/components/place-autocomplete";

interface SociodemographicData {
  firstName: string;
  lastName: string;
  age: number;
  status: 'studente' | 'lavoratore' | 'studente_lavoratore' | 'nessuno' | '';
  studyCity: string;
  familyIncome: 'molto_basso' | 'basso' | 'medio_basso' | 'medio' | 'medio_alto' | 'alto' | 'molto_alto' | '';
  birthPlace: string;
  grownUpPlace: string;
  isOutOfTown: boolean;
  outOfTownSince: string;
  visitFrequency: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function QuestionarioPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const [data, setData] = useState<SociodemographicData>({
    firstName: '',
    lastName: '',
    age: 0,
    status: '',
    studyCity: '',
    familyIncome: '',
    birthPlace: '',
    grownUpPlace: '',
    isOutOfTown: false,
    outOfTownSince: '',
    visitFrequency: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateCurrentStep = (): boolean => {
    const newErrors: FormErrors = {};

    if (currentStep === 1) {
      if (!data.firstName.trim()) newErrors.firstName = 'Nome è obbligatorio';
      if (!data.lastName.trim()) newErrors.lastName = 'Cognome è obbligatorio';
      if (!data.age || data.age < 1 || data.age > 120) newErrors.age = 'Età deve essere valida (1-120)';
      if (!data.status) newErrors.status = 'Status è obbligatorio';
      if ((data.status === 'studente' || data.status === 'studente_lavoratore') && !data.studyCity.trim()) {
        newErrors.studyCity = 'Città di studio è obbligatoria per studenti';
      }
      if (!data.familyIncome) newErrors.familyIncome = 'Reddito familiare è obbligatorio';
    } else if (currentStep === 2) {
      if (!data.birthPlace.trim()) newErrors.birthPlace = 'Luogo di nascita è obbligatorio';
      if (!data.grownUpPlace.trim()) newErrors.grownUpPlace = 'Luogo dove sei cresciuto è obbligatorio';
      if (data.isOutOfTown && !data.outOfTownSince) newErrors.outOfTownSince = 'Specificare da quando sei fuori sede';
      if (data.isOutOfTown && !data.visitFrequency) newErrors.visitFrequency = 'Specificare la frequenza delle visite';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/questionario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Questionario salvato con successo!');
        // Reset form
        setData({
          firstName: '',
          lastName: '',
          age: 0,
          status: '',
          studyCity: '',
          familyIncome: '',
          birthPlace: '',
          grownUpPlace: '',
          isOutOfTown: false,
          outOfTownSince: '',
          visitFrequency: ''
        });
        setCurrentStep(1);
      } else {
        throw new Error('Errore nel salvare il questionario');
      }
    } catch (error) {
      toast.error('Errore nel salvare il questionario');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Dati Sociodemografici - Parte 1</CardTitle>
        <CardDescription>
          Inserisci le tue informazioni personali e di studio/lavoro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Nome *</Label>
            <Input
              id="firstName"
              value={data.firstName}
              onChange={(e) => setData({ ...data, firstName: e.target.value })}
              placeholder="Il tuo nome"
              className={errors.firstName ? 'border-red-500' : ''}
            />
            {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <Label htmlFor="lastName">Cognome *</Label>
            <Input
              id="lastName"
              value={data.lastName}
              onChange={(e) => setData({ ...data, lastName: e.target.value })}
              placeholder="Il tuo cognome"
              className={errors.lastName ? 'border-red-500' : ''}
            />
            {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="age">Età *</Label>
          <Input
            id="age"
            type="number"
            value={data.age || ''}
            onChange={(e) => setData({ ...data, age: parseInt(e.target.value) || 0 })}
            placeholder="La tua età"
            min="1"
            max="120"
            className={errors.age ? 'border-red-500' : ''}
          />
          {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
        </div>

        <div>
          <Label>Status *</Label>
          <RadioGroup
            value={data.status}
            onValueChange={(value) => setData({ ...data, status: value as any })}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="studente" id="studente" />
              <Label htmlFor="studente">Studente</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lavoratore" id="lavoratore" />
              <Label htmlFor="lavoratore">Lavoratore</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="studente_lavoratore" id="studente_lavoratore" />
              <Label htmlFor="studente_lavoratore">Studente lavoratore</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="nessuno" id="nessuno" />
              <Label htmlFor="nessuno">Nessuno</Label>
            </div>
          </RadioGroup>
          {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
        </div>

        {(data.status === 'studente' || data.status === 'studente_lavoratore') && (
          <div>
            <Label htmlFor="studyCity">Città di studio *</Label>
            <PlaceAutocomplete
              value={data.studyCity}
              onChange={(value) => setData({ ...data, studyCity: value })}
              placeholder="Cerca la città dove studi"
              error={errors.studyCity}
            />
            {errors.studyCity && <p className="text-red-500 text-sm mt-1">{errors.studyCity}</p>}
          </div>
        )}

        <div>
          <Label>Reddito familiare *</Label>
          <Select 
            value={data.familyIncome} 
            onValueChange={(value) => setData({ ...data, familyIncome: value as any })}
          >
            <SelectTrigger className={errors.familyIncome ? 'border-red-500' : ''}>
              <SelectValue placeholder="Seleziona il reddito familiare" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="molto_basso">Molto basso</SelectItem>
              <SelectItem value="basso">Basso</SelectItem>
              <SelectItem value="medio_basso">Medio-basso</SelectItem>
              <SelectItem value="medio">Medio</SelectItem>
              <SelectItem value="medio_alto">Medio-alto</SelectItem>
              <SelectItem value="alto">Alto</SelectItem>
              <SelectItem value="molto_alto">Molto alto</SelectItem>
            </SelectContent>
          </Select>
          {errors.familyIncome && <p className="text-red-500 text-sm mt-1">{errors.familyIncome}</p>}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleNext}>Avanti</Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Dati Sociodemografici - Parte 2</CardTitle>
        <CardDescription>
          Informazioni sui luoghi e situazione abitativa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="birthPlace">Dove sei nato *</Label>
          <PlaceAutocomplete
            value={data.birthPlace}
            onChange={(value) => setData({ ...data, birthPlace: value })}
            placeholder="Cerca il luogo di nascita"
            error={errors.birthPlace}
          />
          {errors.birthPlace && <p className="text-red-500 text-sm mt-1">{errors.birthPlace}</p>}
        </div>

        <div>
          <Label htmlFor="grownUpPlace">Dove sei cresciuto (&lt;18 anni) *</Label>
          <PlaceAutocomplete
            value={data.grownUpPlace}
            onChange={(value) => setData({ ...data, grownUpPlace: value })}
            placeholder="Cerca il luogo dove sei cresciuto"
            error={errors.grownUpPlace}
          />
          {errors.grownUpPlace && <p className="text-red-500 text-sm mt-1">{errors.grownUpPlace}</p>}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isOutOfTown"
            checked={data.isOutOfTown}
            onCheckedChange={(checked) => setData({ ...data, isOutOfTown: Boolean(checked) })}
          />
          <Label htmlFor="isOutOfTown">Sei fuori-sede?</Label>
        </div>

        {data.isOutOfTown && (
          <div className="space-y-4">
            <div>
              <Label>Da quanto tempo?</Label>
              <Select 
                value={data.outOfTownSince} 
                onValueChange={(value) => setData({ ...data, outOfTownSince: value })}
              >
                <SelectTrigger className={errors.outOfTownSince ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleziona da quanto tempo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meno_1_anno">Meno di 1 anno</SelectItem>
                  <SelectItem value="1_anno">1 anno</SelectItem>
                  <SelectItem value="2_anni">2 anni</SelectItem>
                  <SelectItem value="3_anni">3 anni</SelectItem>
                  <SelectItem value="4_anni">4 anni</SelectItem>
                  <SelectItem value="5_anni_plus">5+ anni</SelectItem>
                </SelectContent>
              </Select>
              {errors.outOfTownSince && <p className="text-red-500 text-sm mt-1">{errors.outOfTownSince}</p>}
            </div>

            <div>
              <Label>Quanto spesso torni a casa?</Label>
              <Select 
                value={data.visitFrequency} 
                onValueChange={(value) => setData({ ...data, visitFrequency: value })}
              >
                <SelectTrigger className={errors.visitFrequency ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleziona la frequenza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ogni_settimana">Ogni settimana</SelectItem>
                  <SelectItem value="ogni_2_settimane">Ogni 2 settimane</SelectItem>
                  <SelectItem value="ogni_mese">Ogni mese</SelectItem>
                  <SelectItem value="ogni_2_mesi">Ogni 2 mesi</SelectItem>
                  <SelectItem value="ogni_3_6_mesi">Ogni 3-6 mesi</SelectItem>
                  <SelectItem value="meno_2_volte_anno">Meno di 2 volte l'anno</SelectItem>
                </SelectContent>
              </Select>
              {errors.visitFrequency && <p className="text-red-500 text-sm mt-1">{errors.visitFrequency}</p>}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePrevious}>Indietro</Button>
          <Button onClick={handleNext}>Avanti</Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Riepilogo</CardTitle>
        <CardDescription>
          Verifica i dati inseriti prima di salvare
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Nome:</strong> {data.firstName}
          </div>
          <div>
            <strong>Cognome:</strong> {data.lastName}
          </div>
          <div>
            <strong>Età:</strong> {data.age}
          </div>
          <div>
            <strong>Status:</strong> {data.status.replace('_', ' ')}
          </div>
          {data.studyCity && (
            <div className="col-span-2">
              <strong>Città di studio:</strong> {data.studyCity}
            </div>
          )}
          <div className="col-span-2">
            <strong>Reddito familiare:</strong> {data.familyIncome.replace('_', ' ')}
          </div>
          <div className="col-span-2">
            <strong>Luogo di nascita:</strong> {data.birthPlace}
          </div>
          <div className="col-span-2">
            <strong>Dove sei cresciuto:</strong> {data.grownUpPlace}
          </div>
          <div>
            <strong>Fuori-sede:</strong> {data.isOutOfTown ? 'Sì' : 'No'}
          </div>
          {data.isOutOfTown && (
            <>
              <div>
                <strong>Da quanto:</strong> {data.outOfTownSince.replace('_', ' ')}
              </div>
              <div className="col-span-2">
                <strong>Frequenza visite:</strong> {data.visitFrequency.replace('_', ' ')}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handlePrevious}>Indietro</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salva Questionario'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Questionario di Ricerca</h1>
            <p className="text-gray-600 mt-2">
              Compila il questionario per partecipare alla ricerca
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push('/questionario/risultati')}
            className="ml-4"
          >
            Visualizza risultati
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === currentStep
                    ? 'bg-blue-600 text-white'
                    : step < currentStep
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
}