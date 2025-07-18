-- Create session_notes table in Supabase
CREATE TABLE IF NOT EXISTS session_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "sessionId" TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: one note per session
    UNIQUE("sessionId")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_notes_session_id ON session_notes("sessionId");
CREATE INDEX IF NOT EXISTS idx_session_notes_created_at ON session_notes("createdAt");

-- Enable Row Level Security
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own session notes"
ON session_notes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sessions 
        WHERE sessions.id = session_notes."sessionId" 
        AND sessions."userId" = auth.uid()
        AND sessions."isActive" = true
    )
);

CREATE POLICY "Users can insert their own session notes"
ON session_notes FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sessions 
        WHERE sessions.id = session_notes."sessionId" 
        AND sessions."userId" = auth.uid()
        AND sessions."isActive" = true
    )
);

CREATE POLICY "Users can update their own session notes"
ON session_notes FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM sessions 
        WHERE sessions.id = session_notes."sessionId" 
        AND sessions."userId" = auth.uid()
        AND sessions."isActive" = true
    )
);

CREATE POLICY "Users can delete their own session notes"
ON session_notes FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM sessions 
        WHERE sessions.id = session_notes."sessionId" 
        AND sessions."userId" = auth.uid()
        AND sessions."isActive" = true
    )
);

-- Create trigger to update updatedAt automatically
CREATE OR REPLACE FUNCTION update_session_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_notes_updated_at
    BEFORE UPDATE ON session_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_session_notes_updated_at();
