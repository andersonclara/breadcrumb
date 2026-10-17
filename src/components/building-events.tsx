"use client";
import {buildingLoaves,campus,type MapBuilding,type WorldCrumb} from '@breadcrumb/shared';
import {BreadArt} from './pixel-art';

export function BuildingEvents({building,crumbs,onCrumb,onPost}:{building:MapBuilding;crumbs:WorldCrumb[];onCrumb:(c:WorldCrumb)=>void;onPost:()=>void}){
 const loaves=buildingLoaves(building,crumbs,campus.metersPerUnit);
 return <><h2>{building.name||'Campus building'}</h2>{building.buildingNumber&&<p className="pixel-kicker">UF BUILDING {building.buildingNumber}</p>}<p>Full Loaf events at or near this building.</p><div className="building-event-list">{loaves.length?loaves.map(c=><button className="tiny-crumb" key={c.id} onClick={()=>onCrumb(c)}><BreadArt state="full_loaf" size={38}/><span><strong>{c.title}</strong><small>{c.description}</small><small>Full Loaf</small></span></button>):<p className="empty-copy">No active Full Loaf events here yet.</p>}</div><button className="pixel-button" onClick={onPost}>LEAVE A CRUMB HERE</button></>;
}
