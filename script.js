const menuToggle=document.querySelector(".menu-toggle");
const mainNav=document.querySelector(".main-nav");
if(menuToggle&&mainNav){
  menuToggle.addEventListener("click",()=>{
    const open=mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded",String(open));
    menuToggle.setAttribute("aria-label",open?"Close navigation":"Open navigation");
  });
  mainNav.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded","false");
    menuToggle.setAttribute("aria-label","Open navigation");
  }));
}
const form=document.querySelector("#book-search");
const input=document.querySelector("#search-input");
const feedback=document.querySelector("#search-feedback");
form.addEventListener("submit",event=>{
  event.preventDefault();
  if(!input.value.trim()){feedback.textContent="Enter a book title, author or category to get started.";input.focus();return;}
  feedback.textContent="Book search will be available when the library catalogue is connected.";
});
input.addEventListener("input",()=>feedback.textContent="");
document.querySelector("#year").textContent=new Date().getFullYear();
