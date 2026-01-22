export interface TimerEvents {
  onTick: (seconds: number) => void;
  onEnd: () => void;
}

export class TimerService {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Starts a countdown timer for a specific competition.
   * If a timer already exists for this competition, it will be cleared first.
   */
  public start(
    competitionId: string,
    durationSeconds: number,
    events: TimerEvents,
  ): void {
    this.stop(competitionId);

    let remaining = durationSeconds;

    const timer = setInterval(() => {
      if (remaining > 0) {
        remaining -= 1;
        events.onTick(remaining);
      } else {
        this.stop(competitionId);
        events.onEnd();
      }
    }, 1000);

    this.timers.set(competitionId, timer);
  }

  /**
   * Stops and clears the timer for a specific competition.
   */
  public stop(competitionId: string): void {
    const existingTimer = this.timers.get(competitionId);
    if (existingTimer) {
      clearInterval(existingTimer);
      this.timers.delete(competitionId);
    }
  }

  /**
   * Checks if a timer is running for a competition.
   */
  public isRunning(competitionId: string): boolean {
    return this.timers.has(competitionId);
  }

  /**
   * Clears all active timers. Useful for server shutdown or reset.
   */
  public clearAll(): void {
    for (const competitionId of this.timers.keys()) {
      this.stop(competitionId);
    }
  }
}
