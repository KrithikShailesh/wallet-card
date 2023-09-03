import React from "react";
import { Text, StyleSheet } from "react-native";

export default function Index(props) {
  const { style, children } = props;
  const textStyle = StyleSheet.flatten([
    { fontFamily: "Montaga-Regular" },
    style && style,
  ]);
  return <Text style={textStyle}>{children}</Text>;
}
