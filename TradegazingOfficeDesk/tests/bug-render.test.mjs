import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {bugDraft,occurrence} from './bug-fixture.mjs';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('.')&&context.parentURL){const url=new URL(specifier,context.parentURL);for(const ext of ['.tsx','.ts'])if(existsSync(fileURLToPath(url)+ext))return next(url.href+ext,context);}return next(specifier,context);},load(url,context,next){if(url.startsWith('file:')&&/\.(tsx?|json)$/.test(url)){const raw=readFileSync(fileURLToPath(url),'utf8');return {format:'module',shortCircuit:true,source:url.endsWith('.json')?'export default '+raw:ts.transpileModule(raw,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText};}return next(url,context);}});
const {default:Board,BugTable,BugDetail}=await import('../app/BugBoard.tsx');
test('Actual board shell makes blocker-only rule and loading state visible',()=>{
  const html=renderToStaticMarkup(React.createElement(Board));for(const text of ['Nur Bugs','Ein hohes Risiko allein','Bug Board wird geladen','Bugs filtern','Bug erfassen'])assert.ok(html.includes(text),text);assert.match(html,/href="\/bugs"/);
});
test('Actual table/detail render evidence, risks and mission context without executing imported text',()=>{
  const o={...occurrence({mission_id:'m1'}),id:1,bug_id:'bug',actor:'Test',created_at:'2026-11-04T08:00:00Z'};
  const b={...bugDraft({title:'<script>unsafe</script>',probability:'UNBEKANNT'}),id:'bug',number:1,label:'BUG-0001',revision:1,occurrence_count:1,current_occurrences:[o],occurrences:[o],events:[],created_at:o.created_at,updated_at:o.created_at};
  const table=renderToStaticMarkup(React.createElement(BugTable,{bugs:[b],onSelect:()=>{}}));assert.doesNotMatch(table,/<script>/);assert.match(table,/&lt;script&gt;/);assert.match(table,/Fortsetzung möglich/);
  const detail=renderToStaticMarkup(React.createElement(BugDetail,{bug:b,missions:[{id:'m1',mission_number:1,title:'Test'}]}));
  for(const text of ['Unbekannt','Risikobegründung','Wahrscheinlichkeit','tests/bugs.test.mjs','/missions#mission-1','Änderungsverlauf'])assert.ok(detail.includes(text),text);
});
