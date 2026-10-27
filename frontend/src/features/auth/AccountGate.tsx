import { useState, type ReactNode } from "react";
import { TextInput, View } from "react-native";
import { useSession } from "./SessionProvider";
import { ApiError } from "@/shared/api/client";
import { ApiState } from "@/shared/ui/ApiState";
import { Txt } from "@/shared/ui/Txt";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { C, s } from "@/shared/theme/theme";
export function AuthForm({ upgrade = false }: { upgrade?: boolean }) {
  const auth = useSession(),
    [register, setRegister] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  const create = upgrade || register;
  return (
    <Card>
      <Txt bold size={20}>
        {upgrade
          ? "Set up email sign-in"
          : register
            ? "Create account"
            : "Sign in"}
      </Txt>
      {upgrade && (
        <Txt muted>
          Your existing account data will stay attached to this account. Set
          credentials before signing out.
        </Txt>
      )}
      {create && (
        <TextInput
          accessibilityLabel="Display name"
          placeholder="Display name"
          placeholderTextColor={C.subtle}
          value={name}
          onChangeText={setName}
          style={[s.input, { flex: undefined }]}
        />
      )}
      <TextInput
        accessibilityLabel="Email"
        placeholder="Email"
        placeholderTextColor={C.subtle}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={[s.input, { flex: undefined }]}
      />
      <TextInput
        accessibilityLabel="Password"
        placeholder="Password (6–128 characters)"
        placeholderTextColor={C.subtle}
        autoCapitalize="none"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={[s.input, { flex: undefined }]}
      />
      {create && (
        <TextInput
          accessibilityLabel="Confirm password"
          placeholder="Confirm password"
          placeholderTextColor={C.subtle}
          autoCapitalize="none"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          style={[s.input, { flex: undefined }]}
        />
      )}
      {!!error && <Txt color={C.loss}>{error}</Txt>}
      <Button
        primary
        onPress={() => {
          if (auth.busy) return;
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError("Enter a valid email.");
            return;
          }
          if (password.length < 6 || password.length > 128) {
            setError("Password must contain 6–128 characters.");
            return;
          }
          if (create && (name.trim().length < 2 || name.trim().length > 80)) {
            setError("Display name must contain 2–80 characters.");
            return;
          }
          if (create && password !== confirm) {
            setError("Passwords do not match.");
            return;
          }
          setError("");
          const action = upgrade
            ? auth.setCredentials(email.trim(), password, name.trim())
            : register
              ? auth.register(email.trim(), password, name.trim())
              : auth.signIn(email.trim(), password);
          void action
            .then(() => {
              setPassword("");
              setConfirm("");
            })
            .catch((e) => setError(e.message));
        }}
      >
        {auth.busy
          ? "Please wait…"
          : upgrade
            ? "Save login credentials"
            : register
              ? "Register"
              : "Sign in"}
      </Button>
      {!upgrade && (
        <Button
          onPress={() => {
            if (!auth.busy) {
              setRegister((v) => !v);
              setError("");
              setPassword("");
              setConfirm("");
            }
          }}
        >
          {register ? "Already have an account? Sign in" : "Create an account"}
        </Button>
      )}
    </Card>
  );
}
export function AccountGate({ children }: { children: ReactNode }) {
  const auth = useSession();
  if (auth.pending) return <ApiState pending retry={auth.retry} />;
  if (auth.session) return <>{children}</>;
  return (
    <View style={{ gap: 12 }}>
      {auth.error &&
        !(auth.error instanceof ApiError && auth.error.status === 401) && (
          <ApiState error={auth.error} retry={auth.retry} />
        )}
      <AuthForm />
    </View>
  );
}
