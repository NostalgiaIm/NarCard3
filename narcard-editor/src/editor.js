/* ================= 工具 ================= */

const isTauri = Boolean(window.__TAURI_INTERNALS__);
let tauriInvokePromise = null;

/**
 * 调用 Tauri Rust 命令，统一处理桌面模式下的 IPC。
 * @param {string} command - Rust command 名称
 * @param {object} args - 传给 Rust command 的参数
 * @returns {Promise<unknown>} Rust command 返回值
 */
async function tInvoke(command, args) {
  if (!isTauri) throw new Error('当前不是 Tauri 桌面模式');

  if (!tauriInvokePromise) {
    tauriInvokePromise = import('@tauri-apps/api/core').then(module => module.invoke);
  }

  const invoke = await tauriInvokePromise;
  return invoke(command, args || {});
}

let tauriDialogPromise = null;

/**
 * 在 Tauri 桌面模式下打开目录选择器。
 * @param {string} title - 对话框标题
 * @returns {Promise<string|null>} 用户选择的目录路径
 */
async function tChooseDirectory(title) {
  if (!isTauri) throw new Error('当前不是 Tauri 桌面模式');

  if (!tauriDialogPromise) {
    tauriDialogPromise = import('@tauri-apps/plugin-dialog').then(module => module.open);
  }

  const open = await tauriDialogPromise;
  return open({
    directory: true,
    multiple: false,
    title: title || '选择目录'
  });
}

const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.prototype.slice.call((r||document).querySelectorAll(s));
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function jsStr(s){return "'"+String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,'\\n')+"'";}
function slugify(s){return String(s||'').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,'-').replace(/^-+|-+$/g,'')||'untitled';}
function uniqueList(list){const seen=new Set();const out=[];(list||[]).forEach(function(item){const v=String(item||'').trim();const k=v.toLowerCase();if(!v||seen.has(k))return;seen.add(k);out.push(v);});return out;}
function splitTags(v){return uniqueList(String(v||'').split(',').map(s=>s.trim()));}
function toast(msg,isErr){const t=$('#toast');t.textContent=msg;t.classList.toggle('err',!!isErr);t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),2200);}
function copyText(text){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);return new Promise((res,rej)=>{try{const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();res();}catch(e){rej(e);}});}

/* ================= 语法高亮 ================= */
const NUM='\\b\\d+(?:\\.\\d+)?\\b';
const S_DQ='"(?:[^"\\\\\\n]|\\\\.)*"';
const S_SQ="'(?:[^'\\\\\\n]|\\\\.)*'";
const S_BT='`(?:[^`\\\\]|\\\\.)*`';
const S_SLASH='\\/(?:[^\\/\\\\\\n]|\\\\.)+\\/[gimsuy]*';
const C_LINE='\\/\\/[^\\n]*';
const C_BLOCK='\\/\\*[\\s\\S]*?\\*\\/';
const H_LINE='#[^\\n]*';
const D_LINE='(?:^|(?<=\\s))--[^\\n]*';
const H_HTML='<!--[\\s\\S]*?-->';
const C_STRINGS=[S_DQ,S_SQ];
const C_KEYWORDS='abstract|as|assert|async|await|bool|boolean|break|byte|case|catch|char|class|const|constructor|continue|debugger|default|delegate|delete|do|double|dynamic|else|enum|event|explicit|export|extends|extern|false|final|finally|fixed|float|for|foreach|from|func|function|get|goto|if|implements|implicit|import|in|inline|instanceof|int|interface|internal|is|lambda|let|lock|long|namespace|native|new|null|nullptr|number|object|operator|out|override|package|params|private|protected|public|readonly|ref|register|return|sealed|set|short|signed|sizeof|static|strictfp|string|struct|super|switch|synchronized|this|throw|throws|transient|true|try|typedef|typeof|uint|ulong|union|unknown|unsafe|ushort|using|var|virtual|void|volatile|when|where|while|with|yield|None|True|False|and|or|not|elif|def|pass|raise|except|global|nonlocal|del|print|self';
const LANGS={};
function regLang(names,cfg){const kw=cfg.keywords;names.split(/\s+/).forEach(function(n){if(!n)return;const rules=[];if(cfg.heredoc)rules.push(cfg.heredoc);if(cfg.block)rules.push([cfg.block,'tok-cm']);if(cfg.line)rules.push([cfg.line,'tok-cm']);if(cfg.strings)cfg.strings.forEach(s=>rules.push([s,'tok-str']));if(cfg.macros)rules.push(cfg.macros);if(cfg.types)rules.push(['\\b(?:'+cfg.types+')\\b','tok-var']);if(kw)rules.push(['\\b(?:'+kw+')\\b','tok-kw']);if(cfg.builtins)rules.push(['\\b(?:'+cfg.builtins+')\\b','tok-fn']);if(cfg.attr)rules.push(cfg.attr);if(cfg.prop)rules.push(cfg.prop);if(cfg.special)cfg.special.forEach(s=>rules.push(s));if(cfg.num!==false)rules.push([NUM,'tok-num']);if(cfg.funcCall)rules.push([cfg.funcCall,'tok-fn']);LANGS[n]=rules.map(r=>({re:new RegExp(r[0],'y'),cls:r[1]}));});}
const C_LIKE={block:C_BLOCK,line:C_LINE,strings:C_STRINGS,keywords:C_KEYWORDS,funcCall:'[A-Za-z_$][\\w$]*(?=\\s*\\()'};
regLang('c cpp c++ cc h hpp objectivec objc arduino',Object.assign({},C_LIKE,{macros:['#\\s*\\w+','tok-kw'],strings:C_STRINGS.concat(['<[\\w./]+>'])}));
regLang('java kotlin scala groovy',Object.assign({},C_LIKE,{attr:['@\\w+','tok-var']}));
regLang('csharp cs',Object.assign({},C_LIKE,{builtins:'Console|String|List|Dictionary|Task|Math'}));
regLang('javascript js mjs cjs jsx',Object.assign({},C_LIKE,{strings:[S_BT,S_DQ,S_SQ],special:[[S_SLASH,'tok-str']],builtins:'console|window|document|Math|JSON|Object|Array|Promise|Map|Set|Date|String|Number|Boolean'}));
regLang('typescript ts tsx',Object.assign({},C_LIKE,{strings:[S_BT,S_DQ,S_SQ],special:[[S_SLASH,'tok-str']],keywords:C_KEYWORDS+'|type|interface|enum|namespace|declare|readonly|keyof|infer|satisfies|never|any|void',builtins:'console|window|document|Promise|Record|Partial|Pick|Omit|Array'}));
regLang('python py python3',{line:H_LINE,strings:[S_DQ,S_SQ,'"""[\\s\\S]*?"""',"'''[\\s\\S]*?'''"],keywords:'and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield|match|case|self',builtins:'print|len|range|str|int|float|list|dict|set|tuple|open|enumerate|zip|map|filter|sum|min|max|abs|sorted|isinstance|type|super|__init__',prop:['@\\w+','tok-var']});
regLang('rust rs',{block:C_BLOCK,line:C_LINE,strings:C_STRINGS,keywords:'as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while|union',builtins:'String|Vec|Option|Result|Some|None|Ok|Err|Box|Rc|Arc|println|print|format|vec|panic|assert'});
regLang('go golang',{block:C_BLOCK,line:C_LINE,strings:[S_DQ,S_BT],keywords:'break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var|nil|true|false|iota',builtins:'make|len|cap|append|copy|delete|new|panic|recover|print|println|error|string|int|int64|float64|bool|byte|rune'});
regLang('bash sh shell zsh fish ksh',{line:H_LINE,strings:[S_DQ,S_SQ],keywords:'if|then|else|elif|fi|for|while|until|do|done|case|esac|function|in|select|return|exit|break|continue|local|export|readonly|source|set|unset|eval|exec|test|cd|ls|pwd|echo|printf|cat|grep|sed|awk|find|xargs|mkdir|rmdir|touch|cp|mv|rm|ln|chmod|chown|tar|gzip|curl|wget|git|sudo',special:[['\\$\\{[^}]*\\}|\\$[\\w@*#?$!-]+','tok-var'],['-{1,2}[A-Za-z][\\w-]*','tok-fn']]});
regLang('yaml yml',{line:H_LINE,strings:[S_DQ,S_SQ],special:[['^[ \\t]*[\\w.-]+(?=\\s*:)','tok-kw'],['\\b(true|false|null|yes|no|on|off)\\b','tok-kw']],num:false});
regLang('json jsonc',{line:C_LINE,block:C_BLOCK,strings:[S_DQ],keywords:'true|false|null',special:[['"[^"]*"(?=\\s*:)','tok-fn']]});
regLang('html htm xml svg vue svelte astro',{block:H_HTML,strings:[S_DQ,S_SQ],special:[['</?[A-Za-z][\\w:.-]*','tok-kw'],['/?>','tok-kw'],['[A-Za-z-:]+(?==)','tok-fn']],num:false});
regLang('css scss sass less',{block:C_BLOCK,line:C_LINE,strings:[S_DQ,S_SQ],special:[['@[\\w-]+','tok-kw'],['#[0-9a-fA-F]{3,8}\\b','tok-num'],['\\$[\\w-]+|--[\\w-]+','tok-var'],['[-a-zA-Z]+(?=\\s*:)','tok-fn']]});
regLang('sql',{line:D_LINE,block:C_BLOCK,strings:[S_SQ,S_DQ],keywords:'SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|AND|OR|NOT|NULL|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|DISTINCT|COUNT|SUM|AVG|MIN|MAX|IN|EXISTS|BETWEEN|LIKE|IS',num:false});
regLang('markdown md mdx',{special:[['^#{1,6}[^\\n]*','tok-kw'],['^\\s*(?:[-*+]|\\d+\\.)\\s','tok-var'],['```[\\s\\S]*?```|`[^`]*`','tok-str'],['^>.*$','tok-cm'],['\\*\\*[^*]+\\*\\*|__[^_]+__','tok-fn'],['\\[[^\\]]*\\]\\([^)]*\\)','tok-fn']],num:false});
regLang('dockerfile docker',{line:H_LINE,strings:[S_DQ,S_SQ],special:[['^[ \\t]*(?:FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|HEALTHCHECK)\\b','tok-kw'],['\\$\\{?\\w+\\}?','tok-var']],num:false});
regLang('plaintext text txt log',{num:false});
regLang('toml ini cfg conf',{line:H_LINE,strings:[S_DQ,S_SQ],special:[['^[ \\t]*\\[[^\\]]+\\]','tok-kw'],['^[ \\t]*[\\w.-]+(?=\\s*=)','tok-fn']],num:false});
regLang('php',{block:C_BLOCK,line:C_LINE+'|#[^\\n]*',strings:C_STRINGS,keywords:'function|class|public|private|protected|static|const|new|return|if|else|elseif|foreach|for|while|do|switch|case|break|continue|try|catch|finally|throw|echo|print|require|include|namespace|use|extends|implements|interface|trait|abstract|final|as|true|false|null|this|array',special:[['\\$\\w+','tok-var'],['->\\w+|::\\w+','tok-fn']]});
regLang('ruby rb',{line:H_LINE,strings:[S_DQ,S_SQ],keywords:'def|end|class|module|if|else|elsif|unless|while|until|for|in|do|begin|rescue|ensure|return|yield|block_given|require|include|extend|attr_accessor|attr_reader|attr_writer|true|false|nil|self|super|new',special:[['@@?\\w+','tok-var'],[':\\w+','tok-str']]});
regLang('swift',{block:C_BLOCK,line:C_LINE,strings:[S_DQ],keywords:'func|class|struct|enum|protocol|extension|let|var|if|else|guard|switch|case|default|for|in|while|repeat|return|break|continue|import|public|private|internal|fileprivate|open|static|final|override|init|deinit|self|super|nil|true|false|try|catch|throw|throws|as|is|where|inout|mutating|nonmutating|lazy|weak|unowned',num:false});
regLang('lua',{line:'--[^\\n]*',block:'--\\[\\[[\\s\\S]*?\\]\\]',strings:[S_DQ,S_SQ],keywords:'and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while',builtins:'print|pairs|ipairs|type|tostring|tonumber|table|string|math|io|os|require'});
regLang('r rscript',{line:H_LINE,strings:[S_DQ,S_SQ],keywords:'if|else|repeat|while|function|for|in|next|break|TRUE|FALSE|NULL|Inf|NaN|NA|library|require|return',special:[['<-|->|<<-|->>','tok-kw'],['\\b[a-zA-Z.][\\w.]*(?=\\s*\\()','tok-fn']]});
regLang('julia jl',{line:H_LINE,block:'#=[\\s\\S]*?=#',strings:[S_DQ],keywords:'function|end|if|else|elseif|for|while|begin|let|do|return|break|continue|module|using|import|export|struct|mutable|const|global|local|true|false|nothing',num:false});
regLang('haskell hs',{line:'--[^\\n]*',block:'\\{-[\\s\\S]*?-\\}',strings:[S_DQ],keywords:'data|type|newtype|class|instance|where|let|in|do|if|then|else|case|of|import|module|deriving|return|pure|fmap|map|filter|foldr|foldl|head|tail|length|show|read|putStrLn|print|main',num:false});
regLang('graphql gql',{line:H_LINE,strings:[S_DQ],keywords:'query|mutation|subscription|fragment|on|type|input|interface|union|enum|scalar|schema|directive|extend|implements|true|false|null',special:[['\\$\\w+','tok-var'],['@\\w+','tok-fn']]});
regLang('diff patch',{special:[['^\\+\\+\\+.*$|^---.*$','tok-kw'],['^\\+.*$','tok-str'],['^-.*$','tok-cm'],['^@@.*$','tok-fn']],num:false});
regLang('makefile make mk cmake',{line:H_LINE,strings:[S_DQ,S_SQ],special:[['^[\\w.-]+(?=\\s*:)','tok-kw'],['\\$\\([^)]*\\)|\\$\\{[^}]*\\}','tok-var']],keywords:'ifeq|ifneq|ifdef|ifndef|else|endif|include|define|endef|export|unexport|override|vpath',num:false});
regLang('kotlin',Object.assign({},C_LIKE,{attr:['@\\w+','tok-var'],keywords:C_KEYWORDS+'|fun|val|var|when|object|companion|data|sealed|suspend|by|lateinit|init|override|open|abstract|internal|public|private|protected'}));
regLang('scala',Object.assign({},C_LIKE,{keywords:C_KEYWORDS+'|object|trait|case|match|val|var|def|implicit|sealed|abstract|lazy|yield|extends|with'}));
regLang('dart',Object.assign({},C_LIKE,{keywords:C_KEYWORDS+'|late|required|covariant|mixin|extension|factory|typedef|final|var|const'}));
regLang('elixir ex',{line:H_LINE,strings:[S_DQ],keywords:'def|defmodule|defp|defmacro|defstruct|do|end|if|else|unless|case|cond|when|with|fn|for|in|receive|try|catch|rescue|after|raise|import|require|use|alias|true|false|nil',num:false});
regLang('erlang',{line:'%[^\\n]*',strings:[S_DQ],keywords:'module|export|import|record|case|of|end|fun|when|if|true|false|and|or|not|receive|after|try|catch|throw|begin|spawn|self',num:false});
regLang('clojure clj',{line:';[^\\n]*',strings:[S_DQ],keywords:'def|defn|defmacro|let|fn|if|when|unless|cond|case|loop|recur|do|quote|var|set!|ns|require|import|true|false|nil',special:[['\\(|\\[|\\{|\\}|\\)|\\]','tok-var'],[':[\\w.-]+','tok-kw']],num:false});
regLang('protobuf proto',{line:C_LINE,block:C_BLOCK,strings:[S_DQ,S_SQ],keywords:'syntax|package|import|option|message|enum|service|rpc|returns|repeated|optional|required|reserved|oneof|map|stream|true|false',builtins:'double|float|int32|int64|uint32|uint64|bool|string|bytes'});
regLang('terraform tf hcl',{line:H_LINE,block:C_BLOCK,strings:[S_DQ],keywords:'resource|data|variable|output|module|provider|terraform|locals|true|false|null|for|in|if',special:[['\\b[a-z_]+(?=\\s*=)','tok-fn']],num:false});
regLang('vim vimscript',{line:'"[^\\n]*',strings:[S_SQ,S_DQ],keywords:'let|set|setlocal|if|else|elseif|endif|for|endfor|in|while|endwhile|function|endfunction|return|call|echo|echom|map|nmap|vmap|imap|nnoremap|vnoremap|inoremap|command|autocmd|augroup|syntax|highlight|silent|try|catch|finally|throw',special:[['&\\w+|[bgwtlsav]:\\w+','tok-var']],num:false});
regLang('nim',Object.assign({},C_LIKE,{keywords:C_KEYWORDS+'|proc|func|method|iterator|template|macro|type|var|let|const|if|elif|else|when|case|of|for|while|block|try|except|finally|raise|discard|echo|true|false|nil'}));
regLang('zig',Object.assign({},C_LIKE,{keywords:C_KEYWORDS+'|pub|const|var|fn|struct|enum|union|error|test|defer|errdefer|comptime|inline|export|extern|usingnamespace|async|await|suspend|resume|nosuspend|orelse|catch|try|if|else|while|for|switch|break|continue|return|unreachable|and|or|true|false|null|undefined'}));
regLang('fortran f90 f95',{line:'![^\\n]*',strings:[S_DQ,S_SQ],keywords:'program|module|subroutine|function|end|if|then|else|elseif|do|while|select|case|call|return|contains|use|implicit|none|integer|real|complex|character|logical|parameter|dimension|allocate|deallocate|print|write|read|format',num:false});
regLang('matlab octave',{line:'%[^\\n]*',strings:[S_DQ,S_SQ],keywords:'function|end|if|else|elseif|for|while|switch|case|otherwise|try|catch|break|continue|return|global|persistent|clear|clc|close',builtins:'disp|fprintf|sprintf|plot|length|size|zeros|ones|eye|linspace|sum|mean|max|min|abs',num:false});
regLang('assembly asm nasm',{line:'[;#][^\\n]*',strings:[S_DQ,S_SQ],keywords:'mov|push|pop|call|ret|jmp|je|jne|jz|jnz|jg|jl|cmp|test|add|sub|mul|imul|div|idiv|inc|dec|and|or|xor|not|shl|shr|lea|nop|int|syscall|section|global|extern|db|dw|dd|dq|equ|times|org',special:[['%?[re]?[abcd]x|%?[re]?(?:si|di|bp|sp)|%?r\\d+','tok-var']],num:false});
const LANG_ALIASES={shell:'bash',console:'bash',js:'javascript',ts:'typescript',py:'python',rb:'ruby',yml:'yaml',cs:'csharp',rs:'rust',md:'markdown',htm:'html',sh:'bash',zsh:'bash',text:'plaintext',txt:'plaintext',conf:'ini',cfg:'ini'};
function resolveLang(lang){const k=String(lang||'').toLowerCase().trim();if(!k)return null;if(LANGS[k])return LANGS[k];if(LANG_ALIASES[k]&&LANGS[LANG_ALIASES[k]])return LANGS[LANG_ALIASES[k]];const keys=Object.keys(LANGS);for(let i=0;i<keys.length;i++){if(keys[i].split(/\s+/).indexOf(k)!==-1)return LANGS[keys[i]];}return null;}
function highlight(code,lang){
  const rules=resolveLang(lang);if(!rules||!rules.length)return esc(code);
  let out='',i=0;const n=code.length;
  while(i<n){
    let hit=null;
    for(let r=0;r<rules.length;r++){rules[r].re.lastIndex=i;const m=rules[r].re.exec(code);if(m&&m.index===i&&m[0].length){hit={t:m[0],c:rules[r].cls};break;}}
    if(hit){out+='<span class="'+hit.c+'">'+esc(hit.t)+'</span>';i+=hit.t.length;continue;}
    let j=i+1;
    outer:while(j<n){for(let r=0;r<rules.length;r++){rules[r].re.lastIndex=j;const m=rules[r].re.exec(code);if(m&&m.index===j&&m[0].length)break outer;}j++;}
    out+=esc(code.slice(i,j));i=j;
  }
  return out;
}

