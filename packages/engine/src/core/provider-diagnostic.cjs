"use strict";
const terminalRefreshCodes = new Set(["invalid_grant","invalid_refresh_token","token_expired","refresh_token_expired","refresh_token_invalidated","refresh_token_reused"]);
function safeIdentifier(value) { return typeof value==="string" && /^[A-Za-z0-9_:-]{1,128}$/.test(value) && !/^(sk-|eyJ)/.test(value) ? value : undefined; }
function providerDiagnostic(status,code,requestId,bodyShape="unknown") {
 code=safeIdentifier(code);requestId=safeIdentifier(requestId);
 let category="unknown",retryable=false;
 if(code==="subscription_sharing_usage_limit_exceeded"||status===429)category="quota";
 else if(terminalRefreshCodes.has(code)||code==="subscription_sharing_invalid_user"||status===401)category="expired";
 else if(code==="subscription_sharing_user_not_eligible")category="eligibility";
 else if(code==="subscription_sharing_unsupported_capability"||code==="subscription_sharing_route_not_supported")category="unsupported";
 else if(code==="chatpass_v2_scope_not_authorized"||code==="chatpass_v2_invalid_authorization_context"||status===403)category="permission";
 else if(["subscription_sharing_usage_unavailable","subscription_sharing_user_unavailable"].includes(code)||(status>=500&&status<=599)){category="unavailable";retryable=true;}
 return {status:Number.isInteger(status)?status:undefined,code,requestId,category,retryable,bodyShape};
}
function responseDiagnostic(response,body) {
 const code=typeof body?.error==="string"?body.error:body?.error?.code;
 return providerDiagnostic(response.status,code,response.headers.get('x-request-id')??response.headers.get('request-id'),body?.error!==undefined?'error':body?.detail!==undefined?'detail':typeof body==='string'?'text':'unknown');
}
module.exports={providerDiagnostic,responseDiagnostic,terminalRefreshCodes};
