mod storage;

use git2::{Cred, PushOptions, RemoteCallbacks, Repository};
use image::codecs::webp::WebPEncoder;
use image::imageops::FilterType;
use image::{ColorType, GenericImageView, ImageEncoder};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use tauri::Manager;

const APP_NAME: &str = "NarCard Editor";
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInfo {
    name: &'static str,
    version: &'static str,
    runtime: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectInfo {
    root: String,
    posts_path: String,
    index_path: String,
    markdown_path: String,
    posts_count: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectSnapshot {
    project: ProjectInfo,
    posts_text: String,
    index_text: String,
    posts_version: String,
    index_version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MarkdownEntry {
    filename: String,
    size: u64,
    modified_ms: u128,
    version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MarkdownDocument {
    filename: String,
    content: String,
    size: u64,
    version: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PostInput {
    title: String,
    slug: String,
    date: String,
    excerpt: String,
    body: String,
    posts_version: Option<String>,
    index_version: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarkdownWriteInput {
    root: String,
    markdown_dir: String,
    filename: String,
    content: String,
    mode: String,
    expected_version: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WriteResult {
    filename: String,
    version: String,
    backup: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveResult {
    slug: String,
    backups: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeneratedPostInput {
    root: String,
    slug: String,
    function_name: String,
    post_line: String,
    body_code: String,
    posts_version: Option<String>,
    index_version: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CoverInput {
    root: String,
    filename: String,
    bytes: Vec<u8>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CoverResult {
    path: String,
    filename: String,
    width: u32,
    height: u32,
    bytes: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishInput {
    root: String,
    message: String,
    remote: Option<String>,
    branch: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PublishResult {
    changed: bool,
    commit: Option<String>,
    branch: String,
    remote: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SitePost {
    slug: String,
    title: String,
    iso: String,
    display: String,
    tags: Vec<String>,
    category: String,
    excerpt: String,
    cover: String,
    cover_alt: String,
    cover_position: String,
    body: String,
}

#[derive(Debug, Serialize)]
struct SiteTag {
    tag: String,
    count: usize,
}

#[derive(Debug, Serialize)]
struct SiteData {
    posts: Vec<SitePost>,
    tags: Vec<SiteTag>,
}

fn command_error(message: impl Into<String>) -> String {
    message.into()
}

fn count_posts(posts: &str) -> usize {
    posts.matches("{ slug:").count()
}

fn source_string_at(value: &str, start: usize) -> Option<(String, usize)> {
    let tail = value.get(start..)?.trim_start();
    let offset = value.len() - tail.len();
    let quote = tail.chars().next()?;

    if quote != '\'' && quote != '"' {
        return None;
    }

    let mut escaped = false;
    let mut output = String::new();

    for (index, character) in tail.char_indices().skip(1) {
        if escaped {
            output.push(character);
            escaped = false;
            continue;
        }

        if character == '\\' {
            escaped = true;
            continue;
        }

        if character == quote {
            return Some((output, offset + index + character.len_utf8()));
        }

        output.push(character);
    }

    None
}

fn field_string(line: &str, field: &str) -> String {
    let marker = format!("{}:", field);
    let Some(start) = line.find(&marker).map(|value| value + marker.len()) else {
        return String::new();
    };
    source_string_at(line, start)
        .map(|(value, _)| value)
        .unwrap_or_default()
}

fn site_data_from_posts(posts: &str) -> SiteData {
    let mut result = Vec::new();
    for line in posts.lines().filter(|line| line.contains("{ slug:")) {
        let tags = line
            .split("tags: [")
            .nth(1)
            .and_then(|value| value.split(']').next())
            .map(|value| {
                value
                    .split(',')
                    .map(|item| item.trim().trim_matches(['\'', '"']).to_string())
                    .filter(|item| !item.is_empty())
                    .collect()
            })
            .unwrap_or_default();
        result.push(SitePost {
            slug: field_string(line, "slug"),
            title: field_string(line, "title"),
            iso: field_string(line, "iso"),
            display: field_string(line, "display"),
            tags,
            category: field_string(line, "category"),
            excerpt: field_string(line, "excerpt"),
            cover: field_string(line, "cover"),
            cover_alt: field_string(line, "coverAlt"),
            cover_position: field_string(line, "coverPosition"),
            body: String::new(),
        });
    }
    let mut counts = std::collections::BTreeMap::new();
    for post in &result {
        for tag in &post.tags {
            *counts.entry(tag.clone()).or_insert(0) += 1;
        }
    }
    SiteData {
        posts: result,
        tags: counts
            .into_iter()
            .map(|(tag, count)| SiteTag { tag, count })
            .collect(),
    }
}

fn project_info(root: &Path, posts: &Path, index: &Path) -> Result<ProjectInfo, String> {
    let markdown = root.join("src/content/blog");
    let posts_text = storage::read_utf8(posts)?;
    Ok(ProjectInfo {
        root: root.display().to_string(),
        posts_path: posts.display().to_string(),
        index_path: index.display().to_string(),
        markdown_path: markdown.display().to_string(),
        posts_count: count_posts(&posts_text),
    })
}

fn validated_project(root: &str) -> Result<(PathBuf, PathBuf, PathBuf, PathBuf), String> {
    let (root, posts, index) = storage::project_paths(root)?;
    let markdown = root.join("src/content/blog");
    Ok((root, posts, index, markdown))
}

fn js_string(value: &str) -> Result<String, String> {
    serde_json::to_string(value).map_err(|error| format!("序列化文章字段失败：{error}"))
}

fn date_parts(date: &str) -> Option<(u32, u32, u32)> {
    let mut parts = date.split('-');
    let year = parts.next()?.parse::<u32>().ok()?;
    let month = parts.next()?.parse::<u32>().ok()?;
    let day = parts.next()?.parse::<u32>().ok()?;
    if parts.next().is_some() || !(1..=12).contains(&month) || year < 1 {
        return None;
    }
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days = match month {
        2 if leap => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    };
    (1..=days).contains(&day).then_some((year, month, day))
}

fn valid_date(date: &str) -> bool {
    date.len() == 10
        && date.as_bytes()[4] == b'-'
        && date.as_bytes()[7] == b'-'
        && date_parts(date).is_some()
}

fn has_existing_slug(posts: &str, slug: &str) -> bool {
    posts.contains(&format!("slug: '{}'", slug)) || posts.contains(&format!("slug: \"{}\"", slug))
}

fn format_post_line(post: &PostInput) -> Result<String, String> {
    let (_, month, day) = date_parts(&post.date).ok_or_else(|| "日期不是有效日期。".to_string())?;
    let month_name = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ][month as usize - 1];
    let short = format!("{} {:02}", month_name, day);
    let display = format!("{} {:02}, {}", month_name, day, &post.date[..4]);
    Ok(format!(
        "  {{ slug: {}, title: {}, iso: {}, short: {}, display: {}, tags: ['Notes'], category: 'Notes', variant: 0,\n    excerpt: {} }},",
        js_string(&post.slug)?,
        js_string(&post.title)?,
        js_string(&post.date)?,
        js_string(&short)?,
        js_string(&display)?,
        js_string(&post.excerpt)?
    ))
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn markdown_to_html(markdown: &str) -> String {
    let mut html = Vec::new();
    let mut paragraph = Vec::new();
    let flush = |html: &mut Vec<String>, paragraph: &mut Vec<String>| {
        if !paragraph.is_empty() {
            html.push(format!("<p>{}</p>", paragraph.join(" ")));
            paragraph.clear();
        }
    };
    for line in markdown.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            flush(&mut html, &mut paragraph);
        } else if let Some(heading) = trimmed.strip_prefix("### ") {
            flush(&mut html, &mut paragraph);
            html.push(format!("<h3>{}</h3>", escape_html(heading)));
        } else if let Some(heading) = trimmed.strip_prefix("## ") {
            flush(&mut html, &mut paragraph);
            html.push(format!("<h2>{}</h2>", escape_html(heading)));
        } else if let Some(heading) = trimmed.strip_prefix("# ") {
            flush(&mut html, &mut paragraph);
            html.push(format!("<h1>{}</h1>", escape_html(heading)));
        } else if let Some(item) = trimmed.strip_prefix("- ") {
            flush(&mut html, &mut paragraph);
            html.push(format!("<ul><li>{}</li></ul>", escape_html(item)));
        } else {
            paragraph.push(escape_html(trimmed));
        }
    }
    flush(&mut html, &mut paragraph);
    html.join("\n")
}

fn format_body_function(post: &PostInput) -> Result<String, String> {
    let html = serde_json::to_string(&markdown_to_html(&post.body))
        .map_err(|error| format!("序列化正文失败：{error}"))?;
    Ok(format!(
        "function article_{}() {{\n  return {};\n}}\n",
        post.slug.replace('-', "_"),
        html
    ))
}

fn validate_post_input(post: &PostInput) -> Result<(), String> {
    if post.slug.is_empty()
        || !post
            .slug
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
    {
        return Err(command_error("Slug 只能包含 ASCII 字母、数字和连字符。"));
    }
    if post.slug.contains("..") || post.slug.len() > 100 {
        return Err(command_error("Slug 不能包含路径片段，且长度不能超过 100。"));
    }
    if !valid_date(&post.date) {
        return Err(command_error("日期必须使用有效的 YYYY-MM-DD 格式。"));
    }
    if post.body.len() as u64 > storage::MAX_FILE_BYTES {
        return Err(command_error("正文超过 5 MB 大小限制。"));
    }
    Ok(())
}

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        name: APP_NAME,
        version: APP_VERSION,
        runtime: "tauri-v2",
    }
}

#[tauri::command]
fn read_site_data(root: String) -> Result<SiteData, String> {
    let (_, posts_path, _, _) = validated_project(&root)?;
    let posts = storage::read_utf8(&posts_path)?;
    Ok(site_data_from_posts(&posts))
}

fn git_error(context: &str, error: git2::Error) -> String {
    format!("{context}：{}", error.message())
}

// 使用仓库配置和本机凭据代理执行 Git push，不执行 shell 命令。
fn push_repository(repository: &Repository, remote_name: &str, branch: &str) -> Result<(), String> {
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|url, username, _| {
        if let Some(username) = username {
            if let Ok(credentials) = Cred::ssh_key_from_agent(username) {
                return Ok(credentials);
            }
        }
        if let Ok(credentials) = Cred::default() {
            return Ok(credentials);
        }
        Err(git2::Error::from_str(&format!(
            "无法为远程地址 {url} 获取 Git 凭据"
        )))
    });

    let mut options = PushOptions::new();
    options.remote_callbacks(callbacks);
    let mut remote = repository
        .find_remote(remote_name)
        .map_err(|error| git_error("读取 Git remote 失败", error))?;
    let refspec = format!("refs/heads/{branch}:refs/heads/{branch}");
    remote
        .push(&[refspec.as_str()], Some(&mut options))
        .map_err(|error| git_error("Git push 失败", error))
}

// 将当前项目变更提交并推送到已配置的 Git remote。
#[tauri::command]
fn publish_project(input: PublishInput) -> Result<PublishResult, String> {
    let (root, _, _, _) = validated_project(&input.root)?;
    let repository =
        Repository::discover(&root).map_err(|error| git_error("当前项目不在 Git 仓库中", error))?;
    let workdir = repository
        .workdir()
        .ok_or("Git 仓库没有工作目录，暂不支持 bare repository。")?;
    let canonical_workdir =
        fs::canonicalize(workdir).map_err(|error| format!("解析 Git 工作目录失败：{error}"))?;
    if canonical_workdir != root {
        return Err("Git 仓库根目录与所选项目目录不一致。".into());
    }

    let head = repository
        .head()
        .map_err(|error| git_error("读取当前 Git 分支失败", error))?;
    let branch = head
        .shorthand()
        .ok_or("当前 HEAD 不是可发布的本地分支。")?
        .to_string();
    let remote_name = input.remote.unwrap_or_else(|| "origin".to_string());
    let message = input.message.trim();
    if message.is_empty() || message.len() > 200 {
        return Err("提交信息不能为空，且长度不能超过 200 个字符。".into());
    }
    if let Some(requested_branch) = input.branch.as_deref() {
        if requested_branch != branch {
            return Err(format!(
                "当前分支是 {branch}，不能发布到指定的 {requested_branch}。"
            ));
        }
    }

    let statuses = repository
        .statuses(None)
        .map_err(|error| git_error("读取 Git 工作区状态失败", error))?;
    if statuses.is_empty() {
        return Ok(PublishResult {
            changed: false,
            commit: None,
            branch,
            remote: remote_name,
        });
    }

    let mut index = repository
        .index()
        .map_err(|error| git_error("读取 Git 索引失败", error))?;
    index
        .add_all(["*"], git2::IndexAddOption::DEFAULT, None)
        .map_err(|error| git_error("暂存项目变更失败", error))?;
    index
        .write()
        .map_err(|error| git_error("写入 Git 索引失败", error))?;
    let tree_id = index
        .write_tree()
        .map_err(|error| git_error("生成 Git tree 失败", error))?;
    let tree = repository
        .find_tree(tree_id)
        .map_err(|error| git_error("读取 Git tree 失败", error))?;
    let signature = repository.signature().map_err(|error| {
        git_error(
            "读取 Git 用户身份失败，请先配置 user.name 和 user.email",
            error,
        )
    })?;
    let parent = head
        .peel_to_commit()
        .map_err(|error| git_error("读取当前提交失败", error))?;
    let commit_id = repository
        .commit(
            Some("HEAD"),
            &signature,
            &signature,
            message,
            &tree,
            &[&parent],
        )
        .map_err(|error| git_error("创建 Git commit 失败", error))?;

    push_repository(&repository, &remote_name, &branch)?;
    Ok(PublishResult {
        changed: true,
        commit: Some(commit_id.to_string()),
        branch,
        remote: remote_name,
    })
}

#[tauri::command]
fn write_cover(input: CoverInput) -> Result<CoverResult, String> {
    let (root, _, _, _) = validated_project(&input.root)?;
    let slug = Path::new(&input.filename)
        .file_stem()
        .and_then(|value| value.to_str())
        .ok_or("无法从封面文件名解析 slug。")?;
    if slug.is_empty()
        || !slug
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
    {
        return Err("封面 slug 只能包含 ASCII 字母、数字和连字符。".into());
    }
    if input.bytes.len() > 8 * 1024 * 1024 {
        return Err("封面超过 8 MB 大小限制。".into());
    }

    let decoded = image::load_from_memory(&input.bytes)
        .map_err(|error| format!("无法解析封面图片：{error}"))?;
    let (original_width, _original_height) = decoded.dimensions();
    let image = if original_width > 1600 {
        decoded.resize(1600, 1600, FilterType::Lanczos3)
    } else {
        decoded
    };
    let (width, height) = image.dimensions();
    let rgba = image.to_rgba8();
    let mut encoded = Cursor::new(Vec::new());
    WebPEncoder::new_lossless(&mut encoded)
        .write_image(&rgba, width, height, ColorType::Rgba8.into())
        .map_err(|error| format!("编码 WebP 封面失败：{error}"))?;

    let filename = format!("{slug}-cover.webp");
    let covers = root.join("public/images/covers");
    fs::create_dir_all(&covers).map_err(|error| format!("创建封面目录失败：{error}"))?;
    let path = covers.join(&filename);
    storage::atomic_replace_bytes(&path, encoded.get_ref())?;

    Ok(CoverResult {
        path: format!("/images/covers/{filename}"),
        filename,
        width,
        height,
        bytes: encoded.get_ref().len(),
    })
}

#[tauri::command]
fn write_generated_post(input: GeneratedPostInput) -> Result<SaveResult, String> {
    if input.slug.is_empty()
        || !input
            .slug
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err("Slug 只能包含 ASCII 字母、数字和连字符。".into());
    }
    let (_, posts_path, index_path, _) = validated_project(&input.root)?;
    let posts_text = storage::read_utf8(&posts_path)?;
    let index_text = storage::read_utf8(&index_path)?;
    if let Some(expected) = input.posts_version.as_deref() {
        if expected != storage::version(&posts_text) {
            return Err("posts.ts 已被外部修改，请重新加载。".into());
        }
    }
    if let Some(expected) = input.index_version.as_deref() {
        if expected != storage::version(&index_text) {
            return Err("index.astro 已被外部修改，请重新加载。".into());
        }
    }
    if has_existing_slug(&posts_text, &input.slug) {
        return Err("已存在同 slug 文章，未执行写入。".into());
    }
    let posts_at = posts_text
        .rfind("] as const;")
        .ok_or("无法定位 posts.ts 插入位置。")?;
    let mut next_posts = posts_text.clone();
    next_posts.insert_str(posts_at, &format!("  {}\n", input.post_line));
    let index_at = index_text
        .find("function articleBody(post: DemoPost) {")
        .ok_or("无法定位 articleBody 插入位置。")?;
    let mut next_index = index_text.clone();
    next_index.insert_str(index_at, &format!("{}\n", input.body_code));
    let branch_at = next_index
        .find("function articleBody(post: DemoPost) {\n")
        .ok_or("无法定位正文分支位置。")?
        + "function articleBody(post: DemoPost) {\n".len();
    let fn_parts: Vec<&str> = input
        .slug
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|part| !part.is_empty())
        .collect();
    let fn_suffix = if fn_parts.is_empty() {
        format!(
            "{:x}",
            input
                .slug
                .bytes()
                .fold(2166136261u32, |hash, byte| hash.wrapping_mul(16777619)
                    ^ u32::from(byte))
        )
    } else {
        fn_parts
            .iter()
            .map(|part| {
                let mut chars = part.chars();
                chars
                    .next()
                    .map(|first| first.to_uppercase().to_string() + chars.as_str())
                    .unwrap_or_default()
            })
            .collect::<String>()
    };
    let function_name = format!("postBody{}Body", fn_suffix);
    if input.function_name != function_name
        || !input
            .body_code
            .contains(&format!("function {}()", function_name))
    {
        return Err("生成的正文函数名称与 slug 不匹配。".into());
    }
    next_index.insert_str(
        branch_at,
        &format!(
            "  if (post.slug === {:?}) return {}();\n",
            input.slug, function_name
        ),
    );
    let posts_backup = storage::write_with_backup(&posts_path, &posts_text, &next_posts)?;
    let index_backup = match storage::write_with_backup(&index_path, &index_text, &next_index) {
        Ok(path) => path,
        Err(error) => {
            let _ = storage::atomic_replace(&posts_path, &posts_text);
            return Err(format!("写入 index.astro 失败，已恢复 posts.ts：{error}"));
        }
    };
    Ok(SaveResult {
        slug: input.slug,
        backups: vec![
            posts_backup.display().to_string(),
            index_backup.display().to_string(),
        ],
    })
}

#[tauri::command]
fn validate_project(root: String) -> Result<ProjectInfo, String> {
    let (root, posts, index, _) = validated_project(&root)?;
    project_info(&root, &posts, &index)
}

#[tauri::command]
fn read_project(root: String) -> Result<ProjectSnapshot, String> {
    let (root, posts, index, _) = validated_project(&root)?;
    let posts_text = storage::read_utf8(&posts)?;
    let index_text = storage::read_utf8(&index)?;
    Ok(ProjectSnapshot {
        project: project_info(&root, &posts, &index)?,
        posts_version: storage::version(&posts_text),
        index_version: storage::version(&index_text),
        posts_text,
        index_text,
    })
}

#[tauri::command]
fn validate_markdown_dir(root: String, markdown_dir: String) -> Result<String, String> {
    let (_, selected) = storage::canonical_blog_dir(&root, &markdown_dir)?;
    Ok(selected.display().to_string())
}

#[tauri::command]
fn list_markdown(root: String, markdown_dir: String) -> Result<Vec<MarkdownEntry>, String> {
    let (_, directory) = storage::canonical_blog_dir(&root, &markdown_dir)?;
    let mut entries = Vec::new();
    for item in
        fs::read_dir(&directory).map_err(|error| format!("读取 Markdown 目录失败：{error}"))?
    {
        let item = item.map_err(|error| format!("读取目录项失败：{error}"))?;
        let path = item.path();
        let metadata =
            fs::symlink_metadata(&path).map_err(|error| format!("读取目录项信息失败：{error}"))?;
        let filename = item.file_name().to_string_lossy().to_string();
        if metadata.file_type().is_symlink() || !metadata.is_file() || !filename.ends_with(".md") {
            continue;
        }
        if storage::safe_markdown_filename(&filename).is_err() {
            continue;
        }
        let content = storage::read_utf8(&path)?;
        let modified_ms = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis())
            .unwrap_or_default();
        entries.push(MarkdownEntry {
            filename,
            size: metadata.len(),
            modified_ms,
            version: storage::version(&content),
        });
    }
    entries.sort_by(|left, right| left.filename.cmp(&right.filename));
    Ok(entries)
}

#[tauri::command]
fn read_markdown(
    root: String,
    markdown_dir: String,
    filename: String,
) -> Result<MarkdownDocument, String> {
    let (_, directory) = storage::canonical_blog_dir(&root, &markdown_dir)?;
    let path = storage::markdown_path(&directory, &filename)?;
    let content = storage::read_utf8(&path)?;
    let size = fs::metadata(&path)
        .map_err(|error| format!("读取文件信息失败：{error}"))?
        .len();
    Ok(MarkdownDocument {
        filename,
        size,
        version: storage::version(&content),
        content,
    })
}

#[tauri::command]
fn write_markdown(input: MarkdownWriteInput) -> Result<WriteResult, String> {
    let (_, directory) = storage::canonical_blog_dir(&input.root, &input.markdown_dir)?;
    let path = storage::markdown_path(&directory, &input.filename)?;
    if input.content.len() as u64 > storage::MAX_FILE_BYTES {
        return Err("Markdown 文件超过 5 MB 大小限制。".into());
    }
    let exists = path.exists();
    let current = if exists {
        Some(storage::read_utf8(&path)?)
    } else {
        None
    };
    match input.mode.as_str() {
        "create" if exists => return Err("目标 Markdown 已存在，请改用覆盖并确认版本。".into()),
        "create" => {}
        "overwrite" => {
            let expected = input
                .expected_version
                .ok_or("覆盖 Markdown 必须提供版本指纹。")?;
            let actual = current
                .as_deref()
                .map(storage::version)
                .ok_or("目标 Markdown 不存在。")?;
            if expected != actual {
                return Err("Markdown 已被其他程序修改，请重新读取后再保存。".into());
            }
        }
        _ => return Err("写入模式必须是 create 或 overwrite。".into()),
    }
    let backup = current
        .as_deref()
        .map(|original| storage::write_with_backup(&path, original, &input.content))
        .transpose()?
        .map(|path| path.display().to_string());
    if backup.is_none() {
        storage::atomic_replace(&path, &input.content)?;
    }
    Ok(WriteResult {
        filename: input.filename,
        version: storage::version(&input.content),
        backup,
    })
}

#[tauri::command]
fn save_post(root: String, post: PostInput) -> Result<SaveResult, String> {
    validate_post_input(&post)?;
    let (root, posts_path, index_path, _) = validated_project(&root)?;
    let posts_text = storage::read_utf8(&posts_path)?;
    let index_text = storage::read_utf8(&index_path)?;
    if let Some(expected) = post.posts_version.as_deref() {
        if expected != storage::version(&posts_text) {
            return Err("posts.ts 已被其他程序修改，请重新读取项目后再保存。".into());
        }
    }
    if let Some(expected) = post.index_version.as_deref() {
        if expected != storage::version(&index_text) {
            return Err("index.astro 已被其他程序修改，请重新读取项目后再保存。".into());
        }
    }
    if !posts_text.contains("export const posts = [") || !posts_text.contains("] as const;") {
        return Err(command_error("posts.ts 结构不匹配，未执行写入。"));
    }
    if !index_text.contains("function articleBody(post: DemoPost) {") {
        return Err(command_error(
            "index.astro 缺少 articleBody 锚点，未执行写入。",
        ));
    }
    if has_existing_slug(&posts_text, &post.slug) {
        return Err(command_error("已存在同 slug 文章，未执行写入。"));
    }

    let posts_at = posts_text
        .rfind("] as const;")
        .ok_or("无法定位 posts.ts 插入位置。")?;
    let mut next_posts = String::with_capacity(posts_text.len() + 256);
    next_posts.push_str(&posts_text[..posts_at]);
    if !next_posts.ends_with('\n') {
        next_posts.push('\n');
    }
    next_posts.push_str(&format_post_line(&post)?);
    next_posts.push('\n');
    next_posts.push_str(&posts_text[posts_at..]);

    let index_at = index_text
        .find("function articleBody(post: DemoPost) {")
        .ok_or("无法定位 articleBody 插入位置。")?;
    let function = format_body_function(&post)?;
    let branch = format!(
        "  if (post.slug === {:?}) return article_{}();\n",
        post.slug,
        post.slug.replace('-', "_")
    );
    let mut next_index =
        String::with_capacity(index_text.len() + function.len() + branch.len() + 100);
    next_index.push_str(&index_text[..index_at]);
    next_index.push_str(&function);
    next_index.push_str(&index_text[index_at..]);
    let article_open = next_index
        .find("function articleBody(post: DemoPost) {\n")
        .map(|offset| offset + "function articleBody(post: DemoPost) {\n".len())
        .ok_or("无法定位 articleBody 插入位置。")?;
    next_index.insert_str(article_open, &branch);

    let posts_backup = storage::write_with_backup(&posts_path, &posts_text, &next_posts)?;
    let index_backup = match storage::write_with_backup(&index_path, &index_text, &next_index) {
        Ok(path) => path,
        Err(error) => {
            let _ = storage::atomic_replace(&posts_path, &posts_text);
            return Err(format!("index.astro 写入失败，已恢复 posts.ts：{error}"));
        }
    };
    let _ = root;
    Ok(SaveResult {
        slug: post.slug,
        backups: vec![
            posts_backup.display().to_string(),
            index_backup.display().to_string(),
        ],
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Keep the development WebView2 profile separate from the default profile,
    // which can remain locked after an interrupted Tauri session on Windows.
    #[cfg(all(windows, debug_assertions))]
    {
        let dev_data_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join("webview2-dev");
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", dev_data_dir);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            read_site_data,
            write_cover,
            publish_project,
            write_generated_post,
            validate_project,
            read_project,
            validate_markdown_dir,
            list_markdown,
            read_markdown,
            write_markdown,
            save_post
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.set_title(APP_NAME)?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running NarCard Editor");
}

fn main() {
    run();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_unsafe_slugs() {
        assert!(!"../posts"
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-'));
        assert!("safe-post"
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-'));
    }

    #[test]
    fn validates_iso_dates() {
        assert!(valid_date("2026-10-21"));
        assert!(!valid_date("2026-02-29"));
        assert!(valid_date("2028-02-29"));
        assert!(!valid_date("2026/10/21"));
    }

    #[test]
    fn escapes_markdown_text_before_embedding() {
        let html = markdown_to_html("# Hello\n\n<script>alert(1)</script>");
        assert!(html.contains("<h1>Hello</h1>"));
        assert!(html.contains("&lt;script&gt;"));
        assert!(!html.contains("<script>"));
    }

    #[test]
    fn rejects_empty_publish_message() {
        assert!("".trim().is_empty());
        assert!("publish article".len() <= 200);
    }
}
