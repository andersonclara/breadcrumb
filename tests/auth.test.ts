import { describe, expect, it } from "vitest";
import {normalizeUfLogin,signupPasswordError} from '@breadcrumb/shared';
import { canAct, normalizeUfEmail } from "../src/lib/auth/rules";

describe("UF account rules", () => {
  it('accepts UF emails and editable usernames without assuming usernames are email addresses',()=>{
   expect(normalizeUfLogin('  ALBERT@UFL.EDU ')).toBe('albert@ufl.edu');expect(normalizeUfLogin('Cool_Albert')).toBe('cool_albert');
   for(const value of ['a@gmail.com','a@ufl.edu.evil.test','two words','../bad','x',null])expect(normalizeUfLogin(value)).toBeNull();
  });
  it('requires matching passwords while preserving significant whitespace',()=>{
   expect(signupPasswordError('long password','long password')).toBeNull();expect(signupPasswordError('short','short')).toBeTruthy();
   expect(signupPasswordError('  password  ','password')).toContain('match');
  });
  it("normalizes UF addresses", () => expect(normalizeUfEmail("  Student+test@UFL.EDU  ")).toBe("student+test@ufl.edu"));
  it.each([null, "", "a@gmail.com", "a@ufl.edu.evil.test", "a@sub.ufl.edu", "a@@ufl.edu", "a b@ufl.edu", "@ufl.edu"])("rejects invalid address %s", value => {
    expect(normalizeUfEmail(value)).toBeNull();
  });
  it("fails closed for missing, banned, suspended, and malformed profiles", () => {
    expect(canAct(null)).toBe(false);
    expect(canAct({ banned: true, suspended_until: null })).toBe(false);
    expect(canAct({ banned: false, suspended_until: "2030-01-01T00:00:00Z" }, Date.parse("2026-10-17"))).toBe(false);
    expect(canAct({ banned: false, suspended_until: "invalid" })).toBe(false);
  });
  it("allows an active account and an expired suspension", () => {
    expect(canAct({ banned: false, suspended_until: null })).toBe(true);
    expect(canAct({ banned: false, suspended_until: "2026-10-16T00:00:00Z" }, Date.parse("2026-10-17"))).toBe(true);
  });
});