/* ================= Markdown 解析 ================= */
function isBlockStart(line){return /^\s{0,3}(#{1,6}\s|```|~~~|>\s?|:::[a-zA-Z]|\$\$)/.test(line)||/^\s*([-*+]|\d{1,9}[.)])\s+/.test(line)||/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line);}
function parseMd(src){
  const lines=String(src).replace(/\r\n?/g,'\n').split('\n');const N=lines.length;let i=0;const top=[];const stack=[{blocks:top}];const cur=()=>stack[stack.length-1].blocks;const blank=s=>!s.trim();
  while(i<N){
    const line=lines[i];if(blank(line)){i++;continue;}
    let m=/^(\s*)(`{3,}|~{3,})\s*([^\s`~]*)\s*$/.exec(line);
    if(m){const ch=m[2][0];const len=m[2].length;const lang=m[3]||'';const buf=[];i++;const closeRe=new RegExp('^\\s*'+(ch==='`'?'`':'~')+'{'+len+',}\\s*$');while(i<N&&!closeRe.test(lines[i])){buf.push(lines[i]);i++;}i++;const fenceMath=/^(latex|tex|math|katex)$/i.test(lang);cur().push(fenceMath?{type:'math',tex:buf.join('\n').trim(),display:true}:{type:'code',lang:lang,code:buf.join('\n')});continue;}
    m=/^\s*\$\$(.*?)\$\$\s*$/.exec(line);
    if(m&&m[1].trim()){cur().push({type:'math',tex:m[1].trim(),display:true});i++;continue;}
    if(/^\s*\$\$\s*$/.test(line)){const ml=[];i++;while(i<N&&!/^\s*\$\$\s*$/.test(lines[i])){ml.push(lines[i]);i++;}i++;cur().push({type:'math',tex:ml.join('\n').trim(),display:true});continue;}
    m=/^:::\s*([a-zA-Z]+)\s*(.*)$/.exec(line);
    if(m){const kind=m[1].toLowerCase();const title=m[2].trim();const buf=[];let depth=1;i++;while(i<N){const l=lines[i];if(/^:::\s*[a-zA-Z]/.test(l))depth++;else if(/^:::\s*$/.test(l)){depth--;if(depth<=0){i++;break;}}buf.push(l);i++;if(depth<=0)break;}cur().push({type:'callout',kind:kind,title:title,blocks:parseMd(buf.join('\n'))});continue;}
    m=/^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);if(m){cur().push({type:'heading',level:m[1].length,text:m[2]});i++;continue;}
    if(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)){cur().push({type:'hr'});i++;continue;}
    if(line.indexOf('|')!==-1&&i+1<N&&/^\s*\|?[\s:-]*-[\s:|.-]*\|?\s*$/.test(lines[i+1])&&lines[i+1].indexOf('-')!==-1){
      const splitRow=l=>l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(s=>s.trim());
      const head=splitRow(line);const sep=splitRow(lines[i+1]);
      const align=sep.map(s=>(s.charAt(0)===':'&&s.charAt(s.length-1)===':')?'center':s.charAt(s.length-1)===':'?'right':s.charAt(0)===':'?'left':'');
      i+=2;const rows=[];while(i<N&&lines[i].indexOf('|')!==-1&&lines[i].trim()){rows.push(splitRow(lines[i]));i++;}
      cur().push({type:'table',head:head,align:align,rows:rows});continue;
    }
    if(/^\s{0,3}>\s?/.test(line)){const buf=[];while(i<N&&!blank(lines[i])&&/^\s{0,3}>\s?/.test(lines[i])){buf.push(lines[i].replace(/^\s{0,3}>\s?/,''));i++;}cur().push({type:'quote',blocks:parseMd(buf.join('\n'))});continue;}
    if(/^\s*([-*+]|\d{1,9}[.)])\s+/.test(line)){const items=[];while(i<N){const l=lines[i];if(blank(l)){if(i+1<N&&/^\s*([-*+]|\d{1,9}[.)])\s+/.test(lines[i+1])){i++;continue;}break;}const mm=/^([ \t]*)([-*+]|\d{1,9}[.)])\s+(.*)$/.exec(l);if(!mm){if(items.length){items[items.length-1].text+=' '+l.trim();i++;continue;}break;}const indent=mm[1].replace(/\t/g,'    ').length;const ordered=/^\d/.test(mm[2]);let text=mm[3];let checked=null;const tm=/^\[([ xX])\]\s+(.*)$/.exec(text);if(tm){checked=tm[1].toLowerCase()==='x';text=tm[2];}items.push({indent:indent,ordered:ordered,text:text,checked:checked});i++;}cur().push({type:'list',items:items});continue;}
    if(/^\s*<[a-zA-Z\/!]/.test(line)){const buf=[line];i++;while(i<N&&!blank(lines[i])&&!isBlockStart(lines[i])){buf.push(lines[i]);i++;}cur().push({type:'html',raw:buf.join('\n')});continue;}
    const buf=[line];i++;while(i<N&&!blank(lines[i])&&!isBlockStart(lines[i])){buf.push(lines[i]);i++;}cur().push({type:'para',text:buf.join('\n')});
  }
  return top;
}
const TEX_L='\uE000',TEX_R='\uE001';
function texHtml(tex,display){const body=esc(tex);const cls=display?'tex tex-block':'tex tex-inline';return '<'+(display?'div':'span')+' class="'+cls+'" data-tex="'+esc(tex)+'" data-display="'+(display?'1':'0')+'">'+body+'</'+(display?'div':'span')+'>';}
function protectMath(text){const store=[];let out=text.replace(/\$\$([\s\S]+?)\$\$/g,function(_,tex){store.push({tex:tex.trim(),display:true});return TEX_L+(store.length-1)+TEX_R;});out=out.replace(/\$(?!\s)((?:[^\$\n]*?[^\s\$])?)\$/g,function(_,tex){store.push({tex:tex.trim(),display:false});return TEX_L+(store.length-1)+TEX_R;});return {text:out,store:store};}
function restoreMath(html,store){return html.replace(new RegExp(TEX_L+'(\\d+)'+TEX_R,'g'),function(_,i){const item=store[parseInt(i,10)];return item?texHtml(item.tex,item.display):_;});}
function inlineFmt(s){return esc(s).replace(/\*\*\*([^*]+)\*\*\*/g,'<strong><em>$1</em></strong>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>').replace(/__([^_]+)__/g,'<strong>$1</strong>').replace(/(^|[^_\w])_([^_\n]+)_/g,'$1<em>$2</em>').replace(/~~([^~]+)~~/g,'<del>$1</del>').replace(/==([^=]+)==/g,'<mark>$1</mark>');}
function inline(text){
  const pm=protectMath(text);text=pm.text;
  const re=/(`+)([\s\S]*?)\1|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
  let out='';let last=0;let m;
  while((m=re.exec(text))){
    out+=inlineFmt(text.slice(last,m.index));
    if(m[2]!==undefined){out+='<code>'+esc(m[2])+'</code>';}
    else if(m[4]!==undefined){out+='<img src="'+esc(m[4])+'" alt="'+esc(m[3])+'"'+(m[5]?' title="'+esc(m[5])+'"':'')+' />';}
    else{out+='<a href="'+esc(m[7])+'"'+(m[8]?' title="'+esc(m[8])+'"':'')+'>'+inlineFmt(m[6])+'</a>';}
    last=m.index+m[0].length;
  }
  out+=inlineFmt(text.slice(last));
  return restoreMath(out.replace(/\n/g,'<br />'),pm.store);
}
function renderList(items,start,indent){
  const ordered=items[start].ordered;let html=ordered?'<ol>':'<ul>';let i=start;
  while(i<items.length&&items[i].indent>=indent){
    const it=items[i];
    if(it.indent>indent){const sub=renderList(items,i,it.indent);html+=sub.html;i=sub.next;continue;}
    let inner='';i++;
    if(i<items.length&&items[i].indent>indent){const sub=renderList(items,i,items[i].indent);inner=sub.html;i=sub.next;}
    const cls=it.checked===null?'':' class="task-list-item"';
    let pre='';if(it.checked===true)pre='<input type="checkbox" checked /> ';else if(it.checked===false)pre='<input type="checkbox" /> ';
    html+='<li'+cls+'>'+pre+inline(it.text)+inner+'</li>';
  }
  html+=ordered?'</ol>':'</ul>';return {html:html,next:i};
}
let fenceSeq=0;
function renderHTML(blocks,headingSeen){
  headingSeen=headingSeen||{};let html='';
  blocks.forEach(function(b){
    switch(b.type){
      case 'heading':{const base=slugify(b.text);headingSeen[base]=(headingSeen[base]||0)+1;const id=headingSeen[base]>1?base+'-'+headingSeen[base]:base;html+='<h'+b.level+' id="'+id+'">'+inline(b.text)+'</h'+b.level+'>';break;}
      case 'para':html+='<p>'+inline(b.text)+'</p>';break;
      case 'code':{const idx=fenceSeq++;html+='<div class="code-block" data-lang="'+esc(b.lang)+'" data-fence="'+idx+'"><div class="code-head"><button class="code-lang" type="button" data-fence="'+idx+'">'+esc(b.lang||'text')+'<span class="caret">▾</span></button><button class="code-copy" type="button">复制</button></div><pre><code data-raw="'+esc(b.code)+'">'+highlight(b.code,b.lang)+'</code></pre></div>';break;}
      case 'quote':html+='<blockquote>'+renderHTML(b.blocks,headingSeen)+'</blockquote>';break;
      case 'list':{if(!b.items.length)break;html+=renderList(b.items,0,b.items[0].indent).html;break;}
      case 'table':{html+='<table><thead><tr>';b.head.forEach(function(h,k){const a=b.align[k];html+='<th'+(a?' style="text-align:'+a+'"':'')+'>'+inline(h)+'</th>';});html+='</tr></thead><tbody>';b.rows.forEach(function(r){html+='<tr>';b.head.forEach(function(_,k){const a=b.align[k];html+='<td'+(a?' style="text-align:'+a+'"':'')+'>'+inline(r[k]||'')+'</td>';});html+='</tr>';});html+='</tbody></table>';break;}
      case 'hr':html+='<hr />';break;
      case 'math':html+=texHtml(b.tex,b.display!==false);break;
      case 'callout':{const cls='callout callout-'+(b.kind==='danger'?'danger':b.kind==='warn'||b.kind==='warning'?'warning':b.kind==='tip'?'tip':'note');const label=b.title||(b.kind==='danger'?'CAUTION':b.kind.toUpperCase());html+='<div class="'+cls+'"><strong class="callout-title">'+esc(label)+'</strong>'+renderHTML(b.blocks,headingSeen)+'</div>';break;}
      case 'html':html+=b.raw;break;
    }
  });
  return html;
}
function renderAstroParts(blocks){
  const parts=[];
  blocks.forEach(function(b){
    switch(b.type){
      case 'code':parts.push({code:true,lang:b.lang||'text',body:b.code});break;
      case 'quote':parts.push({html:'<blockquote>'+renderHTML(b.blocks)+'</blockquote>'});break;
      case 'callout':{const cls='md-'+(b.kind==='danger'?'danger':b.kind==='warn'||b.kind==='warning'?'warn':b.kind==='tip'?'tip':'note');const label=b.title||(b.kind==='danger'?'CAUTION':b.kind.toUpperCase());parts.push({html:'<div class="md-callout '+cls+'"><strong class="md-callout-title">'+esc(label)+'</strong>'+renderHTML(b.blocks)+'</div>'});break;}
      case 'html':parts.push({html:b.raw});break;
      default:parts.push({html:renderHTML([b])});
    }
  });
  return parts;
}

/* ================= 状态 ================= */
const LS_DRAFT='nocturne-editor-draft-v5';
const LS_META='nocturne-editor-meta-v5';
const LS_TAGS='nocturne-editor-tags-v5';
const LS_LAYOUT='nocturne-editor-layout-v1';
const srcEl=$('#src');
const previewEl=$('#preview');
let renderTimer=null;
let lastSaved='';
let lastSavedMeta='';
let siteData={posts:[],tags:[]};
let editorTags=[];
let selectedPostSlug='__new__';
let currentCover='';
let _metaEditing=false;
let _metaSnapshot=null;
let _coverSnapshot='';

function meta(){return {title:$('#fTitle').value.trim(),slug:$('#fSlug').value.trim(),date:$('#fDate').value,category:$('#fCategory').value.trim(),tags:splitTags($('#fTags').value),desc:$('#fDesc').value.trim(),cover:currentCover,coverAlt:$('#fCoverAlt').value.trim(),coverPosition:$('#fCoverPosition').value};}
function setTags(tags){const n=uniqueList(tags);$('#fTags').value=n.join(', ');renderTagPicker(n);}
function renderTagPicker(selected){
  const picker=$('#tagPicker');if(!picker)return;
  const sel=new Set(uniqueList(selected).map(t=>t.toLowerCase()));
  const all=uniqueList(editorTags.concat(siteData.tags.map(item=>item.tag)));
  picker.innerHTML=all.length?all.map(function(tag){const c=sel.has(tag.toLowerCase());return '<label class="tag-option'+(c?' on':'')+'"><input type="checkbox" value="'+esc(tag)+'"'+(c?' checked':'')+' />'+esc(tag)+'</label>';}).join(''):'<span class="hint">暂无标签，可以在下方创建。</span>';
  $$('input[type="checkbox"]',picker).forEach(function(input){input.addEventListener('change',function(){setTags($$('input[type="checkbox"]:checked',picker).map(i=>i.value));if(!_metaEditing)markDirty();});});
}
function persistEditorTags(){try{localStorage.setItem(LS_TAGS,JSON.stringify(editorTags));}catch(e){}}

let pendingCoverFile=null;let pendingCoverUrl='';
function coverExt(name){const m=/\.([a-z0-9]+)$/i.exec(String(name||''));const ext=m?m[1].toLowerCase():'png';return ['png','jpg','jpeg','webp','avif','gif','svg'].indexOf(ext)===-1?'png':ext;}
function coverPathFor(file){const slug=slugify($('#fSlug').value||$('#fTitle').value||'untitled');return '/images/covers/'+slug+'-cover.'+coverExt(file.name);}
function coverSrc(){if(pendingCoverFile&&pendingCoverUrl)return pendingCoverUrl;return currentCover;}
function clearPendingCover(){if(pendingCoverUrl){URL.revokeObjectURL(pendingCoverUrl);pendingCoverUrl='';}pendingCoverFile=null;}
function renderCover(){
  const preview=$('#coverPreview');const removeBtn=$('#btnCoverRemove');if(!preview)return;
  const src=coverSrc();
  if(src){preview.classList.add('has-image');preview.innerHTML='<span class="cover-badge">'+(pendingCoverFile?'待写入':'Cover')+'</span><img src="'+esc(src)+'" alt="'+esc($('#fCoverAlt').value||'封面预览')+'" />';removeBtn.disabled=false;}
  else{preview.classList.remove('has-image');preview.innerHTML='<span class="cover-empty-ico">＋</span><span class="cover-empty-hint">点击 / 拖拽上传</span>';removeBtn.disabled=true;}
}
function acceptCoverFile(file){
  if(!file)return;if(!/^image\//.test(file.type)){toast('请选择图片文件',true);return;}if(file.size>8*1024*1024){toast('图片超过 8MB，请先压缩',true);return;}
  if(pendingCoverUrl){URL.revokeObjectURL(pendingCoverUrl);pendingCoverUrl='';}
  pendingCoverFile=file;pendingCoverUrl=URL.createObjectURL(file);currentCover=coverPathFor(file);
  if(!$('#fCoverAlt').value.trim())$('#fCoverAlt').value=$('#fTitle').value.trim()||'封面';
  renderCover();markDirty();toast('封面已选：'+currentCover);
}
$('#btnCoverUpload').addEventListener('click',function(){const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml';input.addEventListener('change',function(){acceptCoverFile(input.files&&input.files[0]);});input.click();});
$('#btnCoverRemove').addEventListener('click',function(){if(!currentCover&&!pendingCoverFile)return;if(pendingCoverUrl){URL.revokeObjectURL(pendingCoverUrl);pendingCoverUrl='';}pendingCoverFile=null;currentCover='';renderCover();markDirty();});
$('#coverPreview').addEventListener('click',function(){if(!coverSrc())$('#btnCoverUpload').click();});
$('#coverPreview').addEventListener('dragover',function(ev){ev.preventDefault();$('#coverPreview').classList.add('dragging');});
$('#coverPreview').addEventListener('dragleave',function(){$('#coverPreview').classList.remove('dragging');});
$('#coverPreview').addEventListener('drop',function(ev){ev.preventDefault();$('#coverPreview').classList.remove('dragging');const dt=ev.dataTransfer;if(dt&&dt.files&&dt.files.length)acceptCoverFile(dt.files[0]);});
$('#fCoverAlt').addEventListener('input',function(){if(coverSrc())renderCover();});

function renderPostMenu(){
  const list=$('#postMenuList');if(!list)return;
  list.innerHTML=siteData.posts.map(function(post){const active=post.slug===selectedPostSlug?' active':'';return '<button class="menu-item'+active+'" data-slug="'+esc(post.slug)+'"><span>'+esc(post.title)+'</span></button>';}).join('')||'<div class="menu-label" style="padding-left:12px">暂无站点文章</div>';
  $$('[data-slug]',list).forEach(function(btn){btn.addEventListener('click',function(){const slug=btn.getAttribute('data-slug');const post=siteData.posts.find(item=>item.slug===slug);switchPost(post||null);closeAllMenus();});});
}
function draftKey(slug){return LS_DRAFT+':'+(slug||'__new__');}
function metaKey(slug){return LS_META+':'+(slug||'__new__');}
function readSavedDraft(slug){let body=null,m=null;try{body=localStorage.getItem(draftKey(slug));m=JSON.parse(localStorage.getItem(metaKey(slug))||'null');if(body===null&&slug==='__new__')body=localStorage.getItem(LS_DRAFT);if(!m&&slug==='__new__')m=JSON.parse(localStorage.getItem(LS_META)||'null');}catch(e){}return {body:body,meta:m};}
function persistCurrentDraft(){try{localStorage.setItem(draftKey(selectedPostSlug),srcEl.value);localStorage.setItem(metaKey(selectedPostSlug),JSON.stringify(meta()));}catch(e){return false;}return true;}
function switchPost(post){if(srcEl.value!==lastSaved||JSON.stringify(meta())!==lastSavedMeta)persistCurrentDraft();applyPost(post);}

function updateCurrentPostLabel(){
  const label=$('#currentPostLabel');const post=siteData.posts.find(p=>p.slug===selectedPostSlug);
  if(post)label.textContent=post.title;else if($('#fTitle').value.trim())label.textContent=$('#fTitle').value.trim();else label.textContent='新建文章';
  $('#paneFile').textContent=($('#fSlug').value.trim()||'untitled')+'.md';
}
function applyPost(post){
  const slug=post&&post.slug||'__new__';const saved=readSavedDraft(slug);
  if(!post){
    selectedPostSlug='__new__';$('#fTitle').value='';$('#fSlug').value='';$('#fDate').value=new Date().toISOString().slice(0,10);
    $('#fCategory').value='';$('#fDesc').value='';$('#fCoverAlt').value='';$('#fCoverPosition').value='center';
    clearPendingCover();currentCover='';setTags([]);renderCover();
    srcEl.value=saved.body||sampleDoc();lastSaved=srcEl.value;lastSavedMeta=JSON.stringify(meta());
    render();renderPostMenu();setSaveState('saved');updateCurrentPostLabel();
    toast('新建文章 · 点顶栏「编辑文章」填写标题和封面');return;
  }
  selectedPostSlug=slug;$('#fTitle').value=post.title||'';$('#fSlug').value=post.slug||'';$('#fDate').value=post.iso||'';$('#fCategory').value=post.category||'';$('#fDesc').value=post.excerpt||'';$('#fCoverAlt').value=post.coverAlt||'';$('#fCoverPosition').value=post.coverPosition||'center';
  clearPendingCover();currentCover=post.cover||'';setTags(post.tags||[]);renderCover();
  srcEl.value=saved.body!==null?saved.body:(post.body||('# '+post.title+'\\n\\n'+(post.excerpt||'')+'\\n'));
  lastSaved=srcEl.value;lastSavedMeta=JSON.stringify(meta());render();renderPostMenu();setSaveState('saved');updateCurrentPostLabel();
  toast('已载入：'+post.title);
}
function loadLocalTagLibrary(){try{const saved=JSON.parse(localStorage.getItem(LS_TAGS)||'[]');editorTags=Array.isArray(saved)?uniqueList(saved):[];}catch(e){editorTags=[];}}
async function loadSiteData(showToast){
  try{
    let data;
    if(isTauri&&window.__narcardProject){
      const snapshot=await tInvoke('read_project',{root:window.__narcardProject});
      window.__narcardSnapshot=snapshot;
      data={posts:[],tags:[]};
    }else{
      const response=await fetch('/site-data.json',{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);
      data=await response.json();
    }
    siteData={posts:Array.isArray(data.posts)?data.posts:[],tags:Array.isArray(data.tags)?data.tags:[]};
    editorTags=uniqueList(editorTags.concat(siteData.tags.map(item=>item.tag)));persistEditorTags();renderPostMenu();renderTagPicker(meta().tags);updateCurrentPostLabel();
    if(showToast)toast('已同步 '+siteData.posts.length+' 篇文章');
  }catch(err){renderPostMenu();renderTagPicker(meta().tags);if(showToast)toast('站点数据读取失败',true);}
}

let katexPromise=null;
function whenKatex(){if(window.katex&&typeof window.katex.render==='function')return Promise.resolve(window.katex);if(!katexPromise){katexPromise=new Promise(function(resolve){let tries=0;const timer=setInterval(function(){tries++;if(window.katex&&typeof window.katex.render==='function'){clearInterval(timer);resolve(window.katex);}else if(tries>120){clearInterval(timer);resolve(null);}},60);});}return katexPromise;}
function texCard(el,tex,display,reason){const tag=display?'div':'span';el.classList.remove('tex-ok');el.classList.add('tex-fallback');el.innerHTML='<div class="tex-card-head"><span class="tex-badge">LaTeX</span><span class="tex-err">'+esc(reason||'未渲染')+'</span></div><div class="tex-card-body"><pre>'+esc(tex)+'</pre></div><div class="tex-card-foot">公式暂时无法渲染，已按源码卡片显示。</div>';if(tag==='span')el.classList.add('tex-inline');}
function renderMathIn(root){const nodes=$$('.tex',root);if(!nodes.length)return;whenKatex().then(function(katex){nodes.forEach(function(el){const tex=el.getAttribute('data-tex')||'';const display=el.getAttribute('data-display')==='1';if(!tex.trim()){el.textContent='';return;}if(!katex){texCard(el,tex,display,'KaTeX 未加载');return;}try{katex.render(tex,el,{displayMode:display,throwOnError:true,strict:false,trust:false,output:'html'});el.classList.add('tex-ok');el.classList.remove('tex-fallback');}catch(err){texCard(el,tex,display,(err&&err.message)?String(err.message).slice(0,120):'语法错误');}});});}
function render(){
  fenceSeq=0;let blocks=[];try{blocks=parseMd(srcEl.value);}catch(err){previewEl.innerHTML='<p style="color:#E04A3A">解析出错：'+esc(err.message)+'</p>';return;}
  previewEl.innerHTML=renderHTML(blocks);renderMathIn(previewEl);
  const codes=$$('.code-block',previewEl);const langs={};codes.forEach(function(blk){const l=(blk.getAttribute('data-lang')||'text').toLowerCase();if(l)langs[l]=1;});
  const text=srcEl.value;const nonWs=text.replace(/\s/g,'').length;
  $('#statLines').textContent=text?text.split('\n').length:0;$('#statChars').textContent=text.length;
  $('#statCodes').textContent=codes.length;$('#statLangs').textContent=Object.keys(langs).length;
  $('#statCount').textContent=nonWs;const mins=Math.max(1,Math.round(nonWs/400));$('#statRead').textContent='约 '+mins+' 分钟';
}
function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(function(){render();markDirty();},160);}
function setSaveState(state){const ind=$('#saveIndicator');const sb=$('#sbIndicator');const text=$('#saveText');const sbText=$('#sbIndicatorText');ind.classList.remove('dirty','saving');sb.classList.remove('dirty');if(state==='dirty'){ind.classList.add('dirty');sb.classList.add('dirty');text.textContent='未保存';sbText.textContent='未保存';}else if(state==='saving'){ind.classList.add('saving');text.textContent='保存中…';sbText.textContent='保存中…';}else{text.textContent='已保存';sbText.textContent='已保存';}}
function markDirty(){if(_metaEditing)return;const cm=JSON.stringify(meta());const dirty=srcEl.value!==lastSaved||cm!==lastSavedMeta;setSaveState(dirty?'dirty':'saved');if(dirty)scheduleAutosave();updateCurrentPostLabel();}
let autosaveTimer=null;
function scheduleAutosave(){clearTimeout(autosaveTimer);autosaveTimer=setTimeout(function(){if(!_metaEditing)saveDraft(true);},1500);}
function saveDraft(silent){setSaveState('saving');try{persistCurrentDraft();lastSaved=srcEl.value;lastSavedMeta=JSON.stringify(meta());setTimeout(function(){markDirty();},200);if(!silent)toast('草稿已保存');}catch(err){setSaveState('dirty');if(!silent)toast('保存失败：'+err.message,true);}}
function loadDraft(){
  let draft=null,m=null;try{draft=localStorage.getItem(LS_DRAFT);m=JSON.parse(localStorage.getItem(LS_META)||'null');}catch(e){}
  if(m){selectedPostSlug=m.slug||'__new__';$('#fTitle').value=m.title||'';$('#fSlug').value=m.slug||'';$('#fDate').value=m.date||'';$('#fCategory').value=m.category||'';setTags(m.tags||[]);$('#fDesc').value=m.desc||'';$('#fCoverAlt').value=m.coverAlt||'';$('#fCoverPosition').value=m.coverPosition||'center';clearPendingCover();currentCover=m.cover||'';}
  const saved=readSavedDraft(selectedPostSlug);draft=saved.body!==null?saved.body:draft;
  if(saved.meta){const x=saved.meta;$('#fTitle').value=x.title||$('#fTitle').value;$('#fSlug').value=x.slug||$('#fSlug').value;$('#fDate').value=x.date||$('#fDate').value;$('#fCategory').value=x.category||$('#fCategory').value;setTags(x.tags||[]);$('#fDesc').value=x.desc||$('#fDesc').value;currentCover=x.cover||currentCover;}
  if(draft){srcEl.value=draft;lastSaved=draft;}else{srcEl.value=sampleDoc();lastSaved=srcEl.value;}
  if(!$('#fDate').value)$('#fDate').value=new Date().toISOString().slice(0,10);
  lastSavedMeta=JSON.stringify(meta());renderCover();
}

/* ================= 编辑文章弹窗 ================= */
function openMetaModal(){_metaSnapshot=JSON.stringify(meta());_coverSnapshot=currentCover;_metaEditing=true;renderCover();openModal('#metaModal');setTimeout(function(){$('#fTitle').focus();},60);}
function cancelMetaModal(){if(_metaSnapshot){const m=JSON.parse(_metaSnapshot);$('#fTitle').value=m.title||'';$('#fSlug').value=m.slug||'';$('#fDate').value=m.date||'';$('#fCategory').value=m.category||'';$('#fTags').value=(m.tags||[]).join(', ');$('#fDesc').value=m.desc||'';$('#fCoverAlt').value=m.coverAlt||'';$('#fCoverPosition').value=m.coverPosition||'center';currentCover=_coverSnapshot;renderCover();renderTagPicker(m.tags||[]);}_metaEditing=false;_metaSnapshot=null;closeModal('#metaModal');}
function saveMetaModal(){_metaEditing=false;_metaSnapshot=null;selectedPostSlug=meta().slug||'__new__';closeModal('#metaModal');markDirty();saveDraft(true);renderPostMenu();updateCurrentPostLabel();toast('文章信息已更新');}
$('#btnEditMeta').addEventListener('click',openMetaModal);
$('#btnMetaSave').addEventListener('click',saveMetaModal);
$('#btnMetaCancel').addEventListener('click',cancelMetaModal);

/* ================= 插入动作 ================= */
function replaceRange(start,end,text,selStart,selEnd){srcEl.setRangeText(text,start,end,'end');if(selStart!==undefined)srcEl.setSelectionRange(selStart,selEnd===undefined?selStart:selEnd);srcEl.focus();scheduleRender();}
function wrap(prefix,suffix,placeholder){const s=srcEl.selectionStart,e=srcEl.selectionEnd;const sel=srcEl.value.slice(s,e);const body=sel||placeholder||'';const text=prefix+body+suffix;replaceRange(s,e,text,s+prefix.length,s+prefix.length+body.length);}
function prefixLines(prefixer,placeholder){const s=srcEl.selectionStart,e=srcEl.selectionEnd;const val=srcEl.value;let ls=val.lastIndexOf('\n',s-1)+1;let le=val.indexOf('\n',e);if(le===-1)le=val.length;const block=val.slice(ls,le);const lines=block.split('\n');const out=lines.map(function(l,i){return prefixer(l,i);}).join('\n');replaceRange(ls,le,out===block&&!block?placeholder:out);}
function insertBlock(text){const s=srcEl.selectionStart,e=srcEl.selectionEnd;const before=srcEl.value.slice(0,s);let prefix='';if(before&&!before.endsWith('\n\n'))prefix=before.endsWith('\n')?'\n':'\n\n';const body=prefix+text+'\n';replaceRange(s,e,body,s+prefix.length+text.length);}
const ACTIONS={
  h1:()=>prefixLines(l=>'# '+l.replace(/^#{1,6}\s+/,''),'# 标题'),
  h2:()=>prefixLines(l=>'## '+l.replace(/^#{1,6}\s+/,''),'## 标题'),
  h3:()=>prefixLines(l=>'### '+l.replace(/^#{1,6}\s+/,''),'### 标题'),
  h4:()=>prefixLines(l=>'#### '+l.replace(/^#{1,6}\s+/,''),'#### 标题'),
  bold:()=>wrap('**','**','加粗文字'),
  italic:()=>wrap('*','*','斜体文字'),
  strike:()=>wrap('~~','~~','删除文字'),
  mark:()=>wrap('==','==','高亮文字'),
  code:()=>wrap('`','`','code'),
  ul:()=>prefixLines(l=>'- '+l.replace(/^\s*([-*+]|\d+[.)])\s+/,''),'- 列表项'),
  ol:()=>prefixLines((l,i)=>(i+1)+'. '+l.replace(/^\s*([-*+]|\d+[.)])\s+/,''),'1. 列表项'),
  task:()=>prefixLines(l=>'- [ ] '+l.replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/,''),'- [ ] 待办事项'),
  quote:()=>prefixLines(l=>'> '+l,'> 引用文字'),
  hr:()=>insertBlock('---'),
  link:()=>wrap('[','](https://)','链接文字'),
  image:()=>insertBlock('![图片说明](/images/example.svg)'),
  table:()=>insertBlock('| 列 A | 列 B |\n| :--- | :--- |\n| 值 1 | 值 2 |\n| 值 3 | 值 4 |'),
  sample:()=>{srcEl.value=sampleDoc();lastSaved='';render();markDirty();toast('已载入示例');},
  clear:()=>{if(!confirm('确定清空？'))return;srcEl.value='';lastSaved='';render();markDirty();}
};
$('#toolbar').addEventListener('click',function(ev){const btn=ev.target.closest('[data-act]');if(!btn)return;const act=btn.getAttribute('data-act');if(act==='codeblock'){openLangModal();return;}if(act==='callout'){openModal('#calloutModal');return;}if(act==='formula'){openMathModal();return;}const fn=ACTIONS[act];if(fn)fn();});
$$('[data-menu]:not([data-math-action])').forEach(function(btn){btn.addEventListener('click',function(ev){ev.stopPropagation();const target=$('#'+btn.getAttribute('data-menu'));if(!target)return;const isOpen=target.classList.contains('open');closeAllMenus();if(!isOpen)target.classList.add('open');});});
$('#headingMenu').addEventListener('click',function(ev){const b=ev.target.closest('[data-act]');if(b){ACTIONS[b.getAttribute('data-act')]();closeAllMenus();}});

/* ================= 模态框 ================= */
let lastFocus=null;
function openModal(sel){lastFocus=document.activeElement;const m=$(sel);m.classList.add('open');const focusables=m.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');if(focusables.length){const first=focusables[0];const last=focusables[focusables.length-1];m._trap=function(e){if(e.key!=='Tab')return;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};m.addEventListener('keydown',m._trap);setTimeout(function(){first.focus();},30);}}
function closeModal(sel){const m=$(sel);if(m._trap){m.removeEventListener('keydown',m._trap);m._trap=null;}m.classList.remove('open');if(lastFocus&&typeof lastFocus.focus==='function'){lastFocus.focus();lastFocus=null;}}
$$('[data-close]').forEach(function(b){b.addEventListener('click',function(){const m=b.closest('.modal');if(m){if(m.id==='metaModal'){cancelMetaModal();}else{closeModal('#'+m.id);}}});});
$$('.modal').forEach(function(m){m.addEventListener('click',function(ev){if(ev.target===m){if(m.id==='metaModal'){cancelMetaModal();}else{closeModal('#'+m.id);}}});});
document.addEventListener('keydown',function(ev){if(ev.key==='Escape'){const mm=$('#metaModal');if(mm.classList.contains('open')){cancelMetaModal();return;}$$('.modal.open').forEach(m=>closeModal('#'+m.id));}});

/* ================= 预览区交互 ================= */
previewEl.addEventListener('click',function(ev){
  const btn=ev.target.closest('.code-copy');
  if(btn){const blk=btn.closest('.code-block');const codeEl=blk?blk.querySelector('code'):null;if(!codeEl)return;const text=codeEl.getAttribute('data-raw')||'';copyText(text).then(function(){btn.textContent='已复制';btn.classList.add('copied');setTimeout(function(){btn.textContent='复制';btn.classList.remove('copied');},1400);}).catch(function(){toast('复制失败',true);});return;}
  const langBtn=ev.target.closest('.code-lang');
  if(langBtn){const blk=langBtn.closest('.code-block');const idx=parseInt(blk.getAttribute('data-fence'),10);const cur=blk.getAttribute('data-lang')||'text';const next=prompt('输入新的语言标识（如 bash / python / rust）：',cur);if(next===null)return;const lang=String(next).trim();const updated=replaceFenceLang(srcEl.value,idx,lang);if(updated!==null&&updated!==srcEl.value){srcEl.value=updated;render();markDirty();toast('已切换语言：'+(lang||'text'));}}
});
function replaceFenceLang(src,nth,lang){const lines=String(src).split('\n');let inFence=false;let idx=-1;for(let i=0;i<lines.length;i++){const m=/^(\s*)(`{3,}|~{3,})(.*)$/.exec(lines[i]);if(!m)continue;if(!inFence){idx++;inFence=true;if(idx===nth){lines[i]=m[1]+m[2]+(lang?' '+lang:'');return lines.join('\n');}}else inFence=false;}return null;}

