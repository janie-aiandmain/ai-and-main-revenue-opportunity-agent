// Verify operator-supplied evidence only; no API calls or new approval.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='docs/review/voice-intake-v1/hosted',bytes=await readFile(dir+'/operator-preflight.json'),receipt=JSON.parse(bytes),provenance=JSON.parse(await readFile(dir+'/operator-preflight-provenance.json','utf8')),deployment=JSON.parse(await readFile(dir+'/deployment-owner.json','utf8'));
assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.artifactSha256);
assert.equal(receipt.kind,'VOICE_INTAKE_READ_ONLY_PREFLIGHT');assert.equal(receipt.portalId,'247646122');assert.equal(receipt.contactId,'582095692487');
for(const field of ['readCredentialPortalVerified','writeCredentialPortalVerified','syntheticContactMarkerVerified'])assert.equal(receipt[field],true,field);
assert.equal(receipt.noteContactAssociationType,202);assert.equal(receipt.noteCreationPermission,'UNVERIFIED_NO_MUTATION_PROBE');assert.equal(receipt.noteWritesEnabled,false);assert.equal(receipt.permissionsExpanded,false);
assert.equal(receipt.ownerSourceCommit,deployment.sourceCommit);assert.equal(receipt.ownerDeploymentVersion,deployment.activeVersionId);assert.match(receipt.ledgerBootId,/^[a-f0-9-]{36}$/);
const result={kind:'VERIFIED_OPERATOR_SUPPLIED_VOICE_PREFLIGHT',verified:true,receiptSha256:provenance.artifactSha256,sourceCommit:receipt.ownerSourceCommit,ownerVersion:receipt.ownerDeploymentVersion,ledgerBootId:receipt.ledgerBootId,portalId:receipt.portalId,contactId:receipt.contactId,bothCredentialPortalChecks:true,syntheticMarkerVerified:true,noteAssociationTypeVerified:202,existingExternalVoiceLedgerPathExercised:true,claimBasis:'Supplied receipt matches the previously verified deployed code/version; its route enforces external identity and isolated namespace binding. No independent JWT inspection or signed receipt is claimed.',hostedTranscription:'PENDING_OPERATOR_TEST',noteCreationPermission:'UNVERIFIED_NO_MUTATION_PROBE',noteWritesEnabled:false,humanSemanticApproval:false,noteExecutionApproval:false,newCrmCalls:0,newModelCalls:0,newEmailCalls:0};
await writeFile(dir+'/operator-preflight-check.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
