interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

export class NotificationManager {
  static show({ type, title, message, duration = 5000 }: NotificationProps) {
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 max-w-sm w-full z-50 transform transition-all duration-300 translate-x-full`
    
    const colorClasses = {
      success: 'bg-green-100 border-green-400 text-green-700',
      error: 'bg-red-100 border-red-400 text-red-700',
      warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
      info: 'bg-blue-100 border-blue-400 text-blue-700'
    }
    
    const icons = {
      success: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`,
      error: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>`,
      warning: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>`,
      info: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>`
    }
    
    notification.innerHTML = `
      <div class="border ${colorClasses[type]} px-4 py-3 rounded-lg shadow-lg">
        <div class="flex items-start">
          <div class="flex-shrink-0 mr-3">
            ${icons[type]}
          </div>
          <div class="flex-1">
            ${title ? `<h4 class="font-semibold text-sm mb-1">${title}</h4>` : ''}
            <p class="text-sm">${message}</p>
          </div>
          <button class="flex-shrink-0 ml-3 text-gray-500 hover:text-gray-700" onclick="this.parentElement.parentElement.parentElement.remove()">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    `
    
    document.body.appendChild(notification)
    
    // Animate in
    requestAnimationFrame(() => {
      notification.classList.remove('translate-x-full')
      notification.classList.add('translate-x-0')
    })
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentElement) {
          notification.classList.add('translate-x-full')
          setTimeout(() => {
            if (notification.parentElement) {
              document.body.removeChild(notification)
            }
          }, 300)
        }      }, duration)
    }
  }

  static showSuccess(message: string, title?: string, duration?: number) {
    this.show({ type: 'success', title, message, duration })
  }

  static showError(message: string, title?: string, duration?: number) {
    this.show({ type: 'error', title, message, duration })
  }

  static showWarning(message: string, title?: string, duration?: number) {
    this.show({ type: 'warning', title, message, duration })
  }

  static showInfo(message: string, title?: string, duration?: number) {
    this.show({ type: 'info', title, message, duration })
  }
}