/* ================= 生成主站代码 ================= */
function shortDate(d){const dt=new Date(d+'T00:00:00');if(isNaN(dt))return '';return dt.toLocaleDateString('en-US',{month:'short',day:'2-digit'});}
function longDate(d){const dt=new Date(d+'T00:00:00');if(isNaN(dt))return '';return dt.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'});}
function fnName(slug){
  const raw=String(slug||'');
  const parts=raw.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const words=parts.map(function(part){return part.charAt(0).toUpperCase()+part.slice(1);}).join('');
  let suffix=words;
  if(!suffix){
    let hash=2166136261;
    for(let i=0;i<raw.length;i++){hash^=raw.charCodeAt(i);hash=Math.imul(hash,16777619);}
    suffix=(hash>>>0).toString(36);
  }
  return 'postBody'+suffix+'Body';
}
function buildCode(){
  const m=meta();const slug=m.slug||slugify(m.title||'untitled');const date=m.date||new Date().toISOString().slice(0,10);
  const tags=m.tags.length?m.tags:['Notes'];const category=m.category||'Notes';const fn=fnName(slug);
  const postLine='{ slug: '+jsStr(slug)+', title: '+jsStr(m.title||'未命名文章')+', iso: '+jsStr(date)+', short: '+jsStr(shortDate(date))+', display: '+jsStr(longDate(date))+', tags: ['+tags.map(t=>jsStr(t)).join(', ')+']'+', category: '+jsStr(category)+', cover: '+jsStr(m.cover||'')+', coverAlt: '+jsStr(m.coverAlt||'')+', coverPosition: '+jsStr(m.coverPosition||'center')+', variant: 0,\n    excerpt: '+jsStr(m.desc||'')+' },';
  let blocks=[];try{blocks=parseMd(srcEl.value);}catch(e){blocks=[];}
  const parts=renderAstroParts(blocks);
  const bodyLines=parts.map(function(p){if(p.code)return '    c('+jsStr(p.lang)+', '+jsStr(p.body)+'),';return '    '+jsStr(p.html)+',';});
  const bodyCode='function '+fn+'() {\n  const c = codeBlock;\n\n  return [\n'+(bodyLines.length?bodyLines.join('\n'):"    '<p>正文</p>',")+'\n  ].join(\'\\n\');\n}';
  return {slug:slug,fn:fn,postLine:postLine,bodyCode:bodyCode};
}
function frontmatterMd(){
  const m=meta();const tags=m.tags.length?m.tags:['Notes'];
  const lines=['---'];
  lines.push('title: '+JSON.stringify(m.title||'未命名文章'));lines.push('description: '+JSON.stringify(m.desc||''));
  lines.push('pubDate: '+(m.date||new Date().toISOString().slice(0,10)));lines.push('tags: ['+tags.map(t=>JSON.stringify(t)).join(', ')+']');
  lines.push('category: '+JSON.stringify(m.category||'Notes'));
  if(m.cover){lines.push('cover: '+JSON.stringify(m.cover));}if(m.coverAlt){lines.push('coverAlt: '+JSON.stringify(m.coverAlt));}if(m.coverPosition){lines.push('coverPosition: '+JSON.stringify(m.coverPosition));}
  lines.push('draft: false');lines.push('---','');
  return lines.join('\n')+srcEl.value+'\n';
}
function closeAllMenus(){$$('.menu.open, .mini-menu.open').forEach(m=>m.classList.remove('open'));}
document.addEventListener('click',function(ev){if(!ev.target.closest('.menu-wrap'))closeAllMenus();if(!ev.target.closest('.help-pop')&&!ev.target.closest('#btnHelp'))$('#helpPop').classList.remove('open');});
$('#btnCurrentPost').addEventListener('click',function(ev){ev.stopPropagation();const m=$('#postMenu');const o=m.classList.contains('open');closeAllMenus();if(!o)m.classList.add('open');});
$('#btnMore').addEventListener('click',function(ev){ev.stopPropagation();const m=$('#moreMenu');const o=m.classList.contains('open');closeAllMenus();if(!o)m.classList.add('open');});
$('#btnHelp').addEventListener('click',function(ev){ev.stopPropagation();$('#helpPop').classList.toggle('open');});
$$('#moreMenu [data-action]').forEach(function(btn){btn.addEventListener('click',function(){const act=btn.getAttribute('data-action');closeAllMenus();if(act==='open')openLocalFile();else if(act==='edit-meta')openMetaModal();else if(act==='toggle-view')toggleView();else if(act==='export')exportFile();else if(act==='import')openImport();else if(act==='clear')ACTIONS.clear();});});
$$('#postMenu [data-action]').forEach(function(btn){btn.addEventListener('click',function(){const act=btn.getAttribute('data-action');closeAllMenus();if(act==='reload-site')loadSiteData(true);else if(act==='new')switchPost(null);});});
function toggleView(){const b=document.body;if(b.classList.contains('mode-write')){b.classList.remove('mode-write');b.classList.add('mode-read');}else if(b.classList.contains('mode-read')){b.classList.remove('mode-read');}else{b.classList.add('mode-write');}}
$('#btnSave').addEventListener('click',function(){saveDraft(false);});
function exportFile(){const m=meta();const slug=m.slug||slugify(m.title||'untitled');const blob=new Blob([frontmatterMd()],{type:'text/markdown;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=slug+'.md';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);toast('已导出 '+slug+'.md');}
function openLocalFile(){const input=document.createElement('input');input.type='file';input.accept='.md,.markdown,.txt';input.addEventListener('change',function(){const f=input.files&&input.files[0];if(!f)return;const reader=new FileReader();reader.onload=function(){let text=String(reader.result);const fm=/^---\n([\s\S]*?)\n---\n?/.exec(text);if(fm){const body=fm[1];const get=k=>{const mm=new RegExp('^'+k+':\\s*(.*)$','m').exec(body);return mm?mm[1].replace(/^["']|["']$/g,'').trim():'';};if(get('title'))$('#fTitle').value=get('title');if(get('description'))$('#fDesc').value=get('description');if(get('pubDate'))$('#fDate').value=get('pubDate').slice(0,10);if(get('category'))$('#fCategory').value=get('category');if(get('cover'))currentCover=get('cover');if(get('coverAlt'))$('#fCoverAlt').value=get('coverAlt');if(get('coverPosition'))$('#fCoverPosition').value=get('coverPosition');const tg=get('tags');if(tg)setTags(tg.replace(/^\[|\]$/g,'').split(',').map(s=>s.replace(/["']/g,'').trim()).filter(Boolean));text=text.slice(fm[0].length);}srcEl.value=text;if(!$('#fSlug').value)$('#fSlug').value=slugify(f.name.replace(/\.(md|markdown|txt)$/i,''));renderCover();lastSaved='';render();markDirty();toast('已打开 '+f.name);};reader.readAsText(f,'utf-8');});input.click();}
/**
 * 打开导入到主站弹窗
 * 负责生成文章代码、检测环境兼容性并同步 UI 状态
 */
function openImport() {
  // 生成用于展示的代码片段
  const code = buildCode();
  $('#codePosts').textContent = code.postLine;
  $('#codeBody').textContent = code.bodyCode;

  const note = $('#importNote');

  // 检测当前运行环境：是否支持浏览器文件系统 API，或者是否在 Tauri 桌面端环境
  const isTauri = typeof window.__TAURI_INTERNALS__ !== 'undefined';
  const hasFs = (window.isSecureContext && typeof window.showDirectoryPicker === 'function') || isTauri;

  // 根据环境能力动态设置提示文案
  if (hasFs) {
    note.textContent = '已设置的目录会自动复用；需要更换目录时点击“选择/设置”即可。';
  } else {
    note.textContent = '提示：当前浏览器不支持直接写入文件，请用「方式二」复制。';
  }

  // 根据是否支持直接写入，禁用或启用对应的按钮
  $('#btnWriteAstro').disabled = !hasFs;
  $('#btnWriteMd').disabled = !hasFs;

  updateDirStatus();
  openModal('#importModal');
}
$$('[data-copy]').forEach(function(b){b.addEventListener('click',function(){const id=b.getAttribute('data-copy');copyText($('#'+id).textContent).then(function(){b.textContent='已复制';setTimeout(function(){b.textContent='复制';},1400);});});});
let projectDirHandle=null,blogDirHandle=null;
const DIR_DB='nocturne-editor-directory-v1';
function openDirDb(){return new Promise(function(resolve){if(!window.indexedDB){resolve(null);return;}const req=indexedDB.open(DIR_DB,1);req.onupgradeneeded=function(){req.result.createObjectStore('handles');};req.onsuccess=function(){resolve(req.result);};req.onerror=function(){resolve(null);};});}
async function saveDirHandle(key,handle){const db=await openDirDb();if(!db)return;await new Promise(function(resolve){const tx=db.transaction('handles','readwrite');tx.objectStore('handles').put(handle,key);tx.oncomplete=resolve;tx.onerror=resolve;});}
async function loadDirHandle(key){const db=await openDirDb();if(!db)return null;return await new Promise(function(resolve){const tx=db.transaction('handles','readonly');const req=tx.objectStore('handles').get(key);req.onsuccess=function(){resolve(req.result||null);};req.onerror=function(){resolve(null);};});}
async function requestDirPermission(handle){if(!handle)return false;try{let p=await handle.queryPermission({mode:'readwrite'});if(p!=='granted')p=await handle.requestPermission({mode:'readwrite'});return p==='granted';}catch(e){return false;}}
function updateDirStatus(){const a=$('#astroDirStatus'),b=$('#blogDirStatus');if(a)a.textContent=projectDirHandle?'已设置：'+(projectDirHandle.name||'项目目录'):'尚未设置目录';if(b)b.textContent=blogDirHandle?'已设置：'+(blogDirHandle.name||'blog'):'尚未设置目录';}
async function restoreDirHandles(){try{projectDirHandle=await loadDirHandle('project');blogDirHandle=await loadDirHandle('blog');}catch(e){}updateDirStatus();}
restoreDirHandles();
async function writeAstroToDirectory(root){
  try{
    if(!root)throw new Error('尚未设置项目目录');const srcDir=await root.getDirectoryHandle('src');const dataDir=await srcDir.getDirectoryHandle('data');const pagesDir=await srcDir.getDirectoryHandle('pages');
    const postsHandle=await dataDir.getFileHandle('posts.ts');const indexHandle=await pagesDir.getFileHandle('index.astro');
    const postsText=await(await postsHandle.getFile()).text();const indexText=await(await indexHandle.getFile()).text();
    if(postsText.indexOf('export const posts = [')===-1||postsText.indexOf('] as const;')===-1){toast('posts.ts 结构不匹配',true);return;}
    if(indexText.indexOf('function articleBody(post: DemoPost) {')===-1){toast('index.astro 里没找到 articleBody',true);return;}
    const code=buildCode();const slugLiteral=jsStr(code.slug);if(postsText.indexOf('slug: '+slugLiteral)!==-1||indexText.indexOf('post.slug === '+slugLiteral)!==-1){toast('已存在同 slug',true);return;}
    const postsLines=postsText.split('\n');let arrEnd=-1;for(let i=postsLines.length-1;i>=0;i--){if(postsLines[i].trim()==='] as const;'){arrEnd=i;break;}}
    if(arrEnd===-1){toast('定位 posts.ts 失败',true);return;}
    postsLines.splice(arrEnd,0,'  '+code.postLine);const nextPosts=postsLines.join('\n');
    const indexLines=indexText.split('\n');let fnLine=-1;for(let i=0;i<indexLines.length;i++){if(indexLines[i].indexOf('function articleBody(post: DemoPost) {')!==-1){fnLine=i;break;}}
    if(fnLine===-1){toast('定位 articleBody 失败',true);return;}
    const fnBlock=code.bodyCode.split('\n').concat(['']);indexLines.splice(fnLine,0,...fnBlock);
    const shifted=fnLine+fnBlock.length;indexLines.splice(shifted+1,0,"  if (post.slug === "+jsStr(code.slug)+") return "+code.fn+"();");
    const nextIndex=indexLines.join('\n');
    async function backupAndWrite(handle,text){const w=await handle.createWritable();await w.write(text);await w.close();}
    const bakP=await dataDir.getFileHandle('posts.ts.bak',{create:true});const bakI=await pagesDir.getFileHandle('index.astro.bak',{create:true});
    await backupAndWrite(bakP,postsText);await backupAndWrite(bakI,indexText);await backupAndWrite(postsHandle,nextPosts);await backupAndWrite(indexHandle,nextIndex);
    let coverNote='';
    if(pendingCoverFile){
      const publicDir=await root.getDirectoryHandle('public',{create:true});const imagesDir=await publicDir.getDirectoryHandle('images',{create:true});const coversDir=await imagesDir.getDirectoryHandle('covers',{create:true});
      const name=currentCover.split('/').pop();const fh=await coversDir.getFileHandle(name,{create:true});const cw=await fh.createWritable();await cw.write(pendingCoverFile);await cw.close();
      pendingCoverFile=null;if(pendingCoverUrl){URL.revokeObjectURL(pendingCoverUrl);pendingCoverUrl='';}renderCover();coverNote='，封面已保存到 public/images/covers/'+name;
    }
    saveDraft(true);toast('已同步到主站'+coverNote);closeModal('#importModal');await loadSiteData(false);
  }catch(err){if(err&&err.name==='AbortError')return;toast('写入失败：'+(err&&err.message?err.message:err),true);}
}
async function selectProjectDirectory(){
  if(isTauri){
    try{
      const path=await tChooseDirectory('选择 Astro 项目目录');
      if(!path)return;
      await tInvoke('validate_project',{root:path});
      window.__narcardProject=path;
      window.__narcardSnapshot=await tInvoke('read_project',{root:path});
      projectDirHandle=path;updateDirStatus();toast('项目目录已设置');await loadSiteData(false);return;
    }catch(err){toast('项目目录无效或无法访问：'+(err&&err.message||err),true);return;}
  }
  if(!window.showDirectoryPicker){toast('当前浏览器不支持目录选择',true);return;}
  try{
    const handle=await window.showDirectoryPicker({mode:'readwrite'});
    const src=await handle.getDirectoryHandle('src');
    await src.getDirectoryHandle('data');
    await src.getDirectoryHandle('pages');
    projectDirHandle=handle;await saveDirHandle('project',handle);updateDirStatus();toast('项目目录已记住：'+(handle.name||'项目目录'));
  }catch(err){if(err&&err.name==='AbortError')return;toast('项目目录无效或无法访问',true);}
}
async function selectBlogDirectory(){
  if(!window.showDirectoryPicker){toast('当前浏览器不支持目录选择',true);return;}
  try{
    const handle=await window.showDirectoryPicker({mode:'readwrite'});
    blogDirHandle=handle;await saveDirHandle('blog',handle);updateDirStatus();toast('Markdown 目录已记住：'+(handle.name||'blog'));
  }catch(err){if(err&&err.name==='AbortError')return;toast('Markdown 目录设置失败',true);}
}
async function writeMarkdownToDirectory(dir){
  try{
    if(!dir)throw new Error('尚未设置 Markdown 目录');
    if(!await requestDirPermission(dir))throw new Error('没有目录写入权限');
    const m=meta();const slug=m.slug||slugify(m.title||'untitled');
    const fh=await dir.getFileHandle(slug+'.md',{create:true});
    const w=await fh.createWritable();await w.write(frontmatterMd());await w.close();
    toast('已保存 '+slug+'.md');closeModal('#importModal');
  }catch(err){if(err&&err.name==='AbortError')return;toast('保存失败：'+(err.message||err),true);}
}
if(isTauri){
  window.__narcardProject='';
  /**
   * 读取 Tauri 项目数据，并刷新后续写入所需的文件版本快照。
   * @param {boolean} showToast - 是否显示同步结果
   */
  loadSiteData=function(showToast){
    return tInvoke('read_project',{root:window.__narcardProject}).then(function(snapshot){
      window.__narcardSnapshot=snapshot;
      return tInvoke('read_site_data',{root:window.__narcardProject});
    }).then(function(data){
      siteData=data||{posts:[],tags:[]};
      editorTags=uniqueList(editorTags.concat(siteData.tags.map(function(item){return item.tag;})));
      persistEditorTags();renderPostMenu();renderTagPicker(meta().tags);updateCurrentPostLabel();
      if(showToast)toast('已同步 '+siteData.posts.length+' 篇文章');
    }).catch(function(err){
      renderPostMenu();renderTagPicker(meta().tags);
      if(showToast)toast('站点数据读取失败：'+(err&&err.message||err),true);
    });
  };
  writeAstroToDirectory=async function(){
    try{
      if(!window.__narcardProject)throw new Error('尚未设置项目目录');
      const code=buildCode();const snapshot=window.__narcardSnapshot||{};
      if(pendingCoverFile){const bytes=Array.from(new Uint8Array(await pendingCoverFile.arrayBuffer()));currentCover=await tInvoke('write_cover',{root:window.__narcardProject,filename:currentCover.split('/').pop(),bytes});}
      const result=await tInvoke('write_generated_post',{root:window.__narcardProject,slug:code.slug,functionName:code.fn,postLine:code.postLine,bodyCode:code.bodyCode,postsVersion:snapshot.postsVersion,indexVersion:snapshot.indexVersion});
      toast('已同步到主站，备份已生成');await loadSiteData(false);closeModal('#importModal');return result;
    }catch(err){toast('写入失败：'+(err&&err.message||err),true);}
  };
  selectBlogDirectory=async function(){
    try{
      const path=await tChooseDirectory('选择项目内的 src/content/blog 目录');if(!path)return;
      const result=await tInvoke('validate_markdown_dir',{root:window.__narcardProject,markdownDir:path});
      blogDirHandle=result;updateDirStatus();toast('Markdown 目录已设置');
    }catch(err){toast('Markdown 目录设置失败：'+(err&&err.message||err),true);}
  };
  writeMarkdownToDirectory=async function(){
    try{
      if(!blogDirHandle)throw new Error('尚未设置 Markdown 目录');
      const m=meta();const slug=m.slug||slugify(m.title||'untitled');
      const result=await tInvoke('write_markdown',{root:window.__narcardProject,markdownDir:blogDirHandle,filename:slug+'.md',content:frontmatterMd(),mode:'create'});
      toast('已保存 '+result.filename);closeModal('#importModal');
    }catch(err){toast('保存失败：'+(err&&err.message||err),true);}
  };
}
$('#btnWriteAstro').addEventListener('click',function(){if(isTauri)writeAstroToDirectory();else selectProjectDirectory();});
$('#btnWriteMd').addEventListener('click',selectBlogDirectory);
$('#btnQuickWriteAstro').addEventListener('click',async function(){
  if(!projectDirHandle){toast('请先选择/设置项目目录',true);return;}
  if(!isTauri&&!await requestDirPermission(projectDirHandle)){toast('目录权限已失效，请重新设置项目目录',true);return;}
  await writeAstroToDirectory(projectDirHandle);
});
$('#btnQuickWriteMd').addEventListener('click',async function(){
  if(!blogDirHandle){toast('请先选择/设置 blog 目录',true);return;}
  if(!isTauri&&!await requestDirPermission(blogDirHandle)){toast('目录权限已失效，请重新设置 blog 目录',true);return;}
  await writeMarkdownToDirectory(blogDirHandle);
});
$('#btnQuickCopyCode').addEventListener('click',function(){const post=$('#codePosts').textContent||'';const body=$('#codeBody').textContent||'';copyText(post+'\n\n'+body).then(function(){toast('两段代码已复制');}).catch(function(){toast('复制失败',true);});});
const ALL_LANGS=(function(){const set={};Object.keys(LANGS).forEach(function(group){group.split(/\s+/).forEach(function(n){if(n)set[n]=1;});});Object.keys(LANG_ALIASES).forEach(function(k){set[k]=1;});return Object.keys(set).sort();})();
function openLangModal(){const dl=$('#langList');dl.innerHTML=ALL_LANGS.map(l=>'<option value="'+l+'"></option>').join('');const common=['bash','powershell','batch','css','scss','javascript','typescript','json','yaml','html','astro','python','go','rust','java','c','cpp','csharp','sql','php','ruby','swift','kotlin','dockerfile','nginx','markdown','diff','lua','perl','r','haskell','vim','graphql','toml','ini','makefile','julia','text'];$('#langPills').innerHTML=common.map(l=>'<span class="lang-pill" data-lang="'+l+'">'+l+'</span>').join('');$('#langInput').value='bash';openModal('#langModal');}
$('#langPills').addEventListener('click',function(ev){const p=ev.target.closest('[data-lang]');if(p)$('#langInput').value=p.getAttribute('data-lang');});
function insertCodeBlock(){const lang=($('#langInput').value||'text').trim()||'text';const s=srcEl.selectionStart,e=srcEl.selectionEnd;const sel=srcEl.value.slice(s,e);const code=sel||'// 在这里写代码';const block='```'+lang+'\n'+code+'\n```';replaceRange(s,e,block,s+3+lang.length+1,s+3+lang.length+1+code.length);closeModal('#langModal');toast('已插入 '+lang+' 代码块');}
$('#btnLangOk').addEventListener('click',insertCodeBlock);
$('#langInput').addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();insertCodeBlock();}});
$$('[data-callout]').forEach(function(b){b.addEventListener('click',function(){const kind=b.getAttribute('data-callout');const titles={note:'NOTE',tip:'TIP',warning:'WARNING',danger:'CAUTION'};insertBlock('::: '+kind+' '+titles[kind]+'\n提示内容写在这里。\n:::');closeModal('#calloutModal');});});

/* 公式编辑器（精简但完整） */
const TEX_CATS=[
  {id:'common',icon:'×∪',label:'常用符号',groups:[
    {title:'基本运算',items:[['+','+'],['-','-'],['\\pm','\\pm'],['\\mp','\\mp'],['\\times','\\times'],['\\div','\\div'],['\\cdot','\\cdot'],['\\ast','\\ast'],['\\circ','\\circ'],['\\bullet','\\bullet']]},
    {title:'关系符号',items:[['=','='],['\\ne','\\ne'],['\\approx','\\approx'],['\\equiv','\\equiv'],['<','<'],['>','>'],['\\le','\\le'],['\\ge','\\ge'],['\\ll','\\ll'],['\\gg','\\gg'],['\\sim','\\sim'],['\\propto','\\propto']]},
    {title:'集合与逻辑',items:[['\\in','\\in'],['\\notin','\\notin'],['\\subset','\\subset'],['\\supset','\\supset'],['\\subseteq','\\subseteq'],['\\cup','\\cup'],['\\cap','\\cap'],['\\emptyset','\\emptyset'],['\\forall','\\forall'],['\\exists','\\exists'],['\\neg','\\neg'],['\\land','\\land'],['\\lor','\\lor']]},
    {title:'其他',items:[['\\infty','\\infty'],['\\partial','\\partial'],['\\nabla','\\nabla'],['\\angle','\\angle'],['\\triangle','\\triangle'],['\\square','\\square'],['\\prime','\\prime'],['\\star','\\star'],['\\hbar','\\hbar'],['\\ell','\\ell']]},
  ]},
  {id:'greek',icon:'αβ',label:'希腊字母',groups:[
    {title:'小写',items:[['\\alpha','\\alpha'],['\\beta','\\beta'],['\\gamma','\\gamma'],['\\delta','\\delta'],['\\epsilon','\\epsilon'],['\\varepsilon','\\varepsilon'],['\\zeta','\\zeta'],['\\eta','\\eta'],['\\theta','\\theta'],['\\vartheta','\\vartheta'],['\\iota','\\iota'],['\\kappa','\\kappa'],['\\lambda','\\lambda'],['\\mu','\\mu'],['\\nu','\\nu'],['\\xi','\\xi'],['\\pi','\\pi'],['\\varpi','\\varpi'],['\\rho','\\rho'],['\\varrho','\\varrho'],['\\sigma','\\sigma'],['\\varsigma','\\varsigma'],['\\tau','\\tau'],['\\upsilon','\\upsilon'],['\\phi','\\phi'],['\\varphi','\\varphi'],['\\chi','\\chi'],['\\psi','\\psi'],['\\omega','\\omega']]},
    {title:'大写',items:[['\\Gamma','\\Gamma'],['\\Delta','\\Delta'],['\\Theta','\\Theta'],['\\Lambda','\\Lambda'],['\\Xi','\\Xi'],['\\Pi','\\Pi'],['\\Sigma','\\Sigma'],['\\Upsilon','\\Upsilon'],['\\Phi','\\Phi'],['\\Psi','\\Psi'],['\\Omega','\\Omega']]},
  ]},
  {id:'frac',icon:'x/y',label:'分数微分',groups:[
    {title:'分数',items:[['\\frac{a}{b}','\\frac{a}{b}'],['\\dfrac{a}{b}','\\dfrac{a}{b}'],['\\tfrac{a}{b}','\\tfrac{a}{b}'],['\\cfrac{a}{b}','\\cfrac{a}{b}'],['a/b','a/b']]},
    {title:'微分',items:[['\\frac{dy}{dx}','\\frac{dy}{dx}'],['\\frac{\\partial f}{\\partial x}','\\frac{\\partial f}{\\partial x}'],['\\frac{d^2y}{dx^2}','\\frac{d^2y}{dx^2}'],['\\dot{x}','\\dot{x}'],['\\ddot{x}','\\ddot{x}'],['\\nabla f','\\nabla f'],['\\Delta x','\\Delta x']]},
  ]},
  {id:'root',icon:'√',label:'根式角标',groups:[
    {title:'根式',items:[['\\sqrt{x}','\\sqrt{x}'],['\\sqrt[n]{x}','\\sqrt[n]{x}'],['\\sqrt[3]{x}','\\sqrt[3]{x}']]},
    {title:'上下标',items:[['x^{a}','x^{a}'],['x_{a}','x_{a}'],['x_{a}^{b}','x_{a}^{b}'],['{}_{a}^{b}x','{}_{a}^{b}x'],['x^{a+b}','x^{a+b}']]},
    {title:'重音与装饰',items:[['\\hat{a}','\\hat{a}'],['\\tilde{a}','\\tilde{a}'],['\\bar{a}','\\bar{a}'],['\\vec{a}','\\vec{a}'],['\\dot{a}','\\dot{a}'],['\\ddot{a}','\\ddot{a}'],['\\overline{abc}','\\overline{abc}'],['\\underline{abc}','\\underline{abc}'],['\\widehat{abc}','\\widehat{abc}'],['\\widetilde{abc}','\\widetilde{abc}'],['\\overbrace{abc}','\\overbrace{abc}'],['\\underbrace{abc}','\\underbrace{abc}'],['\\overrightarrow{AB}','\\overrightarrow{AB}'],['\\overleftarrow{AB}','\\overleftarrow{AB}']]},
  ]},
  {id:'limit',icon:'lim',label:'极限对数',groups:[
    {title:'极限',items:[['\\lim_{a}','\\lim_{a}'],['\\lim_{x \\to 0}','\\lim_{x \\to 0}'],['\\lim_{x \\to \\infty}','\\lim_{x \\to \\infty}'],['\\lim_{x \\to a^+}','\\lim_{x \\to a^+}'],['\\max_{x}','\\max_{x}'],['\\min_{x}','\\min_{x}']]},
    {title:'对数与指数',items:[['\\log_a b','\\log_a b'],['\\lg_a b','\\lg_a b'],['\\ln_a b','\\ln_a b'],['\\exp a','\\exp a'],['e^{a}','e^{a}'],['a^{x}','a^{x}']]},
    {title:'界符',items:[['\\min x','\\min x'],['\\max y','\\max y'],['\\sup t','\\sup t'],['\\inf s','\\inf s'],['\\lim u','\\lim u'],['\\limsup w','\\limsup w'],['\\liminf v','\\liminf v'],['\\dim p','\\dim p'],['\\ker \\phi','\\ker \\phi']]},
  ]},
  {id:'trig',icon:'sin',label:'三角函数',groups:[
    {title:'基本',items:[['\\sin','\\sin'],['\\cos','\\cos'],['\\tan','\\tan'],['\\cot','\\cot'],['\\sec','\\sec'],['\\csc','\\csc']]},
    {title:'反三角',items:[['\\arcsin','\\arcsin'],['\\arccos','\\arccos'],['\\arctan','\\arctan'],['\\sin^{-1}','\\sin^{-1}'],['\\cos^{-1}','\\cos^{-1}'],['\\tan^{-1}','\\tan^{-1}']]},
    {title:'双曲',items:[['\\sinh','\\sinh'],['\\cosh','\\cosh'],['\\tanh','\\tanh'],['\\coth','\\coth'],['\\sech','\\sech'],['\\csch','\\csch']]},
    {title:'角度',items:[['^\\circ','^\\circ'],['\\angle','\\angle'],['\\measuredangle','\\measuredangle']]},
  ]},
  {id:'int',icon:'∫',label:'积分运算',groups:[
    {title:'积分',items:[['\\int','\\int'],['\\int_{a}^{b}','\\int_{a}^{b}'],['\\int_{a}^{b} f(x) \\, dx','\\int_{a}^{b} f(x) \\, dx'],['\\iint','\\iint'],['\\iint_{D}','\\iint_{D}'],['\\iiint','\\iiint'],['\\oint','\\oint'],['\\oint_{C}','\\oint_{C}']]},
    {title:'积分号变形',items:[['\\smallint','\\smallint'],['\\oiint','\\oiint'],['\\oiiint','\\oiiint']]},
  ]},
  {id:'big',icon:'∑',label:'大型运算',groups:[
    {title:'求和求积',items:[['\\sum','\\sum'],['\\sum_{i=0}^{n}','\\sum_{i=0}^{n}'],['\\sum_{i=1}^{\\infty}','\\sum_{i=1}^{\\infty}'],['\\prod','\\prod'],['\\prod_{i=0}^{n}','\\prod_{i=0}^{n}'],['\\coprod_{i=0}^{n}','\\coprod_{i=0}^{n}']]},
    {title:'集合运算',items:[['\\bigcup_{i=1}^{n}','\\bigcup_{i=1}^{n}'],['\\bigcap_{i=1}^{n}','\\bigcap_{i=1}^{n}'],['\\bigoplus','\\bigoplus'],['\\bigotimes','\\bigotimes'],['\\bigvee','\\bigvee'],['\\bigwedge','\\bigwedge'],['\\bigsqcup','\\bigsqcup']]},
  ]},
  {id:'bracket',icon:'({})',label:'括号取整',groups:[
    {title:'圆括号方括号',items:[['\\left( x \\right)','\\left( x \\right)'],['\\left[ x \\right]','\\left[ x \\right]'],['\\left\\{ x \\right\\}','\\left\\{ x \\right\\}'],['\\left| x \\right|','\\left| x \\right|'],['\\left\\| x \\right\\|','\\left\\| x \\right\\|']]},
    {title:'取整',items:[['\\lceil x \\rceil','\\lceil x \\rceil'],['\\lfloor x \\rfloor','\\lfloor x \\rfloor'],['\\langle x \\rangle','\\langle x \\rangle'],['\\lceil \\frac{a}{b} \\rceil','\\lceil \\frac{a}{b} \\rceil']]},
    {title:'组合数',items:[['\\binom{n}{k}','\\binom{n}{k}'],['\\tbinom{n}{k}','\\tbinom{n}{k}'],['\\dbinom{n}{k}','\\dbinom{n}{k}'],['C_n^k','C_n^k'],['A_n^k','A_n^k']]},
  ]},
  {id:'matrix',icon:'[▦]',label:'数组矩阵',groups:[
    {title:'矩阵',items:[['\\begin{matrix} a & b \\\\ c & d \\end{matrix}','\\begin{matrix} a & b \\\\ c & d \\end{matrix}'],['\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}','\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'],['\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}','\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}'],['\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}','\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}'],['\\begin{Vmatrix} a & b \\\\ c & d \\end{Vmatrix}','\\begin{Vmatrix} a & b \\\\ c & d \\end{Vmatrix}']]},
    {title:'分段函数',items:[['\\begin{cases} 1, & x > 0 \\\\ 0, & x \\le 0 \\end{cases}','\\begin{cases} 1, & x > 0 \\\\ 0, & x \\le 0 \\end{cases}'],['f(x) = \\begin{cases} a, & x > 0 \\\\ b, & x = 0 \\\\ c, & x < 0 \\end{cases}','\\begin{cases} a, & x>0 \\\\ b, & x=0 \\\\ c, & x<0 \\end{cases}']]},
    {title:'对齐',items:[['\\begin{aligned} a &= b + c \\\\ &= d \\end{aligned}','\\begin{aligned} a &= b+c \\\\ &= d \\end{aligned}'],['\\begin{array}{cc} a & b \\\\ c & d \\end{array}','\\begin{array}{cc} a & b \\\\ c & d \\end{array}'],['\\begin{array}{c|c} a & b \\\\ \\hline c & d \\end{array}','\\begin{array}{c|c} a & b \\\\ c & d \\end{array}']]},
  ]},
];
const TEX_TPL_LIB=[
  {name:'二次公式',tex:'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'},
  {name:'欧拉公式',tex:'e^{i\\pi} + 1 = 0'},
  {name:'高斯积分',tex:'\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}'},
  {name:'傅里叶变换',tex:'F(\\omega) = \\int_{-\\infty}^{\\infty} f(t) e^{-i\\omega t} dt'},
  {name:'薛定谔方程',tex:'i\\hbar \\frac{\\partial}{\\partial t} \\Psi = \\hat{H} \\Psi'},
  {name:'质能方程',tex:'E = mc^2'},
  {name:'泰勒展开',tex:'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^n'},
  {name:'柯西-施瓦茨',tex:'|\\langle u, v \\rangle|^2 \\leq \\langle u, u \\rangle \\cdot \\langle v, v \\rangle'},
  {name:'矩阵乘法',tex:'C_{ij} = \\sum_{k=1}^{n} A_{ik} B_{kj}'},
  {name:'对数换底',tex:'\\log_a b = \\frac{\\ln b}{\\ln a}'},
  {name:'高斯分布',tex:'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}'},
  {name:'二项式定理',tex:'(x+y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^k y^{n-k}'},
  {name:'复数共轭',tex:'z \\bar{z} = |z|^2 = a^2 + b^2'},
  {name:'洛必达法则',tex:'\\lim_{x \\to a} \\frac{f(x)}{g(x)} = \\lim_{x \\to a} \\frac{f\'(x)}{g\'(x)}'},
  {name:'导数定义',tex:'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}'},
  {name:'分部积分',tex:'\\int u \\, dv = uv - \\int v \\, du'},
];
let _texCatsInited=false;
let _texOutScale=1;
const LS_MATH='nocturne-editor-math-v1';
const MATH_DEFAULT={favorites:[],settings:{fontSize:15,inputHeight:150,outScale:1,mode:'source'}};
let _mathState=loadMathState();
let _activeTexMenu=null;
function loadMathState(){try{const raw=JSON.parse(localStorage.getItem(LS_MATH)||'{}');const s=raw&&raw.settings&&typeof raw.settings==='object'?raw.settings:{};const favorites=Array.isArray(raw.favorites)?raw.favorites.filter(x=>x&&typeof x.tex==='string').slice(0,100):[];return {favorites:favorites,settings:{fontSize:clampNum(s.fontSize,11,24,15),inputHeight:clampNum(s.inputHeight,150,420,150),outScale:clampNum(s.outScale,.5,2.5,1),mode:s.mode==='visual'?'visual':'source'}};}catch(e){return JSON.parse(JSON.stringify(MATH_DEFAULT));}}
function clampNum(v,min,max,fallback){v=Number(v);return Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;}
function saveMathState(){try{localStorage.setItem(LS_MATH,JSON.stringify(_mathState));}catch(e){toast('公式设置暂时无法保存',true);}}
function texInput(){return $('#texInput');}
function autoResizeTexInput(){const input=texInput();if(!input)return;input.style.height='auto';input.style.height=Math.min(420,Math.max(150,input.scrollHeight))+'px';_mathState.settings.inputHeight=parseInt(input.style.height,10)||150;saveMathState();}
function resetTexSize(){const input=texInput();if(!input)return;_texOutScale=1;_mathState.settings.fontSize=15;_mathState.settings.inputHeight=150;_mathState.settings.outScale=1;input.style.fontSize='15px';input.style.height='150px';$('#texSizeVal').textContent='15';applyOutScale();saveMathState();toast('已重置公式编辑器大小');}
function replaceTexSelection(wrapper,placeholder){const input=texInput();const s=input.selectionStart,e=input.selectionEnd;const selected=input.value.slice(s,e);const value=wrapper.replace('$CONTENT$',selected||placeholder);input.setRangeText(value,s,e,'end');input.focus();autoResizeTexInput();updateTexLive();}
function openTexMenu(name){$$('.tex-popover').forEach(p=>p.classList.toggle('open',p.getAttribute('data-popover')===name));_activeTexMenu=name;}
function closeTexMenus(){$$('.tex-popover').forEach(p=>p.classList.remove('open'));_activeTexMenu=null;}
const TEX_MENU_DATA={color:[['默认',''],['蓝色','\\color{blue}{$CONTENT$}'],['红色','\\color{red}{$CONTENT$}'],['绿色','\\color{green}{$CONTENT$}'],['橙色','\\color{orange}{$CONTENT$}'],['紫色','\\color{purple}{$CONTENT$}'],['黄色','\\color{yellow}{$CONTENT$}']],font:[['Roman','\\mathrm{$CONTENT$}'],['粗体','\\mathbf{$CONTENT$}'],['斜体','\\mathit{$CONTENT$}'],['下划线','\\underline{$CONTENT$}'],['无衬线','\\mathsf{$CONTENT$}'],['黑板粗体','\\mathbb{$CONTENT$}'],['书写体','\\mathcal{$CONTENT$}'],['Fraktur','\\mathfrak{$CONTENT$}']],size:[['tiny','{\\tiny $CONTENT$}'],['scriptsize','{\\scriptsize $CONTENT$}'],['small','{\\small $CONTENT$}'],['normal','{\\normalsize $CONTENT$}'],['large','{\\large $CONTENT$}'],['Large','{\\Large $CONTENT$}'],['LARGE','{\\LARGE $CONTENT$}'],['huge','{\\huge $CONTENT$}'],['Huge','{\\Huge $CONTENT$}']],environment:[['无环境',''],['align','\\begin{align}\n$CONTENT$\n\\end{align}'],['aligned','\\begin{aligned}\n$CONTENT$\n\\end{aligned}'],['gathered','\\begin{gathered}\n$CONTENT$\n\\end{gathered}'],['cases','\\begin{cases}\n$CONTENT$\n\\end{cases}'],['split','\\begin{split}\n$CONTENT$\n\\end{split}'],['array','\\begin{array}{cc}\n$CONTENT$\n\\end{array}']]};
function renderTexMenus(){Object.keys(TEX_MENU_DATA).forEach(function(name){const el=$('[data-popover="'+name+'"]');if(!el)return;el.innerHTML=TEX_MENU_DATA[name].map(function(item){return '<button type="button" data-menu-value="'+esc(item[1])+'">'+esc(item[0])+'</button>';}).join('');});}
function renderFavorites(){const list=$('#texFavList'),empty=$('#texFavEmpty');if(!list)return;empty.style.display=_mathState.favorites.length?'none':'';list.innerHTML=_mathState.favorites.map(function(f,i){return '<div class="tex-fav-item"><div class="tex-fav-preview" data-fav-preview="'+i+'">'+esc(f.tex)+'</div><div class="tex-fav-actions"><button class="bar-btn" type="button" data-fav-insert="'+i+'">插入</button><button class="bar-btn" type="button" data-fav-delete="'+i+'">删除</button></div></div>';}).join('');whenKatex().then(function(k){if(!k)return;$$('[data-fav-preview]',list).forEach(function(el){const f=_mathState.favorites[parseInt(el.getAttribute('data-fav-preview'),10)];try{k.render(f.tex,el,{displayMode:true,throwOnError:true,strict:false});}catch(e){el.textContent=f.tex;}});});}
function addFavorite(){const tex=texInput().value.trim();if(!tex){toast('公式为空，无法收藏',true);return;}if(_mathState.favorites.some(f=>f.tex===tex)){toast('该公式已收藏');return;}const name=tex.length>28?tex.slice(0,28)+'…':tex;_mathState.favorites.unshift({id:String(Date.now())+'-'+Math.random().toString(36).slice(2),name:name,tex:tex,createdAt:Date.now()});_mathState.favorites=_mathState.favorites.slice(0,100);saveMathState();renderFavorites();toast('已收藏当前公式');}
function applyTexMode(mode){const visual=mode==='visual';_mathState.settings.mode=visual?'visual':'source';$('#texInput').hidden=visual;$('#texVisual').hidden=!visual;$('#btnTexMode').textContent=visual?'源码':'可视化';if(visual){renderTexVisual();}else setTimeout(function(){texInput().focus();},20);saveMathState();}
function renderTexVisual(){const target=$('#texVisual');const tex=texInput().value.trim();if(!tex){target.innerHTML='<span class="tex-live-empty">输入公式开始预览</span>';return;}whenKatex().then(function(k){if(!k){target.innerHTML='<div class="tex-err-box">KaTeX 尚未加载</div>';return;}try{k.render(tex,target,{displayMode:true,throwOnError:true,strict:false});applyOutScaleTo(target);}catch(e){target.innerHTML='<div class="tex-err-box">语法错误<br>'+esc(String(e.message||'无法解析').slice(0,160))+'</div>';}});}
function renderTexCategories(){
  if(_texCatsInited)return;
  renderTexMenus();renderFavorites();_texCatsInited=true;
  const bar=$('#texCatbar');
  bar.innerHTML=TEX_CATS.map(cat=>`<div class="tex-cat" data-cat="${cat.id}"><div class="tex-cat-icon">${cat.icon}</div><div class="tex-cat-label">${cat.label}</div><div class="tex-cat-panel"><div class="tex-cat-panel-inner"><div class="tex-cat-groups">${cat.groups.map(g=>`<div class="tex-cat-group"><div class="tex-cat-group-title">${g.title}</div><div class="tex-cat-grid">${g.items.map(([tex,preview])=>`<button class="tex-cat-item" type="button" data-tex="${esc(tex)}" title="${esc(tex)}"><span class="tex-cat-item-preview" data-preview="${esc(preview)}">${esc(preview)}</span></button>`).join('')}</div></div>`).join('')}</div></div></div></div>`).join('');
  whenKatex().then(function(katex){if(!katex)return;$$('.tex-cat-item-preview',bar).forEach(function(el){const raw=el.getAttribute('data-preview')||'';try{katex.render(raw,el,{throwOnError:true,strict:false,output:'html'});}catch(e){el.textContent=raw;}});});
  bar.addEventListener('click',function(ev){const item=ev.target.closest('.tex-cat-item');if(!item)return;const tex=item.getAttribute('data-tex')||'';const input=$('#texInput');input.setRangeText(tex,input.selectionStart,input.selectionEnd,'end');input.focus();updateTexLive();});
  const tplGrid=$('#texTplGrid');
  tplGrid.innerHTML=TEX_TPL_LIB.map((t,i)=>`<button class="tex-tpl-item" type="button" data-tpl-idx="${i}"><span class="tex-tpl-name">${esc(t.name)}</span><span class="tex-tpl-formula" data-formula="${esc(t.tex)}"></span></button>`).join('');
  whenKatex().then(function(katex){if(!katex)return;$$('.tex-tpl-formula',tplGrid).forEach(function(el){const raw=el.getAttribute('data-formula')||'';try{katex.render(raw,el,{throwOnError:true,strict:false,output:'html'});}catch(e){el.textContent=raw;}});});
  tplGrid.addEventListener('click',function(ev){const item=ev.target.closest('[data-tpl-idx]');if(!item)return;const idx=parseInt(item.getAttribute('data-tpl-idx'),10);const t=TEX_TPL_LIB[idx];if(!t)return;const input=$('#texInput');input.setRangeText(t.tex,input.selectionStart,input.selectionEnd,'end');input.focus();updateTexLive();switchTexTab('tools');toast('已插入模板：'+t.name);});
}
function switchTexTab(tab){$$('.tex-tabbtn').forEach(b=>b.classList.toggle('on',b.getAttribute('data-tab')===tab));['Tools','Templates','Image','Document','Favs'].forEach(function(name){const el=$('#texTab'+name);if(el)el.style.display=((name.toLowerCase()===tab)?'':'none');});_mathState.settings.tab=tab;saveMathState();if(tab==='favs')renderFavorites();}
$('#texTabbar').addEventListener('click',function(ev){const b=ev.target.closest('[data-tab]');if(!b)return;switchTexTab(b.getAttribute('data-tab'));});
function updateTexLive(){const tex=$('#texInput').value.trim();const live=$('#texLive');if(!tex){live.innerHTML='<span class="tex-live-empty">输入公式开始预览</span>';return;}whenKatex().then(function(katex){if(!katex){live.innerHTML='<div class="tex-err-box">KaTeX 尚未加载</div>';return;}try{katex.render(tex,live,{displayMode:true,throwOnError:true,strict:false,output:'html'});applyOutScale();if(_mathState.settings.mode==='visual')renderTexVisual();}catch(err){live.innerHTML='<div class="tex-err-box">语法错误<br/>'+esc((err&&err.message)?String(err.message).slice(0,160):'无法解析')+'</div>';}});}
$('#texInput').addEventListener('input',function(){autoResizeTexInput();clearTimeout(updateTexLive._t);updateTexLive._t=setTimeout(updateTexLive,180);});
$('#texInput').addEventListener('focus',function(){_mathState.settings.inputHeight=parseInt(this.style.height,10)||150;});
$('#texEditorMode').addEventListener('click',function(ev){if(ev.target.id==='texVisual')applyTexMode('source');});
$('#texToolrow').addEventListener('click',function(ev){const action=ev.target.closest('[data-math-action]');if(!action)return;const type=action.getAttribute('data-math-action');if(type==='menu'){const name=action.getAttribute('data-menu');const pop=$('[data-popover="'+name+'"]');if(pop.classList.contains('open'))closeTexMenus();else openTexMenu(name);return;}if(type==='mode'){applyTexMode(_mathState.settings.mode==='visual'?'source':'visual');return;}if(type==='auto-size'){autoResizeTexInput();toast('已自动拉伸输入区');return;}if(type==='reset-size'){resetTexSize();return;}});
$$('[data-popover]').forEach(function(pop){pop.addEventListener('click',function(ev){const b=ev.target.closest('[data-menu-value]');if(!b)return;const value=b.getAttribute('data-menu-value');closeTexMenus();if(value)replaceTexSelection(value,'x');});});
document.addEventListener('click',function(ev){if(_activeTexMenu&&!ev.target.closest('.tex-menu-wrap'))closeTexMenus();});
$('#btnTexRender').addEventListener('click',function(){updateTexLive();toast('已渲染');});
$('#btnTexClear').addEventListener('click',function(){if(!$('#texInput').value.trim())return;$('#texInput').value='';updateTexLive();});
let _texFontSize=_mathState.settings.fontSize||15;
function setTexFontSize(value){_texFontSize=clampNum(value,11,24,15);_mathState.settings.fontSize=_texFontSize;$('#texInput').style.fontSize=_texFontSize+'px';$('#texSizeVal').textContent=_texFontSize;saveMathState();}
$('#btnTexSizeMinus').addEventListener('click',function(){setTexFontSize(_texFontSize-1);});
$('#btnTexSizePlus').addEventListener('click',function(){setTexFontSize(_texFontSize+1);});
$('#btnOutScaleMinus').addEventListener('click',function(){_texOutScale=Math.max(0.5,_texOutScale-0.1);_mathState.settings.outScale=_texOutScale;applyOutScale();saveMathState();});
$('#btnOutScalePlus').addEventListener('click',function(){_texOutScale=Math.min(2.5,_texOutScale+0.1);_mathState.settings.outScale=_texOutScale;applyOutScale();saveMathState();});
function applyOutScaleTo(root){(root||document).querySelectorAll('.katex').forEach(function(k){k.style.fontSize=(1.9*_texOutScale)+'em';});}
function applyOutScale(){$('#outScaleVal').textContent=Math.round(_texOutScale*100)+'%';applyOutScaleTo($('#texLive'));applyOutScaleTo($('#texVisual'));}
function extractTexCandidates(text){const out=[];const patterns=[/\$\$([\s\S]*?)\$\$/g,/\\\\\[([\s\S]*?)\\\\\]/g,/\\\\\(([\s\S]*?)\\\\\)/g,/\$([^$\n]+)\$/g];patterns.forEach(function(re){let m;while((m=re.exec(text))&&out.length<60){const value=m[1].trim();if(value&&!out.some(x=>x===value))out.push(value);}});return out;}
function renderDocumentCandidates(candidates){const box=$('#texDocumentCandidates');if(!candidates.length){box.innerHTML='<div class="tex-empty-hint">未找到明显公式，请复制 LaTeX 后手动粘贴。</div>';return;}box.innerHTML=candidates.map(function(tex,i){return '<div class="tex-candidate"><code>'+esc(tex)+'</code><button class="bar-btn" type="button" data-doc-candidate="'+i+'">插入此公式</button></div>';}).join('');box._items=candidates;}
$('#btnTexChooseImage').addEventListener('click',function(){$('#texImageFile').click();});
function loadTexImage(file){if(!file)return;if(!/^image\//i.test(file.type)){toast('请选择图片文件',true);return;}if(file.size>8*1024*1024){toast('图片不能超过 8MB',true);return;}const preview=$('#texImagePreview');if(preview._url)URL.revokeObjectURL(preview._url);const url=URL.createObjectURL(file);preview._url=url;preview.hidden=false;preview.innerHTML='<img src="'+url+'" alt="公式参考图片"><div class="tex-hint">当前页面未配置 OCR，图片仅作本地参考；请在下方粘贴或输入 LaTeX。</div>';$('#texImageResult').focus();}
$('#texImageFile').addEventListener('change',function(){loadTexImage(this.files&&this.files[0]);});
$('#texImageDropzone').addEventListener('dragover',function(ev){ev.preventDefault();this.classList.add('dragging');});
$('#texImageDropzone').addEventListener('dragleave',function(){this.classList.remove('dragging');});
$('#texImageDropzone').addEventListener('drop',function(ev){ev.preventDefault();this.classList.remove('dragging');loadTexImage(ev.dataTransfer&&ev.dataTransfer.files&&ev.dataTransfer.files[0]);});
$('#btnTexUseImageResult').addEventListener('click',function(){const value=$('#texImageResult').value.trim();if(!value){toast('请先输入识别结果',true);return;}texInput().value=value;autoResizeTexInput();updateTexLive();switchTexTab('tools');toast('已导入图片识别结果');});
$('#btnTexChooseDocument').addEventListener('click',function(){$('#texDocumentFile').click();});
$('#texDocumentFile').addEventListener('change',function(){const file=this.files&&this.files[0];if(!file)return;const ext=(file.name.split('.').pop()||'').toLowerCase();if(!['txt','md','markdown','tex','latex'].includes(ext)){toast('当前仅支持 TXT、Markdown、LaTeX 文本文件',true);return;}if(file.size>4*1024*1024){toast('文档不能超过 4MB',true);return;}const reader=new FileReader();reader.onload=function(){renderDocumentCandidates(extractTexCandidates(String(reader.result||'')));};reader.onerror=function(){toast('读取文档失败',true);};reader.readAsText(file);});
$('#texDocumentCandidates').addEventListener('click',function(ev){const b=ev.target.closest('[data-doc-candidate]');if(!b)return;const value=this._items&&this._items[parseInt(b.getAttribute('data-doc-candidate'),10)];if(!value)return;texInput().value=value;autoResizeTexInput();updateTexLive();switchTexTab('tools');toast('已插入文档公式');});
$('#btnTexFavorite').addEventListener('click',addFavorite);
$('#btnTexClearFavs').addEventListener('click',function(){if(!_mathState.favorites.length)return;if(confirm('确定清空全部收藏公式吗？')){_mathState.favorites=[];saveMathState();renderFavorites();toast('已清空收藏');}});
$('#texFavList').addEventListener('click',function(ev){const ins=ev.target.closest('[data-fav-insert]'),del=ev.target.closest('[data-fav-delete]');if(ins){const f=_mathState.favorites[parseInt(ins.getAttribute('data-fav-insert'),10)];if(f){texInput().value=f.tex;autoResizeTexInput();updateTexLive();switchTexTab('tools');}}if(del){_mathState.favorites.splice(parseInt(del.getAttribute('data-fav-delete'),10),1);saveMathState();renderFavorites();}});
$('#btnTexAI').addEventListener('click',function(){toast('AI 公式助手尚未连接服务；可先使用图片/文档导入并手动校对。');});
$('#btnTexSettings').addEventListener('click',function(){toast('设置已自动保存：输入字号、输入区高度和输出缩放。');});
function openMathModal(){renderTexCategories();_texOutScale=_mathState.settings.outScale||1;setTexFontSize(_mathState.settings.fontSize||15);texInput().style.height=(_mathState.settings.inputHeight||150)+'px';updateTexLive();switchTexTab(_mathState.settings.tab||'tools');applyTexMode(_mathState.settings.mode||'source');openModal('#mathModal');setTimeout(function(){if(_mathState.settings.mode!=='visual')texInput().focus();},60);}
function insertTex(display){const tex=$('#texInput').value.trim();if(!tex){toast('公式为空',true);return;}if(display)insertBlock('$$\n'+tex+'\n$$');else{const s=srcEl.selectionStart,e=srcEl.selectionEnd;const text='$'+tex+'$';replaceRange(s,e,text,s+text.length);}closeModal('#mathModal');toast(display?'已插入块级公式':'已插入行内公式');}
$('#btnTexInline').addEventListener('click',function(){insertTex(false);});
$('#btnTexBlock').addEventListener('click',function(){insertTex(true);});
$('#btnTexCopy').addEventListener('click',function(){const tex=$('#texInput').value.trim();if(!tex){toast('公式为空',true);return;}copyText(tex).then(()=>toast('已复制 LaTeX')).catch(()=>toast('复制失败',true));});
$('#texInput').addEventListener('keydown',function(ev){if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'){ev.preventDefault();insertTex(true);}});

/* 表单事件 */
srcEl.addEventListener('input',scheduleRender);
['#fTitle','#fSlug','#fDate','#fCategory','#fTags','#fDesc','#fCoverAlt','#fCoverPosition'].forEach(function(sel){$(sel).addEventListener('input',function(){if(sel==='#fTags')renderTagPicker(splitTags($('#fTags').value));if(sel==='#fCoverAlt'&&currentCover)renderCover();if(!_metaEditing){try{localStorage.setItem(LS_META,JSON.stringify(meta()));}catch(e){}markDirty();}});});
$('#fTitle').addEventListener('blur',function(){if(!$('#fSlug').value.trim()){const s=slugify($('#fTitle').value);if(s&&s!=='untitled')$('#fSlug').value=s;}});
$('#btnAddTag').addEventListener('click',function(){const input=$('#newTagName');const value=String(input.value||'').trim();if(!value)return;editorTags=uniqueList(editorTags.concat([value]));persistEditorTags();setTags(meta().tags.concat([value]));input.value='';if(!_metaEditing){try{localStorage.setItem(LS_META,JSON.stringify(meta()));}catch(e){}markDirty();}toast('已创建标签：'+value);});
$('#newTagName').addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();$('#btnAddTag').click();}});

(function initDivider(){const divider=$('#divider');const editor=$('#paneEditor');const workspace=$('#workspace');let dragging=false;function onMove(ev){if(!dragging)return;const rect=workspace.getBoundingClientRect();const x=((ev.clientX!==undefined?ev.clientX:ev.touches&&ev.touches[0].clientX))-rect.left;const pct=Math.max(20,Math.min(80,(x/rect.width)*100));editor.style.flexBasis=pct+'%';ev.preventDefault();}function onUp(){if(!dragging)return;dragging=false;divider.classList.remove('dragging');document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);document.removeEventListener('touchmove',onMove);document.removeEventListener('touchend',onUp);try{localStorage.setItem(LS_LAYOUT,editor.style.flexBasis);}catch(e){}}divider.addEventListener('mousedown',function(ev){if(window.innerWidth<980)return;dragging=true;divider.classList.add('dragging');document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);ev.preventDefault();});divider.addEventListener('touchstart',function(ev){if(window.innerWidth<980)return;dragging=true;divider.classList.add('dragging');document.addEventListener('touchmove',onMove,{passive:false});document.addEventListener('touchend',onUp);ev.preventDefault();});divider.addEventListener('dblclick',function(){editor.style.flexBasis='50%';try{localStorage.setItem(LS_LAYOUT,'50%');}catch(e){}});try{const saved=localStorage.getItem(LS_LAYOUT);if(saved)editor.style.flexBasis=saved;}catch(e){}})();

document.addEventListener('keydown',function(ev){const metaKey=ev.ctrlKey||ev.metaKey;if(!metaKey){if(ev.key==='Tab'&&ev.target===srcEl){ev.preventDefault();const s=srcEl.selectionStart;replaceRange(s,srcEl.selectionEnd,'  ',s+2);}return;}const k=ev.key.toLowerCase();if($('#metaModal').classList.contains('open')){if(k==='s'){ev.preventDefault();saveMetaModal();}return;}if(k==='s'){ev.preventDefault();saveDraft(false);}else if(k==='b'){ev.preventDefault();ACTIONS.bold();}else if(k==='i'){ev.preventDefault();ACTIONS.italic();}else if(k==='k'){ev.preventDefault();ACTIONS.link();}else if(k==='e'){ev.preventDefault();exportFile();}else if(k==='m'){ev.preventDefault();openMetaModal();}else if(k==='1'){ev.preventDefault();toggleView();}else if(k==='enter'){ev.preventDefault();openImport();}});
window.addEventListener('beforeunload',function(){if(srcEl.value!==lastSaved&&srcEl.value.trim())saveDraft(true);});

function sampleDoc(){
  return [
    '这是一篇用编辑器写出的示例文章。左边写 Markdown，右边实时预览你的主题效果。',
    '','## 代码块','',
    '代码块右上角有复制按钮，左上角的语言标签可以点击切换语言。',
    '','```bash',
    '# 查看目录内容','ls -a','cd ~/project',
    '```','',
    '## 提示块','',
    '::: tip TIP','在代码块语言标签里填任何语言都可以，没有限制。',':::','',
    '## 行内公式','',
    '质能方程 $E = mc^2$ 是狭义相对论的著名结论。',
    '','## 块级公式','',
    '$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$',
    '','## 表格与列表','',
    '| 命令 | 作用 |','| :--- | :--- |',
    '| `pwd` | 显示当前路径 |','| `ls` | 列出目录内容 |','',
    '- 无序列表','- 也可以嵌套','  - 第二层','',
    '> 引用一段话，用于强调。','',
    '---','',
    '需要填写标题/封面/标签？点顶栏的「编辑文章」。'
  ].join('\n');
}

loadLocalTagLibrary();
loadDraft();
renderPostMenu();
renderTagPicker(meta().tags);
renderCover();
render();
markDirty();
loadSiteData(false);
