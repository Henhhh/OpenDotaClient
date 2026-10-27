// Web session tokens are HttpOnly cookies; only the pre-login state is stored here.
export const readToken = async (): Promise<string | null> => null;
export const writeToken = async (_value: string | null) => {};
export const readFlow = async () =>
  window.sessionStorage.getItem("opendota.login");
export const writeFlow = async (value: string | null) => {
  if (value) window.sessionStorage.setItem("opendota.login", value);
  else window.sessionStorage.removeItem("opendota.login");
};
