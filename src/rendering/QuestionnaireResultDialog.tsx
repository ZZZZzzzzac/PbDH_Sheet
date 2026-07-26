import type { PendingQuestionnaireResult } from "../store/runtimeStore";

export function QuestionnaireResultDialog({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingQuestionnaireResult | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!pending) return null;
  return (
    <div className="validation-dialog-backdrop" data-output-exclude="true">
      <section className="validation-dialog" role="dialog" aria-modal="true" aria-label="确认问卷选择">
        <header className="validation-dialog-header">
          <div>
            <p className="eyebrow">问卷式车卡</p>
            <h2>确认应用“{pending.questionnaireName}”的结果</h2>
          </div>
          <div className="dialog-actions">
            <button className="icon-button" type="button" onClick={onConfirm}>确认应用</button>
            <button className="icon-button secondary-button" type="button" onClick={onCancel}>取消</button>
          </div>
        </header>
        <div className="validation-dialog-body">
          <p>Base 将按以下顺序重放与手动选择相同的 Resource Picker 操作。确认前，当前 Character Save 不会改变。</p>
          <ol className="questionnaire-selection-list">
            {pending.selections.map((selection, index) => (
              <li key={`${selection.sourceModuleId}:${selection.libraryId}:${index}`}>
                <strong>{selection.pickerLabel}</strong>
                <span>{selection.libraryName}：{selection.entries.map((entry) => entry.name).join("、")}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
