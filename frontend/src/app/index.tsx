import { Redirect } from "expo-router";
import { ROUTES } from "@/shared/navigation/routes";

export default function Index() {
  return <Redirect href={ROUTES.home as never} />;
}
