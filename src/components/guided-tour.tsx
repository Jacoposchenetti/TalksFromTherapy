"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, ArrowLeft, ArrowRight, Zap } from "lucide-react"

interface TourStep {
  id: string
  title: string
  content: string
  target: string
  position: 'top' | 'bottom' | 'left' | 'right'
  highlight?: boolean
}

interface GuidedTourProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  steps: TourStep[]
}

interface Position {
  top: number
  left: number
}

export default function GuidedTour({ isOpen, onClose, onComplete, steps }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [cardPosition, setCardPosition] = useState<Position>({ top: 0, left: 0 })

  useEffect(() => {
    if (isOpen && steps[currentStep]) {
      const element = document.querySelector(steps[currentStep].target) as HTMLElement
      setTargetElement(element)
      
      if (element) {
        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // Add highlight if specified
        if (steps[currentStep].highlight) {
          element.classList.add('tour-highlight')
        }

        // Calculate position for tour card
        setTimeout(() => {
          const rect = element.getBoundingClientRect()
          const step = steps[currentStep]
          let top = 0
          let left = 0

          switch (step.position) {
            case 'bottom':
              top = rect.bottom + window.scrollY + 10
              left = rect.left + window.scrollX + (rect.width / 2) - 200 // Center the card
              break
            case 'top':
              top = rect.top + window.scrollY - 320 // Card height estimate
              left = rect.left + window.scrollX + (rect.width / 2) - 200
              break
            case 'right':
              top = rect.top + window.scrollY
              left = rect.right + window.scrollX + 10
              break
            case 'left':
              top = rect.top + window.scrollY
              left = rect.left + window.scrollX - 410 // Card width estimate
              break
            default:
              top = rect.bottom + window.scrollY + 10
              left = rect.left + window.scrollX
          }

          // Ensure card stays within viewport
          const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
          }

          if (left < 10) left = 10
          if (left + 400 > viewport.width) left = viewport.width - 410
          if (top < 10) top = 10

          setCardPosition({ top, left })
        }, 100)
      }
    }

    return () => {
      // Cleanup highlights
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight')
      })
    }
  }, [currentStep, isOpen, steps])

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeTour = () => {
    // Cleanup highlights before completing
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight')
    })
    
    // Mark tour as completed
    localStorage.setItem('tft-tour-completed', 'true')
    onComplete()
    onClose()
  }

  const skipTour = () => {
    // Cleanup highlights before skipping
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight')
    })
    
    localStorage.setItem('tft-tour-completed', 'true')
    onClose()
  }

  if (!isOpen || !steps[currentStep]) return null

  const step = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Tour card */}
      <div 
        className="fixed z-50 w-96"
        style={{
          top: `${cardPosition.top}px`,
          left: `${cardPosition.left}px`
        }}
      >
        <Card className="shadow-2xl border-2 border-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Tour guidato</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Passo {currentStep + 1} di {steps.length}
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <h3 className="font-semibold text-base mb-2">{step.title}</h3>
            <CardDescription className="text-sm leading-relaxed mb-4">
              {step.content}
            </CardDescription>
            
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={skipTour}
              >
                Salta tour
              </Button>
              
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevStep}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Indietro
                  </Button>
                )}
                
                <Button
                  size="sm"
                  onClick={nextStep}
                >
                  {currentStep === steps.length - 1 ? (
                    "Completa"
                  ) : (
                    <>
                      Avanti
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          border-radius: 8px;
          transition: all 0.3s ease;
        }
      `}</style>
    </>
  )
}
