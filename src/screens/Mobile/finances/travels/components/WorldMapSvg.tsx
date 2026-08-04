import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { WORLD_MAP_VIEWBOX, WORLD_MAP_PATHS } from "../../../../../assets/worldMapPaths";

const [, , VB_WIDTH, VB_HEIGHT] = WORLD_MAP_VIEWBOX.split(" ").map(Number);
const MAP_ASPECT_RATIO = VB_WIDTH / VB_HEIGHT;

interface Props {
  visitedCodes: Set<string>;
  visitedColor?: string;
  unvisitedColor?: string;
}

export default function WorldMapSvg({
  visitedCodes,
  visitedColor = "#1A6AF5",
  unvisitedColor = "#E2E8F0",
}: Props) {
  return (
    // aspectRatio (not a fixed height) is what keeps the map filling its
    // full width with no letterboxing — a height picked independently of
    // the viewBox's own ratio just leaves SVG's default "meet" scaling to
    // pad the mismatch with empty space above/below.
    <View style={{ width: "100%", aspectRatio: MAP_ASPECT_RATIO }}>
      <Svg viewBox={WORLD_MAP_VIEWBOX} width="100%" height="100%">
        {Object.entries(WORLD_MAP_PATHS).map(([code, d]) => (
          <Path
            key={code}
            d={d}
            fill={visitedCodes.has(code) ? visitedColor : unvisitedColor}
            stroke="#F6F8FC"
            strokeWidth={0.5}
          />
        ))}
      </Svg>
    </View>
  );
}
