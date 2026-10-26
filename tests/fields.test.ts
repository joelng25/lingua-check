import { test, expect } from 'bun:test';
import { Window } from 'happy-dom';
const window = new Window();
for (const key of ['document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','Event','InputEvent']) Object.assign(globalThis,{[key]:window[key]});
const { isSafeToCheck, createFieldAdapter, getEditableFields } = await import('../src/content/field-adapter');
test('sensitive inputs are not checked',()=>{
 for(const type of ['password','email','url','search']) {const el=document.createElement('input');el.type=type;expect(isSafeToCheck(el)).toBe(false);expect(createFieldAdapter(el)).toBe(null);}
});
test('private custom editor is excluded',()=>{const el=document.createElement('div');el.setAttribute('contenteditable','true');el.setAttribute('data-private','');expect(isSafeToCheck(el)).toBe(false);});
test('payment and codes excluded',()=>{for(const value of ['cc-number','current-password','one-time-code']){const el=document.createElement('input');el.setAttribute('autocomplete',value);expect(isSafeToCheck(el)).toBe(false);}});
test('normal textarea replacement',()=>{const el=document.createElement('textarea');el.value='helo world';const adapter=createFieldAdapter(el);adapter?.applyReplacement(0,4,'hello');expect(el.value).toBe('hello world');});
test('discovery filters sensitive fields',()=>{document.body.innerHTML='<input type="password"><input type="text"><textarea data-sensitive></textarea><textarea></textarea>';expect(getEditableFields().length).toBe(2);});
