"use client";
import {AskPanel} from './ask-panel';
import {AskDiscovery} from './ask-discovery';
import type {DiscoveryRecord} from '@breadcrumb/shared';
import {useLocationSharing} from './location-sharing';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState,type CSSProperties} from 'react';
import {useWorld} from '@breadcrumb/client';
import {categories,CRUMB_DROP_DURATION,fromWorld,UF_VIEW,relatedCrumbs,nearbyPostBuildings,describePostLocation,postLocation,submissionTime,toastStatuses,communities,type MapBuilding,type CommunityId,type Coordinate,type CrumbCategory,type WorldCrumb} from '@breadcrumb/shared';
import {worldClient,worldAction} from '@/lib/world-client';
import {ToastCrumbButton,CarriedCrumb} from './toast-crumb-button';
import {CrumbComposer} from './crumb-composer';
import {BuildingEvents} from './building-events';
import {CampusMap} from './campus-map';
import {AvatarArt,BreadArt,ToastLogo} from './pixel-art';
import {useRouter} from 'next/navigation';

export function PixelWorld(){
 const router=useRouter();
 const [askSelection,setAskSelection]=useState<{record:DiscoveryRecord;revision:number}|null>(null),[mapFocus,setMapFocus]=useState<{record:DiscoveryRecord;revision:number}|null>(null);
 const {world,error,refresh}=useWorld(worldClient);
 const [panel,setPanel]=useState('map'),[filter,setFilter]=useState('all'),[selected,setSelected]=useState<Coordinate|null>(null),[crumbId,setCrumbId]=useState<string|null>(null);
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[category,setCategory]=useState<CrumbCategory>('freebie'),[notice,setNotice]=useState(''),[pending,setPending]=useState(false),[code,setCode]=useState('');
 const [toastStatus,setToastStatus]=useState('all');
 const [community,setCommunity]=useState<CommunityId>('campus'),[carrying,setCarrying]=useState(false);
 const {position:ownPosition}=useLocationSharing();
 const [dropOrigin,setDropOrigin]=useState<Coordinate|null>(null),[postBuilding,setPostBuilding]=useState('');
 const nearbyBuildings=useMemo(()=>dropOrigin?nearbyPostBuildings(dropOrigin):[],[dropOrigin]);
 const originalLocationLabel=useMemo(()=>dropOrigin?describePostLocation(dropOrigin,nearbyBuildings):'Choose a map spot',[dropOrigin,nearbyBuildings]);
 function choosePostBuilding(id:string){setPostBuilding(id);setSelected(postLocation(dropOrigin,nearbyBuildings,id));}
 const [building,setBuilding]=useState<MapBuilding|null>(null);
 const [dropEffect,setDropEffect]=useState<{id:number;point:Coordinate;compose?:boolean;cursorSource?:{x:number;y:number}}|null>(null);
 useEffect(()=>{if(!dropEffect?.compose)return;const timer=setTimeout(()=>setPanel('post'),CRUMB_DROP_DURATION);return()=>clearTimeout(timer);},[dropEffect]);
 async function act(action:string,data:unknown={},success='Saved.'){
  setPending(true);setNotice('');try{const result=await worldAction(action,data);setNotice(result.grouped?'Your related post joined this breadcrumb. You count once toward its loaf.':success);await refresh();return result;}catch(e){setNotice(e instanceof Error?e.message:'Could not save.');return null;}finally{setPending(false);}
 }
 const focusDiscovery=useCallback((record:DiscoveryRecord)=>setMapFocus(previous=>({record,revision:(previous?.revision??0)+1})),[]);
 function openAskDiscovery(record:DiscoveryRecord){setMapFocus(null);setDropEffect(null);setCarrying(false);setAskSelection(previous=>({record,revision:(previous?.revision??0)+1}));setPanel('discovery');}
 const point=selected??{latitude:UF_VIEW.latitude,longitude:UF_VIEW.longitude};
 const related=relatedCrumbs(world.crumbs.filter(c=>(c.community_id??'campus')===community),title,category,point).filter(c=>!c.is_author);
 const currentTheme=world.communities?.find(c=>c.id===community)??communities.find(c=>c.id===community)??communities[0];
 const communityCrumbs=world.crumbs.filter(c=>(c.community_id??'campus')===community);
 const mapCrumbs=communityCrumbs.filter(c=>(filter==='all'||c.category===filter)&&(toastStatus==='all'||c.state===toastStatus));
 const active=world.crumbs.find(c=>c.id===crumbId);
 async function post(join_id?:string){if(world.profile&&!world.profile.avatar_completed){router.push('/avatar');return;}const result=await act('create',{...point,title,description,category,community_id:community,...(join_id?{join_id}:{})},'Breadcrumb dropped!');if(result){setDropEffect(null);setTitle('');setDescription('');setCrumbId(result.id??null);setPanel('detail');}}
 const pickCrumb=useCallback(()=>{setDropEffect(null);setPanel('map');setCarrying(true);setNotice('Crumb in hand! Tap the map to drop it, then add your post.');},[]);
 function startPost(p:Coordinate,cursorSource?:{x:number;y:number}){setDropOrigin(p);setPostBuilding('');setBuilding(null);setSelected(p);setCarrying(false);setPanel('map');setDropEffect({id:Date.now(),point:p,compose:true,cursorSource});}
 function detail(c:WorldCrumb){setDropEffect(null);setCrumbId(c.id);setPanel('detail');}
 return <main className="game-shell"><CarriedCrumb active={carrying}/>
  <header className="game-header"><Link href="/" className="game-logo"><ToastLogo size={40}/><span>BREADCRUMB<span className="logo-sub">LEAVE A CRUMB. SPREAD THE WORD.</span></span></Link><div className="header-actions"><Link className="pixel-button subtle" href="/communities">COMMUNITIES</Link><Link href="/friends" className="pixel-button subtle">FRIENDS {world.friends.filter(f=>f.accepted).length||''}</Link><Link href={world.profile?"/profile":"/login"} className="player-button">{world.profile&&<AvatarArt avatar={world.profile.avatar} size={20}/>} {world.profile?"PROFILE":"SIGN IN"}</Link></div></header>
  <div className="world-layout">
   <aside className="game-sidebar">
    <div className="sidebar-title"><p className="pixel-kicker">YOUR UF COMMUNITY, ON THE MAP</p><h1>FIND YOUR<br/>NEXT<br/><span>CRUMB.</span></h1><p>Free finds, campus plans, and small discoveries. See what your people are sharing.</p></div>
    <div className="campus-summary"><div><strong>{communityCrumbs.length}</strong><span>LIVE CRUMBS</span></div><div><strong>{communityCrumbs.filter(c=>c.state==='full_loaf').length}</strong><span>FULL LOAVES</span></div></div>
    <ToastCrumbButton onPick={pickCrumb}/>
    <div className="sidebar-feed"><p className="pixel-kicker">FRESH CRUMBS <span>{communityCrumbs.length}</span></p>{communityCrumbs.length?communityCrumbs.slice(0,4).map(c=><button className="tiny-crumb" key={c.id} onClick={()=>detail(c)}><BreadArt state={c.state}/><span>{c.title}<small>{categories.find(cat=>cat.id===c.category)?.label} · {c.state==='full_loaf'?'Full Loaf':c.state==='rising'?'Rising':c.state==='burnt'?'Burnt toast':c.state==='stale'?'Stale':'Fresh crumb'}</small></span></button>):<p className="empty-copy">This corner is quiet.<br/>Leave the first crumb.</p>}</div>
   </aside>
   <section className="world-stage" style={{'--active-accent':currentTheme.accent,'--active-background':currentTheme.background} as CSSProperties}><div className="category-toolbar community-map-tabs"><span className="map-nav-label">YOUR COMMUNITIES</span><div role="tablist" aria-label="Your communities">{(world.communities??communities.map(c=>({...c,joined:c.id==='campus'}))).filter(c=>c.id==='campus'||c.joined).map(c=><button role="tab" aria-selected={community===c.id} key={c.id} onClick={()=>setCommunity(c.id)} style={{borderColor:c.accent,background:community===c.id?c.accent:c.background,color:community===c.id?'#FFF9ED':'#49382C'}}>{c.name.toUpperCase()}</button>)}<Link href="/profile#communities" className="add-community-link" aria-label="Add communities from your profile">+ JOIN</Link></div><label className="category-select-label">TOAST<select aria-label="Filter toast status" value={toastStatus} onChange={e=>setToastStatus(e.target.value)}>{toastStatuses.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label><label className="category-select-label">SHOW<select aria-label="Filter breadcrumb category" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label></div><CampusMap key={mapFocus?.revision??0} discoveryFocus={mapFocus} onDiscovery={openAskDiscovery} communityName={currentTheme.name} world={{...world,crumbs:mapCrumbs}} onBuilding={b=>{setDropEffect(null);setBuilding(b);setCarrying(false);setPanel('building');}} selectedBuildingId={panel==='building'?building?.id:null} placing={carrying} onDrop={startPost} onCrumb={detail} selected={selected} ownPosition={ownPosition} dropEffect={dropEffect}/>
    {(error||notice)&&<div className="world-notice" role="status">{notice||error}</div>}
    {panel==='map'&&!carrying&&<button className="pixel-button ask-launcher" onClick={()=>{setDropEffect(null);setPanel('ask');}}>ASK BREADCRUMB</button>}
    <AskPanel open={panel==='ask'} onClose={()=>setPanel('map')} onMap={openAskDiscovery}/>
    {panel!=='map'&&panel!=='ask'&&<div className={`game-panel ${panel==='post'?'composer-panel':''}`} role="region" aria-label={`${panel} panel`}><div className="panel-heading"><span className="pixel-kicker">{panel==='post'?'DROP A BREADCRUMB':panel==='detail'?'CAMPUS DISCOVERY':panel==='avatar'?'PLAYER CREATOR':panel.toUpperCase()}</span><button onClick={()=>setPanel('map')} aria-label="Close panel">×</button></div>
     {panel==='discovery'&&askSelection&&<AskDiscovery key={askSelection.revision} record={askSelection.record} onCurrent={focusDiscovery} onBack={()=>setPanel('ask')}/>}
     {panel==='building'&&building&&<BuildingEvents building={building} crumbs={world.crumbs.filter(c=>(c.community_id??'campus')===community)} onCrumb={detail} onPost={()=>startPost(fromWorld(building.x,building.y-building.height/2))}/>}
     {panel==='post'&&<CrumbComposer description={description} category={category} community={community} joined={(world.communities??communities.map(c=>({...c,joined:c.id==='campus'}))).filter(c=>c.id==='campus'||c.joined)} originalLocationLabel={originalLocationLabel} nearbyBuildings={nearbyBuildings} buildingId={postBuilding} onBuilding={choosePostBuilding} hasLocation={!!selected} signedIn={!!world.profile} pending={pending} related={related} onTitle={setTitle} onDescription={setDescription} onCategory={setCategory} onCommunity={setCommunity} onPost={post} onConfirm={id=>{void act('vote',{id,value:1},'Confirmation added.');}}/>}
     {panel==='detail'&&(active?<><div className="crumb-detail-title"><BreadArt state={active.state} size={56}/><h2>{active.title}</h2></div><span className="state-badge">{active.state.replace('_',' ').toUpperCase()}</span><p className="fine-print">Submitted {submissionTime(active.created_at)}</p><p>{active.description||'A little discovery from the UF community.'}</p><p>{active.related_posts} related updates</p><p className="fine-print">Community updates help keep this event current.</p>{active.is_author?<p>You left this breadcrumb. Other people can help it rise.</p>:<div className="button-row"><button className="pixel-button" disabled={pending} onClick={()=>void act('vote',{id:active.id,value:1},'Confirmation added.')}>{active.my_vote===1?'✓ CONFIRMED':'I SEE THIS NOW'}</button><button className="pixel-button subtle" disabled={pending} onClick={()=>void act('vote',{id:active.id,value:-1},'Dispute recorded.')}>DISPUTE</button></div>}<details><summary>Report this breadcrumb</summary><p>Reporting hides it from your map immediately.</p>{['harassment','privacy','spam','other'].map(reason=><button className="report-button" disabled={pending} key={reason} onClick={()=>void act('report',{id:active.id,reason},'Reported and hidden from your map.')}>{reason}</button>)}</details></>:<p>This breadcrumb has expired, been removed, or is hidden from your map.</p>)}
     {panel==='friends'&&<><h2>YOUR CAMPUS CREW.</h2><p>Only accepted friends can see your location when sharing is on.</p>{world.profile?<><Link href="/profile#location">Location settings</Link><p className="friend-code">YOUR FRIEND CODE: <strong>{world.profile.friend_code}</strong></p><label>Add a friend<input value={code} maxLength={8} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="8-CHARACTER FRIEND CODE"/></label><button className="pixel-button" disabled={pending||code.length!==8} onClick={()=>void act('friend_request',{code},'Friend request sent.')}>SEND REQUEST →</button>{world.friends.map(f=><div className="friend-row" key={f.id}><AvatarArt avatar={f.avatar} size={24}/><div><strong>PLAYER {f.handle.slice(-5).toUpperCase()}</strong><p>{f.accepted?'FRIEND':f.incoming?'WANTS TO BE FRIENDS':'REQUEST SENT'}</p></div>{!f.accepted&&f.incoming&&<button disabled={pending} onClick={()=>void act('friend_accept',{id:f.id},'Friend added.')}>ACCEPT</button>}<button disabled={pending} onClick={()=>void act('friend_remove',{id:f.id},'Friendship removed.')} aria-label="Remove friendship">×</button></div>)}{!world.friends.length&&<p>Your crew starts here. Exchange codes with someone you know.</p>}</>:<Link href="/login" className="pixel-button">SIGN IN TO ADD FRIENDS →</Link>}</>}
     {panel==='buzz'&&<><h2>FRESH CAMPUS BUZZ.</h2>{world.crumbs.length?world.crumbs.filter(c=>(c.community_id??'campus')==='campus').map(c=><button className="tiny-crumb" key={c.id} onClick={()=>detail(c)}><BreadArt state={c.state}/>{c.title}</button>):<p>The first breadcrumb is yours to leave.</p>}</>}
     {panel==='radar'&&<><h2>ON YOUR RADAR.</h2><p>Notification settings are coming next. Location sharing is controlled in your Profile.</p></>}
    </div>}
   </section>
  </div>
 </main>;
}
