// ui/shop.js
import { isUnlocked, unlock, spendCoins, equip } from "../data/progress.js";

const ITEMS = [
  // ===== PLAYER SKINS =====
  { id:"skin.player.blue",    slot:"player",   name:{en:"Blue Suit",    ko:"파란 수트"},   cost:0,   icon:"ico-player-blue"  },
  { id:"skin.player.red",     slot:"player",   name:{en:"Red Suit",     ko:"빨간 수트"},   cost:120, icon:"ico-player-red"   },
  { id:"skin.player.panda",   slot:"player",   name:{en:"Panda Suit",   ko:"판다 수트"},   cost:250, icon:"ico-player-panda" },
  { id:"skin.player.yakuza",  slot:"player",   name:{en:"Yakuza",       ko:"야쿠자"},      cost:180, icon:"ico-player-yakuza",
    desc:{en:"Black suit, shades & bat.", ko:"검은 정장, 선글라스, 배트."}
  },
  { id:"skin.player.superman",slot:"player",   name:{en:"Superman",     ko:"슈퍼맨"},      cost:220, icon:"ico-player-superman",
    desc:{en:"Blue suit with a red cape.",  ko:"파란 수트 + 빨간 망토."}
  },

  // ===== OBSTACLE SKINS =====
  { id:"skin.obstacle.pastel", slot:"obstacle", name:{en:"Pastel Obstacles", ko:"파스텔 장애물"}, cost:0,   icon:"ico-ob-pastel" },
  { id:"skin.obstacle.neon",   slot:"obstacle", name:{en:"Neon Obstacles",   ko:"네온 장애물"},   cost:180, icon:"ico-ob-neon"   },
  { id:"skin.obstacle.orc",    slot:"obstacle", name:{en:"Orc",              ko:"오크"},          cost:160, icon:"ico-ob-orc",
    desc:{en:"Orc heads with blinking.", ko:"깜박이는 오크 머리."}
  },
  // Slime chung – spawner sẽ random 3 biến thể
  { id:"skin.obstacle.slime",  slot:"obstacle", name:{en:"Slime (All)",      ko:"슬라임 (전체)"},  cost:170, icon:"ico-ob-slime",
    desc:{en:"Spawns green/devil/angel at random.", ko:"그린/데빌/엔젤 무작위 등장"}
  },
];

export class ShopPanel{
  constructor(i18n, progress){
    this.i18n = i18n;
    this.progress = progress;
    this.root = document.getElementById("panelShop");
    this.h2   = this.root?.querySelector("h2");

    // dọn placeholder cũ nếu có
    [...this.root.querySelectorAll("p")].forEach(p=>{
      if (p.textContent.trim().toLowerCase().includes("coming")) p.remove();
    });

    // Coins header
    this.coinsEl = document.createElement("div");
    this.coinsEl.className = "shop-coins";
    this.coinsEl.innerHTML = `
      <span class="label"></span>
      <span class="coin-icon" aria-hidden="true"></span>
      <span class="coin-text">0</span>
    `;

    // Tabs
    this.tabs = document.createElement("div");
    this.tabs.className = "shop-tabs";
    this.tabs.innerHTML = `
      <button class="shop-tab" data-tab="player" type="button"></button>
      <button class="shop-tab" data-tab="obstacle" type="button"></button>
    `;

    // List
    this.list = document.createElement("div");
    this.list.className = "shop-list";

    this.root.appendChild(this.coinsEl);
    this.root.appendChild(this.tabs);
    this.root.appendChild(this.list);

    this.curTab = "player";
    this._wireTabs();
    this._updateHeader();
    this._updateCoins();
    this.render();

    // chặn phím scroll & trả focus về canvas
    this._preventScrollKeys();
  }

