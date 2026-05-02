import express from "express";
import { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import adminRouter from "./admin";
import prisma from "../db/prisma";
import { createLoginHandler } from "../auth/http";
import { getSecurityConfig } from "../auth/config";

describe("admin competition import route", () => {
  let server: ReturnType<ReturnType<typeof express>["listen"]>;
  let baseUrl = "";
  let token = "";

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const securityConfig = getSecurityConfig(process.env);
    app.post("/api/auth/login", createLoginHandler(securityConfig));
    app.use("/api/admin", adminRouter);
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "admin",
        password: securityConfig.adminPassword,
      }),
    });
    expect(loginResponse.ok).toBe(true);
    const payload = (await loginResponse.json()) as { token: string };
    token = payload.token;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });

  it("rejects unauthorized import requests", async () => {
    const response = await fetch(`${baseUrl}/api/admin/competitions/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(401);
  });

  it("creates competition, rounds and questions from a valid import payload", async () => {
    const response = await fetch(`${baseUrl}/api/admin/competitions/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        competition: {
          title: "Imported Competition",
          status: "DRAFT",
          host_pin: "2222",
        },
        rounds: [
          {
            title: "Round A",
            type: "STANDARD",
            orderIndex: 1,
            questions: [
              {
                questionText: "Q1",
                type: "MULTIPLE_CHOICE",
                points: 0,
                timeLimitSeconds: 20,
                grading: "AUTO",
                section: "1",
                content: {
                  options: ["A", "B"],
                  correctIndices: [0],
                },
              },
              {
                questionText: "Q2",
                type: "OPEN_WORD",
                points: 2,
                timeLimitSeconds: 30,
                grading: "AUTO",
                section: "1",
                index: 4,
                realIndex: 8,
                content: {
                  answer: "test",
                },
              },
            ],
          },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      id: string;
      roundsCreated: number;
      questionsCreated: number;
    };
    expect(payload.roundsCreated).toBe(1);
    expect(payload.questionsCreated).toBe(2);

    const createdRounds = await prisma.round.findMany({
      where: { competitionId: payload.id },
      include: { questions: true },
    });
    expect(createdRounds).toHaveLength(1);
    expect(createdRounds[0]?.questions).toHaveLength(2);

    const [firstQuestion, secondQuestion] = createdRounds[0].questions.sort(
      (a, b) => (a.realIndex ?? 0) - (b.realIndex ?? 0),
    );
    expect(firstQuestion.index).toBe(0);
    expect(firstQuestion.realIndex).toBe(0);
    expect(secondQuestion.index).toBe(4);
    expect(secondQuestion.realIndex).toBe(8);
  });

  it("returns 400 for malformed JSON request payload", async () => {
    const response = await fetch(`${baseUrl}/api/admin/competitions/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "{ bad json",
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 for missing required import fields", async () => {
    const response = await fetch(`${baseUrl}/api/admin/competitions/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        competition: {
          title: "Missing rounds",
        },
        rounds: [],
      }),
    });

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: string; message: string };
    expect(payload.error).toBe("INVALID_IMPORT_DOCUMENT");
    expect(payload.message).toContain("rounds");
  });
});
