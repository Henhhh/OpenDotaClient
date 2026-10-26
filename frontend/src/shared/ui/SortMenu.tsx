import { useState } from "react";
import { Pressable } from "react-native";
import { Txt } from "@/shared/ui/Txt";
import { Button } from "@/shared/ui/Button";
import { Sheet } from "@/shared/ui/Sheet";

export function SortMenu({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sort options"
        onPress={() => setOpen(true)}
        style={{ paddingVertical: 12, paddingLeft: 12 }}
      >
        <Txt muted size={11}>
          ↧ {value}
        </Txt>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Sort by">
        {items.map((item) => (
          <Button
            key={item}
            onPress={() => {
              onChange(item);
              setOpen(false);
            }}
          >
            {item === value ? "✓ " : ""}
            {item}
          </Button>
        ))}
      </Sheet>
    </>
  );
}
