import {normalizeUfEmail} from './index';
export function normalizeUfLogin(value:unknown):string|null{
 if(typeof value!=='string')return null;
 const login=value.trim().toLowerCase();
 if(login.includes('@'))return normalizeUfEmail(login);
 if(!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(login))return null;
 return login;
}
export function signupPasswordError(password:unknown,confirmation:unknown):string|null{
 if(typeof password!=='string'||password.length<8||password.length>128)return 'Use a password between 8 and 128 characters.';
 if(password!==confirmation)return 'The passwords do not match.';
 return null;
}
