-- GDPR Hard Delete Implementation
-- Per eliminazione completa e immediata

-- 1. Elimina messaggi chat di analisi
DELETE FROM chat_messages 
WHERE chat_id IN (
  SELECT id FROM analysis_chats WHERE user_id = $user_id
);

-- 2. Elimina chat di analisi
DELETE FROM analysis_chats WHERE user_id = $user_id;

-- 3. Elimina note delle sessioni
DELETE FROM session_notes WHERE session_id IN (
  SELECT id FROM sessions WHERE userId = $user_id
);

-- 4. Elimina sessioni
DELETE FROM sessions WHERE userId = $user_id AND id = $session_id;

-- 5. Log della cancellazione per audit
INSERT INTO gdpr_deletion_log (
  user_id,
  deleted_at,
  deletion_type,
  data_categories,
  legal_basis
) VALUES (
  $user_id,
  NOW(),
  'user_request',
  ARRAY['sessions', 'transcripts', 'audio_files'],
  'Art. 17 GDPR - Right to erasure'
);
