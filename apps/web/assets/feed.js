(function(){
      "use strict";

      const $ = (s, el=document)=> el.querySelector(s);
      const $$ = (s, el=document)=> Array.from(el.querySelectorAll(s));

      function pad(n){ return String(n).padStart(2,"0"); }
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
          ta.value=text;
          ta.style.position="fixed"; ta.style.left="-9999px";
          document.body.appendChild(ta);
          ta.select(); document.execCommand("copy");
          ta.remove();
          return true;
        }catch{ return false; }
      }

      const state = {
        filter: "all",
        items: []
      };

      function sampleData(n=9, type="all"){
        const types = ["work","market","learn","invest"];
        const pick = ()=> types[Math.floor(Math.random()*types.length)];
        const now = Date.now();

        const out = [];
        for(let i=0;i<n;i++){
          const t = (type==="all") ? pick() : type;
          const id = chainId("mn");
          out.push({
            id,
            type: t,
            author: (t==="work" ? "Người Tuyển Dụng" :
                     t==="market" ? "Người Bán" :
                     t==="learn" ? "Người Dạy" : "Nhà Đầu Tư"),
            handle: (t==="work" ? "workhub" :
                     t==="market" ? "marketvn" :
                     t==="learn" ? "learnlab" : "investroom"),
            title: (t==="work" ? "Tuyển: Designer / Dev (Remote)" :
                    t==="market" ? "Bán: Gói dịch vụ / sản phẩm" :
                    t==="learn" ? "Khóa học: Kỹ năng / tư duy" : "Deal: Cơ hội hợp tác"),
            body: (t==="work" ? "Mô tả công việc rõ ràng. Không spam. Có trách nhiệm." :
                   t==="market" ? "Giá trị thật, điều kiện rõ. Không lừa đảo." :
                   t==="learn" ? "Học để làm được. Không lý thuyết rỗng." : "Đầu tư minh bạch. Không hype."),
            ts: now - Math.floor(Math.random()*86400000),
            likes: Math.floor(Math.random()*120),
            saves: Math.floor(Math.random()*60),
            comments: Math.floor(Math.random()*18),
            verified: Math.random() > 0.7
          });
        }
        return out;
      }

      function badge(type){
        if(type==="work") return "Làm việc";
        if(type==="market") return "Mua bán";
        if(type==="learn") return "Học";
        if(type==="invest") return "Đầu tư";
        return "Tất cả";
      }

      function timeAgo(ts){
        const s = Math.max(1, Math.floor((Date.now()-ts)/1000));
        const m = Math.floor(s/60);
        const h = Math.floor(m/60);
        const d = Math.floor(h/24);
        if(d>0) return d+"d";
        if(h>0) return h+"h";
        if(m>0) return m+"m";
        return s+"s";
      }

      function postCard(item){
        const v = item.verified ? `<span class="mn-pillMini">Verified</span>` : "";
        const link = `/p/${encodeURIComponent(item.id)}/`;
        return `
          <article class="mn-glass" style="border-radius:18px; padding:14px;">
            <div class="mn-postTop">
              <div class="mn-ava" aria-hidden="true">${item.handle.slice(0,2).toUpperCase()}</div>
              <div style="flex:1">
                <div class="mn-inline" style="justify-content:space-between;">
                  <div class="mn-postMeta">
                    <span class="mn-pillMini">${badge(item.type)}</span>
                    ${v}
                    <span class="mn-muted">,</span>
                    <a class="mn-link" href="/u/${encodeURIComponent(item.handle)}/">u/${item.handle}</a>
                    <span class="mn-muted">,</span>
                    <span class="mn-muted">${timeAgo(item.ts)}</span>
                  </div>
                  <a class="mn-link" href="${link}">Mở</a>
                </div>

                <div style="height:8px;"></div>
                <div class="mn-h2" style="margin:0; font-size:16px;">${item.title}</div>
                <div class="mn-sub" style="margin-top:8px;">${item.body}</div>

                <div style="height:12px;"></div>

                <div class="mn-actions">
                  <button class="mn-act" type="button" data-act="like" data-id="${item.id}">
                    Like <span>${item.likes}</span>
                  </button>
                  <button class="mn-act" type="button" data-act="save" data-id="${item.id}">
                    Save <span>${item.saves}</span>
                  </button>
                  <button class="mn-act" type="button" data-act="comment" data-id="${item.id}">
                    Comment <span>${item.comments}</span>
                  </button>
                  <button class="mn-act" type="button" data-act="share" data-id="${item.id}">
                    Share <span>Share</span>
                  </button>
                </div>

                <div class="mn-sub" style="margin-top:10px;">
                  Link sạch: <span class="mn-code">${link}</span>
                </div>
              </div>
            </div>
          </article>
        `;
      }

      function render(){
        const list = $("#feedList");
        if(!list) return;
        list.innerHTML = state.items.map(postCard).join("");
      }

      function setFilter(f){
        state.filter = f;
        $$(".mn-segBtn").forEach(btn=>{
          btn.classList.toggle("is-active", btn.getAttribute("data-feed")===f);
        });
        // reset list
        state.items = sampleData(9, f);
        render();
      }

      function bindActions(){
        // filter buttons
        $$(".mn-segBtn").forEach(btn=>{
          btn.addEventListener("click", ()=>{
            setFilter(btn.getAttribute("data-feed") || "all");
          });
        });

        // tags
        $$("[data-tag]").forEach(btn=>{
          btn.addEventListener("click", ()=>{
            const t = btn.getAttribute("data-tag");
            if(t==="nhachung") { window.location.href = "https://muonnoi.org/ecosystem/"; return; }
            if(t==="work") setFilter("work");
            else if(t==="market") setFilter("market");
            else if(t==="learn") setFilter("learn");
            else if(t==="invest") setFilter("invest");
          });
        });

        // composer
        const btnPost = $("#btnPost");
        const btnAttach = $("#btnAttach");
        const text = $("#composerText");
        const type = $("#composerType");
        const box = $("#composerResult");
        const demo = $("#demoLink");
        const open = $("#openDemoLink");
        const copyBtn = $("#copyDemoLink");

        btnAttach && btnAttach.addEventListener("click", ()=>{
          alert("Giai đoạn sau: upload ảnh/video/tài liệu qua R2 signed upload + quét malware + chống spam.");
        });

        btnPost && btnPost.addEventListener("click", async ()=>{
          const content = (text && text.value || "").trim();
          if(!content){
            alert("Hãy viết nội dung trước khi đăng.");
            return;
          }
          const id = chainId("mn");
          const t = (type && type.value) || "all";
          const item = {
            id,
            type: t==="all" ? "work" : t,
            author: "Bạn",
            handle: "you",
            title: "Bài mới",
            body: content.slice(0, 320),
            ts: Date.now(),
            likes: 0, saves: 0, comments: 0,
            verified: false
          };
          state.items = [item, ...state.items];
          render();

          const link = `/p/${encodeURIComponent(id)}/`;
          if(demo) demo.textContent = link;
          if(open) open.href = link;
          if(box) box.style.display = "block";
          try{ box.scrollIntoView({behavior:"smooth", block:"center"}); }catch{}
          try{ text.value=""; }catch{}
        });

        copyBtn && copyBtn.addEventListener("click", async ()=>{
          const ok = await copy((demo && demo.textContent) ? ("https://app.muonnoi.org"+demo.textContent) : "");
          copyBtn.textContent = ok ? "Đã sao chép" : "Không sao chép được";
          setTimeout(()=>{ copyBtn.textContent = "Sao chép link"; }, 1200);
        });

        // load more
        const btnMore = $("#btnMore");
        btnMore && btnMore.addEventListener("click", ()=>{
          state.items = state.items.concat(sampleData(9, state.filter));
          render();
          window.scrollBy({ top: 420, behavior: "smooth" });
        });

        const btnRefresh = $("#btnRefresh");
        btnRefresh && btnRefresh.addEventListener("click", ()=>{
          state.items = sampleData(9, state.filter);
          render();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });

        // post actions (delegate)
        document.addEventListener("click", async (e)=>{
          const btn = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
          if(!btn) return;
          const act = btn.getAttribute("data-act");
          const id = btn.getAttribute("data-id");
          if(!act || !id) return;

          const item = state.items.find(x=> x.id===id);
          if(!item) return;

          if(act==="like"){
            item.likes += 1;
            btn.classList.add("is-on");
            btn.querySelector("span").textContent = String(item.likes);
            return;
          }
          if(act==="save"){
            item.saves += 1;
            btn.classList.add("is-on");
            btn.querySelector("span").textContent = String(item.saves);
            return;
          }
          if(act==="comment"){
            alert("Giai đoạn sau: mở thread /p/:id + bình luận + chống spam + quyền riêng tư.");
            return;
          }
          if(act==="share"){
            const link = "https://app.muonnoi.org/p/" + encodeURIComponent(id) + "/";
            const ok = await copy(link);
            btn.classList.add("is-on");
            btn.querySelector("span").textContent = ok ? "Copied" : "Copy failed";
            setTimeout(()=>{ btn.classList.remove("is-on"); btn.querySelector("span").textContent = "Share"; }, 1200);
            return;
          }
        }, { passive:true });
      }

      // init
      function init(){
        state.items = sampleData(9, "all");
        render();
        bindActions();
      }

      if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
      else init();
    })();
