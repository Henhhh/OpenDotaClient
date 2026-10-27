import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack, router, usePathname, useGlobalSearchParams } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppState } from "@/shared/state/AppState";
import { SessionProvider } from "@/features/auth/SessionProvider";
import { Icon } from "@/shared/ui/Icon";
import { setNavigationOrigin } from "@/shared/navigation/navigation";
import { useFonts } from "expo-font";
import { C } from "@/shared/theme/theme";
import { MAIN_TABS, defaultTabForPath } from "@/shared/navigation/routes";

const Inter_400Regular = require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf");

const Inter_700Bold = require("@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf");

const Inter_800ExtraBold = require("@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf");

const queryClient = new QueryClient();

const tabs = MAIN_TABS;

export default function Layout() {
  const path = usePathname();
  const { origin } = useGlobalSearchParams<{ origin?: string }>();
  const root = tabs.find((t) => t[2] === path);
  const active = root?.[0] ?? origin ?? defaultTabForPath(path);
  useEffect(() => setNavigationOrigin(active), [active]);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AppState>
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
              <StatusBar style="light" />
              <View
                style={{
                  flex: 1,
                  width: "100%",
                  maxWidth: 680,
                  alignSelf: "center",
                }}
              >
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: C.bg },
                    animation: "slide_from_right",
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    borderTopWidth: 1,
                    borderTopColor: C.line,
                    backgroundColor: C.card,
                    height: 68,
                  }}
                >
                  {tabs.map(([key, label, url]) => (
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active === key }}
                      key={key}
                      onPress={() => router.navigate(url as never)}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      <View
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 3,
                          borderRadius: 18,
                          backgroundColor:
                            active === key ? "#45232d" : "transparent",
                        }}
                      >
                        <Icon
                          name={key}
                          color={active === key ? C.red : C.muted}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: active === key ? "700" : "400",
                          color: active === key ? C.text : C.muted,
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </SafeAreaView>
          </SafeAreaProvider>
        </AppState>
      </SessionProvider>
    </QueryClientProvider>
  );
}
