"use client";
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import {useWorld} from '@breadcrumb/client';
import {categories,UF_VIEW,relatedCrumbs,roundedLocation,inCampus,communities,type CommunityId,type Coordinate,type CrumbCategory,type WorldCrumb} from '@breadcrumb/shared';
import {worldClient,worldAction} from '@/lib/world-client';
import {ToastCrumbButton,CarriedCrumb} from './toast-crumb-button';
import {CampusMap} from './campus-map';
import {AvatarArt,BreadArt,ToastLogo} from './pixel-art';
import {useRouter} from 'next/navigation';

export function PixelWorld(){
 const router=useRouter();
 const {world,error,refresh}=useWorld(worldClient);
 const [panel,setPanel]=useState('map'),[filter,setFilter]=useState('all'),[selected,setSelected]=useState<Coordinate|null>(null),[crumbId,setCrumbId]=useState<string|null>(null);
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[category,setCategory]=useState<CrumbCategory>('freebie'),[notice,setNotice]=useState(''),[pending,setPending]=useState(false),[code,setCode]=useState('');
 const [community,setCommunity]=useState<CommunityId>('campus'),[carrying,setCarrying]=useState(false);
 const [sharing,setSharing]=useState(false),[ownPosition,setOwnPosition]=useState<Coordinate|null>(null);
 const [dropEffect,setDropEffect]=useState<{id:number;point:Coordinate}|null>(null);
 const watch=useRef<number|null>(null),heartbeat=useRef<ReturnType<typeof setInterval>|null>(null),position=useRef<Coordinate|null>(null);
 const stopSharing=useCallback(()=>{
  if(watch.current!==null)navigator.geolocation?.clearWatch(watch.current);watch.current=null;
  if(heartbeat.current)clearInterval(heartbeat.current);heartbeat.current=null;
  setSharing(false);
  void worldAction('presence_stop').catch(()=>{});
 },[]);
 useEffect(()=>{
  const visibility=()=>{if(document.hidden)stopSharing();};document.addEventListener('visibilitychange',visibility);
  return()=>{document.removeEventListener('visibilitychange',visibility);if(watch.current!==null)navigator.geolocation?.clearWatch(watch.current);if(heartbeat.current)clearInterval(heartbeat.current);if(watch.current!==null)void fetch('/api/world',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'presence_stop',data:{}}),keepalive:true}).catch(()=>{});};
 },[stopSharing]);
 async function act(action:string,data:unknown={},success='Saved.'){
  setPending(true);setNotice('');try{const result=await worldAction(action,data);setNotice(result.grouped?'Your related post joined this breadcrumb. You count once toward its loaf.':success);await refresh();return result;}catch(e){setNotice(e instanceof Error?e.message:'Could not save.');return null;}finally{setPending(false);}
 }
 function startSharing(){
  if(watch.current!==null)return;
  if(!world.profile?.avatar_completed){router.push('/avatar');return;}
  if(!navigator.geolocation){setNotice('Location is unavailable in this browser.');return;}
  const publish=()=>{if(position.current)void worldAction('presence',roundedLocation(position.current)).catch(e=>{setNotice(e.message);stopSharing();});};
  watch.current=navigator.geolocation.watchPosition(location=>{
   const p={latitude:location.coords.latitude,longitude:location.coords.longitude};
   if(!inCampus(p)){setNotice('You are outside the UF campus map. Location sharing was stopped.');stopSharing();return;}
   position.current=p;setOwnPosition(p);setSharing(true);publish();
  },()=>{setNotice('Location permission was denied or your position could not be found.');stopSharing();},{enableHighAccuracy:false,maximumAge:15000,timeout:15000});
  heartbeat.current=setInterval(publish,20000);
 }
 const point=selected??{latitude:UF_VIEW.latitude,longitude:UF_VIEW.longitude};
 const related=relatedCrumbs(world.crumbs.filter(c=>(c.community_id??'campus')===community),title,category,point).filter(c=>!c.is_author);
 const currentTheme=world.communities?.find(c=>c.id===community)??communities.find(c=>c.id===community)??communities[0];
 const active=world.crumbs.find(c=>c.id===crumbId);
 async function post(join_id?:string){if(world.profile&&!world.profile.avatar_completed){router.push('/avatar');return;}const result=await act('create',{...point,title,description,category,community_id:community,...(join_id?{join_id}:{})},'Breadcrumb dropped!');if(result){setDropEffect({id:Date.now(),point:join_id?(world.crumbs.find(c=>c.id===join_id)??point):point});setTitle('');setDescription('');setCrumbId(result.id??null);setPanel('detail');}}
 const pickCrumb=useCallback(()=>{setPanel('map');setCarrying(true);setNotice('Crumb in hand! Tap the map to drop it, then add your post.');},[]);
 function detail(c:WorldCrumb){setCrumbId(c.id);setPanel('detail');}
 return <main className="game-shell"><CarriedCrumb active={carrying}/>
  <header className="game-header"><Link href="/" className="game-logo"><ToastLogo size={40}/><span>BREADCRUMB<span className="logo-sub">LEAVE A CRUMB. SPREAD THE WORD.</span></span></Link><div className="header-actions"><ToastCrumbButton compact onPick={pickCrumb}/><Link className="pixel-button subtle" href="/communities">COMMUNITIES</Link><Link href="/friends" className="pixel-button subtle">FRIENDS {world.friends.filter(f=>f.accepted).length||''}</Link><Link href={world.profile?"/profile":"/login"} className="player-button">{world.profile&&<AvatarArt avatar={world.profile.avatar} size={20}/>} {world.profile?"PROFILE":"SIGN IN"}</Link></div></header>
  <div className="world-layout">
   <aside className="game-sidebar">
    <div className="sidebar-title"><p className="pixel-kicker">LEVEL 01 / UNIVERSITY OF FLORIDA</p><h1>A CAMPUS<br/>FULL OF<br/><span>CRUMBS.</span></h1><p>Your little corner of campus.<br/>Find something. Leave something.</p></div>
    <div className="game-rule"><div className="loaf-progression"><BreadArt size={24}/><span>→</span><BreadArt state="rising" size={30}/><span>→</span><BreadArt state="full_loaf" size={36}/></div><strong>GOOD THINGS RISE TOGETHER.</strong><p>Three independent confirmations or related posts grow a breadcrumb into a Full Loaf. Each person counts once.</p></div>
    <ToastCrumbButton onPick={pickCrumb}/>
    <div className="sidebar-feed"><p className="pixel-kicker">FRESH FROM THE OVEN <span>{world.crumbs.length}</span></p>{world.crumbs.length?world.crumbs.filter(c=>(c.community_id??'campus')===community).slice(0,4).map(c=><button className="tiny-crumb" key={c.id} onClick={()=>detail(c)}><BreadArt state={c.state}/><span>{c.title}<small>{categories.find(cat=>cat.id===c.category)?.label} · {c.confirm_count}/3 confirmations</small></span></button>):<p className="empty-copy">Nothing in the oven yet.<br/>Be the first to leave a crumb.</p>}</div>
    <div className="friend-sharing"><span className={`status-light ${sharing?'on':''}`}/><strong>{sharing?'VISIBLE TO FRIENDS':'EXPLORING PRIVATELY'}</strong><p>Location sharing is off by default. Friends only, rounded to about 100 m.</p><button onClick={sharing?stopSharing:startSharing} className="text-button">{sharing?'STOP SHARING':'SHARE WITH FRIENDS →'}</button></div>
   </aside>
   <section className="world-stage" style={{'--active-accent':currentTheme.accent,'--active-background':currentTheme.background} as CSSProperties}><div className="category-toolbar community-map-tabs"><div role="tablist" aria-label="Your communities">{(world.communities??communities.map(c=>({...c,joined:c.id==='campus'}))).filter(c=>c.id==='campus'||c.joined).map(c=><button role="tab" aria-selected={community===c.id} key={c.id} onClick={()=>setCommunity(c.id)} style={{borderColor:c.accent,background:community===c.id?c.accent:c.background,color:community===c.id?'#FFF9ED':'#49382C'}}>{c.name.toUpperCase()}</button>)}<Link href="/profile#communities" className="add-community-link" aria-label="Add communities from your profile">+ ADD</Link></div><label className="category-select-label">FILTER<select aria-label="Filter breadcrumb category" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label></div><CampusMap world={{...world,crumbs:world.crumbs.filter(c=>(c.community_id??'campus')===community&&(filter==='all'||c.category===filter))}} onDrop={p=>{setSelected(p);if(carrying){setDropEffect({id:Date.now(),point:p});setCarrying(false);}setPanel('post');}} onCrumb={detail} selected={selected} ownPosition={ownPosition} dropEffect={dropEffect}/>
    {(error||notice)&&<div className="world-notice" role="status">{notice||error}</div>}
    {panel!=='map'&&<div className="game-panel" role="region" aria-label={`${panel} panel`}><div className="panel-heading"><span className="pixel-kicker">{panel==='post'?'DROP A BREADCRUMB':panel==='detail'?'CAMPUS DISCOVERY':panel==='avatar'?'PLAYER CREATOR':panel.toUpperCase()}</span><button onClick={()=>setPanel('map')} aria-label="Close panel">×</button></div>
     {panel==='post'&&<><h2>FOUND SOMETHING?</h2><p>Tap a spot on the map, then leave a crumb for the next person.</p><p className="pixel-kicker">{selected?'LOCATION SELECTED ✓':'TAP THE MAP TO CHOOSE A LOCATION'}</p><label>Community<select value={community} onChange={e=>setCommunity(e.target.value as CommunityId)}>{(world.communities??communities.map(c=>({...c,joined:c.id==='campus'}))).filter(c=>c.id==='campus'||c.joined).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value as CrumbCategory)}>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>What’s happening?<input value={title} maxLength={180} onChange={e=>setTitle(e.target.value)} placeholder="Free pizza outside Turlington"/></label><label>Anything else?<textarea value={description} maxLength={2000} onChange={e=>setDescription(e.target.value)} placeholder="A little more detail (optional)"/></label>{related.length>0&&<div className="related-posts"><strong>SAME THING, DIFFERENT CRUMB?</strong>{related.map(c=><div key={c.id}><span>{c.title}</span><div><button disabled={pending} onClick={()=>void act('vote',{id:c.id,value:1},'Confirmation added.')}>I SEE THIS</button><button disabled={pending||title.trim().length<3} onClick={()=>void post(c.id)}>ADD MY UPDATE</button></div></div>)}</div>}{world.profile?<button className="pixel-button" disabled={pending||!selected||title.trim().length<3} onClick={()=>void post()}>DROP THIS CRUMB →</button>:<Link href="/login" className="pixel-button">SIGN IN TO POST →</Link>}</>}
     {panel==='detail'&&(active?<><div className="crumb-detail-title"><BreadArt state={active.state} size={56}/><h2>{active.title}</h2></div><span className="state-badge">{active.state.replace('_',' ').toUpperCase()}</span><p>{active.description||'A little discovery from the UF community.'}</p><p>{active.confirm_count} confirmations · {active.dispute_count} disputes · {active.related_posts} related posts</p><p className="fine-print">Full Loaf means community corroborated. It does not mean verified true.</p>{active.is_author?<p>You left this breadcrumb. Other people can help it rise.</p>:<div className="button-row"><button className="pixel-button" disabled={pending} onClick={()=>void act('vote',{id:active.id,value:1},'Confirmation added.')}>{active.my_vote===1?'✓ CONFIRMED':'I SEE THIS NOW'}</button><button className="pixel-button subtle" disabled={pending} onClick={()=>void act('vote',{id:active.id,value:-1},'Dispute recorded.')}>DISPUTE</button></div>}<details><summary>Report this breadcrumb</summary><p>Reporting hides it from your map immediately.</p>{['harassment','privacy','spam','other'].map(reason=><button className="report-button" disabled={pending} key={reason} onClick={()=>void act('report',{id:active.id,reason},'Reported and hidden from your map.')}>{reason}</button>)}</details></>:<p>This breadcrumb has expired, been removed, or is hidden from your map.</p>)}
     {panel==='friends'&&<><h2>YOUR CAMPUS CREW.</h2><p>Only accepted friends can see your location when sharing is on.</p>{world.profile?<><p>{sharing?'Your rounded location is visible to accepted friends.':'Your location is private. Sharing is off.'}</p><button className="pixel-button" onClick={sharing?stopSharing:startSharing}>{sharing?'STOP SHARING LOCATION':'SHARE WITH FRIENDS →'}</button><p className="friend-code">YOUR FRIEND CODE: <strong>{world.profile.friend_code}</strong></p><label>Add a friend<input value={code} maxLength={8} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="8-CHARACTER FRIEND CODE"/></label><button className="pixel-button" disabled={pending||code.length!==8} onClick={()=>void act('friend_request',{code},'Friend request sent.')}>SEND REQUEST →</button>{world.friends.map(f=><div className="friend-row" key={f.id}><AvatarArt avatar={f.avatar} size={24}/><div><strong>PLAYER {f.handle.slice(-5).toUpperCase()}</strong><p>{f.accepted?'FRIEND':f.incoming?'WANTS TO BE FRIENDS':'REQUEST SENT'}</p></div>{!f.accepted&&f.incoming&&<button disabled={pending} onClick={()=>void act('friend_accept',{id:f.id},'Friend added.')}>ACCEPT</button>}<button disabled={pending} onClick={()=>void act('friend_remove',{id:f.id},'Friendship removed.')} aria-label="Remove friendship">×</button></div>)}{!world.friends.length&&<p>Your crew starts here. Exchange codes with someone you know.</p>}</>:<Link href="/login" className="pixel-button">SIGN IN TO ADD FRIENDS →</Link>}</>}
     {panel==='buzz'&&<><h2>FRESH CAMPUS BUZZ.</h2>{world.crumbs.length?world.crumbs.filter(c=>(c.community_id??'campus')==='campus').map(c=><button className="tiny-crumb" key={c.id} onClick={()=>detail(c)}><BreadArt state={c.state}/>{c.title}</button>):<p>The first breadcrumb is yours to leave.</p>}</>}
     {panel==='ask'&&<><h2>ASK BREADCRUMB.</h2><p>The campus guide is coming next. For now, explore the map for fresh community discoveries.</p></>}
     {panel==='radar'&&<><h2>ON YOUR RADAR.</h2><p>Notification settings are coming next. Location sharing is controlled separately under Friends.</p></>}
    </div>}
   </section>
  </div>
  <nav className="game-nav" aria-label="Main navigation">{[['map','◎','MAP'],['buzz','≋','LIVE BUZZ'],['communities','+','COMMUNITIES'],['radar','◉','RADAR']].map(([id,icon,label])=><button key={id} aria-current={panel===id?'page':undefined} onClick={()=>{if(id==='communities')router.push('/communities');else setPanel(id);}}><span>{icon}</span>{label}</button>)}<span className="nav-caption">MADE FOR THE MOMENTS BETWEEN CLASSES.</span></nav>
 </main>;
}
