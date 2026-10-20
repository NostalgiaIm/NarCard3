import '../styles.css';

const isTauri = '__TAURI_INTERNALS__' in window;
const $ = (id) => document.getElementById(id);
const state = { projectPath: '', loaded: false };

const log = (message, error = false) => {
  const line = `${new Date().toLocaleTimeString()} ${message}`;
  $('log').textContent = line;
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

const chooseDirectory = async () => {
  if (!isTauri) throw new Error('浏览器模式不支持 Tauri 目录选择。');
  const { open } = await import('@tauri-apps/plugin-dialog');
  return open({ directory: true, multiple: false, title: '选择 Astro 项目目录' });
};

const updateControls = () => {
  const selected = Boolean(state.projectPath);
  $('loadProject').disabled = !selected;
  $('savePost').disabled = !selected || !state.loaded;
  $('projectPath').textContent = state.projectPath || '尚未选择项目';
};

const analyze = () => {
  const value = $('body').value;
  const plain = value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*_`~\[\]()!-]/g, ' ')
    .trim();
  $('analysis').textContent = `${[...plain].length} 字`;
};

const metadata = () => ({
  title: $('title').value.trim() || '未命名文章',
  slug: $('slug').value.trim(),
  date: $('date').value || new Date().toISOString().slice(0, 10),
  excerpt: $('excerpt').value.trim(),
  body: $('body').value,
});

$('date').value = new Date().toISOString().slice(0, 10);
$('runtimeBadge').textContent = isTauri ? 'Tauri 桌面版' : '浏览器模式';
$('body').addEventListener('input', analyze);
analyze();

$('chooseProject').addEventListener('click', async () => {
  try {
    const path = await chooseDirectory();
    if (!path) return;
    const result = await invoke('validate_project', { root: path });
    state.projectPath = result.root;
    state.loaded = false;
    updateControls();
    setStatus('项目已验证', `找到 ${result.postsPath} 和 ${result.indexPath}`);
    log(`已选择项目：${result.root}`);
  } catch (error) {
    setStatus('项目验证失败', error.message || String(error), true);
    log(error.message || String(error), true);
  }
});

$('loadProject').addEventListener('click', async () => {
  try {
    const result = await invoke('read_project', { root: state.projectPath });
    state.loaded = true;
    if (result.postsCount > 0) {
      log(`已读取项目，发现 ${result.postsCount} 篇文章。`);
    } else {
      log('项目已读取，但没有识别到文章条目。');
    }
    setStatus('项目读取完成', '现在可以安全写入新文章。');
  } catch (error) {
    log(error.message || String(error), true);
    setStatus('读取失败', error.message || String(error), true);
  }
});

$('savePost').addEventListener('click', async () => {
  try {
    const post = metadata();
    if (!post.slug || !/^[a-z0-9][a-z0-9-]*$/i.test(post.slug)) {
      throw new Error('Slug 只能包含字母、数字和连字符。');
    }
    const result = await invoke('save_post', { root: state.projectPath, post });
    log(`已写入 ${post.slug}；备份：${result.backups.join('、')}`);
    setStatus('文章写入成功', '原文件已备份，两个目标文件已原子替换。');
  } catch (error) {
    log(error.message || String(error), true);
    setStatus('写入失败', error.message || String(error), true);
  }
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
  }).catch((error) => setStatus('Rust 连接失败', error.message || String(error), true));
} else {
  setStatus('浏览器预览模式', '导出功能可用；请在 Tauri 桌面版中选择目录并写入文件。');
  log('当前未检测到 Tauri 运行时。');
}

updateControls();
