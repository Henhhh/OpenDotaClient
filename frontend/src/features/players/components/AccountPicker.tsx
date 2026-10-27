import { useState } from "react";
import { TextInput, View } from "react-native";
import { useSession } from "@/features/auth/SessionProvider";
import { useAppState } from "@/shared/state/AppState";
import { validAccount } from "../api/queries";
import { Button } from "@/shared/ui/Button";
import { Txt } from "@/shared/ui/Txt";
import { C, s } from "@/shared/theme/theme";
export function useViewedAccount() {
  const { session } = useSession(),
    { state } = useAppState();
  return session?.user.dota_account_id ?? state.account;
}
export function AccountPicker() {
  const { set } = useAppState(),
    auth = useSession(),
    account = useViewedAccount();
  const [draft, setDraft] = useState(account),
    [previous, setPrevious] = useState(account),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (previous !== account) {
    setPrevious(account);
    setDraft(account);
  }
  return (
    <View style={{ gap: 8 }}>
      <Txt muted>
        Viewing public Dota account {account}. This does not verify ownership.
      </Txt>
      <View style={s.row}>
        <TextInput
          accessibilityLabel="Player account ID"
          value={draft}
          onChangeText={setDraft}
          keyboardType="number-pad"
          placeholder="Dota account ID"
          placeholderTextColor={C.subtle}
          style={s.input}
        />
        <Button
          onPress={() => {
            const id = draft.trim();
            if (!validAccount(id)) {
              setError("Enter a valid 32-bit account ID.");
              return;
            }
            if (busy) return;
            setError("");
            setBusy(true);
            void (auth.session ? auth.setDotaAccount(id) : Promise.resolve())
              .then(() => set((v) => ({ ...v, account: id })))
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Saving…" : "View player"}
        </Button>
      </View>
      {!!error && <Txt color={C.loss}>{error}</Txt>}
    </View>
  );
}
