import { memo, useMemo } from "react";
import { G, Path, Text as SvgText } from "react-native-svg";
import {
  campus,
  campusPeople,
  type World,
  type Coordinate,
} from "@breadcrumb/shared";
import {
  type SceneBuilding,
  type queryMapScene,
} from "@/lib/map-scene";
import { spritePaths } from "@/lib/map-sprites";
import { AvatarGlyph } from "./pixel-art";
type Geometry = ReturnType<typeof queryMapScene>;
export const MapTerrain = memo(function MapTerrain({
  geometry,
}: {
  geometry: Geometry;
}) {
  return (
    <G>
      {geometry.terrain.map((p) => (
        <Path key={p.style} d={p.path} fill={campus.colors[p.style]} />
      ))}
      {geometry.roads.map((p) => (
        <Path
          key={"r" + p.style}
          d={p.path}
          fill="none"
          stroke="#C4B594"
          strokeWidth={p.style}
          strokeLinecap="round"
        />
      ))}
      {geometry.walkways.map((p) => (
        <Path
          key={"w" + p.style}
          d={p.path}
          fill="none"
          stroke="#FFE7B1"
          strokeWidth={p.style}
          strokeLinecap="round"
        />
      ))}
    </G>
  );
});
const BuildingGlyph = memo(function BuildingGlyph({
  b,
  simple,
}: {
  b: SceneBuilding;
  simple: boolean;
}) {
  const art = useMemo(() => simple ? [] : spritePaths(b.art?.pixels ?? []), [b.art, simple]);
  if (b.art && !simple)
    return (
      <G
        transform={`translate(${b.x - b.width / 2} ${b.y - b.artHeight}) scale(${b.width / b.art.width} ${b.artHeight / b.art.height})`}
      >
        {art.map((p, i) => (
          <Path key={i} d={p.path} fill={p.color} />
        ))}
      </G>
    );
  return (
    <G>
      {simple ? (
        <Path d={b.wall} fill={b.faces[0]?.color ?? "#9D6C56"} />
      ) : (
        b.faces.map((face, i) => (
          <Path key={i} d={face.path} fill={face.color} />
        ))
      )}
      {!simple && (
        <>
          <Path d={b.accents} fill="#F4DDA8" />
          <Path d={b.windows} fill="#4A8EAF" />
        </>
      )}
      <Path d={b.path} fill={b.roof} />
    </G>
  );
});
export const MapBuildings = memo(function MapBuildings({
  geometry,
  simple,
}: {
  geometry: Geometry;
  simple: boolean;
}) {
  return (
    <G>
      {geometry.buildings.map((b) => (
        <BuildingGlyph key={b.id} b={b} simple={simple} />
      ))}
    </G>
  );
});
export const MapPeople = memo(function MapPeople({
  world,
  position,
  scale,
}: {
  world: World;
  position?: Coordinate | null;
  scale: number;
}) {
  const people = campusPeople(world, false, 0, position);
  return (
    <G>
      {people.map((p) => (
        <G
          key={p.id}
          transform={`translate(${p.x} ${p.y}) scale(${scale * p.facing} ${scale}) translate(-8 -24)`}
        >
          <AvatarGlyph avatar={p.avatar} walking={false} />
          <SvgText
            x={8}
            y={-3}
            fontSize={6}
            textAnchor="middle"
            fill="#49382C"
            stroke="#FFFCF5"
            strokeWidth={0.2}
          >
            {p.id === "self" ? "You" : "Friend ?100m"}
          </SvgText>
        </G>
      ))}
    </G>
  );
});
