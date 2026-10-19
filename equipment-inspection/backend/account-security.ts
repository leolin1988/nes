export function validAccountSession(payload:any,account:any){
 return !!account?.is_active&&Number.isSafeInteger(account.auth_version)&&Number.isSafeInteger(payload.auth_version??0)&&(payload.auth_version??0)===account.auth_version;
}
export async function resetPassword(client:any,user:any,country:string,id:string,password:string,changes:any,reply:any){
 if(password.length<6||new TextEncoder().encode(password).length>72)return reply({error:'invalid_password'},400);
 const r=await client.rpc('reset_account_password',{p_country:country,p_actor:user.id,p_target:id,p_password:password,p_changes:changes});
 if(r.error){const code=['forbidden','account_not_found','invalid_password','password_verification_failed'].find(k=>r.error.message?.includes(k))||'password_reset_failed';return reply({error:code},code==='forbidden'?403:400);}
 if(r.data?.password_updated!==true||r.data?.account?.id!==id)return reply({error:'password_verification_failed'},500);
 return reply(r.data);
}


