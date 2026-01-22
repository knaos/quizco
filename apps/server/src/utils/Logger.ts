export interface ILogger {
  info(message: string, ...args: any[]): void;
  error(message: string, error?: any, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export class Logger implements ILogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${this.context}] ${message}`;
  }

  info(message: string, ...args: any[]): void {
    console.info(this.formatMessage(message), ...args);
  }

  error(message: string, error?: any, ...args: any[]): void {
    const formattedMessage = this.formatMessage(message);
    if (error) {
      console.error(formattedMessage, error, ...args);
    } else {
      console.error(formattedMessage, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage(message), ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(this.formatMessage(message), ...args);
  }
}
