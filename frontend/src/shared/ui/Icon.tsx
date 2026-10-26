import Svg, { Path } from "react-native-svg";
import { C } from "@/shared/theme/theme";

export function Icon({
  name,
  size = 21,
  color = C.muted,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const paths: Record<string, string> = {
    home: "M3 10 12 3l9 7v11h-6v-7H9v7H3Z",
    matches:
      "m4 3 12 12m-2 3 6-6M3 4l1 5 5-5Zm16 17-4-4M20 3 9 14m-3-2 6 6m-7 3 4-4",
    heroes: "M12 3 4 6v7c0 5 8 8 8 8s8-3 8-8V6Z",
    pro: "M7 3h10v6c0 8-10 8-10 0ZM7 5H3v4c0 3 4 3 4 3m10-7h4v4c0 3-4 3-4 3m-5 3v6m-4 0h8",
    profile: "M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 22v-3c0-8 16-8 16 0v3",
    search: "M10 3a7 7 0 1 0 0 14 7 7 0 1 0 0-14m5 12 6 6",
    back: "m14 5-7 7 7 7M7 12h15",
    refresh:
      "M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m0 5v-5h-5",
    bell: "M5 16V9a7 7 0 0 1 14 0v7l2 2H3Zm5 5h4",
    filter: "M3 6h8m4 0h6M3 12h2m4 0h12M3 18h12m4 0h2M11 3v6M5 9v6m10 0v6",
    grid: "M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z",
    list: "M7 5h14M7 12h14M7 19h14M3 5h1M3 12h1M3 19h1",
    chart: "M4 3v18h18M8 16V9m5 7V5m5 11v-6",
    star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z",
    live: "M8 5a9 9 0 0 0 0 14m8-14a9 9 0 0 1 0 14M10 8a5 5 0 0 0 0 8m4-8a5 5 0 0 1 0 8M12 11v2",
    close: "m5 5 14 14M19 5 5 19",
    check: "m3 12 5 5L20 5",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8M9 2h6l1 4 4 1 2 5-3 3v5l-5 2-3-3H6l-4-5 3-3V6Z",
    compare: "M5 3v18m14-18v18M2 7h6m8 10h6M8 7l8 10",
    build: "m14 3 7 7-5 1-9 10-4-4 10-9Z",
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={paths[name] ?? paths.heroes} />
    </Svg>
  );
}
