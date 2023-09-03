import React from "react";
import { View, StyleSheet, Image } from "react-native";
import {
  BottomSheetModal,
  useBottomSheetTimingConfigs,
} from "@gorhom/bottom-sheet";
import { Easing } from "react-native-reanimated";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../../component/Text";
import Octicons from "@expo/vector-icons/Octicons";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

import { getCurrencySymbol } from "../../utils";

export default function Index(props) {
  const {
    bottomSheetModalRef,
    snapPoints,
    handleSheetChanges,
    currentIndex,
    data,
  } = props;

  const animationConfigs = useBottomSheetTimingConfigs({
    duration: 800,
    easing: Easing.ease,
  });

  const getFriendsList = (friends) => {
    return friends.map((data, index) => {
      return (
        <View style={styles.friendContainer}>
          <FontAwesome5 name="user-circle" size={20} />
          <Text style={{ fontSize: 10 }}>{data}</Text>
        </View>
      );
    });
  };

  //if no data or current index return nothing
  if (!data && !currentIndex) {
    return;
  }

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      animationConfigs={animationConfigs}
      handleHeight={0}
      handleStyle={{ height: 0, width: 0 }}
      handleIndicatorStyle={{ height: 0, width: 0 }}
      style={{
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={data[currentIndex].accentColors}
        start={[0.1, 0.1]}
        style={styles.gradient}
      >
        <View style={styles.contentContainer}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            <View style={styles.actionCard}>
              <View>
                <Octicons name="upload" size={40} />
              </View>
              <Text style={{ fontSize: 18 }}>Send</Text>
            </View>
            <View style={styles.actionCard}>
              <View>
                <Ionicons name="receipt-outline" size={40} />
              </View>
              <Text style={{ fontSize: 18 }}>Request</Text>
            </View>
            <View style={styles.actionCard}>
              <View>
                <MaterialCommunityIcons name="qrcode-scan" size={40} />
              </View>
              <Text style={{ fontSize: 18 }}>Action</Text>
            </View>
          </View>

          <View style={styles.cardsMainContainer}>
            <View style={styles.weeklyIncomeCard}>
              <Text>Weekly Activity</Text>
              <Image
                source={require("../../assets/images/weekly_spending.png")}
                style={{
                  height: hp("17%"),
                  width: wp("40%"),
                  resizeMode: "contain",
                }}
              />
              <View style={{ flexDirection: "row", paddingBottom: hp("1%") }}>
                <Text style={{ marginTop: hp("1%"), fontSize: 18 }}>
                  {getCurrencySymbol(data[currentIndex].currencyType)}{" "}
                </Text>
                <Text style={{ fontSize: 26 }}>
                  {data[currentIndex].weeklySpending.toLocaleString("en-US")}
                </Text>
              </View>
              <Text></Text>
            </View>
            <View style={styles.rightContainer}>
              <View style={styles.friendsCard}>
                <Text>Friends</Text>
                <View style={{ flexDirection: "row" }}>
                  {getFriendsList(data[currentIndex].friends)}
                </View>
              </View>
              <View style={styles.totalIncomeCard}>
                <Text style={{ fontSize: 16 }}>Total Income</Text>
                <View style={styles.totalIncomeText}>
                  <Text style={{ marginTop: hp("1%"), fontSize: 18 }}>
                    {getCurrencySymbol(data[currentIndex].currencyType)}{" "}
                  </Text>
                  <Text style={{ fontSize: 26 }}>
                    {data[currentIndex].totalIncome.toLocaleString("en-US")}
                  </Text>
                </View>
                <Text style={{ fontSize: 10 }}>This Month</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: wp("5%"),
    paddingVertical: hp("2%"),
  },
  actionCard: {
    height: hp("16%"),
    width: wp("26%"),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    justifyContent: "space-evenly",
    shadowColor: "#000",
    shadowOffset: {
      width: 2,
      height: 2,
    },
    elevation: 3,
    shadowOpacity: 0.25,
    shadowRadius: 1,
    overlayColor: "hidden",
    backgroundColor: "white",
  },
  gradient: {
    flex: 1,
    overflow: "hidden",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  friendsCard: {
    height: hp("12%"),
    width: wp("40%"),
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 10,
    padding: 10,
  },
  totalIncomeCard: {
    height: hp("12%"),
    width: wp("40%"),
    backgroundColor: "white",
    borderRadius: 8,
    padding: 10,
  },
  rightContainer: { justifyContent: "flex-start" },
  weeklyIncomeCard: {
    height: hp("26%"),
    width: wp("46%"),
    backgroundColor: "white",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  cardsMainContainer: {
    flexDirection: "row",
    paddingTop: hp("3%"),
    justifyContent: "space-between",
  },
  friendContainer: {
    height: hp("8%"),
    width: wp("12%"),
    alignItems: "center",
    justifyContent: "center",
  },
  totalIncomeText: {
    flexDirection: "row",
    paddingBottom: hp("0.2%"),
  },
});
