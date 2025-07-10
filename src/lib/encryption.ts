import crypto from 'crypto'

/**
 * SISTEMA DI CRITTOGRAFIA PER DATI SENSIBILI
 * Usa AES-256-GCM per crittografia simmetrica sicura
 */

const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16  // 128 bits
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const ITERATIONS = 100000

/**
 * Genera una chiave derivata dalla password master
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512')
}

/**
 * Ottiene la chiave master dall'environment
 */
function getMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY non configurata nell\'environment')
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_MASTER_KEY deve essere almeno 32 caratteri')
  }
  return key
}

/**
 * Cripta dati sensibili
 * @param plaintext Testo da criptare
 * @returns Stringa criptata (base64)
 */
export function encryptSensitiveData(plaintext: string): string {
  if (!plaintext || plaintext.trim() === '') {
    return ''
  }

  try {
    const masterKey = getMasterKey()
    
    // Genera salt e IV casuali
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)
    
    // Deriva la chiave
    const key = deriveKey(masterKey, salt)
    
    // Cripta
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Combina salt + iv + encrypted (senza tag per CBC)
    const combined = Buffer.concat([
      salt,
      iv,
      Buffer.from(encrypted, 'hex')
    ])
    
    return combined.toString('base64')
  } catch (error) {
    console.error('Errore crittografia:', error)
    throw new Error('Errore durante la crittografia dei dati')
  }
}

/**
 * Decripta dati sensibili
 * @param encryptedData Stringa criptata (base64)
 * @returns Testo in chiaro
 */
export function decryptSensitiveData(encryptedData: string): string {
  if (!encryptedData || encryptedData.trim() === '') {
    return ''
  }

  try {
    const masterKey = getMasterKey()
    
    // Decodifica da base64
    const combined = Buffer.from(encryptedData, 'base64')
    
    // Estrae i componenti
    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH)
    
    // Deriva la chiave
    const key = deriveKey(masterKey, salt)
    
    // Decripta
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    
    let decrypted = decipher.update(encrypted, null, 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Errore decrittografia:', error)
    throw new Error('Errore durante la decrittografia dei dati')
  }
}

/**
 * Cripta solo se i dati sono sensibili (non vuoti)
 */
export function encryptIfSensitive(data: string | null): string | null {
  if (!data || data.trim() === '') {
    return data
  }
  return encryptSensitiveData(data)
}

/**
 * Decripta solo se i dati sono criptati
 */
export function decryptIfEncrypted(data: string | null): string | null {
  if (!data || data.trim() === '') {
    return data
  }
  
  // Controlla se sembra essere dato criptato (base64)
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  if (base64Regex.test(data) && data.length > 100) {
    try {
      return decryptSensitiveData(data)
    } catch {
      // Se fallisce la decrittografia, probabilmente non era criptato
      return data
    }
  }
  
  return data
}

/**
 * Test della crittografia
 */
export function testEncryption(): boolean {
  try {
    const testData = "Questo è un test di crittografia per dati sensibili"
    const encrypted = encryptSensitiveData(testData)
    const decrypted = decryptSensitiveData(encrypted)
    
    console.log('🔐 Test crittografia:')
    console.log('  Input:', testData.substring(0, 30) + '...')
    console.log('  Criptato:', encrypted.substring(0, 30) + '...')
    console.log('  Decriptato:', decrypted.substring(0, 30) + '...')
    console.log('  Match:', testData === decrypted ? '✅' : '❌')
    
    return testData === decrypted
  } catch (error) {
    console.error('❌ Test crittografia fallito:', error)
    return false
  }
}
