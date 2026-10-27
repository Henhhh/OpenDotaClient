import { Pressable, ScrollView } from "react-native";
import { C } from "@/shared/theme/theme";
import { Txt } from "@/shared/ui/Txt";

export function Choices({
  items,
  value,
  onChange,
  segmented = false,
  label = (v: string) => v,
}: {
  items: readonly string[];
  value: string;
  onChange: (v: string) => void;
  segmented?: boolean;
  label?: (v: string) => string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 1 }}
      contentContainerStyle={{
        gap: 6,
        paddingVertical: 8,
        ...(segmented
          ? { backgroundColor: C.card, paddingHorizontal: 5, borderRadius: 24 }
          : {}),
      }}
    >
      {items.map((x) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: x === value }}
          aria-pressed={x === value}
          key={x}
          onPress={() => onChange(x)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 22,
            backgroundColor:
              x === value ? (segmented ? C.raised : "#321d22") : C.card,
            borderWidth: 1,
            borderColor: x === value && !segmented ? C.red : C.line,
          }}
        >
          <Txt size={11} bold color={value === x ? C.text : C.muted}>
            {label(x)}
          </Txt>
        </Pressable>
      ))}
    </ScrollView>
  );
}
