import{c as s}from"./index-B4gOppht.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]],y=s("Download",c);function h(n,o,i){const t=o.map(d=>`"${d.label||d.key}"`).join(","),a=i.map(d=>o.map(r=>{const l=d[r.key];return`"${(l==null?"":String(l)).replace(/"/g,'""')}"`}).join(",")),e=[t,...a].join(`
`);p(n,e,"text/csv")}function f(n,o,i){const t=window.open("","_blank");if(!t)return;const a=`
    <html>
    <head>
      <title>${n}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #1a1a2e; }
        h1 { color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
        th { background: #f0f4f8; padding: 10px; text-align: left; border-bottom: 2px solid #0ea5e9; }
        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
        .header { display: flex; justify-content: space-between; align-items: center; }
        .date { color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${n}</h1>
        <span class="date">${new Date().toLocaleString()}</span>
      </div>
      <table>
        <thead>
          <tr>${o.map(e=>`<th>${e.label||e.key}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${i.map(e=>`<tr>${o.map(d=>`<td>${e[d.key]??""}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;t.document.write(a),t.document.close(),setTimeout(()=>t.print(),500)}function p(n,o,i){const t=new Blob([o],{type:i}),a=URL.createObjectURL(t),e=document.createElement("a");e.href=a,e.download=n,document.body.appendChild(e),e.click(),document.body.removeChild(e),URL.revokeObjectURL(a)}export{y as D,f as a,h as e};
