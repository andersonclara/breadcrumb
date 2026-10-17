export const communities=[
 {id:'campus',name:'Campus',accent:'#D78636',background:'#FFF2D5',description:'Everyday discoveries across UF.'},
 {id:'girls',name:'Girls Only',accent:'#BD4B83',background:'#FDE4EF',description:'A self-selected space for the girls of UF.'},
 {id:'sports',name:'Sports',accent:'#307D69',background:'#DCF1DE',description:'Pickup games, watch parties, and Gator energy.'},
 {id:'majors',name:'Majors',accent:'#3B7FAD',background:'#E2F1FD',description:'Meet people across majors and academic interests.'},
] as const;
export type CommunityId=string;
export type Community=Omit<typeof communities[number],'id'|'name'|'accent'|'background'|'description'>&{id:CommunityId;name:string;accent:string;background:string;description:string;joined:boolean;member_count:number;featured?:boolean;created_by?:string|null};
