import { describe, expect, it } from 'vitest';
import { executeConfirmedAction } from '../src/assistant/execute-audit.js';
import { executeUndo } from '../src/assistant/undo-layer.js';
import { createConfirmationRecord } from '../src/assistant/confirmation-workflow.js';
import type { PreviewResult } from '../src/assistant/preview-engine.js';
import type { ToolDefinition, ToolExecutionContext } from '../src/assistant/tool-registry.js';

const tool: ToolDefinition = {name:'archive_lesson_plan',description:'Archive',descriptionAr:'أرشفة',inputSchema:{},outputSchema:{},riskLevel:'low-risk',confirmationPolicy:'none',undoCapability:'snapshot',requiredPermissions:[],category:'lesson-plans'};
const context: ToolExecutionContext = {actorUserId:'teacher',actorName:'Teacher',actorRole:'OWNER',permissions:[],activeAcademicYearId:'year'};

describe('assistant undo receipt', () => {
  it('offers undo only when a successful mutation stores a snapshot', async () => {
    const snapshots: unknown[] = [];
    const dependencies = {generateId:()=>'receipt',persistReceipt:()=>{},persistAudit:()=>{},persistUndoSnapshot:(_id:string,snapshot:unknown)=>{snapshots.push(snapshot);}};
    const withoutSnapshot = await executeConfirmedAction(dependencies, tool, {}, undefined, undefined, context, 'session', async()=>({success:true}));
    expect(withoutSnapshot.receipt?.undoAvailable).toBe(false);
    const withSnapshot = await executeConfirmedAction(dependencies, tool, {}, undefined, undefined, context, 'session', async()=>({success:true,undoSnapshot:{planId:'plan-1',status:'DRAFT'}}));
    expect(withSnapshot.receipt?.undoAvailable).toBe(true);
    expect(snapshots).toEqual([{planId:'plan-1',status:'DRAFT'}]);
  });

  it('requires a matching confirmation and audits execution and undo', async () => {
    const required = {...tool, confirmationPolicy:'required' as const};
    const preview: PreviewResult = {id:'preview-1',toolName:tool.name,toolInput:{planId:'plan-1'},summary:'أرشفة',items:[],requiresConfirmation:true,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString()};
    const confirmation = createConfirmationRecord(preview);
    const audits: string[] = [];
    const snapshots = new Map<string,unknown>();
    let receipt: Awaited<ReturnType<typeof executeConfirmedAction>>['receipt'];
    let counter = 0;
    const deps = {generateId:()=>`id-${++counter}`,persistReceipt:(value: NonNullable<typeof receipt>)=>{receipt=value;},persistAudit:(value:{action:string})=>{audits.push(value.action);},persistUndoSnapshot:(id:string,snapshot:unknown)=>{snapshots.set(id,snapshot);}};
    const executor = async () => ({success:true,undoSnapshot:{planId:'plan-1',status:'DRAFT'}});
    const rejected = await executeConfirmedAction(deps, required, preview.toolInput, confirmation, preview, context, 'session', executor);
    expect(rejected.success).toBe(false);
    confirmation.confirmed = true;
    const executed = await executeConfirmedAction(deps, required, preview.toolInput, confirmation, preview, context, 'session', executor);
    expect(executed.success).toBe(true);
    expect(audits).toEqual(['EXECUTE']);
    const undone = await executeUndo({generateId:()=>`id-${++counter}`,getReceipt:()=>receipt,getUndoSnapshot:(id)=>snapshots.get(id),persistAudit:(value)=>{audits.push(value.action);}},receipt!.id,receipt!.undoToken!,'session','teacher',async()=>({success:true}));
    expect(undone.success).toBe(true);
    expect(audits).toEqual(['EXECUTE','UNDO']);
  });
});
