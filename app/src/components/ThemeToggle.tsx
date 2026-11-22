"use client";
import {useSyncExternalStore} from "react";
import {Icon} from "./Icons";
function subscribe(callback:()=>void){
 const observer=new MutationObserver(callback);
 observer.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
 return ()=>observer.disconnect();
}
export default function ThemeToggle({className=""}:{className?:string}){
 const dark=useSyncExternalStore(subscribe,()=>document.documentElement.classList.contains("dark"),()=>false);
 function toggle(){const next=!dark;document.documentElement.classList.toggle("dark",next);document.documentElement.style.colorScheme=next?"dark":"light";try{localStorage.setItem("atlas_colorway",next?"dark":"light");localStorage.setItem("geomaster_theme",next?"dark":"light")}catch{}}
 return <button type="button" onClick={toggle} aria-label={dark?"Switch to light theme":"Switch to dark theme"} title={dark?"Light theme":"Dark theme"} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 ${className}`}><Icon name={dark?"sun":"moon"} size={17}/></button>
}
