import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import Text from "../Text";
import { PaymentIcon } from "react-native-payment-icons";

import { getCurrencySymbol } from "../../utils";

export default function Card(props) {
  const {
    name,
    id,
    colors,
    cardType,
    currencyType,
    totalBalance,
    cardNumber,
    onTapCard,
  } = props;

  if (
    !colors &&
    !name &&
    !cardType &&
    !cardNumber &&
    !totalBalance &&
    !currencyType
  ) {
    return;
  }

  return (
    <Pressable style={styles.card} onPress={onTapCard}>
      <LinearGradient
        colors={colors}
        start={[0.1, 0.1]}
        style={styles.gradient}
      >
        {/* <Text style={{ fontSize: 30 }}>{id}</Text> */}
        <View style={{ flex: 1 }}>
          <View style={styles.topArea}>
            <Text style={{ fontSize: 20, fontWeight: "bold" }}>{name}</Text>
            <PaymentIcon type={cardType} width={wp("12%")} height={hp("16%")} />
          </View>

          <View style={styles.bottomArea}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <View style={{ flexDirection: "row" }}>
                  <Text style={{ marginTop: hp("1.4%"), fontSize: 28 }}>
                    {getCurrencySymbol(currencyType)}{" "}
                  </Text>
                  <Text style={{ fontSize: 39 }}>
                    {totalBalance.toLocaleString("en-US")}
                  </Text>
                </View>

                <View style={{ marginTop: hp("2%") }}>
                  <Text style={{ fontSize: 15 }}>
                    {`${cardNumber}`
                      .replace(/.(?=.{4,}$)/g, "#")
                      .replace(/(?=.{4}$)/, " ")}
                  </Text>
                </View>
              </View>
              <View>
                <Image
                  source={require("../../assets/images/tap_pay.png")}
                  style={{
                    height: hp("12%"),
                    width: wp("8%"),
                    resizeMode: "contain",
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "center",
    width: "80%",
    borderRadius: 16,
    marginBottom: 30,
    overflow: "hidden",
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  topArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: wp("80%"),
    paddingVertical: hp("3%"),
    paddingHorizontal: wp("5%"),
  },
  bottomArea: {
    justifyContent: "flex-end",
    flex: 1,
    paddingBottom: hp("2%"),
    paddingHorizontal: wp("5%"),
  },
});
