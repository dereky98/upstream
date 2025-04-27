-- Create the interview_transcripts table if it doesn't exist
CREATE TABLE IF NOT EXISTS "interview_transcripts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "interview_id" TEXT UNIQUE NOT NULL,
  "transcript" JSONB NOT NULL DEFAULT '[]',
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE "interview_transcripts" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow access to authenticated users
CREATE POLICY "Enable all access for authenticated users" 
  ON "interview_transcripts" 
  FOR ALL 
  TO authenticated 
  USING (true);

-- Comment on the table and columns
COMMENT ON TABLE "interview_transcripts" IS 'Stores interview transcripts from the AI interviews';
COMMENT ON COLUMN "interview_transcripts"."interview_id" IS 'Reference to the interview ID';
COMMENT ON COLUMN "interview_transcripts"."transcript" IS 'JSON array of transcript messages with role, content, and timestamp';

-- Create index on interview_id for faster lookups
CREATE INDEX IF NOT EXISTS "interview_transcripts_interview_id_idx" ON "interview_transcripts" ("interview_id"); 