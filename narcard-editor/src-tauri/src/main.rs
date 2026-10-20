use serde::{Deserialize, Serialize};
use std::fs;
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
    posts_count: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PostInput {
    title: String,
    slug: String,
    date: String,
    excerpt: String,
    body: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveResult {
    slug: String,
    backups: Vec<String>,
}

fn command_error(message: impl Into<String>) -> String {
    message.into()
}

fn expected_files(root: &str) -> Result<(PathBuf, PathBuf), String> {
    let root_path = PathBuf::from(root);
    if !root_path.is_absolute() {
        return Err(command_error("项目路径必须是绝对路径。"));
    }
    if !root_path.is_dir() {
        return Err(command_error("项目路径不是目录。"));
    }

    let posts = root_path.join("src").join("data").join("posts.ts");
    let index = root_path.join("src").join("pages").join("index.astro");
    if !posts.is_file() || !index.is_file() {
        return Err(command_error(
            "目录结构不匹配：需要 src/data/posts.ts 和 src/pages/index.astro。",
        ));
    }
    Ok((posts, index))
}

fn count_posts(posts: &str) -> usize {
    posts.matches("{ slug:").count()
}

fn atomic_write(path: &Path, content: &str) -> Result<(), String> {
    let temp = path.with_extension(format!(
        "{}{}.tmp",
        path.extension().and_then(|v| v.to_str()).unwrap_or(""),
        std::process::id()
    ));
    fs::write(&temp, content).map_err(|error| format!("写入临时文件失败：{error}"))?;
    if let Err(error) = replace_file(&temp, path) {
        let _ = fs::remove_file(&temp);
        return Err(format!("替换文件失败：{error}"));
    }
    Ok(())
}

fn replace_file(temp: &Path, destination: &Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        // Windows cannot rename over an existing file, so remove only after the
        // complete temporary file has been written and flushed by fs::write.
        let old = destination.with_extension(format!(
            "{}{}.old",
            destination
                .extension()
                .and_then(|v| v.to_str())
                .unwrap_or(""),
            std::process::id()
        ));
        if old.exists() {
            fs::remove_file(&old).map_err(|error| format!("清理临时备份失败：{error}"))?;
        }
        if destination.exists() {
            fs::rename(destination, &old).map_err(|error| format!("准备替换文件失败：{error}"))?;
        }
        if let Err(error) = fs::rename(temp, destination) {
            if old.exists() {
                let _ = fs::rename(&old, destination);
            }
            return Err(error.to_string());
        }
        let _ = fs::remove_file(old);
        Ok(())
    }
    #[cfg(not(windows))]
    {
        fs::rename(temp, destination).map_err(|error| error.to_string())
    }
}

fn backup_and_write(path: &Path, original: &str, content: &str) -> Result<PathBuf, String> {
    let backup = PathBuf::from(format!("{}.bak", path.display()));
    fs::write(&backup, original).map_err(|error| format!("创建备份失败：{error}"))?;
    atomic_write(path, content)?;
    Ok(backup)
}

fn js_string(value: &str) -> Result<String, String> {
    serde_json::to_string(value).map_err(|error| format!("序列化文章字段失败：{error}"))
}

fn date_parts(date: &str) -> Option<(u32, u32, u32)> {
    let mut parts = date.split('-');
    let year = parts.next()?.parse::<u32>().ok()?;
    let month = parts.next()?.parse::<u32>().ok()?;
    let day = parts.next()?.parse::<u32>().ok()?;
    if parts.next().is_some() || !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }
    Some((year, month, day))
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

fn valid_date(date: &str) -> bool {
    date.len() == 10
        && date.as_bytes()[4] == b'-'
        && date.as_bytes()[7] == b'-'
        && date_parts(date).is_some()
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

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        name: APP_NAME,
        version: APP_VERSION,
        runtime: "tauri-v2",
    }
}

#[tauri::command]
fn validate_project(root: String) -> Result<ProjectInfo, String> {
    let (posts, index) = expected_files(&root)?;
    let posts_text =
        fs::read_to_string(&posts).map_err(|error| format!("读取 posts.ts 失败：{error}"))?;
    Ok(ProjectInfo {
        root,
        posts_path: posts.display().to_string(),
        index_path: index.display().to_string(),
        posts_count: count_posts(&posts_text),
    })
}

#[tauri::command]
fn read_project(root: String) -> Result<ProjectInfo, String> {
    validate_project(root)
}

#[tauri::command]
fn save_post(root: String, post: PostInput) -> Result<SaveResult, String> {
    if post.slug.is_empty()
        || !post
            .slug
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err(command_error("Slug 只能包含 ASCII 字母、数字和连字符。"));
    }
    if post.slug.contains("..") {
        return Err(command_error("Slug 不能包含路径片段。"));
    }
    if !valid_date(&post.date) {
        return Err(command_error("日期必须使用 YYYY-MM-DD 格式。"));
    }

    let (posts_path, index_path) = expected_files(&root)?;
    let posts_text =
        fs::read_to_string(&posts_path).map_err(|error| format!("读取 posts.ts 失败：{error}"))?;
    let index_text = fs::read_to_string(&index_path)
        .map_err(|error| format!("读取 index.astro 失败：{error}"))?;

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

    let posts_anchor = "] as const;";
    let posts_at = posts_text
        .rfind(posts_anchor)
        .ok_or_else(|| command_error("无法定位 posts.ts 插入位置。"))?;
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
        .ok_or_else(|| command_error("无法定位 articleBody 插入位置。"))?;
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
        .ok_or_else(|| command_error("无法定位 articleBody 插入位置。"))?;
    next_index.insert_str(article_open, &branch);

    let posts_backup = backup_and_write(&posts_path, &posts_text, &next_posts)?;
    let index_backup = match backup_and_write(&index_path, &index_text, &next_index) {
        Ok(path) => path,
        Err(error) => {
            let _ = fs::copy(&posts_backup, &posts_path);
            return Err(format!("index.astro 写入失败，已恢复 posts.ts：{error}"));
        }
    };

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
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            validate_project,
            read_project,
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
        assert!(!valid_date("2026/10/21"));
        assert!(!valid_date("2026-1-1"));
    }

    #[test]
    fn escapes_markdown_text_before_embedding() {
        let html = markdown_to_html("# Hello\n\n<script>alert(1)</script>");
        assert!(html.contains("<h1>Hello</h1>"));
        assert!(html.contains("&lt;script&gt;"));
        assert!(!html.contains("<script>"));
    }
}
