(function(){
      "use strict";
      const $ = (s, el=document)=> el.querySelector(s);
      const $$ = (s, el=document)=> Array.from(el.querySelectorAll(s));

      function chainId(prefix="mn"){
        const t = Date.now();
        const r = Math.floor(Math.random()*1e9);
        const raw = prefix+"."+t+"."+r;
        let h = 2166136261;
        for(let i=0;i<raw.length;i++){ h ^= raw.charCodeAt(i); h = Math.imul(h, 16777619); }
        const c = (h>>>0).toString(36).padStart(6,"0").slice(0,6);
        return `${prefix}_${(t>>>0).toString(36)}_${(r>>>0).toString(36)}_${c}`;
      }

      async function copy(text){
        try{
          if(navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(text);
            return true;
          }
        }catch{}
        try{
          const ta=document.createElement("textarea");
          ta.value=text; ta.style.position="fixed"; ta.style.left="-9999px";
          document.body.appendChild(ta);
          ta.select(); document.execCommand("copy");
          ta.remove();
          return true;
        }catch{ return false; }
      }

      const Type = {
        post:  { label:"Bài viết", path:(id)=>`/p/${encodeURIComponent(id)}/` },
        video: { label:"Video", path:(id)=>`/v/${encodeURIComponent(id)}/` },
        doc:   { label:"Tài liệu", path:(id)=>`/d/${encodeURIComponent(id)}/` },
        course:{ label:"Khóa học", path:(id)=>`/c/${encodeURIComponent(id)}/` },
        market:{ label:"Sản phẩm", path:(id)=>`/m/${encodeURIComponent(id)}/` }
      };

      const state = { type:"post" };

      function nowText(){
        const d=new Date();
        const hh=String(d.getHours()).padStart(2,"0");
        const mm=String(d.getMinutes()).padStart(2,"0");
        return hh+":"+mm;
      }

      function setType(t){
        state.type = (Type[t] ? t : "post");
        $$("#typeSeg .mn-segBtn").forEach(b=>{
          b.classList.toggle("is-active", b.getAttribute("data-type")===state.type);
        });
        $("#pvType").textContent = Type[state.type].label;
        refreshPreview();
      }

      function refreshPreview(){
        const title = ($("#title").value || "").trim();
        const body  = ($("#body").value || "").trim();
        const vis   = ($("#visibility").value || "public");
        const cat   = ($("#category").value || "work");
        $("#pvTitle").textContent = title ? title : "Chưa có tiêu đề";
        $("#pvBody").textContent  = body ? body : "Nội dung sẽ hiển thị ở đây...";
        $("#pvMeta").textContent  = (vis + " , " + cat);
        $("#pvNow").textContent   = nowText();
      }

      function bind(){
        // type buttons
        $$("#typeSeg .mn-segBtn").forEach(btn=>{
          btn.addEventListener("click", ()=> setType(btn.getAttribute("data-type")));
        });

        // inputs to preview
        ["title","body","visibility","category"].forEach(id=>{
          const el = $("#"+id);
          if(!el) return;
          el.addEventListener("input", refreshPreview);
          el.addEventListener("change", refreshPreview);
        });

        // attach
        $("#btnAttach").addEventListener("click", ()=>{
          alert("Stage 2: R2 signed upload + quét file + chống spam + quyền riêng tư theo lớp.");
        });

        // create link
        $("#btnCreate").addEventListener("click", ()=>{
          const t = $("#title").value.trim();
          const b = $("#body").value.trim();
          if(!t && !b){
            alert("Hãy nhập tiêu đề hoặc nội dung trước khi tạo.");
            return;
          }
          const id = chainId("mn");
          const path = Type[state.type].path(id);

          $("#resultPath").textContent = path;
          const full = "https://app.muonnoi.org" + path;
          const open = $("#btnOpen");
          open.href = path;

          const box = $("#resultBox");
          box.style.display = "block";
          try{ box.scrollIntoView({behavior:"smooth", block:"center"}); }catch{}

          // keep preview fresh
          refreshPreview();
        });

        // copy
        $("#btnCopy").addEventListener("click", async ()=>{
          const path = ($("#resultPath").textContent || "").trim();
          const full = path ? ("https://app.muonnoi.org" + path) : "";
          const ok = await copy(full);
          const btn = $("#btnCopy");
          btn.textContent = ok ? "Đã sao chép" : "Không sao chép được";
          setTimeout(()=>{ btn.textContent = "Sao chép"; }, 1200);
        });
      }

      function init(){
        setType("post");
        refreshPreview();
        bind();
      }

      if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
      else init();
    })();
