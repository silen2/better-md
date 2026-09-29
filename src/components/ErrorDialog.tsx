import type { Translator } from "../i18n";

type ErrorDialogProps = {
  message: string;
  onClose: () => void;
  t: Translator;
};

export function ErrorDialog({ message, onClose, t }: ErrorDialogProps) {
  return (
    <div className="modal" role="presentation">
      <div className="dialog" role="alertdialog" aria-modal="true">
        <h2>{t("无法执行此操作")}</h2>
        <p>{message}</p>
        <button onClick={onClose}>{t("知道了")}</button>
      </div>
    </div>
  );
}
