'use client'

import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, Pause, X, SkipBack, SkipForward } from 'lucide-react'
import { useState, useEffect } from 'react'

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AudioPlayer() {
  const { 
    currentSession, 
    isPlaying, 
    currentTime, 
    duration, 
    isLoading,
    error,
    togglePlayPause, 
    stop, 
    seek 
  } = useAudioPlayer()

  const [isDragging, setIsDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const displayTime = isDragging ? dragTime : currentTime

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration
    seek(newTime)
  }

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration
    setDragTime(newTime)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    const progressBar = document.getElementById('audio-progress-bar')
    if (!progressBar) return
    
    const rect = progressBar.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percent * duration
    setDragTime(newTime)
  }

  const handleMouseUp = () => {
    if (isDragging) {
      seek(dragTime)
      setIsDragging(false)
    }
  }

  // SEMPRE chiamiamo useEffect, mai condizionalmente
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragTime])

  const skipBackward = () => {
    const newTime = Math.max(0, currentTime - 10)
    seek(newTime)
  }

  const skipForward = () => {
    const newTime = Math.min(duration, currentTime + 10)
    seek(newTime)
  }

  // Renderizzazione condizionale DOPO tutti gli hooks
  if (!currentSession) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <Card className="border-0 rounded-none">
        <div className="p-4">
          {/* Session Info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {currentSession.title}
              </h3>
              <p className="text-xs text-gray-500">
                Paziente: {currentSession.patient.initials}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={stop}
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-3">
            <div 
              id="audio-progress-bar"
              className="relative w-full h-2 bg-gray-200 rounded-full cursor-pointer"
              onClick={handleProgressClick}
              onMouseDown={handleProgressMouseDown}
            >
              {/* Progress */}
              <div 
                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
              
              {/* Drag indicator */}
              {isDragging && (
                <div 
                  className="absolute top-0 h-full w-1 bg-blue-700 rounded-full transform -translate-x-0.5"
                  style={{ left: `${(dragTime / duration) * 100}%` }}
                />
              )}
              
              {/* Seek handle */}
              <div 
                className="absolute top-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md transform -translate-y-1/2 -translate-x-2 cursor-grab active:cursor-grabbing"
                style={{ left: `${progress}%` }}
              />
            </div>
            
            {/* Time Display */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(displayTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={skipBackward}
              disabled={isLoading}
              className="text-gray-600"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={togglePlayPause}
              disabled={isLoading}
              className="w-12 h-12 rounded-full"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={skipForward}
              disabled={isLoading}
              className="text-gray-600"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
