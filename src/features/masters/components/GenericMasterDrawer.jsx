import Drawer from "../../../components/feedback/Drawer.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

const inputCls =
  "w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-primary px-3 py-2 text-sm text-text outline-none";

export default function GenericMasterDrawer({
  open,
  onClose,
  entity = "Record",
  fields = [],
  values = {},
  isNew = true,
}) {
  const toast = useToast();
  const save = () => {
    toast.success(`${entity} ${isNew ? "created" : "saved"}`);
    onClose?.();
  };
  return (
    <Drawer
      open={open}
      title={isNew ? `New ${entity}` : `Edit ${entity}`}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text border border-border rounded-md hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-md"
          >
            {isNew ? "Create" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">
              {f.label}
              {f.required && " *"}
            </label>
            {f.type === "textarea" ? (
              <textarea
                rows={3}
                defaultValue={values[f.name] ?? ""}
                placeholder={f.placeholder}
                className={`${inputCls} resize-none`}
              />
            ) : f.type === "select" ? (
              <select
                className={inputCls}
                defaultValue={values[f.name] ?? ""}
              >
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type ?? "text"}
                defaultValue={values[f.name] ?? ""}
                placeholder={f.placeholder}
                className={inputCls}
              />
            )}
          </div>
        ))}
      </div>
    </Drawer>
  );
}
