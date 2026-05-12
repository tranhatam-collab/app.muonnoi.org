(function(){
      "use strict";

      function genRef(){
        // MN-YYYYMMDD-HHMMSS-RAND
        const d = new Date();
        const pad = (n)=> String(n).padStart(2,"0");
        const y = d.getFullYear();
        const m = pad(d.getMonth()+1);
        const da = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        const r = Math.random().toString(36).slice(2,8).toUpperCase();
        return `MN-${y}${m}${da}-${hh}${mm}${ss}-${r}`;
      }

      async function copy(text){
        try{
          if(navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(text);
            return true;
          }
        }catch{}
        try{
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position="fixed";
          ta.style.left="-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          return true;
        }catch{
          return false;
        }
      }

      const form = document.getElementById("complaintForm");
      const resetBtn = document.getElementById("resetBtn");
      const box = document.getElementById("resultBox");
      const refCode = document.getElementById("refCode");
      const copyRefBtn = document.getElementById("copyRefBtn");

      if(resetBtn && form){
        resetBtn.addEventListener("click", ()=>{
          form.reset();
          if(box){ box.style.display="none"; }
        });
      }

      if(form){
        form.addEventListener("submit", async (e)=>{
          e.preventDefault();

          // create local reference (stage-1)
          const ref = genRef();
          if(refCode) refCode.textContent = ref;
          if(box) box.style.display = "block";

          // future: POST to /api/complaints/create
          // For now: keep it client-side only, no tracking.
          try{ form.reset(); }catch{}
          const agree = document.getElementById("agree");
          if(agree) agree.checked = false;

          // smooth scroll to result
          try{ box.scrollIntoView({behavior:"smooth", block:"center"}); }catch{}
        });
      }

      if(copyRefBtn && refCode){
        copyRefBtn.addEventListener("click", async ()=>{
          const ok = await copy(refCode.textContent || "");
          copyRefBtn.textContent = ok ? "Đã sao chép" : "Không sao chép được";
          setTimeout(()=>{ copyRefBtn.textContent = "Sao chép mã"; }, 1200);
        });
      }
    })();
