import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Animated } from "react-native";
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
  const y = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef(null);

  // variables
  const snapPoints = useMemo(() => ["25%", "50%"], []);

  const handleCardPushUpAnimation = () => {
    Animated.timing(y, {
      toValue: -250,
      duration: 800,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  const handleCardPushDownAnimation = () => {
    Animated.timing(y, {
      toValue: 0,
      duration: 800,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  // callbacks
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
    handleCardPushUpAnimation();
  }, []);

  const handleSheetChanges = useCallback((index) => {
    if (index === -1) {
      handleCardPushDownAnimation();
    }
  }, []);

  useEffect(() => {
    getAllCards();
  }, []);

  const getAllCards = async () => {
    const cards = await makeGetAllCardsApiCall();
    setReversedData(cards.reverse());
    setCurrentIndex(cards.length - 1);
  };

  const onTapCard = async () => {
    setIsModalVisible(true);
    handlePresentModalPress();
  };

  const onCarouselScroll = async (slideIndex) => {
    setCurrentIndex(slideIndex);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Animated.View
          style={[
            { flex: 1, maxHeight: hp("100%") },
            isModalVisible && { transform: [{ translateY: y }] },
          ]}
        >
          {reversedData && (
            <Carousel
              ref={carouselRef}
              data={reversedData}
              vertical
              layout="stack"
              layoutCardOffset={hp("10%")}
              firstItem={reversedData.length - 1}
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
          )}
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
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}