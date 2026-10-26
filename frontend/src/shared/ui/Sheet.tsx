import { type ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { C, s } from "@/shared/theme/theme";
import { IconButton } from "@/shared/ui/IconButton";

export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#000a",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          style={{
            maxHeight: "88%",
            backgroundColor: C.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 16,
            paddingBottom: 28,
          }}
        >
          <View
            style={{
              height: 4,
              width: 36,
              backgroundColor: C.subtle,
              borderRadius: 8,
              alignSelf: "center",
              marginBottom: 12,
            }}
          />
          <View style={s.between}>
            <Text style={s.title}>{title}</Text>
            <IconButton name="close" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
            {children}
          </ScrollView>
          {footer}
        </View>
      </View>
    </Modal>
  );
}
