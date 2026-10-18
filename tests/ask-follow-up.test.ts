import {describe,it,expect} from 'vitest';
import {interpretFollowUp} from '../src/lib/ai/ask/follow-up';
import {defaultConstraints} from '../src/lib/ai/ask/schema';

const context={constraints:{...defaultConstraints,nearPlace:'Reitz',terms:['music']},results:[],referencePlace:'Reitz'};
describe('exact follow-up interpretation',()=>{
 it('sets only the free filter, preserving existing place, interests and time',()=>{
  const result=interpretFollowUp({message:'Only free ones!',context});
  expect(result?.patch.freeOnly).toBe(true);expect(result?.patch.nearPlace).toBeNull();
  expect(result?.patch.terms).toBeNull();expect(result?.patch.time).toBeNull();
 });
 it('selects an ordinal result without adding search terms',()=>{
  expect(interpretFollowUp({message:'Tell me more about the second one.',context})).toMatchObject({action:'details',resultIndex:2,patch:{terms:null}});
 });
 it('clears location only on the explicit campus-wide command',()=>{
  expect(interpretFollowUp({message:'Search across campus',context})?.clearLocation).toBe(true);
 });
 it('leaves compound requests, negations, and messages without context to the model',()=>{
  for(const message of ['Only free ones near Marston','Not only free ones','Only free food tomorrow','Tell me more about the second one and find other events'])expect(interpretFollowUp({message,context})).toBeNull();
  expect(interpretFollowUp({message:'Only free ones'})).toBeNull();
 });
});
