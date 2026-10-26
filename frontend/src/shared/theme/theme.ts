import { StyleSheet } from "react-native";

export const C = {
  bg: "#0d0f14",
  card: "#191d26",
  raised: "#20252f",
  line: "#2a303c",
  text: "#f2f3f5",
  muted: "#9aa1ae",
  subtle: "#687080",
  red: "#d63b3b",
  gold: "#d9ac60",
  win: "#37c88a",
  loss: "#eb5757",
};

export const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#242934",
    gap: 12,
  },
  title: { color: C.text, fontSize: 18, fontWeight: "800" },
  text: { color: C.text, fontSize: 13 },
  muted: { color: C.muted, fontSize: 11, lineHeight: 17 },
  label: { color: C.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  section: { marginTop: 24, marginBottom: 12 },
  input: {
    color: C.text,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 24,
    paddingHorizontal: 16,
    minHeight: 46,
    flex: 1,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 12,
  },
});
