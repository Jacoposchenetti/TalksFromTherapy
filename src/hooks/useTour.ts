import { useState, useEffect, useCallback } from 'react'

interface TourStep {
  id: string
  title: string
  content: string
  target: string
  position: 'top' | 'bottom' | 'left' | 'right'
  highlight?: boolean
}

export const useTour = () => {
  const [isTourOpen, setIsTourOpen] = useState(false)
  const [hasCompletedTour, setHasCompletedTour] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem('tft-tour-completed')
    setHasCompletedTour(completed === 'true')
  }, [])

  const startTour = useCallback(() => {
    setIsTourOpen(true)
  }, [])

  const closeTour = useCallback(() => {
    setIsTourOpen(false)
  }, [])

  const completeTour = useCallback(() => {
    setHasCompletedTour(true)
    localStorage.setItem('tft-tour-completed', 'true')
    setIsTourOpen(false)
  }, [])

  const resetTour = useCallback(() => {
    localStorage.removeItem('tft-tour-completed')
    setHasCompletedTour(false)
  }, [])

  return {
    isTourOpen,
    hasCompletedTour,
    startTour,
    closeTour,
    completeTour,
    resetTour
  }
}

// Tour steps for dashboard
export const dashboardTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Benvenuto in TalksFromTherapy! 👋",
    content: "Questo è il tuo dashboard principale. Ti guiderò attraverso le funzionalità più importanti della piattaforma.",
    target: "[data-tour='dashboard-header']",
    position: "bottom",
    highlight: false
  },
  {
    id: "stats-overview",
    title: "Panoramica Statistiche",
    content: "Qui puoi vedere un riepilogo rapido: pazienti registrati, sessioni caricate e trascrizioni completate.",
    target: "[data-tour='stats-cards']",
    position: "bottom",
    highlight: true
  },
  {
    id: "quick-actions",
    title: "Azioni Rapide",
    content: "Usa questi pulsanti per accedere velocemente alle funzioni principali: gestire pazienti, visualizzare sessioni e accedere ai tutorial.",
    target: "[data-tour='quick-actions']",
    position: "right",
    highlight: true
  },
  {
    id: "patients-button",
    title: "Gestione Pazienti",
    content: "Clicca qui per creare nuovi profili pazienti o gestire quelli esistenti. Tutti i dati sono criptati e conformi al GDPR.",
    target: "[data-tour='patients-button']",
    position: "right",
    highlight: true
  },
  {
    id: "sessions-button",
    title: "Sessioni Audio",
    content: "Qui puoi caricare nuove sessioni audio e visualizzare quelle esistenti. Il sistema transcriverà automaticamente l'audio.",
    target: "[data-tour='sessions-button']",
    position: "right",
    highlight: true
  },
  {
    id: "help-button",
    title: "Tutorial e Aiuto",
    content: "Accedi ai tutorial dettagliati per imparare tutte le funzionalità della piattaforma. Perfetto per approfondire l'uso del sistema!",
    target: "[data-tour='help-button']",
    position: "right",
    highlight: true
  },
  {
    id: "account-info",
    title: "Informazioni Account",
    content: "Qui trovi i dettagli del tuo account. La sicurezza e la privacy sono le nostre priorità principali.",
    target: "[data-tour='account-info']",
    position: "left",
    highlight: true
  },
  {
    id: "complete",
    title: "Tour Completato! 🎉",
    content: "Ottimo lavoro! Ora sei pronto per utilizzare TalksFromTherapy. Puoi sempre rivedere i tutorial dalla sezione Aiuto o riavviare questo tour cliccando sul pulsante 'Tour guidato'.",
    target: "[data-tour='dashboard-header']",
    position: "bottom",
    highlight: false
  }
]

// Tour steps for patients page
export const patientsTourSteps: TourStep[] = [
  {
    id: "patients-welcome",
    title: "Gestione Pazienti 👥",
    content: "Questa è la sezione per gestire i profili dei tuoi pazienti. Tutti i dati sono criptati e sicuri.",
    target: "[data-tour='patients-header']",
    position: "bottom",
    highlight: false
  },
  {
    id: "add-patient",
    title: "Aggiungi Nuovo Paziente",
    content: "Clicca qui per creare un nuovo profilo paziente. Dovrai inserire solo le informazioni essenziali.",
    target: "[data-tour='add-patient-button']",
    position: "bottom",
    highlight: true
  },
  {
    id: "patients-list",
    title: "Lista Pazienti",
    content: "Qui vedrai tutti i tuoi pazienti. Clicca su un paziente per accedere alle sue sessioni e analisi.",
    target: "[data-tour='patients-list']",
    position: "top",
    highlight: true
  }
]
