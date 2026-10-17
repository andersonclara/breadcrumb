import {describe,it,expect} from 'vitest';
import {postHeadline,submissionTime} from '@breadcrumb/shared';
describe('recipe post fields',()=>{
 it('uses the first line for the map title without requiring a second input',()=>{
  expect(postHeadline('  Free pizza at Turlington\nUntil 4 PM, bring a friend. ')).toBe('Free pizza at Turlington');
  expect(postHeadline('x'.repeat(200))).toHaveLength(180);
  expect(postHeadline('  ')).toBe('');
  expect(postHeadline('a\nb')).toBe('a b');
 });
 it('shows the stored submission time in campus time',()=>{
  expect(submissionTime('2026-10-17T19:05:00Z')).toContain('3:05 PM');
  expect(submissionTime('2026-10-17T19:05:00Z')).toContain('EDT');
 });
});
