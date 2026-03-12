import { ILogger } from "./Logger";

type HandlerArgs = unknown[];
type SafeHandler<TArgs extends HandlerArgs> = (...args: TArgs) => void | Promise<void>;

export function withErrorLogging<TArgs extends HandlerArgs>(
  logger: ILogger,
  handlerName: string,
  handler: SafeHandler<TArgs>,
): (...args: TArgs) => void {
  return (...args: TArgs): void => {
    void Promise.resolve(handler(...args)).catch((error: unknown) => {
      logger.error(`Unhandled error in ${handlerName}`, error);
    });
  };
}

