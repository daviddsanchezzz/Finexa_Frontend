import { useRef, useState } from "react";
import { Platform, type GestureResponderEvent, type View } from "react-native";

// Measure the chart container, not the SVG path that happened to receive the touch.
export default function useChartScrubber(onSelect: (fraction: number) => void, inset = 13) {
  const ref = useRef<View>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const gesture = useRef({ active: false, x: 0, left: 0, width: 0, sequence: 0 });

  const select = () => {
    const { x, left, width } = gesture.current;
    if (width > 0) onSelect(Math.max(0, Math.min(1, (x - left) / width)));
  };
  const updateX = (event: GestureResponderEvent) => {
    gesture.current.x = event.nativeEvent.pageX - (Platform.OS === "web" ? window.scrollX : 0);
  };
  const finish = () => {
    gesture.current.active = false;
    setIsScrubbing(false);
  };

  return {
    ref,
    isScrubbing,
    handlers: {
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderTerminationRequest: () => false,
      onResponderGrant: (event: GestureResponderEvent) => {
        updateX(event);
        gesture.current.active = true;
        gesture.current.width = 0;
        const sequence = ++gesture.current.sequence;
        setIsScrubbing(true);
        ref.current?.measureInWindow((left, _top, width) => {
          if (gesture.current.sequence !== sequence) return;
          gesture.current.left = left + inset;
          gesture.current.width = width - inset * 2;
          select();
        });
      },
      onResponderMove: (event: GestureResponderEvent) => {
        if (!gesture.current.active) return;
        updateX(event);
        select();
      },
      onResponderRelease: finish,
      onResponderTerminate: () => {
        ++gesture.current.sequence;
        finish();
      },
      onTouchStart: (event: GestureResponderEvent) => event.stopPropagation(),
      onTouchEnd: (event: GestureResponderEvent) => event.stopPropagation(),
    },
  };
}
