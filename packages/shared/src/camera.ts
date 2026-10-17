type Point={x:number;y:number};
export function pinchCamera(startZoom:number,startDistance:number,distance:number,anchor:Point,midpoint:Point,size:{width:number;height:number}){
 const zoom=Math.max(1,Math.min(128,startZoom*distance/Math.max(1,startDistance)));
 const scale=320/zoom/Math.max(size.width,size.height);
 return {zoom,center:{x:Math.max(0,Math.min(320,anchor.x-(midpoint.x-size.width/2)*scale)),y:Math.max(0,Math.min(320,anchor.y-(midpoint.y-size.height/2)*scale))}};
}
