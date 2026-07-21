function c(n,o,l){const t=o.map(d=>`"${d.label||d.key}"`).join(","),a=l.map(d=>o.map(i=>{const r=d[i.key];return`"${(r==null?"":String(r)).replace(/"/g,'""')}"`}).join(",")),e=[t,...a].join(`
`);s(n,e,"text/csv")}function b(n,o,l){const t=window.open("","_blank");if(!t)return;const a=`
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
          ${l.map(e=>`<tr>${o.map(d=>`<td>${e[d.key]??""}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;t.document.write(a),t.document.close(),setTimeout(()=>t.print(),500)}function s(n,o,l){const t=new Blob([o],{type:l}),a=URL.createObjectURL(t),e=document.createElement("a");e.href=a,e.download=n,document.body.appendChild(e),e.click(),document.body.removeChild(e),URL.revokeObjectURL(a)}export{b as a,c as e};
