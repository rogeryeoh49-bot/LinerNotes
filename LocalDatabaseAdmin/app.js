const schemas = {
  artists: { title:'艺人 Artists', fields:[['name','艺人名','text'],['avatar_url','头像 URL','url'],['bio','简介','textarea']] },
  albums: { title:'专辑 Albums', fields:[['title','专辑名','text'],['artist_id','艺人','artist'],['release_year','年份','number'],['genre','风格','text'],['cover_url','封面 URL','url'],['bg_color','背景色 HEX','text'],['album_detail','专辑介绍','textarea']] },
  songs: { title:'歌曲 Songs', fields:[['title','歌名','text'],['album_id','所属专辑','album'],['track_number','曲序','number'],['duration','时长/秒','number'],['apple_music_url','Apple Music URL','url'],['song_info','歌曲介绍','textarea']] },
  samples: { title:'采样 Samples', fields:[['song_id','对应歌曲','song'],['sample_source','采样来源 / 被采样歌曲','text'],['timestamp_in_song','出现在歌曲中的时间/秒','number'],['apple_music_embed_url','Apple Music Embed URL','url'],['audio_url','音频 URL','url'],['video_url','视频 URL','url']] }
};
let db = {artists:[],albums:[],songs:[],samples:[]};
let table = 'artists';
let editingId = null;
const $ = id => document.getElementById(id);
async function api(path, opts){ const r = await fetch(path, opts); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function load(){ db = await api('/api/db'); renderTabs(); renderForm(); renderList(); }
function labelFor(t,id){ const x=(db[t]||[]).find(i=>Number(i.id)===Number(id)); return x ? `${x.id} · ${x.name||x.title||x.sample_source}` : ''; }
function renderTabs(){ $('tabs').innerHTML = Object.keys(schemas).map(k=>`<button class="tab ${k===table?'active':''}" data-t="${k}">${schemas[k].title}<div class="mini">${db[k].length} 条</div></button>`).join(''); document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{table=b.dataset.t; editingId=null; $('q').value=''; renderTabs(); renderForm(); renderList();}); }
function inputHtml(name,label,type,val=''){
  if(type==='textarea') return `<label>${label}</label><textarea name="${name}">${val??''}</textarea>`;
  if(['artist','album','song'].includes(type)) { const map={artist:'artists',album:'albums',song:'songs'}; return `<label>${label}</label><select name="${name}"><option value="">-- 选择 --</option>${db[map[type]].map(x=>`<option value="${x.id}" ${Number(val)===Number(x.id)?'selected':''}>${x.id} · ${x.name||x.title}</option>`).join('')}</select>`; }
  return `<label>${label}</label><input name="${name}" type="${type}" value="${val??''}">`;
}
function renderForm(item={}){ $('formTitle').textContent = (editingId?'编辑 ':'新建 ') + schemas[table].title; $('form').innerHTML = schemas[table].fields.map(f=>inputHtml(f[0],f[1],f[2],item[f[0]])).join(''); }
function summary(t,x){
  if(t==='artists') return [x.name, x.bio].filter(Boolean);
  if(t==='albums') return [x.title, labelFor('artists',x.artist_id), x.release_year, x.genre].filter(Boolean);
  if(t==='songs') return [x.title, labelFor('albums',x.album_id), x.track_number?`Track ${x.track_number}`:''].filter(Boolean);
  return [x.sample_source, labelFor('songs',x.song_id), x.timestamp_in_song!=null?`${x.timestamp_in_song}s`:'' ].filter(Boolean);
}
function renderList(){ const q=$('q').value.trim().toLowerCase(); $('listTitle').textContent = schemas[table].title; let arr=db[table]||[]; if(q) arr=arr.filter(x=>JSON.stringify(x).toLowerCase().includes(q)); $('list').innerHTML = arr.map(x=>`<div class="item"><div><div class="title">#${x.id} ${summary(table,x)[0]||'(无标题)'}</div><div class="meta">${summary(table,x).slice(1).join(' · ')}</div><span class="pill">${table}</span></div><div class="actions"><button class="secondary" data-edit="${x.id}">编辑</button><button class="secondary danger" data-del="${x.id}">删除</button></div></div>`).join('') || '<div class="meta">暂无数据</div>'; document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editingId=Number(b.dataset.edit); renderForm(db[table].find(x=>Number(x.id)===editingId)); window.scrollTo(0,0);}); document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ if(confirm('确定删除？')){ await api(`/api/${table}/${b.dataset.del}`,{method:'DELETE'}); await load(); }}); }
$('save').onclick = async e => { e.preventDefault(); const fd = new FormData($('form')); const obj = Object.fromEntries(fd.entries()); await api(`/api/${table}${editingId?'/'+editingId:''}`,{method:editingId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)}); editingId=null; await load(); };
$('reset').onclick = e => { e.preventDefault(); editingId=null; renderForm(); };
$('q').oninput = renderList;
$('download').onclick = () => { const blob = new Blob([JSON.stringify(db,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='linernotes-database.json'; a.click(); };
load().catch(e=>alert(e.message));
