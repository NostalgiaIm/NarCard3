use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub const MAX_FILE_BYTES: u64 = 5 * 1024 * 1024;

pub fn canonical_root(root: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(root);
    if !path.is_absolute() {
        return Err("项目路径必须是绝对路径。".into());
    }
    let root = fs::canonicalize(&path).map_err(|error| format!("无法解析项目路径：{error}"))?;
    if !root.is_dir() {
        return Err("项目路径不是目录。".into());
    }
    Ok(root)
}

pub fn project_paths(root: &str) -> Result<(PathBuf, PathBuf, PathBuf), String> {
    let root = canonical_root(root)?;
    let posts = root.join("src").join("data").join("posts.ts");
    let index = root.join("src").join("pages").join("index.astro");
    let blog = root.join("src").join("content").join("blog");
    let posts_meta =
        fs::symlink_metadata(&posts).map_err(|error| format!("读取 posts.ts 信息失败：{error}"))?;
    let index_meta = fs::symlink_metadata(&index)
        .map_err(|error| format!("读取 index.astro 信息失败：{error}"))?;
    if posts_meta.file_type().is_symlink() || index_meta.file_type().is_symlink() {
        return Err("项目源文件不能是符号链接。".into());
    }
    if !posts_meta.is_file() || !index_meta.is_file() {
        return Err("目录结构不匹配：需要 src/data/posts.ts 和 src/pages/index.astro。".into());
    }
    if !blog.is_dir() {
        return Err("目录结构不匹配：需要 src/content/blog Markdown 目录。".into());
    }
    Ok((root, posts, index))
}

pub fn canonical_blog_dir(root: &str, markdown_dir: &str) -> Result<(PathBuf, PathBuf), String> {
    let (root, _, _) = project_paths(root)?;
    let expected_path = root.join("src/content/blog");
    let expected_meta = fs::symlink_metadata(&expected_path)
        .map_err(|error| format!("读取 Markdown 目录信息失败：{error}"))?;
    if expected_meta.file_type().is_symlink() {
        return Err("项目的 Markdown 目录不能是符号链接。".into());
    }
    let expected = fs::canonicalize(&expected_path)
        .map_err(|error| format!("无法解析 Markdown 目录：{error}"))?;
    let selected_meta = fs::symlink_metadata(markdown_dir)
        .map_err(|error| format!("读取所选目录信息失败：{error}"))?;
    if selected_meta.file_type().is_symlink() {
        return Err("所选 Markdown 目录不能是符号链接。".into());
    }
    let selected = fs::canonicalize(markdown_dir)
        .map_err(|error| format!("无法解析所选 Markdown 目录：{error}"))?;
    if selected != expected {
        return Err("Markdown 目录必须是项目内的 src/content/blog。".into());
    }
    Ok((root, selected))
}

pub fn read_utf8(path: &Path) -> Result<String, String> {
    let metadata =
        fs::symlink_metadata(path).map_err(|error| format!("读取文件信息失败：{error}"))?;
    if metadata.file_type().is_symlink() {
        return Err("不允许读取符号链接文件。".into());
    }
    if !metadata.is_file() {
        return Err("目标不是普通文件。".into());
    }
    if metadata.len() > MAX_FILE_BYTES {
        return Err(format!(
            "文件超过 {} MB 大小限制。",
            MAX_FILE_BYTES / 1024 / 1024
        ));
    }
    fs::read_to_string(path).map_err(|error| format!("读取 UTF-8 文件失败：{error}"))
}

pub fn version(content: &str) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in content.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

pub fn safe_markdown_filename(filename: &str) -> Result<(), String> {
    if filename.len() < 4 || filename.len() > 120 || !filename.ends_with(".md") {
        return Err("Markdown 文件名必须是 4-120 个字符并以 .md 结尾。".into());
    }
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err("Markdown 文件名不能包含路径片段。".into());
    }
    let stem = &filename[..filename.len() - 3];
    if stem.is_empty() || !stem.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("Markdown 文件名只能使用字母、数字和连字符。".into());
    }
    let device = stem.to_ascii_uppercase();
    if matches!(
        device.as_str(),
        "CON" | "PRN" | "AUX" | "NUL" | "COM1" | "LPT1"
    ) {
        return Err("Markdown 文件名不能使用 Windows 设备名。".into());
    }
    Ok(())
}

pub fn markdown_path(dir: &Path, filename: &str) -> Result<PathBuf, String> {
    safe_markdown_filename(filename)?;
    Ok(dir.join(filename))
}

pub fn unique_id() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    format!("{}-{}", millis, std::process::id())
}

pub fn atomic_replace_bytes(path: &Path, content: &[u8]) -> Result<(), String> {
    let temp = path.with_file_name(format!(
        ".{}.{}.tmp",
        path.file_name().unwrap_or_default().to_string_lossy(),
        unique_id()
    ));
    fs::write(&temp, content).map_err(|error| format!("写入临时文件失败：{error}"))?;
    #[cfg(windows)]
    {
        let old = path.with_file_name(format!(
            ".{}.{}.old",
            path.file_name().unwrap_or_default().to_string_lossy(),
            unique_id()
        ));
        if path.exists() {
            fs::rename(path, &old).map_err(|error| format!("准备替换文件失败：{error}"))?;
        }
        if let Err(error) = fs::rename(&temp, path) {
            if old.exists() {
                let _ = fs::rename(&old, path);
            }
            let _ = fs::remove_file(&temp);
            return Err(format!("替换文件失败：{error}"));
        }
        let _ = fs::remove_file(old);
    }
    #[cfg(not(windows))]
    fs::rename(&temp, path).map_err(|error| format!("替换文件失败：{error}"))?;
    Ok(())
}

pub fn atomic_replace(path: &Path, content: &str) -> Result<(), String> {
    atomic_replace_bytes(path, content.as_bytes())
}

pub fn backup_path(path: &Path) -> PathBuf {
    path.with_file_name(format!(
        "{}.bak",
        path.file_name().unwrap_or_default().to_string_lossy()
    ))
}

pub fn write_with_backup(path: &Path, original: &str, content: &str) -> Result<PathBuf, String> {
    let backup = backup_path(path);
    fs::write(&backup, original).map_err(|error| format!("创建备份失败：{error}"))?;
    atomic_replace(path, content)?;
    Ok(backup)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_unsafe_names() {
        assert!(safe_markdown_filename("safe-post.md").is_ok());
        assert!(safe_markdown_filename("../escape.md").is_err());
        assert!(safe_markdown_filename("hello.txt").is_err());
        assert!(safe_markdown_filename("CON.md").is_err());
    }

    #[test]
    fn fingerprints_are_stable() {
        assert_eq!(version("same"), version("same"));
        assert_ne!(version("same"), version("changed"));
    }
}
