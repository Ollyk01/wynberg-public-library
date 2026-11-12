const form=document.querySelector("#login-form"),password=document.querySelector("#password"),message=document.querySelector("#message");
form.addEventListener("submit",e=>{e.preventDefault();if(!document.querySelector("#identity").value.trim()||!password.value){message.textContent="Please enter your library login details.";return;}sessionStorage.setItem("wplDemoCustomer","true");location.href="customer-dashboard.html";});
document.querySelector("#show-pass").addEventListener("click",e=>{const show=password.type==="password";password.type=show?"text":"password";e.currentTarget.textContent=show?"Hide":"Show";});
document.querySelector("#forgot").addEventListener("click",e=>{e.preventDefault();message.textContent="Please contact the library for help resetting your password.";});
