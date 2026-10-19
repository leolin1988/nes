/* Passwords stay hashed on the server; only an explicitly entered new password is displayed. */
`accounts|帳號與密碼管理|Accounts and passwords|Cuentas y contraseñas|Tài khoản và mật khẩu
passwordInfo|目前密碼已單向加密，無法查閱。忘記密碼時，請使用「重設密碼」；不會影響其他帳號。|Existing passwords cannot be viewed. Use Reset password if forgotten; other accounts remain unchanged.|Las contraseñas actuales no se pueden consultar. Restablézcala si la olvidó; las demás cuentas no cambian.|Không thể xem mật khẩu hiện tại. Nếu quên, hãy đặt lại; các tài khoản khác không thay đổi.
resetPassword|重設密碼|Reset password|Restablecer contraseña|Đặt lại mật khẩu
showPassword|顯示新密碼|Show new password|Mostrar contraseña nueva|Hiện mật khẩu mới
copyPassword|複製新密碼|Copy new password|Copiar contraseña nueva|Sao chép mật khẩu mới
copyAccount|複製帳號|Copy account|Copiar cuenta|Sao chép tài khoản
confirmPassword|再次輸入新密碼|Confirm new password|Confirmar contraseña nueva|Nhập lại mật khẩu mới
passwordRule|新密碼至少 6 個字元，兩次輸入需相同。|Use at least 6 characters and enter the same password twice.|Use al menos 6 caracteres e introduzca la misma contraseña dos veces.|Ít nhất 6 ký tự và hai lần nhập phải giống nhau.
passwordResetDone|密碼已寫入並驗證成功，舊登入已失效。關閉後不再顯示新密碼。|Password saved and verified. Previous sessions are invalid. The new password is hidden after closing.|Contraseña guardada y verificada. Las sesiones anteriores ya no son válidas. Al cerrar se oculta la contraseña.|Đã lưu và xác minh mật khẩu. Phiên cũ đã hết hiệu lực. Đóng cửa sổ sẽ ẩn mật khẩu mới.
passwordSignInAgain|密碼或登入狀態已更新，請重新登入。|Password or session changed. Please sign in again.|Cambió la contraseña o sesión. Inicie sesión de nuevo.|Mật khẩu hoặc phiên đã thay đổi. Vui lòng đăng nhập lại.
copiedValue|已複製|Copied|Copiado|Đã sao chép
copyManual|無法自動複製，請選取文字手動複製。|Select the text and copy it manually.|Seleccione el texto y cópielo manualmente.|Chọn văn bản và sao chép thủ công.`.split('\n').forEach(line=>{const[k,...v]=line.split('|');translations[k]=Object.fromEntries(['zh','en','es','vi'].map((l,n)=>[l,v[n]]));});
async function copyAccountValue(value){try{await navigator.clipboard.writeText(value);toast('copiedValue');}catch{toast('copyManual');}}
function resetAccountPassword(account){
 if(profile?.role!=='admin')return;
 const m=dialog('resetAccountPassword',t('resetPassword'),`<p><strong>${txt('account')}：${esc(account.account_code)}</strong><br>${txt('fullName')}：${esc(account.full_name||'—')}</p><p>${txt('passwordRule')}</p><label>${txt('newPassword')}<input id="resetPasswordValue" class="select" type="password" minlength="6" autocomplete="new-password"></label><label>${txt('confirmPassword')}<input id="resetPasswordConfirm" class="select" type="password" minlength="6" autocomplete="new-password"></label><label style="display:flex;flex-direction:row;align-items:center;margin-top:12px"><input id="showResetPassword" type="checkbox">${txt('showPassword')}</label><p id="resetPasswordStatus" role="status"></p>`,button('close','id="cancelResetPassword"')+button('resetPassword','id="submitResetPassword"','primary'));
 const value=m.querySelector('#resetPasswordValue'),confirmValue=m.querySelector('#resetPasswordConfirm'),status=m.querySelector('#resetPasswordStatus'),submit=m.querySelector('#submitResetPassword');
 m.querySelector('#cancelResetPassword').onclick=()=>m.remove();
 m.querySelector('#showResetPassword').onchange=e=>{value.type=confirmValue.type=e.target.checked?'text':'password';};
 submit.onclick=async()=>{if(value.value.length<6||value.value!==confirmValue.value){status.textContent=t('passwordRule');return;}submit.disabled=true;try{const result=await api({action:'admin_account_update',id:account.id,password:value.value});verifyPasswordReset(result,account.id);if(account.id===profile?.account_id){localStorage.removeItem('inspection_token');m.querySelector('#cancelResetPassword').onclick=()=>{m.remove();logout();showLogin();toast('passwordSignInAgain');};}value.readOnly=true;confirmValue.closest('label').remove();status.textContent=t('passwordResetDone');submit.remove();m.querySelector('.dialog-foot').insertAdjacentHTML('beforeend',button('copyPassword','id="copyResetPassword"'));m.querySelector('#copyResetPassword').onclick=()=>copyAccountValue(value.value);}catch{status.textContent=t('error');submit.disabled=false;}};
}

function verifyPasswordReset(result,id){if(result?.password_updated!==true||result?.account?.id!==id)throw Error("password_verification_failed");}
const apiBeforePasswordCheck=api;api=async function(payload){try{return await apiBeforePasswordCheck(payload);}catch(e){if(e.message==='auth'&&profile){logout();showLogin();toast('passwordSignInAgain');}throw e;}};
