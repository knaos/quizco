-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE question_type AS ENUM ('CLOSED', 'MULTIPLE_CHOICE', 'OPEN_WORD', 'CROSSWORD');
CREATE TYPE grading_mode AS ENUM ('AUTO', 'MANUAL');
CREATE TYPE competition_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');
CREATE TYPE round_type AS ENUM ('STANDARD', 'CROSSWORD', 'SPEED_RUN');

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  color VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitions
CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  host_pin VARCHAR(50) NOT NULL,
  status competition_status DEFAULT 'DRAFT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rounds
CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  type round_type NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  type question_type NOT NULL,
  points INTEGER DEFAULT 10,
  time_limit_seconds INTEGER DEFAULT 30,
  content JSONB NOT NULL,
  grading grading_mode DEFAULT 'AUTO',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for JSONB
CREATE INDEX IF NOT EXISTS idx_questions_content ON questions USING GIN (content);

-- Answers
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  submitted_content JSONB NOT NULL,
  is_correct BOOLEAN,
  score_awarded INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard View
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  t.id as team_id,
  t.name,
  t.color,
  COALESCE(SUM(a.score_awarded), 0) as total_score
FROM teams t
LEFT JOIN answers a ON t.id = a.team_id AND a.is_correct = TRUE
GROUP BY t.id
ORDER BY total_score DESC;
