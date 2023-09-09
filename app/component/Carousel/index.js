import React, { Component } from "react";
import {
  Animated,
  I18nManager,
  Platform,
  ScrollView,
  View,
} from "react-native";
import shallowCompare from "react-addons-shallow-compare";
import {
  defaultScrollInterpolator,
  stackScrollInterpolator,
  defaultAnimatedStyles,
  shiftAnimatedStyles,
  stackAnimatedStyles,
} from "../../utils/animation.js";

const IS_IOS = Platform.OS === "ios";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const IS_RTL = I18nManager.isRTL;

export default class Carousel extends Component {
  static defaultProps = {
    323: "timing",
    activeAnimationOptions: null,
    activeSlideAlignment: "center",
    activeSlideOffset: 20,
    apparitionDelay: 0,
    callbackOffsetMargin: 5,
    containerCustomStyle: {},
    contentContainerCustomStyle: {},
    enableMomentum: false,
    enableSnap: true,
    firstItem: 0,
    hasParallaxImages: false,
    inactiveSlideOpacity: 0.7,
    inactiveSlideScale: 0.9,
    inactiveSlideShift: 0,
    layout: "default",
    lockScrollTimeoutDuration: 1000,
    lockScrollWhileSnapping: false,
    loop: false,
    loopClonesPerSide: 3,
    scrollEnabled: true,
    slideStyle: {},
    shouldOptimizeUpdates: true,
    swipeThreshold: 20,
    vertical: false,
  };

  constructor(props) {
    super(props);

    this.state = {
      hideCarousel: true,
      interpolators: [],
    };
    const initialActiveItem = this._getFirstItem(props.firstItem);
    this._activeItem = initialActiveItem;
    this._previousActiveItem = initialActiveItem;
    this._previousFirstItem = initialActiveItem;
    this._previousItemsLength = initialActiveItem;

    this._mounted = false;
    this._positions = [];
    this._currentContentOffset = 0;
    this._canFireBeforeCallback = false;
    this._canFireCallback = false;
    this._scrollOffsetRef = null;
    this._onScrollTriggered = true;
    this._lastScrollDate = 0;
    this._scrollEnabled = props.scrollEnabled !== false;

    this._initPositionsAndInterpolators =
      this._initPositionsAndInterpolators.bind(this);
    this._renderItem = this._renderItem.bind(this);
    this._onSnap = this._onSnap.bind(this);

    this._onLayout = this._onLayout.bind(this);
    this._onScroll = this._onScroll.bind(this);
    this._onScrollBeginDrag = props.enableSnap
      ? this._onScrollBeginDrag.bind(this)
      : undefined;
    this._onScrollEnd = props.enableSnap
      ? this._onScrollEnd.bind(this)
      : undefined;
    this._onScrollEndDrag = !props.enableMomentum
      ? this._onScrollEndDrag.bind(this)
      : undefined;
    this._onMomentumScrollEnd = props.enableMomentum
      ? this._onMomentumScrollEnd.bind(this)
      : undefined;

    this._getKeyExtractor = this._getKeyExtractor.bind(this);

    this._setScrollHandler(props);
    this._ignoreNextMomentum = false;
  }

