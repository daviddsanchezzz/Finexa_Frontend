import React from "react";
import Svg, { Path } from "react-native-svg";
import { WORLD_MAP_VIEWBOX, WORLD_MAP_PATHS } from "../../../../../assets/worldMapPaths";

interface Props {
  visitedCodes: Set<string>;
  height?: number;
  visitedColor?: string;
  unvisitedColor?: string;
}

export default function WorldMapSvg({
  visitedCodes,
  height = 150,
  visitedColor = "#1A6AF5",
  unvisitedColor = "#E2E8F0",
}: Props) {
  return (
    <Svg viewBox={WORLD_MAP_VIEWBOX} width="100%" height={height}>
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
  );
}
