import '../styles.css';

const isTauri = '__TAURI_INTERNALS__' in window;
const $ = (id) => document.getElementById(id);
const state = {
  phase: 'idle',
  projectPath: '',
  markdownPath: '',
  project: null,
  markdownFiles: [],
  selectedMarkdown: '',
  selectedVersion: '',
  loaded: false,
  dirty: false,
  busy: false,
};

const messageOf = (error) => error?.message || String(error);
const log = (message, error = false) => {
  $('log').textContent = `${new Date().toLocaleTimeString()} ${message}`;
  $('log').style.color = error ? '#eaa6a6' : '';
};
const setStatus = (title, message, error = false) => {
  $('healthTitle').textContent = title;
  $('healthMessage').textContent = message;
  $('healthTitle').style.color = error ? '#eaa6a6' : '';
};
const invoke = async (command, args = {}) => {
  if (!isTauri) throw new Error('当前是浏览器模式，请使用桌面版执行文件操作。');
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke(command, args);
};
const chooseDirectory = async (title) => {
  if (!isTauri) throw new Error('浏览器模式不支持 Tauri 目录选择。');
  const { open } = await import('@tauri-apps/plugin-dialog');
  return open({ directory: true, multiple: false, title });
};

const setBusy = (busy) => {
  state.busy = busy;
  document.querySelectorAll('button, input, textarea, select').forEach((element) => {
    if (element.id === 'exportMarkdown') return;
    element.disabled = busy || element.dataset.ready === 'false';
  });
  updateControls();
};
const updateControls = () => {
  const project = Boolean(state.projectPath);
  const markdown = Boolean(state.markdownPath);
  const file = Boolean(state.selectedMarkdown);
  $('loadProject').disabled = state.busy || !project;
  $('savePost').disabled = state.busy || !project || !state.loaded;
  $('chooseMarkdown').disabled = state.busy || !project;
  $('refreshMarkdown').disabled = state.busy || !markdown;
  $('markdownFiles').disabled = state.busy || !markdown || !state.markdownFiles.length;
  $('loadMarkdown').disabled = state.busy || !markdown || !file;
  $('saveMarkdown').disabled = state.busy || !markdown || !file || !state.dirty;
  $('createMarkdown').disabled = state.busy || !markdown || !$('markdownFilename').value.trim();
  $('projectPath').textContent = state.projectPath || '尚未选择项目';
  $('markdownPath').textContent = state.markdownPath || '尚未选择 Markdown 目录';
};
const runOperation = async (label, operation) => {
  if (state.busy) return;
  state.phase = 'loading';
  setBusy(true);
  log(`${label}…`);
  try {
    const result = await operation();
    state.phase = 'ready';
    return result;
  } catch (error) {
    state.phase = 'error';
    const message = messageOf(error);
    setStatus(`${label}失败`, message, true);
    log(message, true);
    throw error;
  } finally {
    setBusy(false);
  }
};

