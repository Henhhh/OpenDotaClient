// Web session tokens stay in the HttpOnly cookie managed by the backend.
export const readToken = async (): Promise<string | null> => null;
export const writeToken = async (_value: string | null) => {};
