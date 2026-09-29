import type { KeyboardEvent } from "react";
import type { Translator } from "../i18n";
import type { SearchMatch } from "../domain/types";

type SearchDialogProps = {
  scope: "file" | "project";
  query: string;
  matches: SearchMatch[];
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onMatch: (match: SearchMatch) => void;
  onClose: () => void;
  t: Translator;
};

export function SearchDialog({
  scope,
  query,
  matches,
  onQueryChange,
  onSearch,
  onMatch,
  onClose,
  t,
}: SearchDialogProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onSearch();
  };

  return (
    <div className="modal" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true">
        <h2>{t(scope === "file" ? "搜索当前文件" : "搜索当前项目")}</h2>
        <input
          autoFocus
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("输入关键词，按 Enter 搜索")}
        />
        {matches.map((match) => (
          <button
            className="result"
            key={`${match.path}:${match.line}`}
            onClick={() => onMatch(match)}
          >
            <b>
              {match.path
                ? `${match.path}:${match.line}`
                : t("第 {line} 行", { line: match.line })}
            </b>
            <span>{match.text}</span>
          </button>
        ))}
        <button onClick={onClose}>{t("关闭")}</button>
      </div>
    </div>
  );
}
