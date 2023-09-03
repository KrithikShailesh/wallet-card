import { useFonts } from "expo-font";

import RootScreen from "./app/screens";

export default function App() {
  const [fontsLoaded] = useFonts({
    "Montaga-Regular": require("./app/assets/fonts/Montaga-Regular.ttf"),
  });
  return <RootScreen />;
}
