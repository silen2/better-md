use serde::Serialize;
use std::{
    env, fs,
    path::{Path, PathBuf},
};

#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub children: Option<Vec<FileNode>>,
}
#[derive(Serialize)]
pub struct StartupFile {
    pub path: String,
    pub workspace: String,
}
#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct SearchResult {
    pub path: String,
    pub line: usize,
    pub text: String,
}

pub fn supported(path: &Path, extensions: &[String]) -> Option<String> {
    let kind = match path.extension()?.to_string_lossy().to_lowercase().as_str() {
        "md" => "md",
        "json" => "json",
        "txt" => "text",
        "csv" => "csv",
        _ => return None,
    };
    extensions
        .iter()
        .any(|item| item == kind)
        .then(|| kind.to_string())
}
pub fn scan(path: &Path, extensions: &[String]) -> Vec<FileNode> {
    let mut nodes = fs::read_dir(path)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let item = entry.path();
            let name = entry.file_name().to_string_lossy().into_owned();
            if item.is_dir() {
                Some(FileNode {
                    name,
                    path: item.to_string_lossy().into_owned(),
                    is_dir: true,
                    extension: None,
                    children: Some(scan(&item, extensions)),
                })
            } else {
                supported(&item, extensions).map(|extension| FileNode {
                    name,
                    path: item.to_string_lossy().into_owned(),
                    is_dir: false,
                    extension: Some(extension),
                    children: None,
                })
            }
        })
        .collect::<Vec<_>>();
    nodes.sort_by_key(|node| (!node.is_dir, node.name.to_lowercase()));
    nodes
}
#[tauri::command]
pub fn scan_workspace(root: String, extensions: Vec<String>) -> Vec<FileNode> {
    scan(Path::new(&root), &extensions)
}
#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| error.to_string())
}
#[tauri::command]
pub fn startup_file() -> Option<StartupFile> {
    let supported_types = vec![
        "md".to_string(),
        "json".to_string(),
        "text".to_string(),
        "csv".to_string(),
    ];
    env::args_os().skip(1).find_map(|argument| {
        let path = PathBuf::from(argument);
        if !path.is_file() || supported(&path, &supported_types).is_none() {
            return None;
        }
        let path = path.canonicalize().ok()?;
        Some(StartupFile {
            path: path.to_string_lossy().into_owned(),
            workspace: path.parent()?.to_string_lossy().into_owned(),
        })
    })
}
pub fn collect_files(
    path: &Path,
    extensions: &[String],
    query: &str,
    results: &mut Vec<SearchResult>,
) {
    let Ok(entries) = fs::read_dir(path) else {
        return;
    };
    let normalized_query = query.to_lowercase();
    for entry in entries.flatten() {
        let item = entry.path();
        if item.is_dir() {
            collect_files(&item, extensions, query, results);
        } else if supported(&item, extensions).is_some() {
            if let Ok(text) = fs::read_to_string(&item) {
                for (index, line) in text.lines().enumerate() {
                    if line.to_lowercase().contains(&normalized_query) {
                        results.push(SearchResult {
                            path: item.to_string_lossy().into_owned(),
                            line: index + 1,
                            text: line.to_string(),
                        });
                    }
                }
            }
        }
    }
}
#[tauri::command]
pub fn search_workspace(root: String, extensions: Vec<String>, query: String) -> Vec<SearchResult> {
    let mut results = Vec::new();
    collect_files(&PathBuf::from(root), &extensions, &query, &mut results);
    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};
    fn fixture() -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let root = env::temp_dir().join(format!("bettermd-{suffix}"));
        fs::create_dir_all(root.join("docs")).expect("dir");
        fs::write(root.join("README.md"), "BetterMD\nwelcome").expect("md");
        fs::write(root.join("docs/config.json"), "{\"name\":\"bettermd\"}").expect("json");
        fs::write(root.join("image.png"), "ignored").expect("image");
        root
    }
    #[test]
    fn filters_supported_types() {
        let kinds = vec!["md".into(), "json".into()];
        assert_eq!(supported(Path::new("README.MD"), &kinds), Some("md".into()));
        assert_eq!(supported(Path::new("notes.txt"), &kinds), None);
    }
    #[test]
    fn scans_nested_workspace() {
        let root = fixture();
        let nodes = scan(&root, &["md".into(), "json".into()]);
        assert_eq!(nodes.len(), 2);
        assert!(nodes[0].is_dir);
        assert_eq!(
            nodes[0].children.as_ref().expect("children")[0].name,
            "config.json"
        );
        assert_eq!(nodes[1].name, "README.md");
        fs::remove_dir_all(root).expect("cleanup");
    }
    #[test]
    fn searches_case_insensitively() {
        let root = fixture();
        let mut results = Vec::new();
        collect_files(
            &root,
            &["md".into(), "json".into()],
            "BETTERMD",
            &mut results,
        );
        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|result| result.line == 1));
        fs::remove_dir_all(root).expect("cleanup");
    }
}
