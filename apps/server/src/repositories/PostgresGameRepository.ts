import { Question, Team } from "@quizco/shared";
import { query } from "../db";
import { IGameRepository } from "./IGameRepository";

export class PostgresGameRepository implements IGameRepository {
  async getOrCreateTeam(
    competitionId: string,
    name: string,
    color: string
  ): Promise<Team> {
    const res = await query(
      "INSERT INTO teams (name, color) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color RETURNING id, name, color",
      [name, color]
    );

    const dbTeam = res.rows[0];
    const score = await this.getTeamScore(competitionId, dbTeam.id);

    return {
      id: dbTeam.id,
      name: dbTeam.name,
      color: dbTeam.color,
      score,
      lastAnswerCorrect: null,
    };
  }

  async getTeamScore(competitionId: string, teamId: string): Promise<number> {
    const res = await query(
      `SELECT COALESCE(SUM(a.score_awarded), 0) as total_score 
       FROM answers a 
       JOIN rounds r ON a.round_id = r.id 
       WHERE r.competition_id = $1 AND a.team_id = $2 AND a.is_correct = TRUE`,
      [competitionId, teamId]
    );
    return parseInt(res.rows[0]?.total_score || "0");
  }

  async reconnectTeam(
    competitionId: string,
    teamId: string
  ): Promise<Team | null> {
    const res = await query("SELECT * FROM teams WHERE id = $1", [teamId]);
    if (res.rows.length === 0) return null;

    const dbTeam = res.rows[0];
    const score = await this.getTeamScore(competitionId, teamId);

    return {
      id: dbTeam.id,
      name: dbTeam.name,
      color: dbTeam.color,
      score,
      lastAnswerCorrect: null,
    };
  }

  async getQuestion(questionId: string): Promise<Question | null> {
    const res = await query("SELECT * FROM questions WHERE id = $1", [
      questionId,
    ]);
    return (res.rows[0] as Question) || null;
  }

  async getAllQuestions(): Promise<any[]> {
    const res = await query("SELECT * FROM questions ORDER BY created_at");
    return res.rows;
  }

  async getQuestionsForCompetition(competitionId: string): Promise<any[]> {
    const res = await query(
      `SELECT q.* FROM questions q 
         JOIN rounds r ON q.round_id = r.id 
         WHERE r.competition_id = $1 
         ORDER BY r.order_index, q.created_at`,
      [competitionId]
    );
    return res.rows;
  }

  async saveAnswer(
    teamId: string,
    questionId: string,
    roundId: string,
    submittedContent: any,
    isCorrect: boolean | null,
    scoreAwarded: number
  ): Promise<any> {
    const res = await query(
      "INSERT INTO answers (team_id, question_id, round_id, submitted_content, is_correct, score_awarded) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [
        teamId,
        questionId,
        roundId,
        JSON.stringify(submittedContent),
        isCorrect,
        scoreAwarded,
      ]
    );
    return res.rows[0];
  }

  async getAnswer(answerId: string): Promise<any> {
    const res = await query("SELECT * FROM answers WHERE id = $1", [answerId]);
    return res.rows[0];
  }

  async updateAnswerGrading(
    answerId: string,
    isCorrect: boolean,
    scoreAwarded: number
  ): Promise<void> {
    await query(
      "UPDATE answers SET is_correct = $1, score_awarded = $2 WHERE id = $3",
      [isCorrect, scoreAwarded, answerId]
    );
  }

  async getSubmissionCount(questionId: string): Promise<number> {
    const res = await query(
      "SELECT COUNT(DISTINCT team_id) FROM answers WHERE question_id = $1",
      [questionId]
    );
    return parseInt(res.rows[0].count);
  }

  async getPendingAnswers(competitionId?: string): Promise<any[]> {
    let sql = `SELECT a.*, t.name as team_name, q.question_text 
               FROM answers a 
               JOIN teams t ON a.team_id = t.id 
               JOIN questions q ON a.question_id = q.id 
               WHERE a.is_correct IS NULL`;
    const params: any[] = [];

    if (competitionId) {
      sql += ` AND q.round_id IN (SELECT id FROM rounds WHERE competition_id = $1)`;
      params.push(competitionId);
    }

    const res = await query(sql, params);
    return res.rows;
  }
}
