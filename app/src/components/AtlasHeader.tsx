"use client";
import Link from "next/link";
import {type ReactNode} from "react";
import AtlasBrand from "./AtlasBrand";
import {Icon} from "./Icons";
import ThemeToggle from "./ThemeToggle";
interface Props{setId?:number;title?:string;setName?:string;count?:number;onOpenList?:()=>void;section?:string;actions?:ReactNode}
export default function AtlasHeader({setId,title="Map",setName,count,onOpenList,section,actions}:Props){
 const modes=[["","Explore","compass"],["learn","Learn","book"],["flashcards","Flashcards","cards"],["test","Test","check"],["test?blank=1","Blank map","globe"],["leaderboard","Leaderboard","trophy"]];
 const active=title==="Map"?"Explore":title==="Blank Map Test"?"Blank map":title==="Test Mode"?"Test":title;
 return <header className={`atlas-app-header ${setId?"with-modes":""}`}>
  <div className="atlas-app-top"><AtlasBrand/><span className="atlas-header-separator"/>
   <div className="atlas-header-context"><span>{setId?"Study space":section??"Study space"}</span><h1>{setName?.replace(" (Example)","")||title}</h1></div>
   <div className="atlas-header-actions">{count!==undefined&&<span className="atlas-place-count">{count} places</span>}<Link className="atlas-library-link" href="/sets" aria-label="My atlas"><Icon name="grid" size={17}/><span>My atlas</span></Link>{actions}<ThemeToggle/>{onOpenList&&<button className="atlas-mobile-list" onClick={onOpenList}><Icon name="menu" size={18}/>Places</button>}</div>
  </div>
  {setId&&<nav className="atlas-mode-tabs" aria-label="Study modes">{modes.map(([path,label,icon])=><Link key={path} className={active===label?"is-current":""} href={`/set/${setId}${path?`/${path}`:""}`} aria-current={active===label?"page":undefined}><Icon name={icon} size={17}/>{label}{active===label&&<span className="mode-current-dot"/>}</Link>)}</nav>}
 </header>
}
