"use client";
import {useEffect,useState} from "react";
import {Icon} from "./Icons";
export default function AtlasDelight(){
 const [note,setNote]=useState("");
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const onEvent=(event:Event)=>{setNote((event as CustomEvent<string>).detail||"One more place. A little more familiar.");clearTimeout(timer);timer=setTimeout(()=>setNote(""),1800)};window.addEventListener("atlas:celebrate",onEvent);return()=>{window.removeEventListener("atlas:celebrate",onEvent);clearTimeout(timer)}},[]);
 if(!note)return null;
 return <div className="atlas-achievement" role="status"><span><Icon name="check" size={19}/></span><div><b>New ground covered.</b><p>{note}</p></div>{Array.from({length:8},(_,i)=><i key={i} style={{"--i":i} as React.CSSProperties}/>)}</div>
}
