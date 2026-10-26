import {test,expect} from 'bun:test';
import {isCurrentCheck} from '../src/shared/check-version';
test('reject reversed response',()=>expect(isCurrentCheck(1,2,'new','new')).toBe(false));
test('reject cleared text',()=>expect(isCurrentCheck(1,1,'old','')).toBe(false));
test('reject edited text',()=>expect(isCurrentCheck(1,1,'old','new')).toBe(false));
test('accept latest unchanged result',()=>expect(isCurrentCheck(2,2,'new','new')).toBe(true));
