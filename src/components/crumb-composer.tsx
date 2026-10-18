"use client";
import Link from 'next/link';
import {useRef,useState} from 'react';
import {categories,postHeadline,submissionTime,type NearbyPostBuilding,type CommunityId,type CrumbCategory,type WorldCrumb} from '@breadcrumb/shared';
import {BreadArt,ToastLogo} from './pixel-art';

export function CrumbComposer({description,category,community,joined,originalLocationLabel,nearbyBuildings,buildingId,onBuilding,hasLocation,signedIn,pending,related,onTitle,onDescription,onCategory,onCommunity,onPost,onConfirm}:{
 description:string;category:CrumbCategory;community:CommunityId;
 originalLocationLabel:string;nearbyBuildings:NearbyPostBuilding[];buildingId:string;onBuilding:(id:string)=>void;
 joined:{id:string;name:string}[];hasLocation:boolean;signedIn:boolean;pending:boolean;related:WorldCrumb[];
 onTitle:(value:string)=>void;onDescription:(value:string)=>void;onCategory:(value:CrumbCategory)=>void;onCommunity:(value:string)=>void;
 onPost:(id?:string)=>Promise<unknown>;onConfirm:(id:string)=>void;
}){
 const submitting=useRef(false);
 const [submittedAt,setSubmittedAt]=useState<string|null>(null);
 const ready=hasLocation&&description.trim().length>=3&&!pending;
 async function submit(id?:string){if(!ready||submitting.current)return;submitting.current=true;setSubmittedAt(new Date().toISOString());try{await onPost(id);}finally{submitting.current=false;}}
 return <form className="crumb-composer" aria-label="Create a breadcrumb" onSubmit={e=>{e.preventDefault();void submit();}}>
  <div className="recipe-masthead"><span>BREADCRUMB KITCHEN</span><span>RECIPE CARD / 01</span></div>
  <div className="composer-intro"><div className="composer-toast"><ToastLogo size={64}/></div><div><span className="pixel-kicker">FRESH FROM CAMPUS</span><h2>A fresh crumb.</h2><p>One good find, ready to share.</p></div></div>
  <div className="recipe-meta recipe-meta-controls"><div className="recipe-prep-time"><span>PREP TIME</span><strong>{pending&&submittedAt?submissionTime(submittedAt):'On submission'}</strong></div><label className="recipe-meta-field" htmlFor="crumb-community"><span>SERVES</span><select id="crumb-community" aria-label="Serves, community" value={community} disabled={pending} onChange={e=>onCommunity(e.target.value)}>{joined.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="recipe-meta-field" htmlFor="crumb-flavor"><span>FLAVOR</span><select id="crumb-flavor" aria-label="Flavor, category" value={category} disabled={pending} onChange={e=>onCategory(e.target.value as CrumbCategory)}>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label></div>
  <label className="recipe-ingredients recipe-post-field" htmlFor="crumb-ingredients"><span className="recipe-post-heading">Ingredients</span><textarea id="crumb-ingredients" autoFocus required minLength={3} maxLength={2000} rows={6} value={description} disabled={pending} onChange={e=>{onDescription(e.target.value);onTitle(postHeadline(e.target.value));}} placeholder="What's happening? Write your post here..."/><span className="composer-field-help"><span>Your campus find, in your own words.</span><span>{description.length}/2000</span></span></label>
  <label className="composer-building-field" htmlFor="crumb-building"><span className="composer-label-heading">LOCATION <span className="composer-optional">OPTIONAL</span></span><select id="crumb-building" value={buildingId} disabled={pending||!hasLocation} onChange={e=>onBuilding(e.target.value)}><option value="">{originalLocationLabel}</option>{nearbyBuildings.map(b=><option key={b.id} value={b.id}>At {b.name} ({Math.round(b.distance)} m)</option>)}</select><span className="composer-field-help">{buildingId?'Your crumb will appear at this building.':'Auto-described from your map pin. Your exact clicked spot stays pinned.'}</span></label>
  {related.length>0&&<section className="composer-related" aria-label="Related breadcrumbs"><p className="pixel-kicker">SAME RECIPE, NEW DETAILS?</p><p>Fold your update into a nearby breadcrumb.</p>{related.map(c=><div className="composer-related-card" key={c.id}><div><BreadArt state={c.state}/><strong>{c.title}</strong></div><div><button type="button" disabled={pending} onClick={()=>onConfirm(c.id)}>I see it too</button><button type="button" disabled={!ready} onClick={()=>void submit(c.id)}>Add my update &#8599;</button></div></div>)}</section>}
  <footer className="composer-footer"><span className="recipe-finish">Ready to serve?</span><span className="composer-readiness">{pending?'Dropping your breadcrumb...':!hasLocation?'Pick a map location to post.':description.trim().length<3?'Add your ingredients to drop a crumb.':`Ready for ${joined.find(c=>c.id===community)?.name??'your community'}.`}</span>{signedIn?<button className="pixel-button composer-submit" type="submit" disabled={!ready}><BreadArt state="crumb" size={28}/>{pending?'DROPPING...':'DROP BREADCRUMB'}<span aria-hidden="true">&#8594;</span></button>:<Link href="/login" className="pixel-button composer-submit">SIGN IN TO POST <span aria-hidden="true">&#8594;</span></Link>}</footer>
 </form>;
}
