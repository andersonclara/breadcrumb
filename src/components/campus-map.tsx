"use client";
import Map, { NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { UF_VIEW } from "@/lib/crumbs";

export function CampusMap() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return <div className="map-placeholder flex min-h-[460px] h-full items-center justify-center px-6">
    <div className="max-w-sm rounded-2xl border border-crust/10 bg-cream/95 p-7 text-center shadow-sm">
      <span className="text-3xl" aria-hidden="true">◎</span><h2 className="mt-3 text-xl font-semibold">Your campus, in the moment.</h2>
      <p className="mt-3 text-sm leading-6 text-crust/75">The live UF map will appear here once Mapbox is connected.</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-crust/55">Gainesville, Florida</p>
    </div>
  </div>;
  return <Map initialViewState={UF_VIEW} mapboxAccessToken={token} mapStyle="mapbox://styles/mapbox/light-v11" style={{ width: "100%", height: "100%", minHeight: 460 }}>
    <NavigationControl position="bottom-right" />
  </Map>;
}