const analyze = () => {
  const value = $('body').value;
  const plain = value.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`~\[\]()!-]/g, ' ').trim();
  $('analysis').textContent = `${[...plain].length} 字`;
};
const markDirty = () => {
  state.dirty = true;
  updateControls();
};
const metadata = () => ({
  title: $('title').value.trim() || '未命名文章',
  slug: $('slug').value.trim(),
  date: $('date').value || new Date().toISOString().slice(0, 10),
  excerpt: $('excerpt').value.trim(),
  body: $('body').value,
  postsVersion: state.project?.postsVersion,
  indexVersion: state.project?.indexVersion,
});
const selectMarkdownFile = () => {
  const filename = $('markdownFiles').value;
  state.selectedMarkdown = filename;
  $('markdownFilename').value = filename;
  const entry = state.markdownFiles.find((item) => item.filename === filename);
  state.selectedVersion = entry?.version || '';
  updateControls();
};
const renderMarkdownFiles = () => {
  const select = $('markdownFiles');
  select.innerHTML = '<option value="">选择一个 Markdown 文件</option>';
  state.markdownFiles.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.filename;
    option.textContent = `${item.filename} (${item.size} bytes)`;
    select.appendChild(option);
  });
  select.value = state.selectedMarkdown;
  updateControls();
};

$('date').value = new Date().toISOString().slice(0, 10);
$('runtimeBadge').textContent = isTauri ? 'Tauri 桌面版' : '浏览器模式';
['title', 'slug', 'date', 'excerpt', 'body'].forEach((id) => $(id).addEventListener('input', markDirty));
$('body').addEventListener('input', analyze);
$('markdownFiles').addEventListener('change', selectMarkdownFile);
$('markdownFilename').addEventListener('input', updateControls);
analyze();

$('chooseProject').addEventListener('click', async () => {
  await runOperation('验证项目', async () => {
    const path = await chooseDirectory('选择 Astro 项目目录');
    if (!path) return;
    const result = await invoke('validate_project', { root: path });
    Object.assign(state, { projectPath: result.root, project: null, markdownPath: '', markdownFiles: [], selectedMarkdown: '', selectedVersion: '', loaded: false, dirty: false });
    $('markdownFilename').value = '';
    renderMarkdownFiles();
    updateControls();
    setStatus('项目已验证', `找到 ${result.postsPath}、${result.indexPath} 和 Markdown 目录。`);
    log(`已选择项目：${result.root}`);
  }).catch(() => {});
});

$('loadProject').addEventListener('click', async () => {
  await runOperation('读取项目', async () => {
    const result = await invoke('read_project', { root: state.projectPath });
    state.project = result;
    state.loaded = true;
    state.dirty = false;
    setStatus('项目读取完成', `已读取 ${result.project.postsCount} 篇文章，并建立版本快照。`);
    log(`项目读取完成，posts.ts 版本 ${result.postsVersion}`);
  }).catch(() => {});
});

$('savePost').addEventListener('click', async () => {
  await runOperation('写入主框架', async () => {
    const post = metadata();
    if (!post.slug || !/^[a-z0-9][a-z0-9-]*$/i.test(post.slug)) throw new Error('Slug 只能包含字母、数字和连字符。');
    const result = await invoke('save_post', { root: state.projectPath, post });
    state.dirty = false;
    state.loaded = false;
    state.project = null;
    setStatus('文章写入成功', '原文件已备份；请重新读取项目后再进行下一次主框架写入。');
    log(`已写入 ${post.slug}；备份：${result.backups.join('、')}`);
  }).catch(() => {});
});

$('chooseMarkdown').addEventListener('click', async () => {
  await runOperation('验证 Markdown 目录', async () => {
    const path = await chooseDirectory('选择项目内的 src/content/blog 目录');
    if (!path) return;
    const validated = await invoke('validate_markdown_dir', { root: state.projectPath, markdownDir: path });
    state.markdownPath = validated;
    state.selectedMarkdown = '';
    state.selectedVersion = '';
    await refreshMarkdownFiles();
    setStatus('Markdown 目录已验证', '现在可以读取、新建或覆盖 Markdown 文件。');
    log(`已选择 Markdown 目录：${validated}`);
  }).catch(() => {});
});
const refreshMarkdownFiles = async () => {
  if (!state.markdownPath) return;
  state.markdownFiles = await invoke('list_markdown', { root: state.projectPath, markdownDir: state.markdownPath });
  renderMarkdownFiles();
  log(`已发现 ${state.markdownFiles.length} 个 Markdown 文件。`);
};
$('refreshMarkdown').addEventListener('click', async () => {
  await runOperation('刷新 Markdown 文件', refreshMarkdownFiles).catch(() => {});
});
$('loadMarkdown').addEventListener('click', async () => {
  await runOperation('读取 Markdown', async () => {
    const document = await invoke('read_markdown', { root: state.projectPath, markdownDir: state.markdownPath, filename: state.selectedMarkdown });
    $('body').value = document.content;
    state.selectedVersion = document.version;
    state.dirty = false;
    analyze();
    updateControls();
    setStatus('Markdown 读取完成', `${document.filename} · ${document.size} bytes`);
  }).catch(() => {});
});
$('saveMarkdown').addEventListener('click', async () => {
  await runOperation('保存 Markdown', async () => {
    const document = await invoke('write_markdown', {
      root: state.projectPath,
      markdownDir: state.markdownPath,
      filename: state.selectedMarkdown,
      content: $('body').value,
      mode: 'overwrite',
      expectedVersion: state.selectedVersion,
    });
    state.selectedVersion = document.version;
    state.dirty = false;
    await refreshMarkdownFiles();
    setStatus('Markdown 保存成功', document.backup ? `已创建备份：${document.backup}` : '文件已安全写入。');
  }).catch(() => {});
});
$('createMarkdown').addEventListener('click', async () => {
  await runOperation('新建 Markdown', async () => {
    const filename = $('markdownFilename').value.trim();
    const document = await invoke('write_markdown', {
      root: state.projectPath,
      markdownDir: state.markdownPath,
      filename,
      content: $('body').value,
      mode: 'create',
    });
    state.selectedMarkdown = document.filename;
    state.selectedVersion = document.version;
    state.dirty = false;
    await refreshMarkdownFiles();
    $('markdownFiles').value = document.filename;
    setStatus('Markdown 创建成功', `${document.filename} 已写入项目内容集合。`);
  }).catch(() => {});
});

$('exportMarkdown').addEventListener('click', () => {
  const post = metadata();
  const content = `---\ntitle: ${JSON.stringify(post.title)}\ndescription: ${JSON.stringify(post.excerpt)}\npubDate: ${post.date}\n---\n\n${post.body}\n`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  link.download = `${post.slug || 'untitled'}.md`;
  link.click();
  URL.revokeObjectURL(link.href);
  log(`已导出 ${link.download}`);
});

if (isTauri) {
  invoke('get_app_info').then((info) => {
    setStatus('Rust 已连接', `${info.name} ${info.version} · 文件操作由 Rust 执行。`);
    log('Tauri 通信测试通过。');
  }).catch((error) => setStatus('Rust 连接失败', messageOf(error), true));
} else {
  setStatus('浏览器预览模式', '导出功能可用；请在 Tauri 桌面版中选择目录并执行文件操作。');
  log('当前未检测到 Tauri 运行时。');
}
updateControls();
