import { I18N_STRINGS } from "../data/i18n.js";

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
  // Áp dụng cho text + thuộc tính title/aria-label
  applyDOM(root=document){
    // Nội dung text
    root.querySelectorAll("[data-i18n]").forEach(el=>{
      const key = el.getAttribute("data-i18n");
      el.textContent = this.t(key);
    });
    // Thuộc tính title
    root.querySelectorAll("[data-i18n-title]").forEach(el=>{
      const key = el.getAttribute("data-i18n-title");
      el.setAttribute("title", this.t(key));
    });
    // Thuộc tính aria-label
    root.querySelectorAll("[data-i18n-aria]").forEach(el=>{
      const key = el.getAttribute("data-i18n-aria");
      el.setAttribute("aria-label", this.t(key));
    });
  }
}