  componentDidMount() {
    const { apparitionDelay, firstItem } = this.props;
    const _firstItem = this._getFirstItem(firstItem);
    const apparitionCallback = () => {
      this.setState({ hideCarousel: false });
    };

    this._mounted = true;
    this._initPositionsAndInterpolators();

    requestAnimationFrame(() => {
      if (!this._mounted) {
        return;
      }

      this._snapToItem(_firstItem, false, false, true, false);

      if (apparitionDelay) {
        this._apparitionTimeout = setTimeout(() => {
          apparitionCallback();
        }, apparitionDelay);
      } else {
        apparitionCallback();
      }
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.shouldOptimizeUpdates === false) {
      return true;
    } else {
      return shallowCompare(this, nextProps, nextState);
    }
  }

  componentDidUpdate(prevProps) {
    const { interpolators } = this.state;
    const {
      firstItem,
      itemHeight,
      itemWidth,
      scrollEnabled,
      sliderHeight,
      sliderWidth,
    } = this.props;
    const itemsLength = this._getCustomDataLength(this.props);

    if (!itemsLength) {
      return;
    }

    const nextFirstItem = this._getFirstItem(firstItem, this.props);
    let nextActiveItem =
      this._activeItem || this._activeItem === 0
        ? this._activeItem
        : nextFirstItem;

    const hasNewSliderWidth =
      sliderWidth && sliderWidth !== prevProps.sliderWidth;
    const hasNewSliderHeight =
      sliderHeight && sliderHeight !== prevProps.sliderHeight;
    const hasNewItemWidth = itemWidth && itemWidth !== prevProps.itemWidth;
    const hasNewItemHeight = itemHeight && itemHeight !== prevProps.itemHeight;
    const hasNewScrollEnabled = scrollEnabled !== prevProps.scrollEnabled;

    if (nextActiveItem > itemsLength - 1) {
      nextActiveItem = itemsLength - 1;
    }

    if (hasNewScrollEnabled) {
      this._setScrollEnabled(scrollEnabled);
    }

    if (
      interpolators.length !== itemsLength ||
      hasNewSliderWidth ||
      hasNewSliderHeight ||
      hasNewItemWidth ||
      hasNewItemHeight
    ) {
      this._activeItem = nextActiveItem;
      this._previousItemsLength = itemsLength;

      this._initPositionsAndInterpolators(this.props);

      if (
        hasNewSliderWidth ||
        hasNewSliderHeight ||
        hasNewItemWidth ||
        hasNewItemHeight
      ) {
        this._snapToItem(nextActiveItem, false, false, false, false);
      }
    } else if (
      nextFirstItem !== this._previousFirstItem &&
      nextFirstItem !== this._activeItem
    ) {
      this._activeItem = nextFirstItem;
      this._previousFirstItem = nextFirstItem;
      this._snapToItem(nextFirstItem, false, true, false, false);
    }

    if (this.props.onScroll !== prevProps.onScroll) {
      this._setScrollHandler(this.props);
    }
  }

  componentWillUnmount() {
    this._mounted = false;
    clearTimeout(this._snapNoMomentumTimeout);
    clearTimeout(this._edgeItemTimeout);
    clearTimeout(this._lockScrollTimeout);
  }

  get realIndex() {
    return this._activeItem;
  }

  get currentIndex() {
    return this._getDataIndex(this._activeItem);
  }

  get currentScrollPosition() {
    return this._currentContentOffset;
  }

  _setScrollHandler(props) {
    const scrollEventConfig = {
      listener: this._onScroll,
      useNativeDriver: true,
    };
    this._scrollPos = new Animated.Value(0);
    const argMapping = props.vertical
      ? [{ nativeEvent: { contentOffset: { y: this._scrollPos } } }]
      : [{ nativeEvent: { contentOffset: { x: this._scrollPos } } }];

    if (props.onScroll && Array.isArray(props.onScroll._argMapping)) {
      argMapping.pop();
      const [argMap] = props.onScroll._argMapping;
      if (argMap && argMap.nativeEvent && argMap.nativeEvent.contentOffset) {
        this._scrollPos =
          argMap.nativeEvent.contentOffset.x ||
          argMap.nativeEvent.contentOffset.y ||
          this._scrollPos;
      }
      argMapping.push(...props.onScroll._argMapping);
    }
    this._onScrollHandler = Animated.event(argMapping, scrollEventConfig);
  }

  _needsScrollView() {
    return this._shouldUseStackLayout();
  }

  _needsRTLAdaptations() {
    const { vertical } = this.props;
    return IS_RTL && !IS_IOS && !vertical;
  }

  _canLockScroll() {
    const { scrollEnabled, enableMomentum, lockScrollWhileSnapping } =
      this.props;
    return scrollEnabled && !enableMomentum && lockScrollWhileSnapping;
  }

  _enableLoop() {
    const { data, enableSnap, loop } = this.props;
    return enableSnap && loop && data && data.length && data.length > 1;
  }

  _shouldAnimateSlides(props = this.props) {
    const {
      inactiveSlideOpacity,
      inactiveSlideScale,
      scrollInterpolator,
      slideInterpolatedStyle,
    } = props;
    return (
      inactiveSlideOpacity < 1 ||
      inactiveSlideScale < 1 ||
      !!scrollInterpolator ||
      !!slideInterpolatedStyle ||
      this._shouldUseShiftLayout() ||
      this._shouldUseStackLayout()
    );
  }

  _shouldUseCustomAnimation() {
    const { activeAnimationOptions } = this.props;
    return !!activeAnimationOptions && !this._shouldUseStackLayout();
  }

  _shouldUseShiftLayout() {
    const { inactiveSlideShift, layout } = this.props;
    return layout === "default" && inactiveSlideShift !== 0;
  }

  _shouldUseStackLayout() {
    return this.props.layout === "stack";
  }

  _getCustomData(props = this.props) {
    const { data, loopClonesPerSide } = props;
    const dataLength = data && data.length;

    if (!dataLength) {
      return [];
    }

    if (!this._enableLoop()) {
      return data;
    }

    let previousItems = [];
    let nextItems = [];

    if (loopClonesPerSide > dataLength) {
      const dataMultiplier = Math.floor(loopClonesPerSide / dataLength);
      const remainder = loopClonesPerSide % dataLength;

      for (let i = 0; i < dataMultiplier; i++) {
        previousItems.push(...data);
        nextItems.push(...data);
      }

      previousItems.unshift(...data.slice(-remainder));
      nextItems.push(...data.slice(0, remainder));
    } else {
      previousItems = data.slice(-loopClonesPerSide);
      nextItems = data.slice(0, loopClonesPerSide);
    }

    return previousItems.concat(data, nextItems);
  }

  _getCustomDataLength(props = this.props) {
    const { data, loopClonesPerSide } = props;
    const dataLength = data && data.length;

    if (!dataLength) {
      return 0;
    }

    return this._enableLoop() ? dataLength + 2 * loopClonesPerSide : dataLength;
  }

  _getCustomIndex(index, props = this.props) {
    const itemsLength = this._getCustomDataLength(props);

    if (!itemsLength || (!index && index !== 0)) {
      return 0;
    }

    return this._needsRTLAdaptations() ? itemsLength - index - 1 : index;
  }

  _getDataIndex(index) {
    const { data, loopClonesPerSide } = this.props;
    const dataLength = data && data.length;

    if (!this._enableLoop() || !dataLength) {
      return index;
    }

    if (index >= dataLength + loopClonesPerSide) {
      return loopClonesPerSide > dataLength
        ? (index - loopClonesPerSide) % dataLength
        : index - dataLength - loopClonesPerSide;
    } else if (index < loopClonesPerSide) {
      if (loopClonesPerSide > dataLength) {
        const baseDataIndexes = [];
        const dataIndexes = [];
        const dataMultiplier = Math.floor(loopClonesPerSide / dataLength);
        const remainder = loopClonesPerSide % dataLength;

        for (let i = 0; i < dataLength; i++) {
          baseDataIndexes.push(i);
        }

        for (let j = 0; j < dataMultiplier; j++) {
          dataIndexes.push(...baseDataIndexes);
        }

        dataIndexes.unshift(...baseDataIndexes.slice(-remainder));
        return dataIndexes[index];
      } else {
        return index + dataLength - loopClonesPerSide;
      }
    } else {
      return index - loopClonesPerSide;
    }
  }

  _getPositionIndex(index) {
    const { loop, loopClonesPerSide } = this.props;
    return loop ? index + loopClonesPerSide : index;
  }

  _getFirstItem(index, props = this.props) {
    const { loopClonesPerSide } = props;
    const itemsLength = this._getCustomDataLength(props);

    if (!itemsLength || index > itemsLength - 1 || index < 0) {
      return 0;
    }

    return this._enableLoop() ? index + loopClonesPerSide : index;
  }

  _getWrappedRef() {
    if (
      this._carouselRef &&
      ((this._needsScrollView() && this._carouselRef.scrollTo) ||
        (!this._needsScrollView() && this._carouselRef.scrollToOffset))
    ) {
      return this._carouselRef;
    }
    return (
      this._carouselRef &&
      this._carouselRef.getNode &&
      this._carouselRef.getNode()
    );
  }

  _getScrollEnabled() {
    return this._scrollEnabled;
  }

  _setScrollEnabled(scrollEnabled = true) {
    const wrappedRef = this._getWrappedRef();

    if (!wrappedRef || !wrappedRef.setNativeProps) {
      return;
    }
    wrappedRef.setNativeProps({ scrollEnabled });
    this._scrollEnabled = scrollEnabled;
  }

  _getKeyExtractor(item, index) {
    return this._needsScrollView()
      ? `scrollview-item-${index}`
      : `flatlist-item-${index}`;
  }

  _getScrollOffset(event) {
    const { vertical } = this.props;
    return (
      (event &&
        event.nativeEvent &&
        event.nativeEvent.contentOffset &&
        event.nativeEvent.contentOffset[vertical ? "y" : "x"]) ||
      0
    );
  }

  _getContainerInnerMargin(opposite = false) {
    const {
      sliderWidth,
      sliderHeight,
      itemWidth,
      itemHeight,
      vertical,
      activeSlideAlignment,
    } = this.props;

    if (
      (activeSlideAlignment === "start" && !opposite) ||
      (activeSlideAlignment === "end" && opposite)
    ) {
      return 0;
    } else if (
      (activeSlideAlignment === "end" && !opposite) ||
      (activeSlideAlignment === "start" && opposite)
    ) {
      return vertical ? sliderHeight - itemHeight : sliderWidth - itemWidth;
    } else {
      return vertical
        ? (sliderHeight - itemHeight) / 2
        : (sliderWidth - itemWidth) / 2;
    }
  }

  _getViewportOffset() {
    const {
      sliderWidth,
      sliderHeight,
      itemWidth,
      itemHeight,
      vertical,
      activeSlideAlignment,
    } = this.props;

    if (activeSlideAlignment === "start") {
      return vertical ? itemHeight / 2 : itemWidth / 2;
    } else if (activeSlideAlignment === "end") {
      return vertical
        ? sliderHeight - itemHeight / 2
        : sliderWidth - itemWidth / 2;
    } else {
      return vertical ? sliderHeight / 2 : sliderWidth / 2;
    }
  }

  _getCenter(offset) {
    return offset + this._getViewportOffset() - this._getContainerInnerMargin();
  }

  _getActiveItem(offset) {
    const { activeSlideOffset, swipeThreshold } = this.props;
    const center = this._getCenter(offset);
    const centerOffset = activeSlideOffset || swipeThreshold;

    for (let i = 0; i < this._positions.length; i++) {
      const { start, end } = this._positions[i];
      if (center + centerOffset >= start && center - centerOffset <= end) {
        return i;
      }
    }

    const lastIndex = this._positions.length - 1;
    if (
      this._positions[lastIndex] &&
      center - centerOffset > this._positions[lastIndex].end
    ) {
      return lastIndex;
    }

    return 0;
  }

  _initPositionsAndInterpolators(props = this.props) {
    const { data, itemWidth, itemHeight, scrollInterpolator, vertical } = props;
    const sizeRef = vertical ? itemHeight : itemWidth;

    if (!data || !data.length) {
      return;
    }

    let interpolators = [];
    this._positions = [];

    this._getCustomData(props).forEach((itemData, index) => {
      const _index = this._getCustomIndex(index, props);
      let animatedValue;

      this._positions[index] = {
        start: index * sizeRef,
        end: index * sizeRef + sizeRef,
      };

      if (!this._shouldAnimateSlides(props)) {
        animatedValue = new Animated.Value(1);
      } else if (this._shouldUseCustomAnimation()) {
        animatedValue = new Animated.Value(_index === this._activeItem ? 1 : 0);
      } else {
        let interpolator;

        if (scrollInterpolator) {
          interpolator = scrollInterpolator(_index, props);
        } else if (this._shouldUseStackLayout()) {
          interpolator = stackScrollInterpolator(_index, props);
        }

        if (
          !interpolator ||
          !interpolator.inputRange ||
          !interpolator.outputRange
        ) {
          interpolator = defaultScrollInterpolator(_index, props);
        }

        animatedValue = this._scrollPos.interpolate({
          ...interpolator,
          extrapolate: "clamp",
        });
      }

      interpolators.push(animatedValue);
    });

    this.setState({ interpolators });
  }

  _lockScroll() {
    const { lockScrollTimeoutDuration } = this.props;
    clearTimeout(this._lockScrollTimeout);
    this._lockScrollTimeout = setTimeout(() => {
      this._releaseScroll();
    }, lockScrollTimeoutDuration);
    this._setScrollEnabled(false);
  }

  _releaseScroll() {
    clearTimeout(this._lockScrollTimeout);
    this._setScrollEnabled(true);
  }

  _repositionScroll(index) {
    const { data, loopClonesPerSide } = this.props;
    const dataLength = data && data.length;

    if (
      !this._enableLoop() ||
      !dataLength ||
      (index >= loopClonesPerSide && index < dataLength + loopClonesPerSide)
    ) {
      return;
    }

    let repositionTo = index;

    if (index >= dataLength + loopClonesPerSide) {
      repositionTo = index - dataLength;
    } else if (index < loopClonesPerSide) {
      repositionTo = index + dataLength;
    }

    this._snapToItem(repositionTo, false, false, false, false);
  }

  _scrollTo(offset, animated = true) {
    const { vertical } = this.props;
    const wrappedRef = this._getWrappedRef();

    if (!this._mounted || !wrappedRef) {
      return;
    }

    const specificOptions = this._needsScrollView()
      ? {
          x: vertical ? 0 : offset,
          y: vertical ? offset : 0,
        }
      : {
          offset,
        };
    const options = {
      ...specificOptions,
      animated,
    };

    if (this._needsScrollView()) {
      wrappedRef.scrollTo(options);
    } else {
      wrappedRef.scrollToOffset(options);
    }
  }

  _onScroll(event) {
    const { callbackOffsetMargin, enableMomentum, onScroll } = this.props;

    const scrollOffset = event
      ? this._getScrollOffset(event)
      : this._currentContentOffset;
    const nextActiveItem = this._getActiveItem(scrollOffset);
    const itemReached = nextActiveItem === this._itemToSnapTo;
    const scrollConditions =
      scrollOffset >= this._scrollOffsetRef - callbackOffsetMargin &&
      scrollOffset <= this._scrollOffsetRef + callbackOffsetMargin;

    this._currentContentOffset = scrollOffset;
    this._onScrollTriggered = true;
    this._lastScrollDate = Date.now();

    if (enableMomentum) {
      clearTimeout(this._snapNoMomentumTimeout);

      if (this._activeItem !== nextActiveItem) {
        this._activeItem = nextActiveItem;
      }

      if (itemReached) {
        if (this._canFireBeforeCallback) {
          this._onBeforeSnap(this._getDataIndex(nextActiveItem));
        }

        if (scrollConditions && this._canFireCallback) {
          this._onSnap(this._getDataIndex(nextActiveItem));
        }
      }
    } else if (this._activeItem !== nextActiveItem && itemReached) {
      if (this._canFireBeforeCallback) {
        this._onBeforeSnap(this._getDataIndex(nextActiveItem));
      }

      if (scrollConditions) {
        this._activeItem = nextActiveItem;

        if (this._canLockScroll()) {
          this._releaseScroll();
        }

        if (this._canFireCallback) {
          this._onSnap(this._getDataIndex(nextActiveItem));
        }
      }
    }

    if (
      nextActiveItem === this._itemToSnapTo &&
      scrollOffset === this._scrollOffsetRef
    ) {
      this._repositionScroll(nextActiveItem);
    }

    if (typeof onScroll === "function" && event) {
      onScroll(event);
    }
  }

  _onScrollBeginDrag(event) {
    const { onScrollBeginDrag } = this.props;

    if (!this._getScrollEnabled()) {
      return;
    }

    this._scrollStartOffset = this._getScrollOffset(event);
    this._scrollStartActive = this._getActiveItem(this._scrollStartOffset);
    this._ignoreNextMomentum = false;

    if (onScrollBeginDrag) {
      onScrollBeginDrag(event);
    }
  }

  _onScrollEndDrag(event) {
    const { onScrollEndDrag } = this.props;

    if (this._carouselRef) {
      this._onScrollEnd && this._onScrollEnd();
    }

    if (onScrollEndDrag) {
      onScrollEndDrag(event);
    }
  }

  _onScrollEnd(event) {
    const { enableSnap } = this.props;

    if (this._ignoreNextMomentum) {
      this._ignoreNextMomentum = false;
      return;
    }

    if (this._currentContentOffset === this._scrollEndOffset) {
      return;
    }

    this._scrollEndOffset = this._currentContentOffset;
    this._scrollEndActive = this._getActiveItem(this._scrollEndOffset);

    if (enableSnap) {
      this._snapScroll(this._scrollEndOffset - this._scrollStartOffset);
    }
  }

  _onLayout(event) {
    const { onLayout } = this.props;

    if (this._onLayoutInitDone) {
      this._initPositionsAndInterpolators();
      this._snapToItem(this._activeItem, false, false, false, false);
    } else {
      this._onLayoutInitDone = true;
    }

    if (onLayout) {
      onLayout(event);
    }
  }

  _snapScroll(delta) {
    const { swipeThreshold } = this.props;
    if (!this._scrollEndActive && this._scrollEndActive !== 0 && IS_IOS) {
      this._scrollEndActive = this._scrollStartActive;
    }

    if (this._scrollStartActive !== this._scrollEndActive) {
      this._snapToItem(this._scrollEndActive);
    } else {
      if (delta > 0) {
        if (delta > swipeThreshold) {
          this._snapToItem(this._scrollStartActive + 1);
        } else {
          this._snapToItem(this._scrollEndActive);
        }
      } else if (delta < 0) {
        if (delta < -swipeThreshold) {
          this._snapToItem(this._scrollStartActive - 1);
        } else {
          this._snapToItem(this._scrollEndActive);
        }
      } else {
        this._snapToItem(this._scrollEndActive);
      }
    }
  }

  _snapToItem(
    index,
    animated = true,
    fireCallback = true,
    initial = false,
    lockScroll = true
  ) {
    const { enableMomentum, onSnapToItem, onBeforeSnapToItem } = this.props;
    const itemsLength = this._getCustomDataLength();
    const wrappedRef = this._getWrappedRef();

    if (!itemsLength || !wrappedRef) {
      return;
    }

    if (!index || index < 0) {
      index = 0;
    } else if (itemsLength > 0 && index >= itemsLength) {
      index = itemsLength - 1;
    }

    if (index !== this._previousActiveItem) {
      this._previousActiveItem = index;

      if (lockScroll && this._canLockScroll()) {
        this._lockScroll();
      }

      if (fireCallback) {
        if (onBeforeSnapToItem) {
          this._canFireBeforeCallback = true;
        }

        if (onSnapToItem) {
          this._canFireCallback = true;
        }
      }
    }

    this._itemToSnapTo = index;
    this._scrollOffsetRef =
      this._positions[index] && this._positions[index].start;
    this._onScrollTriggered = false;

    if (!this._scrollOffsetRef && this._scrollOffsetRef !== 0) {
      return;
    }

    this._scrollTo(this._scrollOffsetRef, animated);

    this._scrollEndOffset = this._currentContentOffset;

    if (enableMomentum) {
      if (!initial) {
        this._ignoreNextMomentum = true;
      }
      if (index === 0 || index === itemsLength - 1) {
        clearTimeout(this._edgeItemTimeout);
        this._edgeItemTimeout = setTimeout(() => {
          if (
            !initial &&
            index === this._activeItem &&
            !this._onScrollTriggered
          ) {
            this._onScroll();
          }
        }, 250);
      }
    }
  }

  _onBeforeSnap(index) {
    const { onBeforeSnapToItem } = this.props;

    if (!this._carouselRef) {
      return;
    }

    this._canFireBeforeCallback = false;
    onBeforeSnapToItem && onBeforeSnapToItem(index);
  }

  _onSnap(index) {
    const { onSnapToItem } = this.props;

    if (!this._carouselRef) {
      return;
    }

    this._canFireCallback = false;
    onSnapToItem && onSnapToItem(index);
  }

  _getSlideInterpolatedStyle(index, animatedValue) {
    const { layoutCardOffset, slideInterpolatedStyle } = this.props;

    if (slideInterpolatedStyle) {
      return slideInterpolatedStyle(index, animatedValue, this.props);
    } else if (this._shouldUseStackLayout()) {
      return stackAnimatedStyles(
        index,
        animatedValue,
        this.props,
        layoutCardOffset
      );
    } else if (this._shouldUseShiftLayout()) {
      return shiftAnimatedStyles(index, animatedValue, this.props);
    } else {
      return defaultAnimatedStyles(index, animatedValue, this.props);
    }
  }

  _renderItem({ item, index }) {
    const { interpolators } = this.state;
    const {
      itemWidth,
      itemHeight,
      keyExtractor,
      renderItem,
      slideStyle,
      vertical,
    } = this.props;

    const animatedValue = interpolators && interpolators[index];

    if (!animatedValue && animatedValue !== 0) {
      return null;
    }

    const animate = this._shouldAnimateSlides();
    const Component = animate ? Animated.View : View;
    const animatedStyle = animate
      ? this._getSlideInterpolatedStyle(index, animatedValue)
      : {};

    const mainDimension = vertical
      ? { height: itemHeight }
      : { width: itemWidth };
    const specificProps = this._needsScrollView()
      ? {
          key: keyExtractor
            ? keyExtractor(item, index)
            : this._getKeyExtractor(item, index),
        }
      : {};

    return (
      <Component
        style={[mainDimension, slideStyle, animatedStyle]}
        pointerEvents={"box-none"}
        {...specificProps}
      >
        {renderItem({ item, index })}
      </Component>
    );
  }

  _getComponentOverridableProps() {
    const {
      enableMomentum,
      itemWidth,
      itemHeight,
      loopClonesPerSide,
      sliderWidth,
      sliderHeight,
      vertical,
    } = this.props;

    const visibleItems =
      Math.ceil(
        vertical ? sliderHeight / itemHeight : sliderWidth / itemWidth
      ) + 1;
    const initialNumPerSide = this._enableLoop() ? loopClonesPerSide : 2;
    const initialNumToRender = visibleItems + initialNumPerSide * 2;
    const maxToRenderPerBatch = 1 + initialNumToRender * 2;
    const windowSize = maxToRenderPerBatch;

    const specificProps = !this._needsScrollView()
      ? {
          initialNumToRender: initialNumToRender,
          maxToRenderPerBatch: maxToRenderPerBatch,
          windowSize: windowSize,
        }
      : {};

    return {
      decelerationRate: enableMomentum ? 0.9 : "fast",
      showsHorizontalScrollIndicator: false,
      showsVerticalScrollIndicator: false,
      overScrollMode: "never",
      automaticallyAdjustContentInsets: false,
      directionalLockEnabled: true,
      pinchGestureEnabled: false,
      scrollsToTop: false,
      removeClippedSubviews: !this._needsScrollView(),
      inverted: this._needsRTLAdaptations(),
      ...specificProps,
    };
  }

  _getComponentStaticProps() {
    const { hideCarousel } = this.state;
    const {
      containerCustomStyle,
      contentContainerCustomStyle,
      keyExtractor,
      sliderWidth,
      sliderHeight,
      style,
      vertical,
    } = this.props;

    const containerStyle = [
      containerCustomStyle || style || {},
      hideCarousel ? { opacity: 0 } : {},
      vertical
        ? { height: sliderHeight, flexDirection: "column" }
        : {
            width: sliderWidth,
            flexDirection: this._needsRTLAdaptations() ? "row-reverse" : "row",
          },
    ];
    const contentContainerStyle = [
      vertical
        ? {
            paddingTop: this._getContainerInnerMargin(),
            paddingBottom: this._getContainerInnerMargin(true),
          }
        : {
            paddingLeft: this._getContainerInnerMargin(),
            paddingRight: this._getContainerInnerMargin(true),
          },
      contentContainerCustomStyle || {},
    ];

    const specificProps = !this._needsScrollView()
      ? {
          renderItem: this._renderItem,
          numColumns: 1,
          keyExtractor: keyExtractor || this._getKeyExtractor,
        }
      : {};

    return {
      ref: (c) => (this._carouselRef = c),
      data: this._getCustomData(),
      style: containerStyle,
      contentContainerStyle: contentContainerStyle,
      horizontal: !vertical,
      scrollEventThrottle: 1,
      onScroll: this._onScrollHandler,
      onScrollBeginDrag: this._onScrollBeginDrag,
      onScrollEndDrag: this._onScrollEndDrag,
      onTouchEnd: this._onScrollEnd,
      onLayout: this._onLayout,
      ...specificProps,
    };
  }

  render() {
    const { data, renderItem } = this.props;

    if (!data || !renderItem) {
      return null;
    }

    const props = {
      ...this._getComponentOverridableProps(),
      ...this.props,
      ...this._getComponentStaticProps(),
    };

    const ScrollViewComponent = AnimatedScrollView;

    return (
      <ScrollViewComponent {...props}>
        {this._getCustomData().map((item, index) => {
          return this._renderItem({ item, index });
        })}
      </ScrollViewComponent>
    );
  }
}
