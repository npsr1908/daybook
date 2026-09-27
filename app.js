(() => {
  const STORAGE_KEY = 'daybook-local-v2';
  const seed = JSON.parse(JSON.stringify(window.INITIAL_DATA));
  let loaded=null;
  try { loaded=JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { loaded=null; }
  let state={...seed,...(loaded||{})};
  if(loaded&&loaded.subcategoryCatalogVersion==null)state.subcategoryCatalogVersion=0;
  state.accounts=state.accounts||[];state.expenseCategories=state.expenseCategories||[];state.incomeCategories=state.incomeCategories||[];state.transferCategories=state.transferCategories||[];state.transactions=state.transactions||[];
  const transactionIds=new Set();state.transactions.forEach((t,i)=>{let id=t.id==null?'':String(t.id).trim();if(!id||transactionIds.has(id))id=`local-migrated-${Date.now()}-${i}`;t.id=id;transactionIds.add(id);});
  state.subcategoriesByCategory=state.subcategoriesByCategory||JSON.parse(JSON.stringify(seed.subcategoriesByCategory||{}));
  if((state.subcategoryCatalogVersion||0)<2){for(const [category,items] of Object.entries(seed.subcategoriesByCategory||{})){state.subcategoriesByCategory[category]||=[];for(const item of items)if(!state.subcategoriesByCategory[category].includes(item))state.subcategoriesByCategory[category].push(item);}state.subcategoryCatalogVersion=2;}
  state.userName=state.userName||'';
  state.subcategories=[...new Set(Object.values(state.subcategoriesByCategory).flat())].sort();
  state.expenseCategories.forEach(c=>state.subcategoriesByCategory[c.name]||=[]);
  state.transactions.forEach(t=>{
    if(t.type==='Expense'&&t.subcategory){state.subcategoriesByCategory[t.category]||=[];if(!state.subcategoriesByCategory[t.category].includes(t.subcategory))state.subcategoriesByCategory[t.category].push(t.subcategory);}
    if(t.account&&!state.accounts.some(a=>a.name===t.account))state.accounts.push({name:t.account,type:'Bank',openingBalance:0});
  });
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { toast('Your browser could not save this change. Check its storage settings.'); return false; } };
  const asDate = value => new Date(`${value}T12:00:00`);
  const localDate = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const formatTime = value => {if(!/^\d{2}:\d{2}$/.test(value||''))return '';const [hour,minute]=value.split(':').map(Number);return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour>=12?'PM':'AM'}`;};
  const newTransactionId = () => {let id;do{id=`local-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;}while(state.transactions.some(t=>t.id===id||t.pairId===id||t.id===`${id}-out`||t.id===`${id}-in`));return id;};
  function setTimeControls(value) {if(!value){$('#form-time-hour').value='';$('#form-time-minute').value='';$('#form-time-period').value='AM';return;}const [hour24,minute]=value.split(':').map(Number),period=hour24>=12?'PM':'AM';$('#form-time-hour').value=String(hour24%12||12);$('#form-time-minute').value=String(minute).padStart(2,'0');$('#form-time-period').value=period;}
  function readTimeControls(){const hour=Number($('#form-time-hour').value),minute=Number($('#form-time-minute').value),period=$('#form-time-period').value;if(!Number.isInteger(hour)||hour<1||hour>12||!Number.isInteger(minute)||minute<0||minute>59||!['AM','PM'].includes(period))return '';return `${String((hour%12)+(period==='PM'?12:0)).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;}
  const monthKey = value => value.slice(0,7);
  const monthLabel = key => key==='all'?'All months':new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric'}).format(asDate(`${key}-01`));
  const money = (value, compact=false) => {
    const abs = Math.abs(Number(value)||0);
    if (compact && abs >= 100000) return `${value<0?'−':''}₹${(abs/100000).toFixed(1)}L`;
    if (compact && abs >= 10000) return `${value<0?'−':''}₹${(abs/1000).toFixed(1)}k`;
    return `${value<0?'−':''}₹${new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(Math.round(abs))}`;
  };
  const fmtDate = value => new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(asDate(value));
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const months = () => [...new Set(state.transactions.map(t=>monthKey(t.date)))].sort().reverse();
  let selectedMonth = 'all';
  let transactionMonthFilter = 'all';
  const monthTx = () => selectedMonth==='all'?state.transactions:state.transactions.filter(t=>monthKey(t.date)===selectedMonth);
  const sum = (arr, pred, getter=t=>t.amount) => arr.filter(pred).reduce((a,t)=>a+Number(getter(t)||0),0);
  const byCategory = () => {
    const groups={}; for(const t of monthTx().filter(t=>t.type==='Expense')) groups[t.category]=(groups[t.category]||0)+Number(t.amount||0);
    return Object.entries(groups).sort((a,b)=>b[1]-a[1]);
  };
  const totalBudget = () => state.expenseCategories.reduce((a,c)=>a+Number(c.budget||0),0);
  const colors=['#315f4e','#91aa73','#d99a71','#879bb3','#c7b16b','#a58ca9','#79a3a0'];
  const expandedCategories=new Set();
  const iconFor = t => t.type==='Income'?'↙':t.type==='Transfer'?'⇄':({'Food':'◒','Household':'⌂','Transport':'↗','Fitness':'✳','Home':'⌂','Entertainment':'▷','Investment':'◌','Gifting':'✿','Lending':'↗','Shopping':'◇'}[t.category]||'◦');
  const budgetIcon = (name,custom) => custom||({Food:'🍲',Household:'🧺',Entertainment:'🎬',Medical:'✚',Transport:'🚗',Investment:'📈',Travel:'✈',Home:'🏠',Fitness:'🏃',Lending:'↗',Shopping:'🛍',Gifting:'🎁',Others:'✳',Miscellaneous:'◈'})[name]||'◉';
  const categoryIconOptions=[['◈','General'],['🍲','Food'],['🧺','Household'],['🎬','Entertainment'],['✚','Medical'],['🚗','Transport'],['📈','Investment'],['✈','Travel'],['🏠','Home'],['🏃','Fitness'],['↗','Lending'],['🛍','Shopping'],['🎁','Gifting'],['💧','Utilities'],['🎓','Education'],['✳','Other'],['◉','Circle']];
  const actionIcon = (action,attr,value,label) => `<button type="button" class="icon-action ${action==='edit'?'edit-action':'delete-action'}" ${attr}="${esc(value)}" aria-label="${action==='edit'?'Edit':'Delete'} ${esc(label)}" title="${action==='edit'?'Edit':'Delete'} ${esc(label)}"><svg viewBox="0 0 24 24" aria-hidden="true">${action==='edit'?'<path d="m14 5 5 5M4 20l4.2-.9L19 8.3 15.7 5 4.9 15.8 4 20Z"/>':'<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>'}</svg></button>`;
  function renderMonthOptions(){
    const opts=months(); if(selectedMonth!=='all'&&!opts.includes(selectedMonth)) opts.push(selectedMonth);
    const ordered=['all',...opts.sort().reverse()];
    const paint=select=>{
      const wrap=select.closest('.month-picker');select.innerHTML=ordered.map(m=>`<option value="${m}">${esc(monthLabel(m))}</option>`).join('');select.value=selectedMonth;select.classList.add('month-native');select.setAttribute('aria-hidden','true');select.tabIndex=-1;
      if(!wrap.querySelector('.month-picker-trigger')){
        select.insertAdjacentHTML('afterend','<button type="button" class="month-picker-trigger" aria-haspopup="listbox" aria-expanded="false"><span class="month-picker-current"></span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg></button><div class="month-picker-menu" role="listbox" aria-label="Choose month"></div>');
        wrap.querySelector('.month-picker-trigger').addEventListener('click',e=>{e.stopPropagation();const wasOpen=wrap.classList.contains('open');$$('.month-picker.open').forEach(p=>{p.classList.remove('open');p.querySelector('.month-picker-trigger')?.setAttribute('aria-expanded','false');});if(!wasOpen){wrap.classList.add('open');wrap.querySelector('.month-picker-trigger').setAttribute('aria-expanded','true');wrap.querySelector('.month-picker-menu button[aria-selected="true"]')?.focus();}});
      }
      wrap.querySelector('.month-picker-current').textContent=monthLabel(selectedMonth);
      wrap.querySelector('.month-picker-menu').innerHTML=ordered.map(m=>`<button type="button" class="month-option ${m===selectedMonth?'selected':''}" role="option" aria-selected="${m===selectedMonth}" data-month-option="${m}"><span class="month-option-mark">${m===selectedMonth?'✓':''}</span><span>${esc(monthLabel(m))}</span></button>`).join('');
      wrap.querySelectorAll('[data-month-option]').forEach(option=>option.addEventListener('click',()=>{selectedMonth=option.dataset.monthOption;$$('.month-picker.open').forEach(p=>{p.classList.remove('open');p.querySelector('.month-picker-trigger')?.setAttribute('aria-expanded','false');});render();}));
    };
    paint($('#month-picker'));$$('.month-select-synced').forEach(paint);
  }
  function renderTransactionMonthFilter(){
    const select=$('#transaction-month-filter'),wrap=$('#transaction-month-picker'),available=months();
    if(transactionMonthFilter!=='all'&&!available.includes(transactionMonthFilter))transactionMonthFilter='all';
    select.innerHTML=`<option value="all">All months</option>${available.map(m=>`<option value="${m}">${esc(monthLabel(m))}</option>`).join('')}`;
    select.value=transactionMonthFilter;select.classList.add('month-native');select.setAttribute('aria-hidden','true');select.tabIndex=-1;
    if(!wrap.querySelector('.month-picker-trigger')){
      select.insertAdjacentHTML('afterend','<button type="button" class="month-picker-trigger" aria-haspopup="listbox" aria-expanded="false"><span class="month-picker-current"></span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg></button><div class="month-picker-menu" role="listbox" aria-label="Filter transactions by month"></div>');
      wrap.querySelector('.month-picker-trigger').addEventListener('click',e=>{e.stopPropagation();const wasOpen=wrap.classList.contains('open');$$('.month-picker.open').forEach(p=>{p.classList.remove('open');p.querySelector('.month-picker-trigger')?.setAttribute('aria-expanded','false');});if(!wasOpen){wrap.classList.add('open');wrap.querySelector('.month-picker-trigger').setAttribute('aria-expanded','true');wrap.querySelector('.month-picker-menu button[aria-selected="true"]')?.focus();}});
    }
    const choices=[['all','All months'],...available.map(m=>[m,monthLabel(m)])];
    wrap.querySelector('.month-picker-current').textContent=choices.find(([value])=>value===transactionMonthFilter)?.[1]||'All months';
    wrap.querySelector('.month-picker-menu').innerHTML=choices.map(([value,label])=>`<button type="button" class="month-option ${value===transactionMonthFilter?'selected':''}" role="option" aria-selected="${value===transactionMonthFilter}" data-transaction-month="${value}"><span class="month-option-mark">${value===transactionMonthFilter?'✓':''}</span><span>${esc(label)}</span></button>`).join('');
    wrap.querySelectorAll('[data-transaction-month]').forEach(option=>option.addEventListener('click',()=>{transactionMonthFilter=option.dataset.transactionMonth;wrap.classList.remove('open');wrap.querySelector('.month-picker-trigger').setAttribute('aria-expanded','false');renderTransactionMonthFilter();renderTransactions();}));
  }
  function renderStats(){
    const tx=monthTx(), income=sum(tx,t=>t.type==='Income'), spent=sum(tx,t=>t.type==='Expense'), saved=income-spent;
    const accounts=accountBalances(), net=accounts.reduce((a,x)=>a+x.balance,0);
    const data=[
      {label:'Net balance',value:money(net),caption:'Across all your accounts',icon:'◈',tone:'highlight'},
      {label:'Income',value:money(income),caption:`${esc(monthLabel(selectedMonth))} · ${tx.filter(t=>t.type==='Income').length} deposits`,icon:'↙'},
      {label:'Spent',value:money(spent),caption:`${esc(monthLabel(selectedMonth))} · ${tx.filter(t=>t.type==='Expense').length} purchases`,icon:'↗'},
      {label:saved<0?'Net outflow':'Saved',value:money(saved),caption:saved<0?'More out than in this month':'Income minus spending',icon:'✳'}
    ];
    $('#stats-grid').innerHTML=data.map(c=>`<article class="stat-card ${c.tone||''}"><div class="stat-top"><span class="stat-label">${c.label}</span><span class="stat-icon">${c.icon}</span></div><div class="stat-value">${c.value}</div><div class="stat-caption">${c.caption}</div></article>`).join('');
    $('#cashflow-summary').textContent=money(saved);$('#cashflow-period-label').textContent=selectedMonth==='all'?'net cash flow across all months':'net cash flow this month';
  }
  function accountBalances(){
    return state.accounts.map(a=>{
      let balance=Number(a.openingBalance)||0;
      for(const t of state.transactions.filter(x=>x.account===a.name)){
        if(t.type==='Expense') balance-=Number(t.amount)||0;
        else balance+=Number(t.amount)||0;
      }
      return {...a,balance};
    });
  }
  function renderCashflow(){
    const tx=monthTx(), labels=['Wk 1','Wk 2','Wk 3','Wk 4'], bins=labels.map(()=>({income:0,expense:0}));
    tx.forEach(t=>{const i=Math.min(3,Math.floor((asDate(t.date).getDate()-1)/7));if(t.type==='Income')bins[i].income+=Number(t.amount)||0;if(t.type==='Expense')bins[i].expense+=Number(t.amount)||0;});
    const max=Math.max(1,...bins.flatMap(b=>[b.income,b.expense])), chartW=600,chartH=125, base=104, top=8, scale=(base-top)/max, group=chartW/4, barW=20;
    const grid=[0,1,2].map(i=>{const y=top+i*(base-top)/2;return `<line class="chart-gridline" x1="34" y1="${y}" x2="${chartW}" y2="${y}"/><text class="chart-label" x="0" y="${y+3}">${i===0?money(max,true):i===1?money(max/2,true):'0'}</text>`}).join('');
    const bars=bins.map((b,i)=>{const cx=72+i*group+group/2, ih=Math.max(2,b.income*scale), eh=Math.max(2,b.expense*scale);return `<rect x="${cx-barW-2}" y="${base-ih}" width="${barW}" height="${ih}" rx="4" fill="#b8cb9c"/><rect x="${cx+2}" y="${base-eh}" width="${barW}" height="${eh}" rx="4" fill="#e5a17c"/><text class="chart-label" x="${cx-20}" y="122">${labels[i]}</text>`}).join('');
    $('#cashflow-chart').innerHTML=`<svg viewBox="0 0 600 130" preserveAspectRatio="none" role="img" aria-label="Weekly income and spending chart">${grid}${bars}</svg>`;
  }
  function renderBudget(){
    const cats=byCategory(),budget=totalBudget()*(selectedMonth==='all'?Math.max(1,months().length):1),spent=sum(monthTx(),t=>t.type==='Expense'),ratio=budget?Math.min(1,spent/budget):0;
    $('#budget-ring').style.background=`conic-gradient(#315f4e 0deg ${Math.round(ratio*360)}deg, #e6eadf ${Math.round(ratio*360)}deg 360deg)`;
    $('#budget-remaining').textContent=money(budget-spent);
    $('#budget-hint').textContent=spent>budget?'over plan':'left to spend';
    $('#budget-total-spent').innerHTML=`${money(spent)} <small>of ${money(budget)}</small>`;
    $('#budget-legend').innerHTML=`<div class="legend-row"><i style="background:#315f4e"></i><span>Spent · ${Math.round(ratio*100)}%</span></div><div class="legend-row"><i style="background:#e6eadf"></i><span>Remaining · ${Math.max(0,100-Math.round(ratio*100))}%</span></div>`;
    $('#budget-ring').setAttribute('aria-label',`${Math.round(ratio*100)} percent of budget used`);
    $('#top-categories').innerHTML=cats.slice(0,5).map(([n,v],i)=>{const cap=state.expenseCategories.find(c=>c.name===n)?.budget||0;const pct=cap?Math.min(100,Math.round(v/cap*100)):100;return `<div><div class="top-cat-head"><span>${esc(n)}</span><strong>${money(v)}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div></div>`}).join('')||'<div class="empty-state">Your categories will appear here.</div>';
  }
  function rowMarkup(t,compact=false){
    const sign=t.type==='Expense'?'−':t.type==='Income'?'+':'';
    return `<div class="transaction-row"><div class="transaction-main"><span class="transaction-icon">${iconFor(t)}</span><div style="min-width:0"><div class="transaction-title">${esc(t.description)}</div><div class="transaction-meta">${esc(t.category||t.type)}${t.subcategory?` · ${esc(t.subcategory)}`:''} · ${esc(t.account)}${t.time?` · ${formatTime(t.time)}`:''}</div></div></div><div class="transaction-amount ${t.type==='Expense'?'negative':t.type==='Income'?'positive':''}">${sign}${money(t.amount)}</div></div>`;
  }
  function renderRecent(){
    const list=monthTx().slice().sort((a,b)=>b.date.localeCompare(a.date)||String(b.time||'').localeCompare(String(a.time||''))||String(b.id).localeCompare(String(a.id))).slice(0,5);
    $('#recent-transactions').innerHTML=list.map(t=>rowMarkup(t,true)).join('')||'<div class="empty-state">Add your first transaction for this month.</div>';
  }
  function renderTransactions(){
    const q=$('#transaction-search').value.toLowerCase().trim(),type=$('#type-filter').value,cat=$('#category-filter').value;
    const list=state.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)||String(b.time||'').localeCompare(String(a.time||''))||String(b.id).localeCompare(String(a.id))).filter(t=>(transactionMonthFilter==='all'||monthKey(t.date)===transactionMonthFilter)&&(type==='all'||t.type===type)&&(cat==='all'||t.category===cat)&&(!q||[t.description,t.category,t.subcategory,t.account,t.notes].join(' ').toLowerCase().includes(q)));
    $('#transaction-table').innerHTML=list.map(t=>`<tr><td><span class="table-title">${esc(t.description)}</span><span class="type-badge ${t.type.toLowerCase()}">${t.type}</span>${t.notes?`<span class="table-note">${esc(t.notes)}</span>`:''}</td><td>${fmtDate(t.date)}${t.time?`<span class="table-time">${formatTime(t.time)}</span>`:''}</td><td><span class="table-category"><i></i>${esc(t.category||t.type)}${t.subcategory?` · ${esc(t.subcategory)}`:''}</span></td><td>${esc(t.account)}</td><td class="table-amount ${t.type.toLowerCase()}">${t.type==='Expense'?'−':t.type==='Income'?'+':''}${money(t.amount)}</td><td class="actions-cell"><div class="row-actions">${actionIcon('edit','data-edit-transaction',t.id,t.description)}${actionIcon('delete','data-delete-transaction',t.id,t.description)}</div></td></tr>`).join('');
    $$('[data-edit-transaction]', $('#transaction-table')).forEach((button,index)=>button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const transaction=state.transactions.find(t=>String(t.id)===button.dataset.editTransaction)||list[index];if(!transaction){toast('This transaction could not be loaded. Refresh the tracker and try again.');return;}try{openModal(transaction);}catch(error){console.error(error);toast('Could not open this transaction for editing.');}}));
    $$('[data-delete-transaction]', $('#transaction-table')).forEach((button,index)=>button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const transaction=state.transactions.find(t=>String(t.id)===button.dataset.deleteTransaction)||list[index];if(!transaction){toast('This transaction could not be loaded. Refresh the tracker and try again.');return;}const paired=Boolean(transaction.pairId),pairId=transaction.pairId,id=transaction.id;confirmInApp(paired?'Delete this transfer from both accounts?':'Delete this transaction?',()=>{const before=JSON.stringify(state);state.transactions=state.transactions.filter(t=>paired?t.pairId!==pairId:t.id!==id);if(!save()){state=JSON.parse(before);render();return;}render();toast(paired?'Transfer deleted from both accounts.':'Transaction deleted.');});}));
    $('#transaction-empty').classList.toggle('hidden',list.length>0);
    $('#table-footer').textContent=`Showing ${list.length} of ${state.transactions.length} transactions`;
  }
  function setExportDateMode(){
    const all=$('#export-all-dates').checked;$('#export-date-range').classList.toggle('hidden',all);$('#export-from-date').required=!all;$('#export-to-date').required=!all;
  }
  function closeExport(){ $('#export-modal').classList.add('hidden'); }
  function downloadTransactions(from,to,allDates){
    if(!allDates&&from>to){toast('The from date must be before the to date.');return;}
    const rows=state.transactions.filter(t=>allDates||((!from||t.date>=from)&&(!to||t.date<=to)));
    if(!rows.length){toast('There are no transactions in that date range.');return;}
    const columns=['Date','Time','Type','Description','Category','Subcategory','Account','Amount','Notes'];
    const csvCell=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
    const lines=[columns,...rows.slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||'').localeCompare(String(b.time||''))).map(t=>[t.date,t.time||'',t.type,t.description,t.category,t.subcategory||'',t.account,t.type==='Expense'?-Math.abs(Number(t.amount)||0):Number(t.amount)||0,t.notes||''])];
    const blob=new Blob(['\uFEFF'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    const period=allDates?'all-dates':'from-'+(from||'beginning')+'-to-'+(to||'latest');link.href=url;link.download='transactions-'+period+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);closeExport();toast(rows.length+' transaction'+(rows.length===1?'':'s')+' downloaded.');
  }
  function renderBudgets(){
    const cats=byCategory(), actual=Object.fromEntries(cats),periods=selectedMonth==='all'?Math.max(1,months().length):1;
    $('#budget-cards').innerHTML=state.expenseCategories.map((c,i)=>{
      const spent=actual[c.name]||0,limit=(Number(c.budget)||0)*periods,pct=limit?Math.round(spent/limit*100):spent?100:0,over=pct>100;
      const subs=state.subcategoriesByCategory[c.name]||[],open=expandedCategories.has(c.name);
      const subRows=subs.map(sub=>{const n=sum(monthTx(),t=>t.type==='Expense'&&t.category===c.name&&t.subcategory===sub);return `<div class="subcat-row"><span>${esc(sub)}</span><strong>${money(n)}</strong>${actionIcon('edit','data-edit-subcategory',`${c.name}|${sub}`,sub)}${actionIcon('delete','data-delete-subcategory',`${c.name}|${sub}`,sub)}</div>`}).join('');
      return `<article class="budget-card ${over?'over':''}"><div class="budget-card-head"><button class="budget-expand ${open?'open':''}" data-expand-category="${esc(c.name)}" aria-expanded="${open}" aria-label="${open?'Hide':'Show'} ${esc(c.name)} subcategories"><span class="expand-chevron" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m5 7.5 5 5 5-5"/></svg></span><span class="expand-label">${open?'Hide subcategories':'Subcategories'}</span></button><span class="budget-card-icon" data-category-icon="${esc(c.name)}">${budgetIcon(c.name,c.icon)}</span><strong class="budget-name">${esc(c.name)}</strong><span class="budget-actions">${actionIcon('edit','data-edit-category',c.name,c.name)}${actionIcon('delete','data-delete-category',c.name,c.name)}</span></div><div class="budget-card-values"><strong>${money(spent)}</strong><span>of ${money(limit)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,pct)}%"></div></div><div class="budget-card-foot"><span>${over?`${pct-100}% over plan`:limit?`${100-pct}% left`:'No monthly limit'}</span><strong>${pct}%</strong></div><div class="subcategory-list ${open?'':'hidden'}">${subRows||'<div class="subcat-empty">No subcategories yet.</div>'}<button class="add-subcategory" data-add-subcategory="${esc(c.name)}">＋ Add expense subcategory</button></div></article>`;
    }).join('');
  }
  function renderAccounts(){
    const groups={Bank:'Bank Account',Card:'Credit cards',Cash:'Cash & wallets','Emergency Fund':'Emergency Fund','Fixed Deposit':'Fixed Deposits'},balances=accountBalances();
    $('#account-net').textContent=money(balances.reduce((a,x)=>a+x.balance,0));
    $('#account-groups').innerHTML=Object.entries(groups).map(([type,title])=>{
      const list=balances.filter(a=>a.type===type);if(!list.length)return '';
      const icon=type==='Bank'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 9 9-5 9 5M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18M3 10h18"/></svg>':type==='Card'?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18m-14 5h4"/></svg>':type==='Fixed Deposit'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h4M8 12h8m-8 4h8"/></svg>':type==='Emergency Fund'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="M12 8v8m-4-4h8"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18m-5 5h2M7 6V4h10v2"/></svg>';
      return `<section class="account-section"><div class="account-section-head"><h2>${title}</h2><span>${list.length} account${list.length===1?'':'s'}</span></div>${list.map(a=>`<div class="account-row"><span class="account-badge">${icon}</span><div class="account-info"><strong>${esc(a.name)}</strong><small>${esc(a.type==='Card'?'Credit card':a.type==='Cash'?'Cash account':a.type==='Emergency Fund'?'Emergency fund':a.type==='Fixed Deposit'?'Fixed deposit':'Bank account')} · opening ${money(a.openingBalance)}</small></div><span class="account-balance ${a.balance<0?'negative':''}">${money(a.balance)}</span>${actionIcon('edit','data-edit-account',a.name,a.name)}${actionIcon('delete','data-delete-account',a.name,a.name)}</div>`).join('')}</section>`;
    }).join('');
  }
  function renderAnalytics(){
    const all=state.transactions, income=sum(all,t=>t.type==='Income'), spent=sum(all,t=>t.type==='Expense'), savings=income-spent;
    const monthMap={};
    all.forEach(t=>{const k=monthKey(t.date);monthMap[k]??={income:0,expense:0};if(t.type==='Income')monthMap[k].income+=Number(t.amount)||0;if(t.type==='Expense')monthMap[k].expense+=Number(t.amount)||0;});
    const keys=Object.keys(monthMap).sort(), activeMonths=new Set(all.filter(t=>t.type==='Income'||t.type==='Expense').map(t=>monthKey(t.date))).size||1, avg=spent/activeMonths, rate=income?savings/income*100:0;
    const highest=keys.reduce((best,k)=>!best||monthMap[k].expense>monthMap[best].expense?k:best,'');
    const metrics=[
      {label:'Income recorded',value:money(income),hint:`${all.filter(t=>t.type==='Income').length} income entries`,icon:'↙',tone:'green'},
      {label:'Expenses recorded',value:money(spent),hint:`${all.filter(t=>t.type==='Expense').length} expense entries`,icon:'↗',tone:'coral'},
      {label:'Savings rate',value:`${rate.toFixed(1)}%`,hint:income?`${money(savings)} net saved`:'Add income to see your rate',icon:'✳',tone:'lime'},
      {label:'Average monthly spend',value:money(avg),hint:highest?`Highest month · ${monthLabel(highest)}`:'Based on months with entries',icon:'◷',tone:'blue'}
    ];
    $('#analytics-stats').innerHTML=metrics.map(m=>`<article class="analytics-stat ${m.tone}"><div class="analytics-stat-top"><span>${m.label}</span><i>${m.icon}</i></div><strong>${m.value}</strong><small>${m.hint}</small></article>`).join('');
    if(!keys.length){$('#analytics-month-chart').innerHTML='<div class="analytics-empty">Your monthly picture will appear here after you add transactions.</div>';$('#analytics-category-chart').innerHTML='<div class="analytics-empty">Your expense mix will appear here after you add expenses.</div>';}else{
      const shown=keys.slice(-12),max=Math.max(1,...shown.flatMap(k=>[monthMap[k].income,monthMap[k].expense])),base=145,top=12,scale=(base-top)/max,w=640,group=w/shown.length,bar=Math.min(23,group*.27);
      const grid=[0,1,2,3].map(i=>{const y=top+i*(base-top)/3;return `<line class="chart-gridline" x1="32" y1="${y}" x2="${w}" y2="${y}"/><text class="chart-label" x="0" y="${y+3}">${money(max*(1-i/3),true)}</text>`}).join('');
      const bars=shown.map((k,i)=>{const d=monthMap[k],x=42+i*group+group/2,h1=Math.max(d.income?2:0,d.income*scale),h2=Math.max(d.expense?2:0,d.expense*scale),lab=new Intl.DateTimeFormat('en-IN',{month:'short'}).format(asDate(`${k}-01`));return `<rect x="${x-bar-2}" y="${base-h1}" width="${bar}" height="${h1}" rx="4" fill="#85aa89"/><rect x="${x+2}" y="${base-h2}" width="${bar}" height="${h2}" rx="4" fill="#df9778"/><text class="chart-label" text-anchor="middle" x="${x}" y="166">${lab}</text><text class="analytics-saving-label" text-anchor="middle" x="${x}" y="184">${money(d.income-d.expense,true)}</text>`;}).join('');
      $('#analytics-month-chart').innerHTML=`<div class="analytics-chart-legend"><span><i class="income-dot"></i>Income</span><span><i class="expense-dot"></i>Spending</span><span class="legend-side-note">Net savings shown below each month</span></div><svg viewBox="0 0 ${w} 190" preserveAspectRatio="none" role="img" aria-label="Monthly income, spending and net savings">${grid}${bars}</svg>`;
      const byCat={};all.filter(t=>t.type==='Expense').forEach(t=>byCat[t.category]=(byCat[t.category]||0)+Number(t.amount||0));
      const list=Object.entries(byCat).sort((a,b)=>b[1]-a[1]),topCats=list.slice(0,5),other=list.slice(5).reduce((a,x)=>a+x[1],0);if(other)topCats.push(['Other',other]);
      const catTotal=topCats.reduce((a,x)=>a+x[1],0)||1;let deg=0;const stops=topCats.map(([n,v],i)=>{const start=deg;deg+=v/catTotal*360;return `${colors[i%colors.length]} ${start}deg ${deg}deg`;}).join(',');
      $('#analytics-category-chart').innerHTML=topCats.length?`<div class="analytics-donut-row"><div class="analytics-donut" style="background:conic-gradient(${stops})"><div><strong>${money(catTotal,true)}</strong><small>all expenses</small></div></div><div class="analytics-cat-legend">${topCats.map(([n,v],i)=>`<div class="analytics-cat-row"><i style="background:${colors[i%colors.length]}"></i><span>${esc(n)}</span><strong>${money(v)}</strong><small>${Math.round(v/catTotal*100)}%</small></div>`).join('')}</div></div>`:'<div class="analytics-empty">No expense entries in the selected history yet.</div>';
    }
    const trendCategories={};all.filter(t=>t.type==='Expense').forEach(t=>{trendCategories[t.category]||={};trendCategories[t.category][monthKey(t.date)]=(trendCategories[t.category][monthKey(t.date)]||0)+Number(t.amount||0);});
    const trendMonths=keys.slice(-6),trendRows=Object.entries(trendCategories).map(([name,values])=>({name,values,total:Object.values(values).reduce((a,v)=>a+v,0)})).sort((a,b)=>b.total-a.total).slice(0,10);
    const trendCols=`minmax(120px,1.4fr) repeat(${Math.max(1,trendMonths.length)},minmax(78px,1fr))`;
    $('#analytics-category-trends').innerHTML=trendRows.length?`<div class="analytics-row category-trend-row analytics-head" style="grid-template-columns:${trendCols}"><span>Category</span>${trendMonths.map(k=>`<span>${new Intl.DateTimeFormat('en-IN',{month:'short',year:'2-digit'}).format(asDate(`${k}-01`))}</span>`).join('')}</div>${trendRows.map(row=>`<div class="analytics-row category-trend-row" style="grid-template-columns:${trendCols}"><strong>${esc(row.name)}</strong>${trendMonths.map(k=>`<span>${money(row.values[k]||0)}</span>`).join('')}</div>`).join('')}`:'<div class="analytics-empty">Category trends will appear after expenses are recorded.</div>';
    let rolling=state.accounts.reduce((a,x)=>a+Number(x.openingBalance||0),0);const balanceByMonth={};
    for(const k of keys){const delta=sum(all,t=>monthKey(t.date)===k&&t.type==='Income')-sum(all,t=>monthKey(t.date)===k&&t.type==='Expense')+sum(all,t=>monthKey(t.date)===k&&t.type==='Transfer');rolling+=delta;balanceByMonth[k]=rolling;}
    const balanceKeys=keys.slice(-12);
    if(!balanceKeys.length)$('#analytics-balance-chart').innerHTML='<div class="analytics-empty">Net balance history will appear here after transactions are recorded.</div>';
    else{const vals=balanceKeys.map(k=>balanceByMonth[k]),lo=Math.min(0,...vals),hi=Math.max(1,...vals),span=hi-lo||1,left=42,right=620,top=17,bottom=155;const points=vals.map((v,i)=>{const x=balanceKeys.length===1?(left+right)/2:left+i*(right-left)/(balanceKeys.length-1),y=bottom-(v-lo)/span*(bottom-top);return [x,y];}),path=points.map((p,i)=>`${i?'L':'M'} ${p[0]} ${p[1]}`).join(' '),labels=balanceKeys.map((k,i)=>{const short=new Intl.DateTimeFormat('en-IN',{month:'short',year:'2-digit'}).format(asDate(`${k}-01`));return `<text class="chart-label" text-anchor="middle" x="${points[i][0]}" y="178">${short}</text>`}).join('');$('#analytics-balance-chart').innerHTML=`<svg viewBox="0 0 640 190" preserveAspectRatio="none" role="img" aria-label="Monthly net balance trend"><line class="chart-gridline" x1="36" y1="${top}" x2="630" y2="${top}"/><line class="chart-gridline" x1="36" y1="${(top+bottom)/2}" x2="630" y2="${(top+bottom)/2}"/><line class="chart-gridline" x1="36" y1="${bottom}" x2="630" y2="${bottom}"/><text class="chart-label" x="0" y="${top+3}">${money(hi,true)}</text><text class="chart-label" x="0" y="${bottom+3}">${money(lo,true)}</text><path d="${path}" fill="none" stroke="#4f8a67" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#fff" stroke="#4f8a67" stroke-width="2"/>`).join('')}${labels}</svg>`;}
    const cats=state.expenseCategories.map(c=>{const actual=sum(monthTx(),t=>t.type==='Expense'&&t.category===c.name),limit=Number(c.budget)||0;return {name:c.name,actual,limit,variance:limit-actual};}).sort((a,b)=>b.actual-a.actual);
    $('#analytics-budget-table').innerHTML=cats.length?`<div class="analytics-row analytics-head"><span>Category</span><span>Planned</span><span>Actual</span><span>Left / over</span></div>${cats.map(c=>`<div class="analytics-row"><span>${esc(c.name)}</span><span>${money(c.limit)}</span><span>${money(c.actual)}</span><strong class="${c.variance<0?'negative':''}">${c.variance<0?`${money(Math.abs(c.variance))} over`:money(c.variance)}</strong></div>`).join('')}`:'<div class="analytics-empty">Add a budget category to see your comparison.</div>';
    const subTotals={};all.filter(t=>t.type==='Expense'&&t.subcategory).forEach(t=>{const key=`${t.category}|||${t.subcategory}`;subTotals[key]=(subTotals[key]||0)+Number(t.amount||0);});
    const subs=Object.entries(subTotals).sort((a,b)=>b[1]-a[1]).slice(0,10);
    $('#analytics-subcategories').innerHTML=subs.length?`<div class="analytics-row analytics-head"><span>Subcategory</span><span>Category</span><span>Transactions</span><span>Total spent</span></div>${subs.map(([key,v])=>{const [category,sub]=key.split('|||'),count=all.filter(t=>t.type==='Expense'&&t.category===category&&t.subcategory===sub).length;return `<div class="analytics-row"><span>${esc(sub)}</span><span>${esc(category)}</span><span>${count}</span><strong>${money(v)}</strong></div>`}).join('')}`:'<div class="analytics-empty">Categorized subcategory spending will appear here.</div>';
  }
  function render(){
    renderMonthOptions();renderTransactionMonthFilter();renderStats();renderCashflow();renderBudget();renderRecent();renderTransactions();renderBudgets();renderAccounts();renderAnalytics();
    $('#transaction-count').textContent=state.transactions.length;
    const cats=[...new Set(state.transactions.map(t=>t.category).filter(Boolean))].sort();
    const filter=$('#category-filter'),wanted=filter.value||'all';filter.innerHTML='<option value="all">All categories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join('');filter.value=cats.includes(wanted)?wanted:'all';
    updateName();
  }
  const personalizedText=new Map();
  function updateName(){const n=state.userName||'you',display=state.userName||'Your',possessive=state.userName?`${n}’s`:'Your',upperPossessive=state.userName?`${n.toUpperCase()}’S`:'YOUR';$('.workspace-label').textContent=state.userName?`${n.toUpperCase()}’S SPACE`:'YOUR SPACE';$('.local-status strong').textContent=state.userName?`${n}’s data`:'Your data';$('.profile strong').textContent=state.userName||'You';$('.avatar').textContent=n.trim().charAt(0).toUpperCase()||'?';$('.breadcrumb span').textContent=state.userName||'You';const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;if(!personalizedText.has(node)&&node.nodeValue.includes('{{owner'))personalizedText.set(node,node.nodeValue);const original=personalizedText.get(node);if(original)node.nodeValue=original.replaceAll('{{owner-uppercase-possessive}}',upperPossessive).replaceAll('{{owner-possessive}}',possessive).replaceAll('{{owner}}',display);}}
  function askName(){if(state.userName)return;$('#name-modal').classList.remove('hidden');$('#name-input').focus();}
  function setPage(name){
    $$('.page-view').forEach(p=>p.classList.toggle('hidden',p.id!==`page-${name}`));
    $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===name));
    $('#breadcrumb-current').textContent=name[0].toUpperCase()+name.slice(1);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function setType(type){
    const valid=['Expense','Income','Transfer'].includes(type);$('#form-type').value=valid?type:'';$$('.type-tab').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
    const transfer=type==='Transfer',expense=type==='Expense';
    $('#transfer-accounts-field').classList.toggle('hidden',!transfer);$('#single-account-field').classList.toggle('hidden',!valid||transfer);$('#transaction-classification-fields').classList.toggle('hidden',!valid);$('#subcategory-field').classList.toggle('hidden',!expense);$('#add-transfer-category').classList.toggle('hidden',!transfer);
    $('#form-category').required=valid;$('#form-account').required=valid&&!transfer;$('#form-account-from').required=transfer;$('#form-account-to').required=transfer;
    const cats=!valid?[]:type==='Income'?state.incomeCategories:type==='Transfer'?state.transferCategories:state.expenseCategories.map(c=>c.name);
    $('#form-category').innerHTML=cats.map(c=>`<option>${esc(c)}</option>`).join('');
    const accounts=state.accounts.map(a=>`<option>${esc(a.name)}</option>`).join('');
    $('#form-account').innerHTML=accounts;$('#form-account-from').innerHTML=accounts;$('#form-account-to').innerHTML=accounts;
    if(state.accounts.length>1)$('#form-account-to').selectedIndex=1;
    renderSubcategoryOptions();
  }
  function renderSubcategoryOptions(){
    const category=$('#form-category').value,options=state.subcategoriesByCategory[category]||[];
    $('#form-subcategory').innerHTML='<option value="">Choose a subcategory</option>'+options.map(s=>`<option>${esc(s)}</option>`).join('');
  }
  let editingTransaction=null;
  function openModal(transaction=null){
    if(!transaction||!state.transactions.includes(transaction))transaction=null;
    editingTransaction=transaction;
    $('#transaction-form').reset();setType(transaction?.type||'');
    $('#form-date').value=localDate();setTimeControls(transaction?.time||'00:00');
    if(transaction){$('#modal-title').textContent='Edit transaction';$('#form-submit').innerHTML='Save changes <span>→</span>';$('#form-description').value=transaction.description==null||transaction.description==='undefined'?'':transaction.description;const amount=Number(transaction.amount);$('#form-amount').value=Number.isFinite(amount)&&amount!==0?Math.abs(amount):'';$('#form-date').value=/^\d{4}-\d{2}-\d{2}$/.test(transaction.date||'')?transaction.date:localDate();$('#form-notes').value=transaction.notes||'';$('#form-category').value=transaction.category||'';$('#form-account').value=transaction.account||'';$('#form-account-from').value=transaction.account||'';$('#form-account-to').value='';if(transaction.pairId){const pair=state.transactions.filter(t=>t.pairId===transaction.pairId);$('#form-account-from').value=pair.find(t=>t.amount<0)?.account||'';$('#form-account-to').value=pair.find(t=>t.amount>0)?.account||'';}renderSubcategoryOptions();$('#form-subcategory').value=transaction.subcategory||'';}else{$('#modal-title').textContent='Add a transaction';$('#form-submit').innerHTML='Save transaction <span>→</span>';}
    $('#transaction-modal').classList.remove('hidden');$('#form-description').focus();
  }
  function closeModal(){$('#transaction-modal').classList.add('hidden');editingTransaction=null;}
  let toastTimer;function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
  function confirmInApp(message,onConfirm){$('#confirm-message').textContent=message;$('#confirm-modal').classList.remove('hidden');const finish=()=>$('#confirm-modal').classList.add('hidden');$('#confirm-cancel').onclick=()=>{finish();clean();};$('#confirm-close').onclick=()=>{finish();clean();};const accept=()=>{finish();clean();onConfirm();};const clean=()=>{$('#confirm-continue').removeEventListener('click',accept);};$('#confirm-continue').addEventListener('click',accept,{once:true});$('#confirm-continue').focus();}
  let editorSave=null;
  function openEditor(title,fields,values,onSave){
    $('#editor-title').textContent=title;editorSave=onSave;
    $('#editor-fields').innerHTML=fields.map(f=>`<div class="field"><label class="field-label" for="editor-${esc(f.key)}">${esc(f.label)}</label>${f.type==='select'?`<select class="form-input editor-input" id="editor-${esc(f.key)}" name="${esc(f.key)}" ${f.required===false?'':'required'}>${f.options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select>`:`<input class="form-input editor-input" id="editor-${esc(f.key)}" name="${esc(f.key)}" type="${f.type||'text'}" value="${esc(values[f.key]??'')}" ${f.type==='number'?'step="0.01"':''} ${f.min!=null?`min="${f.min}"`:''} ${f.required===false?'':'required'}>`}${f.hint?`<small class="field-hint">${esc(f.hint)}</small>`:''}</div>`).join('');
    for(const f of fields)if(f.type==='select'&&values[f.key]!=null)$(`#editor-${f.key}`).value=values[f.key];
    $('#editor-modal').classList.remove('hidden');$('.editor-input')?.focus();
  }
  function closeEditor(){$('#editor-modal').classList.add('hidden');editorSave=null;}
  function refreshSubcategoryList(){state.subcategories=[...new Set(Object.values(state.subcategoriesByCategory).flat())].sort();}
  function backup(filename='daybook-backup.json',notify=true){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);if(notify)toast('Your private backup is ready to save.');
  }
  function restoreFile(file){
    if(!file)return;if(!window.confirm('Replace the Daybook data in this browser with the selected backup?'))return;const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(reader.result);if(!Array.isArray(d.transactions)||!Array.isArray(d.accounts))throw new Error('Invalid');const previous=state;state={...seed,...d,subcategoriesByCategory:d.subcategoriesByCategory||JSON.parse(JSON.stringify(seed.subcategoriesByCategory||{}))};if(!save()){state=previous;render();return;}selectedMonth='all';render();toast('Your backup has been restored.');}catch{toast('That file could not be opened as a Daybook backup.');}};reader.readAsText(file);
  }
  function editAccount(accountName){
    const account=state.accounts.find(a=>a.name===accountName);if(!account)return;
    openEditor('Edit account',[{key:'name',label:'Account name'},{key:'type',label:'Account type',type:'select',options:[{value:'Bank',label:'Bank account'},{value:'Card',label:'Credit card'},{value:'Cash',label:'Cash or wallet'},{value:'Emergency Fund',label:'Emergency fund'},{value:'Fixed Deposit',label:'Fixed deposit'}]},{key:'openingBalance',label:'Opening balance',type:'number',hint:'Enter a negative value when you owe on a credit card.'}],account,values=>{
      const name=values.name.trim();if(!name)return false;if(state.accounts.some(a=>a!==account&&a.name.toLowerCase()===name.toLowerCase())){toast('That account name is already in use.');return false;}
      const old=account.name;account.name=name;account.type=values.type;account.openingBalance=Number(values.openingBalance)||0;if(old!==name)state.transactions.forEach(t=>{if(t.account===old)t.account=name;});return true;
    });
  }
  function addAccount(){
    openEditor('Add an account',[{key:'name',label:'Account name'},{key:'type',label:'Account type',type:'select',options:[{value:'Bank',label:'Bank account'},{value:'Card',label:'Credit card'},{value:'Cash',label:'Cash or wallet'},{value:'Emergency Fund',label:'Emergency fund'},{value:'Fixed Deposit',label:'Fixed deposit'}]},{key:'openingBalance',label:'Opening balance',type:'number',hint:'Enter a negative value when you owe on a credit card.'}],{type:'Bank',openingBalance:0},values=>{
      const name=values.name.trim();if(!name||state.accounts.some(a=>a.name.toLowerCase()===name.toLowerCase())){toast('Enter a new account name.');return false;}state.accounts.push({name,type:values.type,openingBalance:Number(values.openingBalance)||0});return true;
    });
  }
  function editBudgetCategory(category){
    openEditor('Edit budget category',[{key:'name',label:'Expense category',hint:'Past expenses in this category will follow its new name.'},{key:'budget',label:'Monthly budget',type:'number',min:0}],{name:category.name,budget:category.budget},values=>{
      const name=values.name.trim();if(!name||state.expenseCategories.some(c=>c!==category&&c.name.toLowerCase()===name.toLowerCase())||state.incomeCategories.some(c=>c.toLowerCase()===name.toLowerCase())||state.transferCategories.some(c=>c.toLowerCase()===name.toLowerCase())){toast('Enter a unique category name.');return false;}
      const old=category.name;category.name=name;category.budget=Number(values.budget)||0;
      if(old!==name){const subs=state.subcategoriesByCategory[old]||[];delete state.subcategoriesByCategory[old];state.subcategoriesByCategory[name]=subs;state.transactions.forEach(t=>{if(t.type==='Expense'&&t.category===old)t.category=name;});if(expandedCategories.delete(old))expandedCategories.add(name);}return true;
    });
  }
  function addBudgetCategory(){
    openEditor('Add expense category',[{key:'name',label:'Expense category'},{key:'budget',label:'Monthly budget',type:'number',min:0}],{budget:0},values=>{
      const name=values.name.trim();if(!name||state.expenseCategories.some(c=>c.name.toLowerCase()===name.toLowerCase())||state.incomeCategories.some(c=>c.toLowerCase()===name.toLowerCase())||state.transferCategories.some(c=>c.toLowerCase()===name.toLowerCase())){toast('Enter a new category name.');return false;}state.expenseCategories.push({name,budget:Number(values.budget)||0});state.subcategoriesByCategory[name]=[];return true;
    });
  }
  function addTransferCategory(){
    openEditor('Add transfer category',[{key:'name',label:'Transfer category',hint:'For example, Autopay or a bank transfer.'}],{},values=>{
      const name=values.name.trim();if(!name||state.transferCategories.some(c=>c.toLowerCase()===name.toLowerCase())||state.expenseCategories.some(c=>c.name.toLowerCase()===name.toLowerCase())||state.incomeCategories.some(c=>c.toLowerCase()===name.toLowerCase())){toast('Enter a new category name.');return false;}
      state.transferCategories.push(name);setType('Transfer');$('#form-category').value=name;return true;
    });
  }
  function editSubcategory(fromCategory,fromName,toCategory=fromCategory,toName=fromName){
    openEditor(fromName?'Edit expense subcategory':'Add expense subcategory',[{key:'name',label:'Subcategory name'},{key:'category',label:'Expense category',type:'select',hint:fromName?'Past transactions using this subcategory will move with it.':'Choose the budget category it belongs under.',options:state.expenseCategories.map(c=>({value:c.name,label:c.name}))}],{name:toName,category:toCategory},values=>{
      const name=values.name.trim(),category=values.category;if(!name||!category)return false;
      if((state.subcategoriesByCategory[category]||[]).some(s=>s.toLowerCase()===name.toLowerCase()&&!(category===fromCategory&&s===fromName))){toast('That subcategory is already under this category.');return false;}
      if(fromName){state.subcategoriesByCategory[fromCategory]=(state.subcategoriesByCategory[fromCategory]||[]).filter(s=>s!==fromName);}
      state.subcategoriesByCategory[category]||=[];if(!state.subcategoriesByCategory[category].includes(name))state.subcategoriesByCategory[category].push(name);
      if(fromName)state.transactions.forEach(t=>{if(t.type==='Expense'&&t.category===fromCategory&&t.subcategory===fromName){t.category=category;t.subcategory=name;}});
      refreshSubcategoryList();return true;
    });
  }
  $('#editor-form').addEventListener('submit',e=>{
    e.preventDefault();if(!editorSave)return;const values=Object.fromEntries(new FormData(e.currentTarget).entries()),before=JSON.stringify(state);
    if(editorSave(values)===false)return;if(!save()){state=JSON.parse(before);render();return;}closeEditor();render();toast('Your changes are saved.');
  });
  $$('.nav-item').forEach(n=>n.addEventListener('click',()=>setPage(n.dataset.page)));
  $$('[data-goto]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.goto)));
  $('#month-picker').addEventListener('change',e=>{selectedMonth=e.target.value;render();});
  $$('.month-select-synced').forEach(s=>s.addEventListener('change',e=>{selectedMonth=e.target.value;render();}));
  document.addEventListener('click',e=>{if(!e.target.closest('.month-picker'))$$('.month-picker.open').forEach(p=>{p.classList.remove('open');p.querySelector('.month-picker-trigger')?.setAttribute('aria-expanded','false');});});
  $('#add-transaction').addEventListener('click',()=>openModal());$('#add-transaction-list').addEventListener('click',()=>openModal());
  $('#add-transfer-category').addEventListener('click',addTransferCategory);
  $('#export-transactions').addEventListener('click',()=>{$('#export-all-dates').checked=false;$('#export-from-date').value='';$('#export-to-date').value='';setExportDateMode();$('#export-modal').classList.remove('hidden');});
  $('#export-close').addEventListener('click',closeExport);$('#export-cancel').addEventListener('click',closeExport);
  $('#export-modal').addEventListener('click',e=>{if(e.target.id==='export-modal')closeExport();});
  $('#export-all-dates').addEventListener('change',setExportDateMode);
  $('#export-form').addEventListener('submit',e=>{e.preventDefault();downloadTransactions($('#export-from-date').value,$('#export-to-date').value,$('#export-all-dates').checked);});
  $('#modal-close').addEventListener('click',closeModal);$('#modal-cancel').addEventListener('click',closeModal);
  $('#transaction-modal').addEventListener('click',e=>{if(e.target.id==='transaction-modal')closeModal();});
  $$('.type-tab').forEach(b=>b.addEventListener('click',()=>setType(b.dataset.type)));
  $('#form-category').addEventListener('change',renderSubcategoryOptions);
  $('#form-account-from').addEventListener('change',()=>{const from=$('#form-account-from').value,to=$('#form-account-to');for(const o of to.options)o.disabled=o.value===from;if(to.value===from){const other=[...to.options].find(o=>!o.disabled);if(other)to.value=other.value;}});
  $('#transaction-form').addEventListener('submit',e=>{
    e.preventDefault();const type=$('#form-type').value,amountText=$('#form-amount').value,rawAmount=Number(amountText);
    if(!['Expense','Income','Transfer'].includes(type)){toast('Choose Expense, Income, or Transfer before saving.');$$('.type-tab')[0].focus();return;}
    if(!/^\d+(\.\d{1,2})?$/.test(amountText)||!Number.isFinite(rawAmount)||rawAmount<=0){toast('Enter a positive amount using numbers only.');$('#form-amount').focus();return;}
    const time=readTimeControls();if(!time){toast('Enter a valid time, then choose AM or PM.');$('#form-time-hour').focus();return;}
    if(type==='Transfer'&&$('#form-account-from').value===$('#form-account-to').value){toast('Choose two different accounts for a transfer.');return;}
    const common={date:$('#form-date').value,time,description:$('#form-description').value.trim(),type,category:$('#form-category').value,subcategory:$('#form-subcategory').value,notes:$('#form-notes').value.trim()};
    if(!common.date||!common.description||!rawAmount)return;
    const before=JSON.stringify(state);let message;
    // Only update a row that is still present in the saved transaction list.
    // A stale editor reference must never turn a new entry into an edit.
    if(editingTransaction&&!state.transactions.includes(editingTransaction))editingTransaction=null;
    if(editingTransaction){
      const old=editingTransaction,wasTransfer=Boolean(old.pairId),base=old.pairId||old.id;state.transactions=state.transactions.filter(t=>wasTransfer?t.pairId!==old.pairId:t.id!==old.id);
      if(type==='Transfer'){const pairId=wasTransfer?old.pairId:`${base}-transfer-${Date.now()}`;state.transactions.push({...common,id:`${pairId}-out`,pairId,amount:-rawAmount,account:$('#form-account-from').value},{...common,id:`${pairId}-in`,pairId,amount:rawAmount,account:$('#form-account-to').value});message='Both sides of the transfer were updated.';}
      else{state.transactions.push({...old,...common,id:wasTransfer?`${base}-edited-${Date.now()}`:old.id,pairId:undefined,amount:rawAmount,account:$('#form-account').value});message=wasTransfer?'Transfer changed to a single transaction.':'Transaction updated.';}
    }else{const id=newTransactionId();const entries=type==='Transfer'?[{...common,id:`${id}-out`,pairId:id,amount:-rawAmount,account:$('#form-account-from').value},{...common,id:`${id}-in`,pairId:id,amount:rawAmount,account:$('#form-account-to').value}]:[{...common,id,amount:rawAmount,account:$('#form-account').value}];state.transactions.push(...entries);message=type==='Transfer'?'Transfer added to both accounts.':'Transaction added.';}
    if(!save()){state=JSON.parse(before);render();return;}selectedMonth=monthKey(common.date);render();closeModal();toast(message);
  });
  $('#form-amount').addEventListener('input',e=>{let value=e.target.value.replace(/[^\d.]/g,'');const dot=value.indexOf('.');if(dot!==-1)value=value.slice(0,dot+1)+value.slice(dot+1).replace(/\./g,'').slice(0,2);e.target.value=value;});
  $('#transaction-search').addEventListener('input',renderTransactions);$('#type-filter').addEventListener('change',renderTransactions);$('#category-filter').addEventListener('change',renderTransactions);
  document.addEventListener('click',e=>{
    const btn=e.target instanceof Element?e.target.closest('[data-edit-account],[data-delete-account],[data-edit-category],[data-delete-category],[data-edit-subcategory],[data-delete-subcategory]'):null;if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(btn.hasAttribute('data-edit-account')){editAccount(btn.dataset.editAccount);return;}
    if(btn.hasAttribute('data-delete-account')){const n=btn.dataset.deleteAccount;if(state.transactions.some(t=>t.account===n)){toast('This account has transactions. Move or delete them before removing the account.');return;}confirmInApp(`Delete ${n}?`,()=>{const before=JSON.stringify(state);state.accounts=state.accounts.filter(a=>a.name!==n);if(!save()){state=JSON.parse(before);render();return;}render();});return;}
    if(btn.hasAttribute('data-edit-category')){const category=state.expenseCategories.find(c=>c.name===btn.dataset.editCategory);if(category)editBudgetCategory(category);return;}
    if(btn.hasAttribute('data-delete-category')){const n=btn.dataset.deleteCategory;if(state.transactions.some(t=>t.type==='Expense'&&t.category===n)){toast('Delete or recategorize its transactions first.');return;}confirmInApp(`Delete the ${n} budget category and its subcategories?`,()=>{const before=JSON.stringify(state);state.expenseCategories=state.expenseCategories.filter(c=>c.name!==n);delete state.subcategoriesByCategory[n];if(!save()){state=JSON.parse(before);render();return;}render();toast('Budget category deleted.');});return;}
    const [category,subcategory]=(btn.dataset.editSubcategory||btn.dataset.deleteSubcategory||'').split('|');
    if(btn.hasAttribute('data-edit-subcategory')){editSubcategory(category,subcategory);return;}
    if(btn.hasAttribute('data-delete-subcategory')){confirmInApp(`Delete ${subcategory}? Existing transactions will keep their category and lose only this subcategory label.`,()=>{const before=JSON.stringify(state);state.subcategoriesByCategory[category]=(state.subcategoriesByCategory[category]||[]).filter(s=>s!==subcategory);state.transactions.forEach(t=>{if(t.type==='Expense'&&t.category===category&&t.subcategory===subcategory)t.subcategory='';});refreshSubcategoryList();if(!save()){state=JSON.parse(before);render();return;}render();});}
  },true);
  $('#budget-cards').addEventListener('click',e=>{
    const toggle=e.target.closest('[data-expand-category]');if(toggle){const n=toggle.dataset.expandCategory;expandedCategories.has(n)?expandedCategories.delete(n):expandedCategories.add(n);renderBudgets();return;}
    const edit=e.target.closest('[data-edit-category]');if(edit){const c=state.expenseCategories.find(x=>x.name===edit.dataset.editCategory);if(c)editBudgetCategory(c);return;}
    const delcat=e.target.closest('[data-delete-category]');if(delcat){const n=delcat.dataset.deleteCategory;if(state.transactions.some(t=>t.type==='Expense'&&t.category===n)){toast('Delete or recategorize its transactions first.');return;}if(!confirm(`Delete the ${n} budget category and its subcategories?`))return;const before=JSON.stringify(state);state.expenseCategories=state.expenseCategories.filter(c=>c.name!==n);delete state.subcategoriesByCategory[n];if(!save()){state=JSON.parse(before);return;}render();toast('Budget category deleted.');return;}
    const delsub=e.target.closest('[data-delete-subcategory]');if(delsub){const [cat,sub]=delsub.dataset.deleteSubcategory.split('|');if(!confirm(`Delete ${sub}? Existing transactions will keep their category and lose only this subcategory label.`))return;const before=JSON.stringify(state);state.subcategoriesByCategory[cat]=(state.subcategoriesByCategory[cat]||[]).filter(s=>s!==sub);state.transactions.forEach(t=>{if(t.type==='Expense'&&t.category===cat&&t.subcategory===sub)t.subcategory='';});refreshSubcategoryList();if(!save()){state=JSON.parse(before);return;}render();return;}
    const add=e.target.closest('[data-add-subcategory]');if(add){editSubcategory('', '', add.dataset.addSubcategory, '');return;}
    const sub=e.target.closest('[data-edit-subcategory]');if(sub){const [cat,name]=sub.dataset.editSubcategory.split('|');editSubcategory(cat,name);}
  });
  $('#add-category-button').addEventListener('click',addBudgetCategory);
  $('#account-groups').addEventListener('click',e=>{const d=e.target.closest('[data-delete-account]');if(d){const n=d.dataset.deleteAccount;if(state.transactions.some(t=>t.account===n)){toast('This account has transactions. Move or delete them before removing the account.');return;}if(!confirm(`Delete ${n}?`))return;const before=JSON.stringify(state);state.accounts=state.accounts.filter(a=>a.name!==n);if(!save()){state=JSON.parse(before);return;}render();return;}const b=e.target.closest('[data-edit-account]');if(b)editAccount(b.dataset.editAccount);});
  $('#add-account-button').addEventListener('click',addAccount);
  $('#editor-close').addEventListener('click',closeEditor);$('#editor-cancel').addEventListener('click',closeEditor);
  $('#editor-modal').addEventListener('click',e=>{if(e.target.id==='editor-modal')closeEditor();});
  $('#backup-button').addEventListener('click',()=>backup());$('#backup-top').addEventListener('click',()=>backup());
  $('#restore-button').addEventListener('click',()=>$('#restore-file').click());$('#restore-top').addEventListener('click',()=>$('#restore-file').click());
  $('#reset-top').addEventListener('click',()=>{
    if(!window.confirm('A dated JSON backup will download first. Then all transactions will be cleared and account balances reset to zero. Account names, categories, subcategories, and budget limits will stay. Continue?'))return;
    backup(`daybook-before-reset-${new Date().toISOString().replace(/[:.]/g,'-')}.json`,false);
    const previous=state;state={...previous,userName:'',transactions:[],accounts:previous.accounts.map(a=>({...a,openingBalance:0}))};selectedMonth='all';if(!save()){state=previous;return;}render();setPage('overview');askName();toast('A backup was downloaded. Your tracker is ready to start fresh.');
  });
  $('#restore-file').addEventListener('change',e=>{const file=e.target.files[0];e.target.value='';restoreFile(file);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeEditor();$('#confirm-modal').classList.add('hidden');}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){e.preventDefault();openModal();}});
  $('#name-form').addEventListener('submit',e=>{e.preventDefault();const n=$('#name-input').value.trim();if(!n)return;const previous=state;state.userName=n;if(!save()){state=previous;return;}$('#name-modal').classList.add('hidden');render();});
  render();askName();
})();
