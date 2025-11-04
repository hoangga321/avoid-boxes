import { I18N_STRINGS } from "../data/i18n.js";

/**
 * I18n wrapper (giữ API cũ), thêm:
 *  - attr helpers (title, aria)
 *  - tOr(): trả bản dịch nếu có, không thì lấy tiếng Anh
 */
export class I18n {
  constructor(){
    this.lang = localStorage.getItem("lang") || "en";
    this.dict = I18N_STRINGS;
  }

  setLang(lang){
    if(!this.dict[lang]) return;
    this.lang = lang;
    localStorage.setItem("lang", lang);
    this.applyDOM();
  }

  t(key){
    const d = this.dict[this.lang] || {};
    return (d[key] ?? key);
  }

  /** Trả translation theo lang hiện tại; nếu không có thì rơi về 'en' */
  tOr(key){
    const d = this.dict[this.lang] || {};
    if (d[key] != null) return d[key];
    const en = this.dict["en"] || {};
    return (en[key] ?? key);
  }

  // Áp dụng cho text + title/aria
  applyDOM(root=document){
    root.querySelectorAll("[data-i18n]").forEach(el=>{
      const key = el.getAttribute("data-i18n");
      el.textContent = this.tOr(key);
    });
    root.querySelectorAll("[data-i18n-title]").forEach(el=>{
      const key = el.getAttribute("data-i18n-title");
      el.setAttribute("title", this.tOr(key));
    });
    root.querySelectorAll("[data-i18n-aria]").forEach(el=>{
      const key = el.getAttribute("data-i18n-aria");
      el.setAttribute("aria-label", this.tOr(key));
    });
  }
}
