'use client'

import { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react'

interface Session {
  id: string
  title: string
  audioUrl?: string
  patient: {
    id: string
    initials: string
  }
}

interface AudioPlayerState {
  currentSession: Session | null
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoading: boolean
  error: string | null
}

interface AudioPlayerContextType extends AudioPlayerState {
  playSession: (session: Session) => void
  pause: () => void
  play: () => void
  stop: () => void
  seek: (time: number) => void
  togglePlayPause: () => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null)

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [state, setState] = useState<AudioPlayerState>({
    currentSession: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null
  })

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    const audio = audioRef.current

    const handleLoadStart = () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
    }

    const handleLoadedMetadata = () => {
      setState(prev => ({ 
        ...prev, 
        duration: audio.duration || 0,
        isLoading: false
      }))
    }

    const handleTimeUpdate = () => {
      setState(prev => ({ 
        ...prev, 
        currentTime: audio.currentTime || 0 
      }))
    }

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }))
    }

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }))
    }

    const handleEnded = () => {
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        currentTime: 0 
      }))
    }

    const handleError = () => {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        isPlaying: false,
        error: 'Errore durante il caricamento dell\'audio'
      }))
    }

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }))
    }

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      // Cleanup
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.pause()
      audio.src = ''
    }
  }, [])

  const playSession = async (session: Session) => {
    if (!audioRef.current || !session.audioUrl) {
      console.warn('[AUDIO DEBUG] audioRef o audioUrl mancante', { audioRef: !!audioRef.current, audioUrl: session.audioUrl })
      return
    }

    const audio = audioRef.current
    
    // Se la stessa sessione è già selezionata, toggla play/pause
    if (state.currentSession?.id === session.id) {
      if (state.isPlaying) {
        audio.pause()
      } else {
        audio.play().catch(console.error)
      }
      return
    }

    setState(prev => ({ 
      ...prev, 
      currentSession: session,
      currentTime: 0,
      duration: 0,
      isLoading: true,
      error: null
    }))

    try {
      console.log('[AUDIO DEBUG] Chiedo signed URL per sessione', session.id)
      const res = await fetch(`/api/sessions/${session.id}/audio`)
      if (!res.ok) {
        console.error('[AUDIO DEBUG] Errore fetch signed URL', res.status, res.statusText)
        throw new Error('Impossibile ottenere URL audio')
      }
      const { url } = await res.json()
      console.log('[AUDIO DEBUG] Signed URL ricevuto:', url)
      console.log('[AUDIO DEBUG] audio.src PRIMA:', audio.src)
      audio.src = url
      console.log('[AUDIO DEBUG] audio.src DOPO:', audio.src)
      audio.load()
      audio.play().catch(e => console.error('[AUDIO DEBUG] Errore play:', e))
    } catch (err) {
      console.error('[AUDIO DEBUG] Errore generale playSession:', err)
      setState(prev => ({ ...prev, isLoading: false, error: 'Errore nel caricamento audio' }))
    }
  }

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }

  const play = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error)
    }
  }

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setState(prev => ({ 
      ...prev, 
      currentSession: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0
    }))
  }

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setState(prev => ({ ...prev, currentTime: time }))
    }
  }

  const togglePlayPause = () => {
    if (state.isPlaying) {
      pause()
    } else {
      play()
    }
  }

  const contextValue: AudioPlayerContextType = {
    ...state,
    playSession,
    pause,
    play,
    stop,
    seek,
    togglePlayPause
  }

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider')
  }
  return context
}
