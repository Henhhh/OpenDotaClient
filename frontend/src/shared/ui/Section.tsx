import { Pressable, Text, View } from "react-native";
import { s } from "@/shared/theme/theme";
import { Txt } from "@/shared/ui/Txt";

export function Section({
  title,
  eyebrow,
  action,
  onPress,
}: {
  title: string;
  eyebrow?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={[s.between, s.section]}>
      <View>
        {eyebrow && <Text style={s.label}>{eyebrow.toUpperCase()}</Text>}
        <Text style={s.title}>{title}</Text>
      </View>
      {action && (
        <Pressable onPress={onPress} accessibilityRole="button">
          <Txt muted>{action} ›</Txt>
        </Pressable>
      )}
    </View>
  );
}
