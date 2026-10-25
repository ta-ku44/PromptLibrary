import { useEffect, useRef } from 'preact/hooks';
import { useShallow } from 'zustand/shallow';
import { parseVariables } from '@/utils/variables';
import { useContentStore } from '../stores/useContentStore';

export default function Modal() {
  const ref = useRef<HTMLDialogElement>(null);
  const { phase, confirm, setVariableValue, resetFlow } = useContentStore(
    useShallow((state) => ({
      phase: state.phase,
      confirm: state.confirm,
      setVariableValue: state.setVariableValue,
      resetFlow: state.resetFlow,
    })),
  );

  const isConfirming = phase.kind === 'confirming';

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    isConfirming ? dialog.showModal() : dialog.close();
  }, [isConfirming]);

  return (
    <dialog ref={ref} onCancel={resetFlow} className="modal m-auto overflow-visible bg-transparent p-0">
      {isConfirming && (
        <div className="pointer-events-auto w-xl max-w-[calc(100vw-2rem)] overflow-hidden overscroll-none rounded-lg border bg-card shadow-lg">
          <header className="flex items-center justify-between border-b p-3.5">
            <h2 className="text-lg">「{phase.prompt.name}」のカスタム項目を入力</h2>
          </header>

          <form id="confirm-form" onSubmit={confirm} className="flex flex-col gap-3 p-3.5">
            {parseVariables(phase.prompt.content).map((v) => (
              <></>
            ))}
          </form>

          <footer className="flex justify-end gap-3 border-t p-3.5">
            <button type="button" onClick={resetFlow} className="rounded border px-3 py-1.5 hover:bg-accent">
              キャンセル
            </button>
            <button type="submit" form="confirm-form" className="rounded bg-[#006aff] px-3 py-1.5 text-white hover:bg-[#4090ff]">
              確定
            </button>
          </footer>
        </div>
      )}
    </dialog>
  );
}
