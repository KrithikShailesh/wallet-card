import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Animated, StyleSheet, ActivityIndicator, View } from "react-native";
import { Easing } from "react-native-reanimated";
import Carousel from "react-native-snap-carousel";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Card from "../component/Card";
import Modal from "../component/Modal";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { makeGetAllCardsApiCall } from "../api";

export default function RootScreen() {
  const [reversedData, setReversedData] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(null);

  const bottomSheetModalRef = useRef(null);
  const yAxis = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef(null);

  const snapPoints = useMemo(() => ["25%", "50%"], []);

  //All Carousel and Scroll related animation and functions
  const handleCardPushUpAnimation = () => {
    Animated.timing(yAxis, {
      toValue: -280,
      duration: 700,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  const handleCardPushDownAnimation = () => {
    Animated.timing(yAxis, {
      toValue: 0,
      duration: 600,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
    handleCardPushUpAnimation();
  }, []);

  const handleSheetChanges = useCallback((index) => {
    if (index === -1) {
      handleCardPushDownAnimation();
    }
  }, []);

  const onTapCard = async () => {
    setIsModalVisible(true);
    handlePresentModalPress();
  };

  const onCarouselScroll = async (slideIndex) => {
    setCurrentIndex(slideIndex);
  };

  //onMounting Call the api to get the data to populate the screen
  useEffect(() => {
    getAllCards();
  }, []);

  const getAllCards = async () => {
    //We can design the api in such a way that we scroll halway through 5 card we get the next 10 cards and append to the list but the mockapi deos not allow indexing in free plan
    const cards = await makeGetAllCardsApiCall();
    setReversedData(cards);
    setCurrentIndex(cards.length - 1);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <BottomSheetModalProvider>
        <Animated.View
          style={[
            { flex: 1, maxHeight: hp("100%") },
            isModalVisible && { transform: [{ translateY: yAxis }] },
          ]}
        >
          <Carousel
            ref={carouselRef}
            data={reversedData}
            vertical
            layout="stack"
            layoutCardOffset={hp("10%")}
            firstItem={reversedData && reversedData.length - 1}
            renderItem={({ item, index }) => (
              <Card
                name={item.name}
                id={item.id}
                colors={item.colors}
                cardType={item.cardType}
                currencyType={item.currencyType}
                totalBalance={item.totalBalance}
                cardNumber={item.cardNumber}
                onTapCard={onTapCard}
              />
            )}
            onBeforeSnapToItem={(slideIndex) => onCarouselScroll(slideIndex)}
            inactiveSlideOpacity={1}
            itemHeight={hp("30%")}
            lockScrollWhileSnapping={true}
            sliderHeight={hp("150%")}
            decelerationRate={"normal"}
            disableIntervalMomentum={true}
          />
        </Animated.View>
        {reversedData && currentIndex && (
          <Modal
            handlePresentModalPress={handlePresentModalPress}
            bottomSheetModalRef={bottomSheetModalRef}
            snapPoints={snapPoints}
            handleSheetChanges={handleSheetChanges}
            carouselRef={carouselRef}
            currentIndex={currentIndex}
            data={reversedData}
          />
        )}

        {!reversedData && !currentIndex && (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator size={"large"} color={"#405755"} />
          </View>
        )}
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#B3C7C5",
    justifyContent: "center",
  },
});
