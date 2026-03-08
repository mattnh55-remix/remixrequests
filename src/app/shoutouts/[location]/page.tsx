
"use client";

import { useState } from "react";

export default function ShoutoutsPage({params}:{params:{location:string}}){

  const [fromName,setFromName] = useState("");
  const [messageText,setMessageText] = useState("");
  const [tier,setTier] = useState("BASIC");
  const [msg,setMsg] = useState("");

  async function submit(){

    const res = await fetch("/api/public/shoutouts/submit",{
      method:"POST",
      headers:{ "content-type":"application/json"},
      body:JSON.stringify({
        location:params.location,
        fromName,
        messageText,
        tier
      })
    });

    const data = await res.json();

    if(!data.ok) setMsg(data.error);
    else setMsg("Shout-out submitted for approval!");
  }

  return (
    <div style={{padding:20,maxWidth:600}}>
      <h1>Remix Shout-Outs</h1>

      <input
        placeholder="From name"
        value={fromName}
        onChange={e=>setFromName(e.target.value)}
      />

      <textarea
        placeholder="Your message"
        value={messageText}
        onChange={e=>setMessageText(e.target.value)}
      />

      <select value={tier} onChange={e=>setTier(e.target.value)}>
        <option value="BASIC">Basic</option>
        <option value="FEATURED">Featured</option>
      </select>

      <button onClick={submit}>Send Shout-Out</button>

      <div>{msg}</div>
    </div>
  );
}
