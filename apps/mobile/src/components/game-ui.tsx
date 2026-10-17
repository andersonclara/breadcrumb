import {Pressable,StyleSheet,Text} from 'react-native';
import type {PropsWithChildren} from 'react';
export const gameStyles=StyleSheet.create({
 page:{flex:1,backgroundColor:'#FFF2D8'},content:{padding:22,gap:18,paddingBottom:40},
 title:{fontFamily:'PressStart2P_400Regular',fontSize:18,lineHeight:32,color:'#49382C'},
 body:{fontSize:14,lineHeight:23,color:'#49382C'},label:{fontFamily:'PressStart2P_400Regular',fontSize:8,lineHeight:16,color:'#49382C'},
 input:{backgroundColor:'#FFF6E3',borderWidth:2,borderColor:'#AD8D64',padding:13,color:'#49382C',fontSize:15},
 button:{borderWidth:2,borderColor:'#49382C',backgroundColor:'#F4BC55',padding:15,minHeight:45,alignItems:'center'},
 buttonText:{fontFamily:'PressStart2P_400Regular',fontSize:8,lineHeight:16,color:'#382B23',textAlign:'center'},
 row:{flexDirection:'row',alignItems:'center',gap:12},error:{fontSize:12,lineHeight:20,color:'#8B3829',padding:12,backgroundColor:'#FFEBC2'},
});
export function GameButton({children,onPress,disabled=false}:{onPress:()=>void;disabled?:boolean}&PropsWithChildren){return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[gameStyles.button,disabled&&{opacity:.45}]}><Text style={gameStyles.buttonText}>{children}</Text></Pressable>;}
