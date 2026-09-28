#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::{
    env, fs,
    path::{Path, PathBuf},
};

#[derive(Serialize)]
struct FileNode {
    name: String,
    path: String,
    is_dir: bool,
    extension: Option<String>,
    children: Option<Vec<FileNode>>,
}

#[derive(Serialize)]
struct StartupFile {
    path: String,
    workspace: String,
}

fn supported(path: &Path, extensions: &[String]) -> Option<String> {
    let ext = path.extension()?.to_string_lossy().to_lowercase();
    let kind = match ext.as_str() {
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

fn scan(path: &Path, extensions: &[String]) -> Vec<FileNode> {
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
fn scan_workspace(root: String, extensions: Vec<String>) -> Vec<FileNode> {
    scan(Path::new(&root), &extensions)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| error.to_string())
}

/// Returns a supported document passed to BetterMD by Windows file association.
/// Only a real file is accepted so normal Tauri command-line flags are ignored.
#[tauri::command]
fn startup_file() -> Option<StartupFile> {
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

fn collect_files(path: &Path, extensions: &[String], query: &str, results: &mut Vec<SearchResult>) {
    let Ok(entries) = fs::read_dir(path) else {
        return;
    };
    for entry in entries.flatten() {
        let item = entry.path();
        if item.is_dir() {
            collect_files(&item, extensions, query, results);
        } else if supported(&item, extensions).is_some() {
            if let Ok(text) = fs::read_to_string(&item) {
                for (index, line) in text.lines().enumerate() {
                    if line.to_lowercase().contains(&query.to_lowercase()) {
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
#[derive(Serialize)]
struct SearchResult {
    path: String,
    line: usize,
    text: String,
}
#[tauri::command]
fn search_workspace(root: String, extensions: Vec<String>, query: String) -> Vec<SearchResult> {
    let mut results = Vec::new();
    collect_files(&PathBuf::from(root), &extensions, &query, &mut results);
    results
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_workspace,
            read_text_file,
            search_workspace,
            startup_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running BetterMD")
}
