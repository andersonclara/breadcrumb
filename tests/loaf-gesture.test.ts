import {describe,expect,it} from 'vitest';
import {checkSliceGesture,sliceHint} from '@breadcrumb/shared';

const hand=(x:number)=>Array.from({length:30},(_,i)=>{const f=i/29;return {x:x+Math.sin(i*1.7)*0.02,y:-0.05+1.1*f,t:Math.round(900*f*f*(3-2*f))+i};});

describe('shared loaf slice gesture (what the slicer shows before submitting)',()=>{
 it('rejects a cut away from the dotted line and reports where it landed, so the loaf splits there',()=>{
  const result=checkSliceGesture(0.4,hand(0.85));
  expect(result).toMatchObject({ok:false,reason:'position'});
  if(!result.ok)expect(result.cutAt).toBeCloseTo(0.85,1);
  expect(sliceHint('position')).toContain('new loaf');
 });
 it('accepts a cut on the line and reports where the knife went',()=>{
  const result=checkSliceGesture(0.4,hand(0.42));
  expect(result.ok).toBe(true);
  if(result.ok)expect(result.cutAt).toBeCloseTo(0.42,1);
 });
 it('gives a matching hint for partial and rushed cuts',()=>{
  const partial=hand(0.4).map(p=>({...p,y:p.y/2}));
  expect(checkSliceGesture(0.4,partial)).toEqual({ok:false,reason:'partial'});
  expect(sliceHint('partial')).toContain('all the way through');
  const rushed=hand(0.4).map((p,i)=>({...p,t:i}));
  expect(checkSliceGesture(0.4,rushed)).toEqual({ok:false,reason:'speed'});
 });
});
