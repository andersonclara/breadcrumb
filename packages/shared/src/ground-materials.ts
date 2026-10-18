
export const groundMaterials={
 grass:{name:'Grass',color:'#A7CF7B',detail:'#93BA6D',size:.32,path:'M.04 .07h.025v.02H.04zM.22 .23h.02v.025H.22z'},
 woodland:{name:'Natural woodland',color:'#658D60',detail:'#567C53',size:.4,path:'M.08 .06h.05v.03H.08zM.27 .29h.04v.03H.27z'},
 water:{name:'Water',color:'#72B5CC',detail:'#93CBD7',size:.4,path:'M.03 .09h.13v.012H.03zM.22 .28h.1v.012H.22z'},
 planter:{name:'Planted bed',color:'#859E68',detail:'#6C8656',size:.18,path:'M.02 .03h.035v.035H.02zM.11 .12h.035v.025H.11z'},
 turf:{name:'Artificial turf',color:'#7CAE66',detail:'#74A25F',size:.4,path:'M0 0h.2v.4H0z'},
 sand:{name:'Sand / dirt',color:'#E4CF9A',detail:'#C9B37D',size:.16,path:'M.03 .04h.012v.012H.03zM.11 .12h.015v.012H.11z'},
 concrete:{name:'Concrete',color:'#F3E4B8',detail:'#D8CDA5',size:.25,path:'M0 0h.25v.008H0zM0 0h.008v.25H0z'},
 brick:{name:'Brick / pavers',color:'#BC8064',detail:'#E0B696',size:.06,path:'M0 0h.06v.002H0zM0 .03h.06v.002H0zM0 0h.002v.03H0zM.03 .03h.002v.03H.03z'},
 asphalt:{name:'Asphalt',color:'#999B96',detail:'#8E908B',size:.15,path:'M.03 .02h.012v.012H.03zM.1 .11h.015v.01H.1z'},
 gravel:{name:'Gravel',color:'#B6AD99',detail:'#8F8B7E',size:.1,path:'M.01 .02h.02v.015H.01zM.06 .07h.025v.015H.06z'},
 wood:{name:'Wood decking',color:'#B29065',detail:'#836C51',size:.08,path:'M0 0h.08v.004H0zM.01 .035h.03v.002H.01z'},
 unknown:{name:'Unclassified surface',color:'#A7CF7B',detail:'#93BA6D',size:.32,path:'M.04 .07h.025v.02H.04zM.22 .23h.02v.025H.22z'},
} as const;
export function groundMaterial(material:string){return groundMaterials[material as keyof typeof groundMaterials]??groundMaterials.unknown;}
