import * as SecureStore from "expo-secure-store";
export const readToken = () => SecureStore.getItemAsync("opendota.session");
export const writeToken = (value: string | null) =>
  value
    ? SecureStore.setItemAsync("opendota.session", value)
    : SecureStore.deleteItemAsync("opendota.session");
export const readFlow = () => SecureStore.getItemAsync("opendota.login");
export const writeFlow = (value: string | null) =>
  value
    ? SecureStore.setItemAsync("opendota.login", value)
    : SecureStore.deleteItemAsync("opendota.login");