  /* ===== Helpers ===== */
  _t(en, ko){ return this.i18n?.lang==="ko" ? ko : en; }
  _updateHeader(){ if(this.h2) this.h2.textContent = this._t("Shop","상점"); }
  _updateCoins(){
    if (!this.coinsEl) return;
    this.coinsEl.querySelector(".label").textContent = this._t("Coins:","코인:");
    this.coinsEl.querySelector(".coin-text").textContent = this.progress?.coins ?? 0;
  }
  _focusCanvas(){
    // Tìm canvas của game và focus để Arrow/WASD không cuộn panel
    (document.getElementById("gameCanvas") || document.querySelector("canvas"))?.focus();
  }
  _preventScrollKeys(){
    const stop = (e)=>{
      const k = e.key;
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","PageUp","PageDown","Home","End"].includes(k) ||
          ["w","a","s","d","W","A","S","D"].includes(k)){
        e.preventDefault();        // không cuộn panel
      }
    };
    this.root.addEventListener("keydown", stop);
  }

  setLang(i18n){ this.i18n = i18n; this._wireTabs(); this._updateHeader(); this._updateCoins(); this.render(); }
  setProgress(p){ this.progress = p; this._updateCoins(); this.render(); }
  onEquipChange = null;

  _wireTabs(){
    const t = this._t.bind(this);
    const btns = this.tabs.querySelectorAll(".shop-tab");
    const setLabels = ()=>{
      btns[0].textContent = t("Player Skins","플레이어 스킨");
      btns[1].textContent = t("Obstacle Skins","장애물 스킨");
    };
    setLabels();

    const activate = (tab)=>{
      this.curTab = tab;
      btns.forEach(b => b.classList.toggle("active", b.dataset.tab===tab));
      this.render();
      this._focusCanvas(); // FOCUS CANVAS sau khi đổi tab
    };

    btns.forEach(b=> b.addEventListener("click", ()=> activate(b.dataset.tab)));
    activate(this.curTab);
  }

  render(){
    const t = this._t.bind(this);
    const DEFAULTS = { player:"skin.player.blue", obstacle:"skin.obstacle.pastel" };

    this.list.innerHTML = "";

    ITEMS.filter(it=>it.slot===this.curTab).forEach(item=>{
      const owned    = isUnlocked(this.progress, item.id);
      const equipped = this.progress.equip[item.slot] === item.id;

      const row = document.createElement("div");
      row.className = "shop-item";

      const title = t(item.name.en, item.name.ko);
      const desc  = item.desc ? t(item.desc.en||"", item.desc.ko||"") : "";
      const iconCls = item.icon ? ` ${item.icon}` : "";

      row.innerHTML = `
        <div class="meta">
          <span class="shop-ico${iconCls}" aria-hidden="true"></span>
          <div class="title">${title}</div>
          <div class="desc">${desc || (t("Slot: ","슬롯: ") + item.slot)}</div>
        </div>
        <div class="actions"></div>
      `;

      const actions = row.querySelector(".actions");
      const mkBtn = (cls, text, handler) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = cls; b.textContent = text;
        b.addEventListener("click", ()=>{ handler(); this._focusCanvas(); }); // FOCUS CANVAS sau click
        actions.appendChild(b);
        return b;
      };

      if (!owned){
        const costTxt = item.cost>0 ? ` (${item.cost})` : "";
        mkBtn("btn-buy", `${t("Buy","구매")}${costTxt}`, ()=>{
          if (item.cost>0 && !spendCoins(this.progress, item.cost)){
            alert(t("Not enough coins!","코인이 부족합니다!"));
            return;
          }
          unlock(this.progress, item.id);
          this.setProgress(this.progress);
        });
      } else {
        if (equipped){
          const eqBtn = mkBtn("btn-equip", t("Equipped","장착됨"), ()=>{});
          eqBtn.disabled = true;
          mkBtn("btn-unequip", t("Unequip","해제"), ()=>{
            equip(this.progress, item.slot, DEFAULTS[item.slot]);
            this.setProgress(this.progress);
            this.onEquipChange && this.onEquipChange(this.progress.equip);
          });
        } else {
          mkBtn("btn-equip", t("Equip","장착"), ()=>{
            equip(this.progress, item.slot, item.id);
            this.setProgress(this.progress);
            this.onEquipChange && this.onEquipChange(this.progress.equip);
          });
        }
      }

      this.list.appendChild(row);
    });
  }
}
